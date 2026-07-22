"use client";

import { useState } from "react";

interface OwnerControlsProps {
  inviteCode: string | null;
  // Lets the hub swap its invite link the moment a fresh code exists —
  // otherwise "+" and the invite sheet keep sharing the dead one.
  onCodeChange?: (code: string) => void;
}

export default function OwnerControls({ inviteCode, onCodeChange }: OwnerControlsProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [code, setCode] = useState(inviteCode);

  async function act(action: string, extra: object = {}) {
    setBusy(action);
    setMessage("");
    try {
      const res = await fetch("/api/pools/owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      if (action === "regenerate_invite") {
        setCode(data.code);
        onCodeChange?.(data.code);
        setMessage("fresh invite generated — old links stop working");
      } else if (action === "reset_budget") {
        setMessage("pool re-opened with a $30 budget");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "failed — try again");
    } finally {
      setBusy(null);
    }
  }

  async function copyInvite() {
    if (!code) return;
    const link = `${window.location.origin}/join/${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setMessage("invite link copied");
    } catch {
      window.prompt("Copy your invite link", link);
    }
  }

  return (
    <>
      <button className="card3 misc-row" onClick={() => setOpen(true)}>
        <span className="misc-icon">👑</span>
        <span style={{ textAlign: "left" }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>owner controls</span>
          <span style={{ display: "block", fontSize: 11, color: "var(--dim)", fontWeight: 600, marginTop: 1 }}>
            budget · invites
          </span>
        </span>
        <span style={{ color: "#3A4436", fontSize: 16, fontWeight: 700, marginLeft: "auto" }}>›</span>
      </button>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)} role="presentation">
          <section className="share-sheet" onClick={(e) => e.stopPropagation()} aria-modal="true" role="dialog" aria-label="owner controls">
            <div className="sheet-handle" />
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="display" style={{ fontSize: 18 }}>👑 owner controls</div>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 6 }}>
              <button className="btn3" onClick={copyInvite} disabled={!code}>
                copy invite link
              </button>
              <button
                className="btn3 ghost"
                disabled={busy !== null}
                onClick={() => {
                  if (window.confirm("regenerate the invite? old links stop working.")) act("regenerate_invite");
                }}
              >
                {busy === "regenerate_invite" ? "generating…" : "regenerate invite"}
              </button>
              <button
                className="btn3 ghost"
                disabled={busy !== null}
                onClick={() => {
                  if (window.confirm("re-open the pool with a $30 budget? this doesn't wipe usage history.")) act("reset_budget");
                }}
              >
                {busy === "reset_budget" ? "working…" : "re-open pool ($30 budget)"}
              </button>
              {message && (
                <div style={{ fontSize: 11.5, color: "var(--volt)", fontWeight: 700, textAlign: "center" }}>{message}</div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
