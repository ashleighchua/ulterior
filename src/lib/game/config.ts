// Central game configuration: rounds, roles, timing and scoring.
// Note: the database and server still use the original internal names
// (Act, Motive, Agenda, OBSERVER/DISRUPTOR/DECOY). Players only ever see the words below:
// Round, Role, Mission, Detective, Troublemaker, Decoy.

export type Motive = "PLAYER" | "OBSERVER" | "DISRUPTOR" | "DECOY";

/**
 * The roles the table is trying to find. The Decoy is deliberately NOT one of them:
 * they only pretend to be, so guessing them scores nothing (and scores for the Decoy).
 */
export const isSecretRole = (m: Motive | undefined) => m === "OBSERVER" || m === "DISRUPTOR";

export type GameStatus =
  | "LOBBY"
  | "ACT_INTRO"
  | "ACT_ACTIVE"
  | "ACT_SUBMISSION"
  | "ACT_TRANSITION"
  | "FINAL_ACCUSATION"
  | "REVEAL"
  | "FINISHED";

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;
/** Upper bound on rounds in any game length (used for validation). */
export const MAX_ROUNDS = 5;

export type GameLength = "QUICK" | "FULL";

/**
 * Each round draws its missions from one of the five mission pools (1 = gentlest, 5 = boldest).
 * A Quick game skips the middle pools so it still escalates.
 */
export const LENGTHS: Record<GameLength, { label: string; pools: number[]; bonusRounds: number[] }> = {
  QUICK: { label: "Quick", pools: [1, 3, 5], bonusRounds: [2] },
  FULL: { label: "Full", pools: [1, 2, 3, 4, 5], bonusRounds: [2, 4] },
};

export function lengthFor(rounds: number): GameLength {
  return rounds <= LENGTHS.QUICK.pools.length ? "QUICK" : "FULL";
}

export const TIMING = {
  introSec: 45,
  transitionSec: 8,
  lobbyExpiryHours: 12,
  /** How much the host's "+5 min" button adds. */
  extendSec: 5 * 60,
};

/**
 * Bigger tables need longer rounds so everyone gets airtime:
 * 4 players → 10 min, 8 → 14 min, 12 → 18 min.
 */
export function roundMinutes(players: number) {
  return Math.min(18, Math.max(10, 6 + players));
}

/** Rough whole-evening estimate for the lobby: rounds + check-ins + the ending. */
export function estimateMinutes(players: number, length: GameLength) {
  const rounds = LENGTHS[length].pools.length;
  return rounds * (roundMinutes(players) + 2) + 10;
}

const POOLS: Record<number, { title: string; line: string }> = {
  1: { title: "The Opening", line: "Easy does it. Nobody suspects a thing." },
  2: { title: "The Conversation", line: "Steer the talk. Gently." },
  3: { title: "The Tell", line: "Watch closely. Someone is up to something." },
  4: { title: "The Turn", line: "Bolder now. The table is warm." },
  5: { title: "The Endgame", line: "One last chance to pull it off." },
};

export function roundInfo(round: number, totalRounds: number) {
  const pool = LENGTHS[lengthFor(totalRounds)].pools[round - 1] ?? round;
  return { title: POOLS[pool]?.title ?? "", line: POOLS[pool]?.line ?? "" };
}

export function motivesFor(count: number): { observers: number; disruptors: number; decoys: number } {
  if (count <= 5) return { observers: 1, disruptors: 1, decoys: 0 };
  if (count <= 8) return { observers: 1, disruptors: 1, decoys: 1 };
  return { observers: 1, disruptors: 2, decoys: 1 };
}

export const SCORING = {
  agendaComplete: 1,
  difficultAgendaComplete: 2, // bold missions (the later rounds)
  specialObjectiveComplete: 2, // Detective / Troublemaker / Decoy bonus mission
  observerCorrectSuspicion: 1, // per round the Detective's suspect had a secret role
  correctFinalAccusation: 2,
  decoySuspectedRound: 1, // per round at least one person suspected the Decoy
  decoyFinalGuess: 1, // per person whose final guess was the Decoy
};

export const MOTIVE_COPY: Record<Motive, { name: string; lines: string[]; objective?: string; scoring: string[] }> = {
  PLAYER: {
    name: "Guest",
    lines: ["Complete your missions", "without anyone noticing you have one."],
    scoring: [
      `+${SCORING.agendaComplete} for each mission (+${SCORING.difficultAgendaComplete} for bold ones)`,
      `+${SCORING.correctFinalAccusation} if your final guess has a secret role`,
    ],
  },
  OBSERVER: {
    name: "Detective",
    lines: ["You have missions too.", "But you're also watching the table."],
    objective: "Each round, work out who's playing a secret role.",
    scoring: [
      `+${SCORING.agendaComplete} for each mission (+${SCORING.difficultAgendaComplete} for bold ones)`,
      `+${SCORING.specialObjectiveComplete} for each bonus mission`,
      `+${SCORING.observerCorrectSuspicion} each round your suspect has a secret role`,
      `+${SCORING.correctFinalAccusation} if your final guess has a secret role`,
    ],
  },
  DISRUPTOR: {
    name: "Troublemaker",
    lines: ["You have missions too.", "But you're also quietly steering the evening."],
    objective: "Nudge the flow of dinner. Keep it playful — never at anyone's expense.",
    scoring: [
      `+${SCORING.agendaComplete} for each mission (+${SCORING.difficultAgendaComplete} for bold ones)`,
      `+${SCORING.specialObjectiveComplete} for each bonus mission`,
      `+${SCORING.correctFinalAccusation} if your final guess has a secret role`,
    ],
  },
  DECOY: {
    name: "Decoy",
    lines: ["You have missions too.", "But you want everyone to suspect you."],
    objective: "Act just suspicious enough that people think you have a secret role. You don't — and anyone who guesses you gets nothing.",
    scoring: [
      `+${SCORING.agendaComplete} for each mission (+${SCORING.difficultAgendaComplete} for bold ones)`,
      `+${SCORING.specialObjectiveComplete} for each bonus mission`,
      `+${SCORING.decoySuspectedRound} each round someone suspects you`,
      `+${SCORING.decoyFinalGuess} for every final guess on you`,
      `+${SCORING.correctFinalAccusation} if your final guess has a secret role`,
    ],
  },
};
