// Central game configuration: Acts, Motive balancing, timing and scoring.

export type Motive = "PLAYER" | "OBSERVER" | "DISRUPTOR";

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
export const TOTAL_ACTS = 5;

export const TIMING = {
  actDurationSec: 15 * 60,
  introSec: 45,
  transitionSec: 8,
  lobbyExpiryHours: 12,
};

export const ACTS: Record<number, { numeral: string; title: string; line: string }> = {
  1: { numeral: "I", title: "The Opening", line: "Easy does it. Nobody suspects a thing." },
  2: { numeral: "II", title: "The Conversation", line: "Steer the talk. Gently." },
  3: { numeral: "III", title: "The Tell", line: "Watch closely. Someone is up to something." },
  4: { numeral: "IV", title: "The Turn", line: "Bolder now. The table is warm." },
  5: { numeral: "V", title: "The Endgame", line: "One last chance to pull it off." },
};

/** Acts in which Observers and Disruptors receive their additional objective. */
export const SPECIAL_OBJECTIVE_ACTS = [2, 4];

export function motivesFor(count: number): { observers: number; disruptors: number } {
  if (count <= 5) return { observers: 1, disruptors: 0 };
  if (count <= 8) return { observers: 1, disruptors: 1 };
  return { observers: 1, disruptors: 2 };
}

export const MOTIVE_COPY: Record<Motive, { name: string; lines: string[]; objective?: string }> = {
  PLAYER: {
    name: "Player",
    lines: ["You are simply trying to complete your Agendas", "without making it obvious that you have one."],
  },
  OBSERVER: {
    name: "Observer",
    lines: ["You have your own Agendas.", "But you're also watching the table."],
    objective: "Identify the people who seem to be pursuing hidden Agendas.",
  },
  DISRUPTOR: {
    name: "Disruptor",
    lines: ["You have your own Agendas.", "But you're also quietly steering the evening."],
    objective:
      "Subtly alter the flow of dinner. Keep it harmless and playful — never at anyone's expense.",
  },
};

export const SCORING = {
  agendaComplete: 1,
  difficultAgendaComplete: 2, // difficulty >= 2 (Acts IV & V)
  specialObjectiveComplete: 2, // Observer / Disruptor additional objective
  observerCorrectSuspicion: 1, // per Act suspicion that landed on an Ulterior Motive
  correctFinalAccusation: 2,
};

export function actInfo(n: number) {
  return ACTS[n] ?? { numeral: String(n), title: "", line: "" };
}
