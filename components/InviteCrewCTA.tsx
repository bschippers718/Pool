"use client";

import { useState } from "react";

interface InviteCrewCTAProps {
  poolName: string;
  inviteCode: string;
  memberCount: number;
  budgetDollars: number;
  currentShare: number;
}

function shareAt(budgetDollars: number, members: number): number {
  return budgetDollars / members + 1;
}

// The receipt's loudest message after the price: inviting friends is how you
// pay less. Concrete math, one tap to share the real invite link.
export default function InviteCrewCTA({ poolName, inviteCode, memberCount, budgetDollars, currentShare }: InviteCrewCTAProps) {
  const [feedback, setFeedback] = useState<"shared" | "copied" | null>(null);

  // Same "+2 friends" pitch as the misc hub so the math never disagrees.
  const target = memberCount + 2;
  const targetShare = shareAt(budgetDollars, target);

  async function invite() {
    const url = `${window.location.origin}/join/${inviteCode}`;
    const text = `join my AI pool "${poolName}" — we split one budget and everyone pays less 🌊`;

    // Native share sheet (HTTPS only). A dismissed sheet is not a failure.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Join my pool", text, url });
        setFeedback("shared");
      } catch {
        /* dismissed */
      }
      return;
    }

    // Clipboard (also HTTPS-gated on iOS), then a prompt that works anywhere.
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setFeedback("copied");
      return;
    } catch {
      /* fall through */
    }
    window.prompt("copy your invite link:", url);
    setFeedback("copied");
  }

  return (
    <div
      style={{
        marginTop: 14, background: "var(--ink)", borderRadius: 14, padding: "16px 14px 14px",
        textAlign: "center", border: "3px solid var(--ink)",
      }}
    >
      <div className="display" style={{ fontSize: 15, color: "var(--volt)", lineHeight: 1.3 }}>
        invite your crew,<br />pay less. that&apos;s the app.
      </div>
      <div style={{ fontSize: 12, color: "#8B9184", fontWeight: 700, marginTop: 8, lineHeight: 1.5 }}>
        {target} of you = <b style={{ color: "var(--volt)" }}>${targetShare.toFixed(2)}/mo each</b>
        <span style={{ opacity: 0.7 }}> instead of ${currentShare.toFixed(0)}</span>
      </div>
      <button
        className="btn3"
        style={{ marginTop: 12, fontSize: 14, padding: 14 }}
        onClick={invite}
      >
        {feedback ? `invite ${feedback} ✓ — send more` : "invite the crew 🔗"}
      </button>
    </div>
  );
}
