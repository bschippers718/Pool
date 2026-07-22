import { ModelId } from "./pricing";

export interface Member {
  id: string;
  name: string;
  color: string;
  share: number; // fraction of pool usage this week
  tag?: "benched" | "carrying" | "ghost";
  requests: number;
}

export const MEMBERS: Member[] = [
  { id: "matt", name: "matt", color: "#3DFF88", share: 0.38, tag: "benched", requests: 612 },
  { id: "jess", name: "jess", color: "#B7A6FF", share: 0.19, tag: "carrying", requests: 298 },
  { id: "sam", name: "sam", color: "#FFC24D", share: 0.15, requests: 241 },
  { id: "kira", name: "kira", color: "#8FD6FF", share: 0.13, requests: 204 },
  { id: "dev", name: "dev", color: "#FF9AB5", share: 0.1, requests: 158 },
  { id: "ava", name: "ava", color: "#FFE98A", share: 0.05, tag: "ghost", requests: 79 },
];

export const ME = MEMBERS[1]; // jess

export interface StreamPost {
  id: string;
  memberId: string;
  kind: "school" | "art" | "wisdom" | "take";
  time: string;
  title: string;
  body: string[];
  highlight?: string;
  note?: string;
  reacts: Record<string, number>;
  reach: string;
  model: ModelId;
}

export const STREAM: StreamPost[] = [
  {
    id: "p1",
    memberId: "sam",
    kind: "school",
    time: "1h",
    title: "solve 3x² − 7x + 2 = 0, show steps",
    body: ["factor: (3x − 1)(x − 2) = 0", "set each part to zero", "3x − 1 = 0 → x = ⅓ · x − 2 = 0 → x = 2"],
    highlight: "x = ⅓ or x = 2",
    note: "🧑‍🏫 taught, not done — steps shown so you learn it",
    reacts: { "🙏": 4, "🔥": 2 },
    reach: "shared out · 340 views",
    model: "cheap",
  },
  {
    id: "p2",
    memberId: "kira",
    kind: "art",
    time: "3h",
    title: "holographic goose sticker w/ tiny sunglasses",
    body: [],
    note: "🎨 image gen · 4 variants · 1 pool credit",
    reacts: { "💀": 6, "🫡": 2 },
    reach: "shared out · 2.1k views",
    model: "image",
  },
  {
    id: "p3",
    memberId: "jess",
    kind: "wisdom",
    time: "5h",
    title: "is it bad to work out 6 days a week?",
    body: ["not if you rotate intensity — alternate hard/easy days, keep one full rest day, and watch sleep + resting heart rate for early burnout signs."],
    highlight: "rotate intensity",
    note: "⚕️ general info, not medical advice — see a pro for your specifics",
    reacts: { "🫡": 5, "💪": 3 },
    reach: "squad only",
    model: "smart",
  },
];

// Demo canned responses so the app works with zero API keys
export const DEMO_REPLIES: Record<ModelId, string[]> = {
  cheap: [
    "here are three directions:\n\n1. deadpan: \"shot on film because my camera roll has trust issues\"\n2. wistful: \"the coast develops slower than i do\"\n3. chaotic: \"36 exposures and not one of them is the sunset\"",
    "short version: yes, but with an asterisk.\n\nlong version: the asterisk is doing most of the work in that sentence. want me to unpack it?",
    "breaking this down:\n\n• what you're actually asking\n• what the trade-off is\n• what i'd do in your spot\n\nthe honest answer is option 2, and here's why…",
  ],
  smart: [
    "thoughtful take on that:\n\nit depends less on the thing itself and more on the cadence. alternate hard and easy days, keep one full rest day, and let sleep be the tiebreaker.",
    "there are two schools of thought here, and honestly the second one is right about 80% of the time. the trick is knowing which 80% you're in…",
  ],
  image: ["[image generated: 4 variants ready]"],
};
