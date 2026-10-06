import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { getReveal } from "@/lib/game.functions";
import { MOTIVE_COPY } from "@/lib/game/config";
import type { Seat } from "@/lib/session";
import { Avatar } from "./Shell";

const STAGES = ["The Roles", "The Missions", "The Suspicions", "Final Guesses", "The Scores"] as const;

export function Reveal({ seat }: { seat: Seat }) {
  const fetchReveal = useServerFn(getReveal);
  const q = useQuery({ queryKey: ["reveal", seat.code], queryFn: () => fetchReveal({ data: seat }) });
  const [stage, setStage] = useState(-1);

  if (!q.data) return <div className="flex flex-1 items-center justify-center"><p className="eyebrow animate-breathe">Drawing the curtain</p></div>;
  if (!q.data.ok) return <p className="mt-20 text-center text-muted-foreground">The Reveal isn't ready yet.</p>;
  const { reveal, verdict } = q.data;
  const P = new Map(reveal.players.map((p) => [p.id, p]));
  const name = (id: string | null) => (id ? P.get(id)?.name ?? "Someone" : "nobody");

  if (stage < 0)
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="eyebrow animate-rise">Everyone has chosen</p>
        <h2 className="wordmark animate-curtain mt-8 text-5xl">The Reveal</h2>
        <p className="display animate-rise mt-8 text-2xl italic text-muted-foreground" style={{ animationDelay: ".8s" }}>Gather round one phone.</p>
        <button className="btn-primary animate-rise mt-16" style={{ animationDelay: "1.2s" }} onClick={() => setStage(0)}>Begin</button>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col pt-8">
      <div className="flex gap-1.5">
        {STAGES.map((_, i) => <span key={i} className="h-px flex-1" style={{ background: i <= stage ? "var(--brass)" : "var(--hairline)" }} />)}
      </div>
      <p className="eyebrow mt-6">{stage + 1} / {STAGES.length}</p>
      <h2 key={stage} className="display animate-curtain mt-2 text-5xl">{STAGES[stage]}</h2>

      <div key={`b${stage}`} className="mt-8 flex-1">
        {stage === 0 && (
          <ul className="space-y-1">
            {reveal.players.map((p, i) => (
              <li key={p.id} className="animate-rise flex items-center justify-between border-b border-hairline py-4" style={{ animationDelay: `${300 + i * 450}ms` }}>
                <span className="flex items-center gap-3"><Avatar emoji={p.emoji} name={p.name} size="sm" /><span className="eyebrow !text-foreground !text-xs">{p.name}</span></span>
                <span className={`display text-2xl ${p.motive !== "PLAYER" ? "seal" : "text-muted-foreground"}`}>{MOTIVE_COPY[p.motive].name}</span>
              </li>
            ))}
          </ul>
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
                        {a.result === "COMPLETE" ? "✓ COMPLETE" : a.result === "FAILED" ? "× FAILED" : "— UNREPORTED"}
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
            <p className="display text-2xl italic text-muted-foreground">Who suspected whom?</p>
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
                        <span className={s.suspectId && P.get(s.suspectId)?.motive !== "PLAYER" ? "seal" : ""}>{name(s.suspectId)}</span>
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
              const correct = !!(a?.accusedId && P.get(a.accusedId)?.motive !== "PLAYER");
              return (
                <li key={p.id} className="animate-rise flex items-center justify-between border-b border-hairline py-4" style={{ animationDelay: `${300 + i * 400}ms` }}>
                  <span className="text-sm">{p.name} <span className="text-muted-foreground">guessed</span> <span className="display text-xl">{a ? name(a.accusedId) : "—"}</span></span>
                  <span className={`text-[0.65rem] tracking-[0.2em] ${correct ? "text-brass" : "text-muted-foreground"}`}>{a ? (correct ? "✓ CORRECT" : "× WRONG") : ""}</span>
                </li>
              );
            })}
          </ul>
        )}

        {stage === 4 && (
          <div>
            <div className="space-y-4">
              {verdict.titles.map((t, i) => (
                <div key={t.title} className="animate-rise card-quiet p-4" style={{ animationDelay: `${i * 250}ms` }}>
                  <p className="eyebrow">{t.title}</p>
                  <p className={`display mt-2 text-3xl ${i === 0 ? "text-brass" : ""}`}>{t.ids.map((id) => P.get(id)?.name).join(" & ")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.why}</p>
                </div>
              ))}
            </div>
            <p className="eyebrow mt-10">Final standings</p>
            <ol className="mt-3">
              {verdict.rows.map((r, i) => (
                <li key={r.playerId} className="flex items-center justify-between border-b border-hairline py-3">
                  <span className="flex items-center gap-3"><span className="numerals w-5 text-muted-foreground">{i + 1}</span><span className="display text-xl">{P.get(r.playerId)?.name}</span></span>
                  <span className="numerals text-2xl">{r.score}</span>
                </li>
              ))}
            </ol>
            <p className="wordmark mt-12 text-center text-lg text-muted-foreground">The Evening Is Over</p>
          </div>
        )}
      </div>

      <div className="mt-10 flex gap-3">
        {stage > 0 && <button className="btn-ghost" onClick={() => setStage(stage - 1)}>Back</button>}
        {stage < STAGES.length - 1 ? (
          <button className="btn-primary" onClick={() => setStage(stage + 1)}>Next</button>
        ) : (
          <Link to="/" className="btn-primary">New evening</Link>
        )}
      </div>
    </div>
  );
}
