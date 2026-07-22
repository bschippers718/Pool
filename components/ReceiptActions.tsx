"use client";

import { useState } from "react";

interface ReceiptActionsProps {
  shareText?: string;
  footnote?: string;
}

export default function ReceiptActions({ shareText, footnote }: ReceiptActionsProps) {
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  async function shareReceipt() {
    const data = {
      title: "My Pool drop",
      text: shareText ?? "I paid $1.20 for GPT-5, Claude, and image gen this week — and saved $48.80.",
      url: `${window.location.origin}/misc/receipt`,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(`${data.text} ${data.url}`);
      }
      setShared(true);
    } catch {
      // The native share sheet was dismissed; leave the button unchanged.
    }
  }

  return (
    <>
      <div style={{ margin: "26px 24px 0", display: "flex", gap: 10 }}>
        <button className="btn3 ghost" style={{ flex: 1 }} onClick={() => setSaved(true)}>
          {saved ? "saved ✓" : "save"}
        </button>
        <button className="btn3" style={{ flex: 2 }} onClick={shareReceipt}>
          {shared ? "shared ✓" : "share receipt 📤"}
        </button>
      </div>
      <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--dim3)", marginTop: 12, fontWeight: 500 }}>
        {footnote ?? "3 of your 6 members joined from a shared receipt"}
      </div>
    </>
  );
}
