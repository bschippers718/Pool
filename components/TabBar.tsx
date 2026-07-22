"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5c-4.97 0-9 3.36-9 7.5 0 2.3 1.25 4.36 3.22 5.7-.14 1.1-.6 2.2-1.47 3.3 1.93-.1 3.55-.75 4.75-1.6.8.17 1.63.26 2.5.26 4.97 0 9-3.36 9-7.5s-4.03-7.66-9-7.66Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.18 : 0}
      />
      {active && <circle cx="12" cy="11" r="2.2" fill="currentColor" />}
    </svg>
  );
}

function StreamIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r={active ? 2.6 : 2} fill="currentColor" />
      <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.7" opacity={active ? 0.75 : 0.55} />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.4" opacity={active ? 0.45 : 0.3} />
    </svg>
  );
}

function MiscIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="12" r="1.9" fill="currentColor" opacity={active ? 1 : 0.6} />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" opacity={active ? 1 : 0.8} />
      <circle cx="18.5" cy="12" r="1.9" fill="currentColor" />
    </svg>
  );
}

const TABS = [
  { href: "/chat", label: "chat", Icon: ChatIcon },
  { href: "/stream", label: "stream", Icon: StreamIcon },
  { href: "/misc", label: "misc", Icon: MiscIcon },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar">
      {TABS.map(({ href, label, Icon }) => {
        const active = path.startsWith(href);
        return (
          <Link key={href} href={href} className={`tab-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
            <span className="t-icon">
              <Icon active={active} />
            </span>
            <span className="t-label">{label}</span>
            <span className="t-pip" />
          </Link>
        );
      })}
    </nav>
  );
}
