import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { creatorAction, getState, setTheTable, submitAccusation, submitAct } from "@/lib/game.functions";
import { estimateMinutes, LENGTHS, MAX_PLAYERS, MIN_PLAYERS, MOTIVE_COPY, roundInfo, roundMinutes, type GameLength } from "@/lib/game/config";
import { clearSeat, localFlag, type Seat } from "@/lib/session";
import { Avatar, Shell } from "./Shell";
import { Reveal } from "./Reveal";
import { HowToPlay } from "./HowToPlay";

type State = Extract<Awaited<ReturnType<typeof getState>>, { ok: true }>;
type Player = State["players"][number];

function useClock(offset: number) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 500);
    return () => clearInterval(id);
  }, [offset]);
  return now;
}
const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function Game({ seat, onLost }: { seat: Seat; onLost: () => void }) {
  const fetchState = useServerFn(getState);
  const qc = useQueryClient();
  const qk = useMemo(() => ["table", seat.code, seat.playerId], [seat]);
  const q = useQuery({
    queryKey: qk,
    queryFn: () => fetchState({ data: seat }),
    refetchInterval: 6000,
  });
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: qk }), [qc, qk]);

  useEffect(() => {
    const ch = supabase
      .channel(`table-${seat.code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_tables", filter: `code=eq.${seat.code}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [seat.code, refresh]);

  const data = q.data;
  useEffect(() => {
    if (data && !data.ok) {
      clearSeat(seat.code);
      onLost();
    }
  }, [data, seat.code, onLost]);

  const offset = data?.ok ? data.serverNow - Date.now() : 0;
  const offsetRef = useRef(offset);
  if (data?.ok) offsetRef.current = offset;
  const now = useClock(offsetRef.current);

  // Nudge the shared state machine when a boundary passes.
  const t = data?.ok ? data.table : null;
  const boundary = t ? (t.status === "ACT_INTRO" ? t.introEndsAt : t.status === "ACT_ACTIVE" ? t.actEndsAt : t.status === "ACT_TRANSITION" ? t.transitionEndsAt : null) : null;
  const crossed = boundary ? now >= Date.parse(boundary) : false;
  useEffect(() => {
    if (crossed) refresh();
  }, [crossed, refresh]);

  if (!data) return <Shell><div className="flex flex-1 items-center justify-center"><p className="eyebrow animate-breathe">Finding your seat</p></div></Shell>;
  if (!data.ok) return null;
  return <Screens s={data} seat={seat} now={now} refresh={refresh} />;
}

function Screens({ s, seat, now, refresh }: { s: State; seat: Seat; now: number; refresh: () => void }) {
  const { table } = s;
  const top = table.status !== "LOBBY" && table.currentAct > 0 && !["REVEAL", "FINISHED"].includes(table.status)
    ? <span className="eyebrow">Round {table.currentAct} of {table.totalRounds}</span>
    : <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground">{table.code}</span>;

  let body: React.ReactNode;
  switch (table.status) {
    case "LOBBY": body = <Lobby s={s} seat={seat} refresh={refresh} />; break;
    case "ACT_INTRO":
    case "ACT_ACTIVE": body = <ActScreen s={s} seat={seat} now={now} />; break;
    case "ACT_SUBMISSION": body = <Submission s={s} seat={seat} refresh={refresh} />; break;
    case "ACT_TRANSITION": body = <Interlude s={s} seat={seat} />; break;
    case "FINAL_ACCUSATION": body = <Accusation s={s} seat={seat} refresh={refresh} />; break;
    default: body = <Reveal seat={seat} />;
  }
  return <Shell top={top}>{body}</Shell>;
}

// ---------------- The Table (lobby) ----------------

const RULES_SEEN = "ulterior:rulesSeen";

function Lobby({ s, seat, refresh }: { s: State; seat: Seat; refresh: () => void }) {
  const start = useServerFn(setTheTable);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [length, setLength] = useState<GameLength>("QUICK");
  const [rules, setRules] = useState(false);
  const [newHere, setNewHere] = useState(false);
  useEffect(() => {
    try { setNewHere(!localStorage.getItem(RULES_SEEN)); } catch { /* storage unavailable */ }
  }, []);
  const closeRules = () => {
    try { localStorage.setItem(RULES_SEEN, "1"); } catch { /* storage unavailable */ }
    setNewHere(false);
    setRules(false);
  };
  useEffect(() => {
    const url = `${window.location.origin}/t/${s.table.code}`;
    setLink(url);
    QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: "#1b1714", light: "#ece6da" } }).then(setQr);
  }, [s.table.code]);

  const ready = s.players.length >= MIN_PLAYERS;
  async function go() {
    setBusy(true);
    setError(null);
    try {
      const r = await start({ data: { ...seat, length } });
      if (!r.ok) setError(r.error);
    } catch {
      setError("Couldn't reach the table. Check your connection and try again.");
    } finally {
      setBusy(false);
      refresh();
    }
  }
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: "ULTERIOR", text: "Take a seat at my table.", url: link }); return; } catch { /* fallthrough */ }
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (rules) return <HowToPlay onDone={closeRules} doneLabel="Back to the table" />;

  const count = Math.max(s.players.length, MIN_PLAYERS);
  return (
    <div className="flex flex-1 flex-col pt-10">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">The Table</p>
        <button onClick={() => setRules(true)} className="link-quiet">How to play</button>
      </div>
      {newHere && (
        <button onClick={() => setRules(true)} className="animate-rise card-quiet mt-6 w-full p-5 text-left">
          <p className="eyebrow seal">New here?</p>
          <p className="display mt-2 text-2xl">Learn the game in one minute.</p>
          <p className="mt-1 text-sm text-muted-foreground">Read it while everyone sits down →</p>
        </button>
      )}
      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="eyebrow !text-[0.6rem]">Table Code</p>
          <p className="mt-2 font-mono text-5xl tracking-[0.25em]">{s.table.code}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={share} className="link-quiet">{copied ? "Link copied" : "Share link"}</button>
          <button onClick={() => setShowQr((v) => !v)} className="link-quiet">{showQr ? "Hide code" : "Show QR"}</button>
        </div>
      </div>
      {showQr && qr && (
        <div className="animate-rise mt-6 self-center rounded-md bg-foreground p-3">
          <img src={qr} alt={`QR code to join table ${s.table.code}`} className="h-52 w-52" />
        </div>
      )}

      <div className="rule mt-10" />
      <div className="mt-6 flex items-baseline justify-between">
        <p className="eyebrow">At the Table</p>
        <p className="numerals text-lg text-muted-foreground">{s.players.length} / {MAX_PLAYERS} seated</p>
      </div>
      <ul className="mt-4 divide-y divide-[var(--hairline)]">
        {s.players.map((p, i) => (
          <li key={p.id} className="animate-rise flex items-center gap-4 py-3" style={{ animationDelay: `${i * 60}ms` }}>
            <Avatar emoji={p.emoji} name={p.name} />
            <span className="display text-2xl">{p.name}</span>
            {p.id === s.me.id && <span className="eyebrow ml-auto !text-[0.6rem]">You</span>}
          </li>
        ))}
        {Array.from({ length: Math.max(0, MIN_PLAYERS - s.players.length) }).map((_, i) => (
          <li key={`e${i}`} className="flex items-center gap-4 py-3 opacity-30">
            <span className="h-10 w-10 rounded-full border border-dashed border-hairline" />
            <span className="display text-2xl italic">An empty chair</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-10">
        {ready && <p className="display mb-4 text-center text-2xl animate-rise">The table is ready.</p>}
        {!ready && <p className="mb-4 text-center text-sm text-muted-foreground">At least {MIN_PLAYERS} needed. Share the code.</p>}
        {error && <p className="mb-4 text-center text-sm seal">{error}</p>}
        {s.table.isCreator ? (
          <>
            <p className="eyebrow mb-3">How long?</p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(Object.keys(LENGTHS) as GameLength[]).map((l) => (
                <button key={l} type="button" data-on={length === l} onClick={() => setLength(l)} className="choice flex-col !items-start gap-1">
                  <span className="display text-xl">{LENGTHS[l].label}</span>
                  <span className="text-xs text-muted-foreground">{LENGTHS[l].pools.length} rounds · ~{estimateMinutes(count, l)} min</span>
                </button>
              ))}
            </div>
            <p className="mb-6 text-center text-xs text-muted-foreground">
              Rounds are {roundMinutes(count)} min with {count} people — bigger tables get longer rounds. You can add time during a round.
            </p>
            <button className="btn-primary" disabled={!ready || busy} onClick={go}>{busy ? "Setting…" : "Set the Table"}</button>
            <p className="mt-4 text-center text-xs italic text-muted-foreground">You're playing too. The table can look after itself.</p>
          </>
        ) : (
          <p className="eyebrow animate-breathe text-center">Waiting for the table to be set</p>
        )}
      </div>
    </div>
  );
}

// ---------------- Motive ----------------

function MotiveCard({ motive, onClose }: { motive: State["motive"]; onClose: () => void }) {
  if (!motive) return null;
  const c = MOTIVE_COPY[motive];
  return (
    <div className="flex flex-1 flex-col pt-14">
      <p className="eyebrow animate-rise">Your role</p>
      <h2 className={`display animate-curtain mt-8 text-6xl ${motive !== "PLAYER" ? "seal" : ""}`}>{c.name}</h2>
      <div className="animate-rise mt-10 space-y-1 text-lg" style={{ animationDelay: ".5s" }}>
        {c.lines.map((l) => <p key={l}>{l}</p>)}
      </div>
      {c.objective && (
        <div className="animate-rise card-quiet mt-8 p-5" style={{ animationDelay: ".8s" }}>
          <p className="eyebrow">Your extra job</p>
          <p className="display mt-3 text-2xl">{c.objective}</p>
        </div>
      )}
      <div className="animate-rise mt-8" style={{ animationDelay: "1s" }}>
        <p className="eyebrow">How you score</p>
        <ul className="mt-3 space-y-1 text-sm">{c.scoring.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
      <p className="mt-8 text-xs italic text-muted-foreground">Keep this private. Nobody knows how many secret roles are at the table.</p>
      <div className="mt-auto pt-10"><button className="btn-primary" onClick={onClose}>Understood</button></div>
    </div>
  );
}

// ---------------- Act ----------------

function ActScreen({ s, seat, now }: { s: State; seat: Seat; now: number }) {
  const act = s.table.currentAct;
  const motiveSeen = localFlag(seat.code, "motiveSeen");
  const begun = localFlag(seat.code, `begun-${act}`);
  const [seenMotive, setSeenMotive] = useState(false);
  const [hasBegun, setHasBegun] = useState(false);
  const [peek, setPeek] = useState<"none" | "agenda" | "motive">("none");
  const [early, setEarly] = useState(false);
  useEffect(() => {
    setSeenMotive(!!motiveSeen.get());
    setHasBegun(!!begun.get());
    setEarly(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act]);

  const agenda = s.agendas.find((a) => a.act === act && !a.isSpecial);
  const special = s.agendas.find((a) => a.act === act && a.isSpecial);
  const remaining = s.table.actEndsAt ? Date.parse(s.table.actEndsAt) - now : 0;
  const duration = s.table.actEndsAt && s.table.introEndsAt ? Date.parse(s.table.actEndsAt) - Date.parse(s.table.introEndsAt) : 0;
  const shown = Math.min(remaining, duration);
  const info = roundInfo(act, s.table.totalRounds);

  if (!seenMotive) return <MotiveCard motive={s.motive} onClose={() => { motiveSeen.set("1"); setSeenMotive(true); }} />;
  if (peek === "motive") return <MotiveCard motive={s.motive} onClose={() => setPeek("none")} />;

  if (!hasBegun || peek === "agenda") {
    return (
      <div className="flex flex-1 flex-col pt-12">
        <p className="eyebrow animate-rise">Round {act} of {s.table.totalRounds}</p>
        <h2 className="display animate-curtain mt-3 text-6xl">{info.title}</h2>
        <div className="rule mt-10" />
        <p className="eyebrow mt-10 animate-rise" style={{ animationDelay: ".4s" }}>
          Your mission{agenda && agenda.difficulty >= 2 && <span className="text-brass"> · Bold · worth 2</span>}
        </p>
        <p className="display animate-rise mt-4 text-[2rem] leading-tight" style={{ animationDelay: ".6s" }}>“{agenda?.text}”</p>
        {special && (
          <div className="animate-rise card-quiet mt-8 p-5" style={{ animationDelay: ".9s" }}>
            <p className="eyebrow seal">Bonus mission · worth 2</p>
            <p className="display mt-3 text-xl">{special.text}</p>
          </div>
        )}
        <p className="numerals mt-10 text-center text-5xl text-muted-foreground">{fmt(shown)}</p>
        <div className="mt-auto pt-8">
          <button className="btn-primary" onClick={() => { begun.set("1"); setHasBegun(true); setPeek("none"); }}>
            {peek === "agenda" ? "Hide it again" : "Start the round"}
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">Then put your phone face down. When the timer ends, you'll do a quick check-in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="eyebrow">Time Remaining</p>
      <p className="numerals mt-4 text-[6.5rem] leading-none">{fmt(shown)}</p>
      <p className="display mt-6 text-2xl italic text-muted-foreground">{early ? "Keep chatting — you'll check in when the timer ends." : info.line}</p>
      <p className="eyebrow animate-breathe mt-10">Put your phone down</p>
      <div className="mt-16 flex flex-col items-center gap-4">
        {!early && <button className="link-quiet" onClick={() => setEarly(true)}>I'm done early</button>}
        <button className="link-quiet" onClick={() => setPeek("agenda")}>View my mission</button>
        <button className="link-quiet" onClick={() => setPeek("motive")}>View my role</button>
        <HostControls s={s} seat={seat} />
      </div>
    </div>
  );
}

function HostControls({ s, seat }: { s: State; seat: Seat }) {
  const act = useServerFn(creatorAction);
  const [confirm, setConfirm] = useState<"none" | "round" | "evening">("none");
  if (!s.table.isCreator) return null;
  const run = (action: "ADD_TIME" | "END_ROUND" | "END_EARLY") => {
    setConfirm("none");
    act({ data: { ...seat, action } }).catch(() => undefined);
  };
  if (confirm !== "none")
    return (
      <div className="flex gap-4">
        <button className="link-quiet seal" onClick={() => run(confirm === "round" ? "END_ROUND" : "END_EARLY")}>
          {confirm === "round" ? "Yes, check in now" : "Yes, end it"}
        </button>
        <button className="link-quiet" onClick={() => setConfirm("none")}>Keep playing</button>
      </div>
    );
  return (
    <div className="mt-4 flex flex-col items-center gap-4 border-t border-hairline pt-6">
      <p className="eyebrow !text-[0.6rem]">Host</p>
      <button className="link-quiet" onClick={() => run("ADD_TIME")}>+5 minutes</button>
      {s.table.status === "ACT_ACTIVE" && <button className="link-quiet" onClick={() => setConfirm("round")}>End this round now</button>}
      <button className="link-quiet !text-[0.6rem] opacity-60" onClick={() => setConfirm("evening")}>End the evening early</button>
    </div>
  );
}

// ---------------- Submission ----------------

function PlayerPick({ players, me, value, onChange, noneLabel }: { players: Player[]; me: string; value: string | null; onChange: (v: string | null) => void; noneLabel?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {players.filter((p) => p.id !== me).map((p) => (
        <button key={p.id} type="button" data-on={value === p.id} onClick={() => onChange(value === p.id ? null : p.id)} className="choice">
          <Avatar emoji={p.emoji} name={p.name} size="sm" />
          <span className="truncate">{p.name}</span>
        </button>
      ))}
      {noneLabel && (
        <button type="button" data-on={value === null} onClick={() => onChange(null)} className="choice col-span-2 justify-center text-sm text-muted-foreground">
          {noneLabel}
        </button>
      )}
    </div>
  );
}

function Submission({ s, seat, refresh }: { s: State; seat: Seat; refresh: () => void }) {
  const act = s.table.currentAct;
  const submit = useServerFn(submitAct);
  const agenda = s.agendas.find((a) => a.act === act && !a.isSpecial);
  const special = s.agendas.find((a) => a.act === act && a.isSpecial);
  const [step, setStep] = useState<"result" | "involved" | "special" | "suspect">("result");
  const [result, setResult] = useState<"COMPLETE" | "FAILED" | null>(null);
  const [involved, setInvolved] = useState<string | null>(null);
  const [specialResult, setSpecialResult] = useState<"COMPLETE" | "FAILED" | null>(null);
  const [suspect, setSuspect] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (s.me.submittedAct >= act) return <Interlude s={s} seat={seat} waiting />;

  const afterResult = (r: "COMPLETE" | "FAILED") => {
    setResult(r);
    setStep(r === "COMPLETE" && agenda?.requiresPlayer ? "involved" : special ? "special" : "suspect");
  };

  async function send() {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      const r = await submit({ data: { ...seat, act, result, involvedId: involved, specialResult: special ? specialResult ?? "FAILED" : null, suspectId: suspect } });
      if (!r.ok && r.error !== "Already recorded.") setError(r.error);
    } catch {
      setError("Couldn't reach the table. Try again.");
    } finally {
      setBusy(false);
      refresh();
    }
  }

  if (step === "result")
    return (
      <div className="flex flex-1 flex-col pt-14">
        <p className="eyebrow text-center">Quick check-in</p>
        <p className="display animate-curtain mt-4 text-center text-7xl">Time's up</p>
        <p className="display mt-6 text-center text-2xl italic text-muted-foreground">Did you pull off your mission?</p>
        <p className="mt-10 border-l border-claret pl-4 text-sm text-muted-foreground">“{agenda?.text}”</p>
        <p className="mt-4 text-xs text-muted-foreground">Be honest — it all comes out in the reveal.</p>
        <div className="mt-auto flex flex-col gap-3 pt-10">
          <button className="btn-primary" onClick={() => afterResult("COMPLETE")}>I did it</button>
          <button className="btn-ghost" onClick={() => afterResult("FAILED")}>Didn't manage</button>
        </div>
      </div>
    );

  if (step === "involved")
    return (
      <div className="flex flex-1 flex-col pt-14">
        <p className="eyebrow">Privately</p>
        <h2 className="display mt-4 text-4xl">Who did you pull it off with?</h2>
        <p className="mt-3 text-sm text-muted-foreground">Nobody sees this until the reveal.</p>
        <div className="mt-8"><PlayerPick players={s.players} me={s.me.id} value={involved} onChange={setInvolved} noneLabel="Rather not say" /></div>
        <div className="mt-auto pt-10"><button className="btn-primary" onClick={() => setStep(special ? "special" : "suspect")}>Continue</button></div>
      </div>
    );

  if (step === "special")
    return (
      <div className="flex flex-1 flex-col pt-14">
        <p className="eyebrow seal">Bonus mission</p>
        <p className="display mt-4 text-3xl">“{special?.text}”</p>
        <p className="display mt-6 text-xl italic text-muted-foreground">Did you pull this off too?</p>
        <div className="mt-auto flex flex-col gap-3 pt-10">
          <button className="btn-primary" onClick={() => { setSpecialResult("COMPLETE"); setStep("suspect"); }}>Pulled it off</button>
          <button className="btn-ghost" onClick={() => { setSpecialResult("FAILED"); setStep("suspect"); }}>Not this time</button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col pt-14">
      <p className="eyebrow">Suspicion</p>
      <h2 className="display mt-4 text-4xl">Who do you think has a secret role?</h2>
      <p className="mt-3 text-sm text-muted-foreground">Pick one. It stays secret until the reveal.</p>
      <div className="mt-8"><PlayerPick players={s.players} me={s.me.id} value={suspect} onChange={setSuspect} noneLabel="Nobody, yet" /></div>
      <div className="mt-auto pt-10">
        {error && <p className="mb-4 text-sm seal">{error}</p>}
        <button className="btn-primary" disabled={busy} onClick={send}>{busy ? "Sealing…" : "Seal it"}</button>
      </div>
    </div>
  );
}

function Interlude({ s, seat, waiting }: { s: State; seat: Seat; waiting?: boolean }) {
  const action = useServerFn(creatorAction);
  const done = s.players.filter((p) => p.submitted_act >= s.table.currentAct).length;
  const last = s.table.currentAct >= s.table.totalRounds;
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="eyebrow">Round {s.table.currentAct} of {s.table.totalRounds}</p>
      <h2 className="display animate-curtain mt-4 text-6xl">Round over.</h2>
      <p className="display mt-4 text-2xl italic text-muted-foreground">{last ? "That was the last round. One final guess to go." : "The next round starts shortly."}</p>
      {waiting && <p className="eyebrow animate-breathe mt-12">{done} of {s.players.length} have checked in</p>}
      {waiting && s.table.isCreator && s.table.status === "ACT_SUBMISSION" && (
        <button className="link-quiet mt-10" onClick={() => action({ data: { ...seat, action: "MOVE_ON" } })}>Move on without them</button>
      )}
    </div>
  );
}

// ---------------- Final Accusations ----------------

function Accusation({ s, seat, refresh }: { s: State; seat: Seat; refresh: () => void }) {
  const accuse = useServerFn(submitAccusation);
  const action = useServerFn(creatorAction);
  const [intro, setIntro] = useState(true);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = s.players.filter((p) => p.accused).length;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await accuse({ data: { ...seat, accusedId: pick } });
      if (!r.ok && r.error !== "Already recorded.") setError(r.error);
    } catch {
      setError("Couldn't reach the table. Try again.");
    } finally {
      setBusy(false);
      refresh();
    }
  }

  if (s.me.accused)
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h2 className="display text-5xl">Sealed.</h2>
        <p className="display mt-4 text-2xl italic text-muted-foreground">The reveal starts when everyone has guessed.</p>
        <p className="eyebrow animate-breathe mt-12">{done} of {s.players.length} guesses in</p>
        {s.table.isCreator && <button className="link-quiet mt-10" onClick={() => action({ data: { ...seat, action: "REVEAL_NOW" } })}>Reveal now</button>}
      </div>
    );

  if (intro)
    return (
      <div className="flex flex-1 flex-col pt-20">
        <h2 className="wordmark animate-curtain text-4xl leading-tight">The Evening<br />Is Over</h2>
        <p className="display animate-rise mt-12 text-3xl italic" style={{ animationDelay: ".8s" }}>One last question.</p>
        <p className="animate-rise mt-6 text-muted-foreground" style={{ animationDelay: "1.1s" }}>Guess one person who had a secret role. Get it right for +2.</p>
        <div className="mt-auto pt-10"><button className="btn-primary animate-rise" style={{ animationDelay: "1.4s" }} onClick={() => setIntro(false)}>Go on</button></div>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col pt-14">
      <p className="eyebrow">Final guess</p>
      <h2 className="display mt-4 text-4xl">Who do you think had a secret role?</h2>
      <div className="mt-8"><PlayerPick players={s.players} me={s.me.id} value={pick} onChange={setPick} /></div>
      <div className="mt-auto pt-10">
        {error && <p className="mb-4 text-sm seal">{error}</p>}
        <button className="btn-primary" disabled={!pick || busy} onClick={send}>
          {busy ? "Sealing…" : "Lock it in"}
        </button>
      </div>
    </div>
  );
}
