// Structured Agenda library. Assignment draws from here per Act.

export type AgendaCategory =
  | "Conversation"
  | "Influence"
  | "Observation"
  | "Social"
  | "Misdirection"
  | "Food"
  | "Seating"
  | "Storytelling"
  | "Group Behaviour"
  | "Suspicion";

export interface Agenda {
  id: string;
  text: string;
  act: number;
  difficulty: 1 | 2;
  category: AgendaCategory;
  minPlayers: number;
  maxPlayers: number;
  requiresPlayer: boolean;
  requiresConfirmation: boolean;
  motive: "ANY" | "OBSERVER" | "DISRUPTOR";
  tag: string; // reuse prevention
}

type Seed = [id: string, act: number, category: AgendaCategory, text: string, tag: string, requiresPlayer?: boolean, minPlayers?: number];

const seeds: Seed[] = [
  // ACT I — The Opening
  ["a1-01", 1, "Conversation", "Make someone say the word “actually” without asking them to.", "say-word", true],
  ["a1-02", 1, "Social", "Cause someone to ask you a question about yourself.", "ask-me", true],
  ["a1-03", 1, "Storytelling", "Ask someone a question that makes them tell a story from a trip.", "trip-story", true],
  ["a1-04", 1, "Food", "Get someone to offer you something from their plate or the table.", "offer-food", true],
  ["a1-05", 1, "Conversation", "Get someone to recommend a country they would move to tomorrow.", "move-country", true],
  ["a1-06", 1, "Social", "Learn the name of someone's first pet without asking about pets directly.", "first-pet", true],
  ["a1-07", 1, "Food", "Get someone to describe the best thing they have eaten this year.", "best-meal", true],
  ["a1-08", 1, "Conversation", "Make someone recommend a restaurant without asking them for a recommendation.", "restaurant", true],
  ["a1-09", 1, "Social", "Get someone to repeat a phrase you used earlier this evening.", "echo", true],
  ["a1-10", 1, "Observation", "Find out what time someone woke up this morning, without asking directly.", "wake-time", true],
  ["a1-11", 1, "Storytelling", "Get someone to tell you about the last thing that made them laugh out loud.", "laugh", true],
  ["a1-12", 1, "Food", "Get someone to admit a food they secretly can't stand.", "hate-food", true],

  // ACT II — The Conversation
  ["a2-01", 2, "Conversation", "Get someone to tell the table about a place they would happily move to tomorrow.", "move-tomorrow", true],
  ["a2-02", 2, "Influence", "Convince the table that a completely normal food is overrated.", "overrated-food"],
  ["a2-03", 2, "Conversation", "Get someone to reveal their most irrational travel opinion.", "travel-opinion", true],
  ["a2-04", 2, "Storytelling", "Get someone to tell the table about a place they would never visit again.", "never-again", true],
  ["a2-05", 2, "Social", "Make someone show you a photo on their phone.", "show-photo", true],
  ["a2-06", 2, "Conversation", "Get the group talking about an unexpectedly specific topic — at least three people must join in.", "specific-topic"],
  ["a2-07", 2, "Influence", "Convince someone that you have a surprisingly strong opinion about something completely trivial.", "trivial-opinion", true],
  ["a2-08", 2, "Storytelling", "Get someone to tell you their most memorable travel disaster.", "travel-disaster", true],
  ["a2-09", 2, "Conversation", "Steer the conversation to childhood ambitions and get two people to share theirs.", "ambitions"],
  ["a2-10", 2, "Food", "Get someone to describe, in detail, the perfect sandwich.", "sandwich", true],
  ["a2-11", 2, "Storytelling", "Get someone to tell the story behind an object they are wearing or carrying.", "object-story", true],
  ["a2-12", 2, "Conversation", "Get someone to name the most overrated film everyone else loves.", "overrated-film", true],

  // ACT III — The Tell
  ["a3-01", 3, "Observation", "Notice who has spoken the least this evening, and get them to lead a conversation for a full minute.", "quiet-lead", true],
  ["a3-02", 3, "Social", "Get two other players to discover something they have in common.", "common-ground", true],
  ["a3-03", 3, "Influence", "Make someone change their answer to a question after hearing someone else's answer.", "change-answer", true],
  ["a3-04", 3, "Suspicion", "Get someone to accuse a different person of acting strangely tonight.", "accuse-other", true],
  ["a3-05", 3, "Observation", "Find out which person at the table each player would call in an emergency — get at least two answers.", "emergency-call"],
  ["a3-06", 3, "Misdirection", "Act as though you are pursuing an obvious fake agenda, so convincingly that someone calls it out.", "fake-agenda"],
  ["a3-07", 3, "Food", "Get someone to swap a bite, a sauce or a side with you.", "food-swap", true],
  ["a3-08", 3, "Storytelling", "Make someone defend a city they have previously criticised.", "defend-city", true],
  ["a3-09", 3, "Social", "Get someone to give you a genuine compliment without fishing for it obviously.", "compliment", true],
  ["a3-10", 3, "Observation", "Learn one thing about someone tonight that nobody else at the table knew.", "secret-fact", true],
  ["a3-11", 3, "Conversation", "Get the table to agree on the single best decade for music.", "best-decade"],

  // ACT IV — The Turn
  ["a4-01", 4, "Group Behaviour", "Introduce a completely unnecessary but plausible rule for the evening and get someone to agree with you.", "fake-rule", true],
  ["a4-02", 4, "Seating", "Get someone to change their seat.", "change-seat", true],
  ["a4-03", 4, "Influence", "Get two people to disagree about something extremely low stakes.", "low-stakes-disagree"],
  ["a4-04", 4, "Group Behaviour", "Get the group to collectively choose between two ridiculous options.", "ridiculous-choice"],
  ["a4-05", 4, "Group Behaviour", "Get the table to debate an extremely low-stakes question for at least two minutes.", "debate"],
  ["a4-06", 4, "Food", "Get the table to order, share or pass around one dish as a group.", "shared-dish"],
  ["a4-07", 4, "Group Behaviour", "Get at least three people to raise a glass at the same time — no drinking required.", "toast"],
  ["a4-08", 4, "Influence", "Convince someone to rank three things you choose — publicly, out loud.", "ranking", true],
  ["a4-09", 4, "Misdirection", "Get someone to believe a harmless, made-up fact about a vegetable for at least a minute. Then come clean.", "veg-fact", true],
  ["a4-10", 4, "Seating", "Get two people to physically lean in to look at something together.", "lean-in"],

  // ACT V — The Endgame
  ["a5-01", 5, "Group Behaviour", "Get the whole table to vote on something. Anything. Make it official.", "table-vote"],
  ["a5-02", 5, "Storytelling", "Get someone to tell a story to the whole table that they've clearly told before.", "classic-story", true],
  ["a5-03", 5, "Influence", "Start a tiny tradition for this dinner and get at least two people to follow it.", "tradition"],
  ["a5-04", 5, "Group Behaviour", "Get the table to plan an imaginary trip together — destination, date and who books.", "imaginary-trip"],
  ["a5-05", 5, "Social", "Get someone to give a short, sincere toast to the evening.", "sincere-toast", true],
  ["a5-06", 5, "Misdirection", "Convince someone that you have been the Observer all night. Whether or not you are.", "claim-observer", true],
  ["a5-07", 5, "Group Behaviour", "Get everyone to answer the same question, one after the other, around the table.", "round-robin"],
  ["a5-08", 5, "Seating", "Get the table to rearrange something — plates, glasses, candles — for a reason you invent.", "rearrange"],
  ["a5-09", 5, "Conversation", "Get the table to name the most memorable moment of the evening so far.", "best-moment"],
  ["a5-10", 5, "Influence", "Get someone to quote something you said earlier tonight back to the table.", "quote-me", true],
];

