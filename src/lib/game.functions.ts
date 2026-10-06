import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LENGTHS, MAX_PLAYERS, MAX_ROUNDS, MIN_PLAYERS, TIMING, motivesFor, roundMinutes, type Motive, type GameStatus } from "./game/config";
import { AGENDAS, SPECIAL_AGENDAS } from "./game/agendas";
import { computeVerdict, type RevealData } from "./game/scoring";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });

const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{4}$/, "Table Codes are four letters.");
const nameSchema = z.string().trim().min(1, "Give us a name.").max(20, "Keep it under 20 characters.");
const emojiSchema = z.string().max(8).optional().nullable();
const sessionSchema = z.object({ code: codeSchema, playerId: z.string().uuid(), token: z.string().min(20).max(100) });

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
type Admin = Awaited<ReturnType<typeof admin>>;

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function newToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function newCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => letters[x % letters.length]).join("");
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
const iso = (ms: number) => new Date(ms).toISOString();
const expired = (createdAt: string) => Date.now() - new Date(createdAt).getTime() > TIMING.lobbyExpiryHours * 3600_000;

async function seatPlayer(db: Admin, tableId: string, name: string, emoji: string | null | undefined) {
  const { data: existing } = await db.from("players").select("id, name, seat").eq("table_id", tableId);
  const list = existing ?? [];
  if (list.length >= MAX_PLAYERS) return fail("This table is full.");
  if (list.some((p) => p.name.toLowerCase() === name.toLowerCase())) return fail("Someone at this table already goes by that name.");
  const seat = list.reduce((m, p) => Math.max(m, p.seat), 0) + 1;
  const { data: player, error } = await db.from("players").insert({ table_id: tableId, name, emoji: emoji || null, seat }).select("id").single();
  if (error || !player) return fail(error?.code === "23505" ? "Someone at this table already goes by that name." : "Couldn't take that seat. Try again.");
  const token = newToken();
  await db.from("player_secrets").insert({ player_id: player.id, token_hash: await sha256(token) });
  return { ok: true as const, data: { playerId: player.id, token } };
}

async function verify(db: Admin, s: z.infer<typeof sessionSchema>) {
  const { data: table } = await db.from("game_tables").select("*").eq("code", s.code).maybeSingle();
  if (!table) return null;
  const { data: player } = await db.from("players").select("*").eq("id", s.playerId).eq("table_id", table.id).maybeSingle();
  if (!player) return null;
  const { data: secret } = await db.from("player_secrets").select("token_hash").eq("player_id", player.id).maybeSingle();
  if (!secret || secret.token_hash !== (await sha256(s.token))) return null;
  return { table, player };
}

/** Rounds in this game = the highest round anyone was dealt a mission for. */
async function totalRounds(db: Admin, tableId: string) {
  const { data } = await db.from("agenda_assignments").select("act").eq("table_id", tableId).order("act", { ascending: false }).limit(1).maybeSingle();
  return data?.act ?? MAX_ROUNDS;
}

/** Idempotent state machine driven lazily by any client. */
async function advance(db: Admin, tableId: string) {
  for (let i = 0; i < 6; i++) {
    const { data: t } = await db.from("game_tables").select("*").eq("id", tableId).single();
    if (!t) return;
    const now = Date.now();
    const status = t.status as GameStatus;
    let patch: Record<string, unknown> | null = null;
    if (status === "ACT_INTRO" && t.intro_ends_at && now >= Date.parse(t.intro_ends_at)) patch = { status: "ACT_ACTIVE" };
    else if (status === "ACT_ACTIVE" && t.act_ends_at && now >= Date.parse(t.act_ends_at)) patch = { status: "ACT_SUBMISSION" };
    else if (status === "ACT_SUBMISSION") {
      const { data: ps } = await db.from("players").select("submitted_act").eq("table_id", tableId);
      if ((ps ?? []).every((p) => p.submitted_act >= t.current_act))
        patch = { status: "ACT_TRANSITION", transition_ends_at: iso(now + TIMING.transitionSec * 1000) };
    } else if (status === "ACT_TRANSITION" && t.transition_ends_at && now >= Date.parse(t.transition_ends_at)) {
      if (t.current_act >= (await totalRounds(db, tableId))) patch = { status: "FINAL_ACCUSATION" };
      else {
        const intro = now + TIMING.introSec * 1000;
        patch = { status: "ACT_INTRO", current_act: t.current_act + 1, intro_ends_at: iso(intro), act_ends_at: iso(intro + t.act_duration_sec * 1000) };
      }
    } else if (status === "FINAL_ACCUSATION") {
      const { data: ps } = await db.from("players").select("accused").eq("table_id", tableId);
      if ((ps ?? []).every((p) => p.accused)) patch = { status: "REVEAL" };
    }
    if (!patch) return;
    await db.from("game_tables").update({ ...patch, updated_at: iso(now) }).eq("id", tableId).eq("status", status).eq("current_act", t.current_act);
  }
}

