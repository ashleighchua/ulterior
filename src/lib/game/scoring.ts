import { SCORING, type Motive } from "./config";

export interface RevealAgenda {
  playerId: string;
  act: number;
  isSpecial: boolean;
  text: string;
  difficulty: number;
  result: string | null;
  involvedPlayerId: string | null;
}
export interface RevealData {
  players: { id: string; name: string; emoji: string | null; motive: Motive }[];
  agendas: RevealAgenda[];
  suspicions: { playerId: string; act: number; suspectId: string | null }[];
  accusations: { playerId: string; accusedId: string | null }[];
}

export interface VerdictRow {
  playerId: string;
  score: number;
  completed: number;
  specialCompleted: number;
  correctReads: number;
  suspectedBy: number;
  involvedIn: number;
  accusationCorrect: boolean;
}

export function computeVerdict(d: RevealData) {
  const special = new Set(d.players.filter((p) => p.motive !== "PLAYER").map((p) => p.id));
  const motiveOf = new Map(d.players.map((p) => [p.id, p.motive]));
  const rows: VerdictRow[] = d.players.map((p) => {
    let score = 0;
    let completed = 0;
    let specialCompleted = 0;
    for (const a of d.agendas.filter((a) => a.playerId === p.id && a.result === "COMPLETE")) {
      if (a.isSpecial) {
        specialCompleted++;
        score += SCORING.specialObjectiveComplete;
      } else {
        completed++;
        score += a.difficulty >= 2 ? SCORING.difficultAgendaComplete : SCORING.agendaComplete;
      }
    }
    const mySusp = d.suspicions.filter((s) => s.playerId === p.id && s.suspectId && special.has(s.suspectId));
    let correctReads = mySusp.length;
    if (motiveOf.get(p.id) === "OBSERVER") score += mySusp.length * SCORING.observerCorrectSuspicion;
    const acc = d.accusations.find((a) => a.playerId === p.id);
    const accusationCorrect = !!(acc?.accusedId && special.has(acc.accusedId));
    if (accusationCorrect) {
      score += SCORING.correctFinalAccusation;
      correctReads++;
    }
    return {
      playerId: p.id,
      score,
      completed,
      specialCompleted,
      correctReads,
      suspectedBy: d.suspicions.filter((s) => s.suspectId === p.id).length,
      involvedIn: d.agendas.filter((a) => a.involvedPlayerId === p.id && a.result === "COMPLETE").length,
      accusationCorrect,
    };
  });
  rows.sort((a, b) => b.score - a.score);

  const top = (key: keyof VerdictRow, filter?: (r: VerdictRow) => boolean) => {
    const pool = rows.filter((r) => (filter ? filter(r) : true) && (r[key] as number) > 0);
    if (!pool.length) return null;
    const max = Math.max(...pool.map((r) => r[key] as number));
    return pool.filter((r) => r[key] === max).map((r) => r.playerId);
  };
  const titles = [
    { title: "Most Convincing", why: "Highest score of the evening", ids: top("score") },
    { title: "Master of the Agenda", why: "Most Agendas completed", ids: top("completed") },
    { title: "Human Lie Detector", why: "Most suspicions landed on an Ulterior Motive", ids: top("correctReads") },
    { title: "Best Distraction", why: "Most disruption objectives pulled off", ids: top("specialCompleted", (r) => motiveOf.get(r.playerId) === "DISRUPTOR") },
    { title: "Most Suspicious", why: "Suspected most often by the table", ids: top("suspectedBy") },
    { title: "Chaos Agent", why: "Unwittingly involved in the most Agendas", ids: top("involvedIn") },
  ].filter((t) => t.ids);
  return { rows, titles: titles as { title: string; why: string; ids: string[] }[] };
}
