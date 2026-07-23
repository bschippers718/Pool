"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Floating chat composer: hovers over every scrolling page so the pool is
// always one tap away. Collapsed it's a bubble; tapping expands it into a
// real input. Sending stashes the prompt and jumps to /chat, which auto-sends.
// Hidden on chat itself and on public/auth flows where it would be noise.
const HIDDEN_PREFIXES = ["/chat", "/sign-in", "/sign-up", "/join", "/m/", "/onboarding"];

export const PENDING_PROMPT_KEY = "pool:pending-prompt";

export default function ChatFab() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (path === "/" || HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(p))) return null;

  function send() {
    const prompt = text.trim();
    if (!prompt) return;
    try {
      sessionStorage.setItem(PENDING_PROMPT_KEY, prompt);
    } catch {
      // storage unavailable (private mode) — fall through, chat still opens
    }
    setText("");
    setOpen(false);
    router.push("/chat");
  }

  if (!open) {
    return (
      <button
        type="button"
        className="chat-fab"
        aria-label="Ask the pool"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3.5c-4.97 0-9 3.36-9 7.5 0 2.3 1.25 4.36 3.22 5.7-.14 1.1-.6 2.2-1.47 3.3 1.93-.1 3.55-.75 4.75-1.6.8.17 1.63.26 2.5.26 4.97 0 9-3.36 9-7.5s-4.03-7.66-9-7.66Z"
            fill="currentColor"
          />
          <circle cx="8.4" cy="11" r="1.25" fill="var(--volt)" />
          <circle cx="12" cy="11" r="1.25" fill="var(--volt)" />
          <circle cx="15.6" cy="11" r="1.25" fill="var(--volt)" />
        </svg>
      </button>
    );
  }

  return (
    <div className="chat-fab-bar">
      <input
        ref={inputRef}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") send();
          if (e.key === "Escape") setOpen(false);
        }}
        onBlur={() => {
          // Collapse only when nothing is typed; keep drafts alive.
          if (!text.trim()) setOpen(false);
        }}
        placeholder="ask the pool…"
        style={{
          flex: 1, minWidth: 0, background: "none", border: "none", outline: "none",
          color: "var(--paper)", fontSize: 16, fontFamily: "inherit", fontWeight: 500,
        }}
      />
      <button
        type="button"
        aria-label="send"
        // pointerdown so the input's blur doesn't collapse the bar first
        onPointerDown={(e) => {
          e.preventDefault();
          send();
        }}
        style={{
          width: 38, height: 38, borderRadius: "50%", background: "var(--volt)", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
          color: "var(--ink)", fontWeight: 800, cursor: "pointer", flexShrink: 0,
          opacity: text.trim() ? 1 : 0.5,
        }}
      >
        ↑
      </button>
    </div>
  );
}