// ---------- Lobby ----------

export const createTable = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ name: nameSchema, emoji: emojiSchema }).parse(d))
  .handler(async ({ data }): Promise<Result<{ code: string; playerId: string; token: string }>> => {
    const db = await admin();
    for (let i = 0; i < 8; i++) {
      const code = newCode();
      const { data: table, error } = await db.from("game_tables").insert({ code, act_duration_sec: roundMinutes(MIN_PLAYERS) * 60 }).select("id").single();
      if (error || !table) continue;
      const seat = await seatPlayer(db, table.id, data.name, data.emoji);
      if (!seat.ok) return seat;
      await db.from("game_tables").update({ creator_player_id: seat.data.playerId }).eq("id", table.id);
      return { ok: true, data: { code, ...seat.data } };
    }
    return fail("Couldn't set up a table just now. Try again.");
  });

export const joinTable = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: codeSchema, name: nameSchema, emoji: emojiSchema }).parse(d))
  .handler(async ({ data }): Promise<Result<{ code: string; playerId: string; token: string }>> => {
    const db = await admin();
    const { data: table } = await db.from("game_tables").select("id, status, created_at").eq("code", data.code).maybeSingle();
    if (!table) return fail("That table doesn't exist.");
    if (table.status !== "LOBBY") return fail("Too late. The table has secrets now.");
    if (expired(table.created_at)) return fail("That table has quietly cleared. Start a new one.");
    const seat = await seatPlayer(db, table.id, data.name, data.emoji);
    if (!seat.ok) return seat;
    return { ok: true, data: { code: data.code, ...seat.data } };
  });

export const peekTable = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ code: codeSchema }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: t } = await db.from("game_tables").select("id, status, created_at").eq("code", data.code).maybeSingle();
    if (!t) return { exists: false, status: null as string | null, count: 0 };
    const { count } = await db.from("players").select("id", { count: "exact", head: true }).eq("table_id", t.id);
    return { exists: !expired(t.created_at) || t.status !== "LOBBY", status: t.status, count: count ?? 0 };
  });

