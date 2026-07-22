"use client";

import { SignOutButton } from "@clerk/nextjs";

// Misc-row styled sign-out. Only rendered in live mode (needs ClerkProvider).
export default function SignOutRow() {
  return (
    <SignOutButton redirectUrl="/">
      <button className="card3 misc-row">
        <span className="misc-icon">👋</span>
        <span style={{ textAlign: "left" }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>sign out</span>
          <span style={{ display: "block", fontSize: 11, color: "var(--dim)", fontWeight: 600, marginTop: 1 }}>
            your pool and history stay put
          </span>
        </span>
        <span style={{ color: "#3A4436", fontSize: 16, fontWeight: 700, marginLeft: "auto" }}>›</span>
      </button>
    </SignOutButton>
  );
}
