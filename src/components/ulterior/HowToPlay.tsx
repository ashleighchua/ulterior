import { useState } from "react";
import { SCORING } from "@/lib/game/config";

const PAGES: { eyebrow: string; title: string; body: React.ReactNode }[] = [
  {
    eyebrow: "The idea",
    title: "Secret missions at dinner.",
    body: (
      <>
        <p>Each round, your phone gives you a small secret mission, like:</p>
        <p className="display mt-4 border-l border-claret pl-4 text-2xl">“Get someone to do an impression.”</p>
        <p className="mt-4">Pull it off without anyone noticing. Then phone face down — just talk and eat.</p>
        <p className="mt-4 text-muted-foreground">When the timer ends, a 30-second check-in on your phone: did you do it?</p>
      </>
    ),
  },
  {
    eyebrow: "The twist",
    title: "One of you is the Troublemaker.",
    body: (
      <>
        <p>Their missions are about stirring things up — changing the subject, starting silly debates, getting everyone to do something.</p>
        <p className="mt-4">Watch for it. At each check-in you'll say who you suspect. Nobody sees your answers until the end.</p>
        <p className="mt-4 text-muted-foreground">A big table splitting into a few conversations is fine.</p>
      </>
    ),
  },
  {
    eyebrow: "The end",
    title: "Guess. Then the reveal.",
    body: (
      <>
        <p>After the last round, everyone makes one final guess: <em>who was the Troublemaker?</em> Then gather round one phone for the reveal.</p>
        <ul className="mt-6 divide-y divide-[var(--hairline)]">
          {[
            ["Each mission you pull off", `+${SCORING.agendaComplete}`],
            ["Guess the Troublemaker", `+${SCORING.correctFinalAccusation}`],
            ["Troublemaker: fewer than half guess you", `+${SCORING.troublemakerEscaped}`],
          ].map(([what, pts]) => (
            <li key={what} className="flex items-baseline justify-between gap-4 py-3">
              <span>{what}</span>
              <span className="numerals text-2xl text-brass">{pts}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">Honour system — be honest at check-ins. The reveal shows everything.</p>
      </>
    ),
  },
];

export function HowToPlay({ onDone, doneLabel = "Got it" }: { onDone: () => void; doneLabel?: string }) {
  const [i, setI] = useState(0);
  const page = PAGES[i]!;
  const last = i === PAGES.length - 1;
  return (
    <div className="flex flex-1 flex-col pt-8">
      <div className="flex gap-1.5">
        {PAGES.map((_, j) => <span key={j} className="h-px flex-1" style={{ background: j <= i ? "var(--brass)" : "var(--hairline)" }} />)}
      </div>
      <p className="eyebrow mt-6">How to play · {page.eyebrow}</p>
      <h2 key={`t${i}`} className="display animate-curtain mt-3 text-5xl">{page.title}</h2>
      <div key={`b${i}`} className="animate-rise mt-8 text-lg leading-relaxed">{page.body}</div>
      <div className="mt-auto flex gap-3 pt-10">
        {i > 0 ? <button className="btn-ghost" onClick={() => setI(i - 1)}>Back</button> : <button className="btn-ghost" onClick={onDone}>Skip</button>}
        <button className="btn-primary" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? doneLabel : "Next"}</button>
      </div>
    </div>
  );
}