export const setTheTable = createServerFn({ method: "POST" })
  .inputValidator((d) => sessionSchema.extend({ length: z.enum(["QUICK", "FULL"]).default("QUICK") }).parse(d))
  .handler(async ({ data }): Promise<Result<null>> => {
    const db = await admin();
    const v = await verify(db, data);
    if (!v) return fail("We lost your seat.");
    const { table } = v;
    if (table.creator_player_id !== v.player.id) return fail("Only the person who started the table can set it.");
    if (table.status !== "LOBBY") return { ok: true, data: null };
    const { data: players } = await db.from("players").select("id").eq("table_id", table.id);
    const ps = players ?? [];
    if (ps.length < MIN_PLAYERS) return fail(`The table needs at least ${MIN_PLAYERS}.`);

    // Claim the start atomically.
    const now = Date.now();
    const intro = now + TIMING.introSec * 1000;
    const roundSec = roundMinutes(ps.length) * 60;
    const { pools, bonusRounds } = LENGTHS[data.length];
    const { data: claimed } = await db
      .from("game_tables")
      .update({ status: "ACT_INTRO", current_act: 1, act_duration_sec: roundSec, intro_ends_at: iso(intro), act_ends_at: iso(intro + roundSec * 1000), updated_at: iso(now) })
      .eq("id", table.id).eq("status", "LOBBY").select("id");
    if (!claimed?.length) return { ok: true, data: null };

    // Motives
    const { observers, disruptors, decoys } = motivesFor(ps.length);
    const roles: Motive[] = [...Array(observers).fill("OBSERVER"), ...Array(disruptors).fill("DISRUPTOR"), ...Array(decoys).fill("DECOY")];
    const order = shuffle(ps.map((p) => p.id));
    const motiveOf = new Map<string, Motive>();
    order.forEach((id, i) => motiveOf.set(id, roles[i] ?? "PLAYER"));
    await db.from("motives").insert(order.map((id) => ({ player_id: id, table_id: table.id, motive: motiveOf.get(id)! })));

    // Agendas: one per player per round, drawn from that round's pool, distinct within a round where possible.
    const rows: { table_id: string; player_id: string; act: number; is_special: boolean; agenda_id: string; text: string; difficulty: number; requires_player: boolean }[] = [];
    const usedByPlayer = new Map<string, Set<string>>();
    for (let act = 1; act <= pools.length; act++) {
      const pool = AGENDAS.filter((a) => a.act === pools[act - 1] && ps.length >= a.minPlayers && ps.length <= a.maxPlayers);
      let deck = shuffle(pool);
      for (const id of shuffle(ps.map((p) => p.id))) {
        if (!deck.length) deck = shuffle(pool);
        const used = usedByPlayer.get(id) ?? new Set();
        const idx = deck.findIndex((a) => !used.has(a.tag));
        const pick = deck.splice(idx < 0 ? 0 : idx, 1)[0]!;
        used.add(pick.tag);
        usedByPlayer.set(id, used);
        rows.push({ table_id: table.id, player_id: id, act, is_special: false, agenda_id: pick.id, text: pick.text, difficulty: pick.difficulty, requires_player: pick.requiresPlayer });
      }
    }
    for (const [id, m] of motiveOf) {
      if (m === "PLAYER") continue;
      const deck = shuffle(SPECIAL_AGENDAS.filter((a) => a.motive === m));
      bonusRounds.forEach((act, i) => {
        const pick = deck[i % deck.length]!;
        rows.push({ table_id: table.id, player_id: id, act, is_special: true, agenda_id: pick.id, text: pick.text, difficulty: 2, requires_player: false });
      });
    }
    await db.from("agenda_assignments").insert(rows);
    return { ok: true, data: null };
  });

// ---------- In-game ----------

export const getState = createServerFn({ method: "POST" })
  .inputValidator((d) => sessionSchema.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const v0 = await verify(db, data);
    if (!v0) return { ok: false as const, error: "lost" };
    await advance(db, v0.table.id);
    const { data: table } = await db.from("game_tables").select("*").eq("id", v0.table.id).single();
    const { data: players } = await db.from("players").select("id, name, emoji, seat, submitted_act, accused").eq("table_id", v0.table.id).order("seat");
    const me = players!.find((p) => p.id === v0.player.id)!;
    const t = table!;
    let motive: Motive | null = null;
    let agendas: { act: number; isSpecial: boolean; text: string; difficulty: number; requiresPlayer: boolean; result: string | null }[] = [];
    let suspectedThisAct = false;
    if (t.status !== "LOBBY") {
      const { data: m } = await db.from("motives").select("motive").eq("player_id", me.id).maybeSingle();
      motive = (m?.motive as Motive) ?? null;
      const { data: a } = await db.from("agenda_assignments").select("act, is_special, text, difficulty, requires_player, result").eq("player_id", me.id).lte("act", t.current_act).order("act");
      agendas = (a ?? []).map((x) => ({ act: x.act, isSpecial: x.is_special, text: x.text, difficulty: x.difficulty, requiresPlayer: x.requires_player, result: x.result }));
      const { data: s } = await db.from("suspicions").select("id").eq("player_id", me.id).eq("act", t.current_act).maybeSingle();
      suspectedThisAct = !!s;
    }
    const rounds = t.status === "LOBBY" ? 0 : await totalRounds(db, t.id);
    return {
      ok: true as const,
      serverNow: Date.now(),
      table: {
        code: t.code, status: t.status as GameStatus, currentAct: t.current_act, totalRounds: rounds,
        introEndsAt: t.intro_ends_at, actEndsAt: t.act_ends_at, transitionEndsAt: t.transition_ends_at,
        isCreator: t.creator_player_id === me.id,
      },
      players: players!,
      me: { id: me.id, name: me.name, emoji: me.emoji, submittedAct: me.submitted_act, accused: me.accused },
      motive, agendas, suspectedThisAct,
    };
  });

