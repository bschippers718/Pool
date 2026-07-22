"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Floating chat bubble: one tap back to chat from anywhere in the app.
// Hidden on chat itself and on public/auth flows where it would be noise.
const HIDDEN_PREFIXES = ["/chat", "/sign-in", "/sign-up", "/join", "/m/", "/onboarding"];

export default function ChatFab() {
  const path = usePathname();
  if (path === "/" || HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(p))) return null;

  return (
    <Link href="/chat#compose" className="chat-fab" aria-label="Open chat">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5c-4.97 0-9 3.36-9 7.5 0 2.3 1.25 4.36 3.22 5.7-.14 1.1-.6 2.2-1.47 3.3 1.93-.1 3.55-.75 4.75-1.6.8.17 1.63.26 2.5.26 4.97 0 9-3.36 9-7.5s-4.03-7.66-9-7.66Z"
          fill="currentColor"
        />
        <circle cx="8.4" cy="11" r="1.25" fill="var(--volt)" />
        <circle cx="12" cy="11" r="1.25" fill="var(--volt)" />
        <circle cx="15.6" cy="11" r="1.25" fill="var(--volt)" />
      </svg>
    </Link>
  );
}