const observerSeeds: [string, string, string][] = [
  ["ob-01", "Identify two players who seem to be pursuing an Agenda. Mark one of them as your suspect.", "ob-two"],
  ["ob-02", "Find out what another player thinks someone else is secretly doing.", "ob-thinks"],
  ["ob-03", "Get someone to accidentally reveal what they were trying to accomplish.", "ob-reveal"],
  ["ob-04", "Predict which player is most likely to complete their Agenda this Act — and watch them.", "ob-predict"],
  ["ob-05", "Identify the player who seems least suspicious. Keep an eye on them.", "ob-least"],
];

const disruptorSeeds: [string, string, string][] = [
  ["di-01", "Get the table to abandon one topic and move onto another.", "di-topic"],
  ["di-02", "Convince someone to change a harmless plan.", "di-plan"],
  ["di-03", "Cause two people to disagree about something trivial.", "di-disagree"],
  ["di-04", "Redirect the group's attention without making it obvious.", "di-redirect"],
  ["di-05", "Get the group to collectively change what they are currently doing.", "di-change"],
];

export const AGENDAS: Agenda[] = seeds.map(([id, act, category, text, tag, requiresPlayer, minPlayers]) => ({
  id,
  text,
  act,
  difficulty: act >= 4 ? 2 : 1,
  category,
  minPlayers: minPlayers ?? 4,
  maxPlayers: 12,
  requiresPlayer: !!requiresPlayer,
  requiresConfirmation: true,
  motive: "ANY",
  tag,
}));

export const SPECIAL_AGENDAS: Agenda[] = [
  ...observerSeeds.map(([id, text, tag]) => ({
    id, text, tag, act: 0, difficulty: 2 as const, category: "Observation" as const,
    minPlayers: 4, maxPlayers: 12, requiresPlayer: false, requiresConfirmation: true, motive: "OBSERVER" as const,
  })),
  ...disruptorSeeds.map(([id, text, tag]) => ({
    id, text, tag, act: 0, difficulty: 2 as const, category: "Misdirection" as const,
    minPlayers: 4, maxPlayers: 12, requiresPlayer: false, requiresConfirmation: true, motive: "DISRUPTOR" as const,
  })),
];