export const submitAct = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    sessionSchema.extend({
      act: z.number().int().min(1).max(MAX_ROUNDS),
      result: z.enum(["COMPLETE", "FAILED"]),
      involvedId: z.string().uuid().nullable(),
      specialResult: z.enum(["COMPLETE", "FAILED"]).nullable(),
      suspectId: z.string().uuid().nullable(),
    }).parse(d))
  .handler(async ({ data }): Promise<Result<null>> => {
    const db = await admin();
    const v = await verify(db, data);
    if (!v) return fail("We lost your seat.");
    const { table, player } = v;
    if (data.act > table.current_act || (data.act === table.current_act && !["ACT_SUBMISSION", "ACT_TRANSITION", "ACT_ACTIVE"].includes(table.status)))
      return fail("Not yet. The Act is still running.");
    if (data.act === table.current_act && table.status === "ACT_ACTIVE" && table.act_ends_at && Date.now() < Date.parse(table.act_ends_at) - 2000)
      return fail("The table is still in session.");
    if (player.submitted_act >= data.act) return fail("Already recorded.");
    const { data: ids } = await db.from("players").select("id").eq("table_id", table.id);
    const valid = new Set((ids ?? []).map((p) => p.id));
    const involved = data.involvedId && valid.has(data.involvedId) && data.involvedId !== player.id ? data.involvedId : null;
    const suspect = data.suspectId && valid.has(data.suspectId) && data.suspectId !== player.id ? data.suspectId : null;
    // claim submission first (prevents duplicates)
    const { data: claimed } = await db.from("players").update({ submitted_act: data.act }).eq("id", player.id).lt("submitted_act", data.act).select("id");
    if (!claimed?.length) return fail("Already recorded.");
    const now = iso(Date.now());
    await db.from("agenda_assignments").update({ result: data.result, involved_player_id: involved, submitted_at: now }).eq("player_id", player.id).eq("act", data.act).eq("is_special", false);
    if (data.specialResult) await db.from("agenda_assignments").update({ result: data.specialResult, submitted_at: now }).eq("player_id", player.id).eq("act", data.act).eq("is_special", true);
    await db.from("suspicions").upsert({ table_id: table.id, player_id: player.id, act: data.act, suspect_id: suspect }, { onConflict: "player_id,act" });
    await advance(db, table.id);
    return { ok: true, data: null };
  });

export const submitAccusation = createServerFn({ method: "POST" })
  .inputValidator((d) => sessionSchema.extend({ accusedId: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data }): Promise<Result<null>> => {
    const db = await admin();
    const v = await verify(db, data);
    if (!v) return fail("We lost your seat.");
    if (v.table.status !== "FINAL_ACCUSATION") return fail("Not the moment for that.");
    if (v.player.accused) return fail("Already recorded.");
    const { data: target } = await db.from("players").select("id").eq("id", data.accusedId ?? "00000000-0000-0000-0000-000000000000").eq("table_id", v.table.id).maybeSingle();
    const accused = target && target.id !== v.player.id ? target.id : null;
    const { data: claimed } = await db.from("players").update({ accused: true }).eq("id", v.player.id).eq("accused", false).select("id");
    if (!claimed?.length) return fail("Already recorded.");
    await db.from("accusations").insert({ player_id: v.player.id, table_id: v.table.id, accused_id: accused });
    await advance(db, v.table.id);
    return { ok: true, data: null };
  });

