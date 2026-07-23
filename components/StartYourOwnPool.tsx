"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RippleGlyph } from "@/components/Icons";

interface StartYourOwnPoolProps {
  poolName: string;
}

// Shown to invited members (non-owners): the self-serve path from
// "friend's pool" to "my own pool". One pool per person in the alpha,
// so starting your own means leaving this one first — the sheet says so.
export default function StartYourOwnPool({ poolName }: StartYourOwnPoolProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function leaveAndStart() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pools/leave", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "couldn't leave the pool — try again");
      router.push("/onboarding?mode=create");
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't leave the pool — try again");
      setBusy(false);
    }
  }

  return (
    <>
      <button className="card3 misc-row" onClick={() => setOpen(true)}>
        <span className="misc-icon">🌊</span>
        <span style={{ textAlign: "left" }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>start your own pool</span>
          <span style={{ display: "block", fontSize: 11, color: "var(--dim)", fontWeight: 600, marginTop: 1 }}>
            be the owner — run your own crew
          </span>
        </span>
        <span style={{ color: "#3A4436", fontSize: 16, fontWeight: 700, marginLeft: "auto" }}>›</span>
      </button>

      {open && (
        <div className="sheet-backdrop" onClick={() => !busy && setOpen(false)} role="presentation">
          <section className="share-sheet" onClick={(e) => e.stopPropagation()} aria-modal="true" role="dialog" aria-label="start your own pool">
            <div className="sheet-handle" />
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="display" style={{ fontSize: 18 }}>🌊 start your own pool</div>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close" disabled={busy}>×</button>
            </div>
            <div className="share-preview">
              <b>One pool per person during the alpha.</b>
              <div style={{ color: "var(--dim)", fontSize: 11.5, lineHeight: 1.6, marginTop: 8 }}>
                Starting your own means leaving <b style={{ color: "var(--paper)" }}>{poolName}</b> first.
                The crew keeps their pool and your chats stay yours — you&apos;ll name your new pool and
                get your own invite link to share.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 6 }}>
              <button className="btn3" disabled={busy} onClick={leaveAndStart}>
                {busy ? "leaving…" : <>leave &amp; start my pool<RippleGlyph /></>}
              </button>
              <button className="btn3 ghost" disabled={busy} onClick={() => setOpen(false)}>
                never mind, stay in {poolName.toLowerCase()}
              </button>
              {error && (
                <div style={{ fontSize: 11.5, color: "var(--hot)", fontWeight: 700, textAlign: "center" }}>{error}</div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
