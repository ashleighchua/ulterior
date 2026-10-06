import { useState } from "react";
import { MOTIVE_COPY, SCORING } from "@/lib/game/config";

const PAGES: { eyebrow: string; title: string; body: React.ReactNode }[] = [
  {
    eyebrow: "The idea",
    title: "Secret missions at dinner.",
    body: (
      <>
        <p>Each round, your phone gives you a small secret mission, like:</p>
        <p className="display mt-4 border-l border-claret pl-4 text-2xl">“Get someone to show you a photo on their phone.”</p>
        <p className="mt-4">Pull it off without anyone noticing. Then put your phone face down and enjoy dinner.</p>
      </>
    ),
  },
  {
    eyebrow: "The twist",
    title: "Some people have a secret role.",
    body: (
      <>
        <p>Most people are <span className="display text-xl">{MOTIVE_COPY.PLAYER.name}s</span>. A few get a secret role on top of their missions:</p>
        <ul className="mt-4 space-y-3">
          <li><span className="display seal text-xl">{MOTIVE_COPY.OBSERVER.name}</span> — watches the table and tries to spot the other secret roles.</li>
          <li><span className="display seal text-xl">{MOTIVE_COPY.DISRUPTOR.name}</span> — quietly steers the conversation. Only at tables of 6 or more.</li>
        </ul>
        <p className="mt-4">Nobody knows who has a secret role. That's what you're guessing.</p>
      </>
    ),
  },
  {
    eyebrow: "Each round",
    title: "Read. Play. Check in.",
    body: (
      <ol className="space-y-4">
        <li><span className="numerals mr-3 text-muted-foreground">1</span>Read your mission. Phone face down.</li>
        <li><span className="numerals mr-3 text-muted-foreground">2</span>Talk, eat, and try to pull it off. A big table will split into a few conversations — that's fine.</li>
        <li><span className="numerals mr-3 text-muted-foreground">3</span>When the timer ends, a 30-second check-in: <em>Did you do it?</em> and <em>Who do you think has a secret role?</em> Answers stay hidden until the end.</li>
      </ol>
    ),
  },
  {
    eyebrow: "The end",
    title: "One guess. Then the reveal.",
    body: (
      <>
        <p>After the last round (3 rounds in a Quick game, 5 in a Full one), everyone makes one final guess: <em>who had a secret role?</em></p>
        <p className="mt-4">Then gather round one phone for the reveal: everyone's missions, every secret role, the scores and a few awards.</p>
      </>
    ),
  },
  {
    eyebrow: "Scoring",
    title: "How to win.",
    body: (
      <ul className="divide-y divide-[var(--hairline)]">
        {[
          ["Complete a mission", `+${SCORING.agendaComplete}`],
          ["Complete a bold mission (final rounds)", `+${SCORING.difficultAgendaComplete}`],
          ["Final guess has a secret role", `+${SCORING.correctFinalAccusation}`],
          [`Bonus mission (${MOTIVE_COPY.OBSERVER.name} or ${MOTIVE_COPY.DISRUPTOR.name})`, `+${SCORING.specialObjectiveComplete}`],
          [`${MOTIVE_COPY.OBSERVER.name}: suspect has a secret role (per round)`, `+${SCORING.observerCorrectSuspicion}`],
        ].map(([what, pts]) => (
          <li key={what} className="flex items-baseline justify-between gap-4 py-3">
            <span>{what}</span>
            <span className="numerals text-2xl text-brass">{pts}</span>
          </li>
        ))}
        <li className="pt-4 text-sm text-muted-foreground">Missions are on the honour system. Report truthfully — the reveal shows everything.</li>
      </ul>
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
