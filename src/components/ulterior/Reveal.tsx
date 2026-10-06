import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { getReveal } from "@/lib/game.functions";
import { isSecretRole, MOTIVE_COPY, type Motive } from "@/lib/game/config";
import type { Seat } from "@/lib/session";
import { Avatar } from "./Shell";

const STAGES = ["The Roles", "The Missions", "The Suspicions", "Final Guesses", "The Scores"] as const;

const roleColor = (m: Motive) => (isSecretRole(m) ? "seal" : m === "DECOY" ? "text-brass" : "text-muted-foreground");

export function Reveal({ seat }: { seat: Seat }) {
  const fetchReveal = useServerFn(getReveal);
  const q = useQuery({ queryKey: ["reveal", seat.code], queryFn: () => fetchReveal({ data: seat }) });
  const [stage, setStage] = useState(-1);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [placesShown, setPlacesShown] = useState(0);

  if (!q.data) return <div className="flex flex-1 items-center justify-center"><p className="eyebrow animate-breathe">Drawing the curtain</p></div>;
  if (!q.data.ok) return <p className="mt-20 text-center text-muted-foreground">The reveal isn't ready yet.</p>;
  const { reveal, verdict } = q.data;
  const P = new Map(reveal.players.map((p) => [p.id, p]));
  const name = (id: string | null) => (id ? P.get(id)?.name ?? "Someone" : "nobody");
  const guessesOn = (id: string) => reveal.accusations.filter((a) => a.accusedId === id).length;

  if (stage < 0)
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="eyebrow animate-rise">Everyone has guessed</p>
        <h2 className="wordmark animate-curtain mt-8 text-5xl">The Reveal</h2>
        <p className="display animate-rise mt-8 text-2xl italic text-muted-foreground" style={{ animationDelay: ".8s" }}>Gather round one phone.</p>
        <p className="animate-rise mt-4 text-sm text-muted-foreground" style={{ animationDelay: "1s" }}>Pick one person to read it out. Everyone else: no peeking at your own phone.</p>
        <button className="btn-primary animate-rise mt-16" style={{ animationDelay: "1.2s" }} onClick={() => setStage(0)}>Begin</button>
      </div>
    );

  // Scores count down from last place to the winner.
  const ranked = verdict.rows;
  const allPlaced = placesShown >= ranked.length;
  const topScore = ranked[0]?.score ?? 0;
  const winners = ranked.filter((r) => r.score === topScore).map((r) => P.get(r.playerId)?.name).join(" & ");
  const nextIsWinner = placesShown === ranked.length - 1 || ranked[ranked.length - 1 - placesShown]?.score === topScore;

  return (
    <div className="flex flex-1 flex-col pt-8">
      <div className="flex gap-1.5">
        {STAGES.map((_, i) => <span key={i} className="h-px flex-1" style={{ background: i <= stage ? "var(--brass)" : "var(--hairline)" }} />)}
      </div>
      <p className="eyebrow mt-6">{stage + 1} / {STAGES.length}</p>
      <h2 key={stage} className="display animate-curtain mt-2 text-5xl">{STAGES[stage]}</h2>

      <div key={`b${stage}`} className="mt-8 flex-1">
        {stage === 0 && (
          <div>
            <p className="text-sm text-muted-foreground">Before each tap, ask the table: <em>what do you think they were?</em></p>
            <ul className="mt-4 space-y-1">
              {reveal.players.map((p) => {
                const open = flipped.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={open}
                      onClick={() => setFlipped(new Set(flipped).add(p.id))}
                      className="flex w-full items-center justify-between border-b border-hairline py-4 text-left"
                    >
                      <span className="flex items-center gap-3"><Avatar emoji={p.emoji} name={p.name} size="sm" /><span className="display text-2xl">{p.name}</span></span>
                      {open ? (
                        <span className="animate-curtain text-right">
                          <span className={`display block text-2xl ${roleColor(p.motive)}`}>{MOTIVE_COPY[p.motive].name}</span>
                          <span className="text-[0.65rem] tracking-[0.2em] text-muted-foreground">{guessesOn(p.id)} GUESSED THEM</span>
                        </span>
                      ) : (
                        <span className="animate-breathe rounded-sm border border-dashed border-hairline px-3 py-2 text-[0.65rem] tracking-[0.2em] text-muted-foreground">TAP TO REVEAL</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {flipped.size < reveal.players.length && (
              <button className="link-quiet mt-6" onClick={() => setFlipped(new Set(reveal.players.map((p) => p.id)))}>Reveal everyone</button>
            )}
          </div>
        )}

        {stage === 1 && (
          <div className="space-y-8">
            {reveal.players.map((p, i) => (
              <div key={p.id} className="animate-rise" style={{ animationDelay: `${i * 150}ms` }}>
                <p className="flex items-center gap-3"><Avatar emoji={p.emoji} name={p.name} size="sm" /><span className="display text-2xl">{p.name}</span></p>
                <ul className="mt-3 space-y-2">
                  {reveal.agendas.filter((a) => a.playerId === p.id).map((a, j) => (
                    <li key={j} className="flex gap-3 text-sm">
                      <span className="numerals w-6 shrink-0 text-muted-foreground">R{a.act}</span>
                      <span className="flex-1">{a.isSpecial && <span className="seal">Bonus · </span>}{a.text}</span>
                      <span className={`shrink-0 text-[0.65rem] tracking-[0.2em] ${a.result === "COMPLETE" ? "text-brass" : "text-muted-foreground"}`}>
                        {a.result === "COMPLETE" ? "✓ DID IT" : a.result === "FAILED" ? "× MISSED" : "— NO ANSWER"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {stage === 2 && (
          <div className="space-y-6">
            <p className="display text-2xl italic text-muted-foreground">Who suspected whom, round by round?</p>
            {reveal.players.map((p, i) => {
              const mine = reveal.suspicions.filter((s) => s.playerId === p.id);
              return (
                <div key={p.id} className="animate-rise border-b border-hairline pb-4" style={{ animationDelay: `${i * 150}ms` }}>
                  <p className="display text-xl">{p.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {mine.length === 0 && <span className="text-sm text-muted-foreground">suspected nobody</span>}
                    {mine.map((s) => (
                      <span key={s.act} className="rounded-sm border border-hairline px-2 py-1 text-xs">
                        <span className="numerals mr-1 text-muted-foreground">R{s.act}</span>
                        <span className={s.suspectId ? roleColor(P.get(s.suspectId)?.motive ?? "PLAYER") : ""}>{name(s.suspectId)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {stage === 3 && (
          <ul className="space-y-1">
            {reveal.players.map((p, i) => {
              const a = reveal.accusations.find((x) => x.playerId === p.id);
              const target = a?.accusedId ? P.get(a.accusedId)?.motive : undefined;
              const verdictText = !a ? "" : isSecretRole(target) ? "✓ CORRECT" : target === "DECOY" ? "× FOOLED BY THE DECOY" : "× WRONG";
              return (
                <li key={p.id} className="animate-rise flex items-center justify-between gap-3 border-b border-hairline py-4" style={{ animationDelay: `${300 + i * 400}ms` }}>
                  <span className="text-sm">{p.name} <span className="text-muted-foreground">guessed</span> <span className="display text-xl">{a ? name(a.accusedId) : "—"}</span></span>
                  <span className={`shrink-0 text-right text-[0.65rem] tracking-[0.2em] ${isSecretRole(target) ? "text-brass" : "text-muted-foreground"}`}>{verdictText}</span>
                </li>
              );
            })}
          </ul>
        )}

        {stage === 4 && (
          <div>
            {allPlaced && (
              <div className="animate-curtain mb-10 text-center">
                <p className="eyebrow">Tonight's winner</p>
                <p className="display mt-3 text-6xl text-brass">{winners}</p>
              </div>
            )}
            <ol>
              {ranked.map((r, i) => {
                const visible = i >= ranked.length - placesShown;
                return (
                  <li key={r.playerId} className={`flex items-center justify-between border-b border-hairline py-3 ${visible ? "animate-rise" : "opacity-20"}`}>
                    <span className="flex items-center gap-3">
                      <span className="numerals w-5 text-muted-foreground">{i + 1}</span>
                      <span className="display text-xl">{visible ? P.get(r.playerId)?.name : "· · ·"}</span>
                    </span>
                    <span className="numerals text-2xl">{visible ? r.score : ""}</span>
                  </li>
                );
              })}
            </ol>
            {allPlaced && (
              <div className="mt-10 space-y-4">
                <p className="eyebrow">Awards</p>
                {verdict.titles.map((t, i) => (
                  <div key={t.title} className="animate-rise card-quiet p-4" style={{ animationDelay: `${i * 250}ms` }}>
                    <p className="eyebrow">{t.title}</p>
                    <p className="display mt-2 text-3xl">{t.ids.map((id) => P.get(id)?.name).join(" & ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.why}</p>
                  </div>
                ))}
                <p className="wordmark pt-6 text-center text-lg text-muted-foreground">The Evening Is Over</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-10 flex gap-3">
        {stage > 0 && <button className="btn-ghost" onClick={() => setStage(stage - 1)}>Back</button>}
        {stage < STAGES.length - 1 ? (
          <button className="btn-primary" onClick={() => setStage(stage + 1)}>Next</button>
        ) : !allPlaced ? (
          <button className="btn-primary" onClick={() => setPlacesShown(nextIsWinner ? ranked.length : placesShown + 1)}>
            {nextIsWinner ? "Reveal the winner" : placesShown === 0 ? "Start from last place" : "Next place"}
          </button>
        ) : (
          <Link to="/" className="btn-primary">New evening</Link>
        )}
      </div>
    </div>
  );
}