/** Creator-only: nudge the evening along (more time, end a round, stalled check-ins, end early). */
export const creatorAction = createServerFn({ method: "POST" })
  .inputValidator((d) => sessionSchema.extend({ action: z.enum(["ADD_TIME", "END_ROUND", "MOVE_ON", "END_EARLY", "REVEAL_NOW"]) }).parse(d))
  .handler(async ({ data }): Promise<Result<null>> => {
    const db = await admin();
    const v = await verify(db, data);
    if (!v) return fail("We lost your seat.");
    const t = v.table;
    if (t.creator_player_id !== v.player.id) return fail("Only the person who started the table can do that.");
    const now = Date.now();
    let patch: Record<string, unknown> | null = null;
    if (data.action === "ADD_TIME" && ["ACT_INTRO", "ACT_ACTIVE"].includes(t.status) && t.act_ends_at)
      patch = { act_ends_at: iso(Math.max(Date.parse(t.act_ends_at), now) + TIMING.extendSec * 1000) };
    if (data.action === "END_ROUND" && t.status === "ACT_ACTIVE") patch = { status: "ACT_SUBMISSION" };
    if (data.action === "MOVE_ON" && t.status === "ACT_SUBMISSION") patch = { status: "ACT_TRANSITION", transition_ends_at: iso(now + TIMING.transitionSec * 1000) };
    if (data.action === "END_EARLY" && ["ACT_INTRO", "ACT_ACTIVE", "ACT_SUBMISSION", "ACT_TRANSITION"].includes(t.status)) patch = { status: "FINAL_ACCUSATION" };
    if (data.action === "REVEAL_NOW" && t.status === "FINAL_ACCUSATION") patch = { status: "REVEAL" };
    if (!patch) return fail("Nothing to do right now.");
    await db.from("game_tables").update({ ...patch, updated_at: iso(now) }).eq("id", t.id).eq("status", t.status);
    return { ok: true, data: null };
  });

export const getReveal = createServerFn({ method: "POST" })
  .inputValidator((d) => sessionSchema.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const v = await verify(db, data);
    if (!v) return { ok: false as const, error: "lost" };
    if (!["REVEAL", "FINISHED"].includes(v.table.status)) return { ok: false as const, error: "Not yet." };
    const tid = v.table.id;
    const [{ data: players }, { data: motives }, { data: agendas }, { data: susp }, { data: acc }] = await Promise.all([
      db.from("players").select("id, name, emoji, seat").eq("table_id", tid).order("seat"),
      db.from("motives").select("player_id, motive").eq("table_id", tid),
      db.from("agenda_assignments").select("player_id, act, is_special, text, difficulty, result, involved_player_id").eq("table_id", tid).order("act"),
      db.from("suspicions").select("player_id, act, suspect_id").eq("table_id", tid).order("act"),
      db.from("accusations").select("player_id, accused_id").eq("table_id", tid),
    ]);
    const mm = new Map((motives ?? []).map((m) => [m.player_id, m.motive as Motive]));
    const reveal: RevealData = {
      players: (players ?? []).map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, motive: mm.get(p.id) ?? "PLAYER" })),
      agendas: (agendas ?? []).map((a) => ({ playerId: a.player_id, act: a.act, isSpecial: a.is_special, text: a.text, difficulty: a.difficulty, result: a.result, involvedPlayerId: a.involved_player_id })),
      suspicions: (susp ?? []).map((s) => ({ playerId: s.player_id, act: s.act, suspectId: s.suspect_id })),
      accusations: (acc ?? []).map((a) => ({ playerId: a.player_id, accusedId: a.accused_id })),
    };
    return { ok: true as const, reveal, verdict: computeVerdict(reveal) };
  });
