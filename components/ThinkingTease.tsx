"use client";

import { useEffect, useState } from "react";

// Rotating pop-trivia shown while the pool is thinking (before the first
// token streams in). Original one-liners only — no song lyrics (copyright).
const TEASES: string[] = [
  "trivia: which artist re-recorded four albums just to own them? 🐍✨",
  "quick — is it gif or jif? (wrong answers only)",
  "trivia: what year did minecraft drop? hint: older than tiktok ⛏️",
  "the office or parks & rec — you have 3 seconds ⏱️",
  "trivia: which country wins eurovision the most? 🎤",
  "hot take loading… pineapple on pizza is valid 🍍",
  "trivia: what does the E in eminem NOT stand for? 🤔",
  "pop quiz: how many rings does saturn have? more than your group chat has streaks 🪐",
  "trivia: bad bunny sings in which language? (free points) 🐰",
  "real ones know: the mario bros are from brooklyn 🍄",
  "trivia: which app was literally called 'musical.ly' first? 🎵",
  "counting this as cardio: scrolling 4 hrs a day 📱",
  "trivia: what's the best-selling video game ever? (it's blocks) 🧱",
  "you've been rickrolled at least once. statistically. 🕺",
  "trivia: beyoncé has the most grammys ever — how many? 🏆",
  "npc behavior: reading the terms & conditions 📜",
  "trivia: what color is the '67 impala from supernatural? 🚗",
  "fun fact: venus spins backwards. planet of the drama ♀",
  "trivia: fortnite's map has been nuked how many times? 💥",
  "this answer is being split like a netflix password rn 🌊",
  "trivia: drake started on which teen drama? 🇨🇦",
  "octopuses have three hearts. more than your ex 🐙",
  "trivia: what does 'sus' actually come from? (among us predates you thinking it) 🚀",
  "manifesting a good answer rn 🧿",
];

// Module-level cursor: each mount starts at a different tease without calling
// impure functions during render.
let teaseCursor = Math.floor(Math.random() * TEASES.length);
function nextTeaseStart(): number {
  teaseCursor = (teaseCursor + 7) % TEASES.length;
  return teaseCursor;
}

export default function ThinkingTease() {
  const [idx, setIdx] = useState(nextTeaseStart);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % TEASES.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div role="status" aria-label="the pool is thinking" style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 22 }}>
      <span className="tease-dots" aria-hidden="true">
        <span /><span /><span />
      </span>
      <span key={idx} className="tease-line" style={{ fontSize: 12.5, color: "var(--dim)", fontWeight: 600, lineHeight: 1.45 }}>
        {TEASES[idx]}
      </span>
    </div>
  );
}
