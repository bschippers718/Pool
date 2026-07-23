"use client";

import { useState } from "react";
import { RippleGlyph } from "@/components/Icons";

export interface SwitcherPool {
  id: string;
  name: string;
  emoji: string;
  isOwner: boolean;
  isActive: boolean;
}

interface PoolSwitcherProps {
  pools: SwitcherPool[];
}

// Every pool you're in, right on the misc page: tap to switch, leave the ones
// you don't own, and start or join another — no dead ends, no hidden flows.
export default function PoolSwitcher({ pools }: PoolSwitcherProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function switchTo(pool: SwitcherPool) {
    if (pool.isActive || busy) return;
    setBusy(pool.id);
    setError("");
    try {
      const res = await fetch("/api/pools/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId: pool.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "couldn't switch — try again");
      // Everything on this page is scoped to the active pool — refetch it all.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't switch — try again");
      setBusy(null);
    }
  }

  async function leave(pool: SwitcherPool) {
    if (busy) return;
    if (!window.confirm(`leave "${pool.name}"? the crew keeps their pool — you can rejoin later with an invite.`)) return;
    setBusy(pool.id);
    setError("");
    try {
      const res = await fetch("/api/pools/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId: pool.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "couldn't leave — try again");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't leave — try again");
      setBusy(null);
    }
  }

  return (
    <div className="card3" style={{ padding: "16px 16px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--dim)" }}>
        your pools
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        {pools.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => switchTo(p)}
              disabled={busy !== null}
              style={{
                flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10,
                background: p.isActive ? "var(--volt-dim)" : "transparent",
                border: `1.5px solid ${p.isActive ? "var(--volt-line)" : "transparent"}`,
                borderRadius: 12, padding: "9px 11px", cursor: p.isActive ? "default" : "pointer",
                fontFamily: "inherit", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 17 }}>{p.emoji}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: "var(--paper)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                  {p.isOwner && <span style={{ marginLeft: 6, fontSize: 11 }}>👑</span>}
                </span>
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: p.isActive ? "var(--volt)" : "var(--dim2)", marginTop: 1 }}>
                  {busy === p.id ? "working…" : p.isActive ? "active" : "tap to switch"}
                </span>
              </span>
            </button>
            {!p.isOwner && (
              <button
                onClick={() => leave(p)}
                disabled={busy !== null}
                style={{
                  fontSize: 10.5, fontWeight: 800, color: "var(--dim)", background: "none",
                  border: "1px solid var(--line)", borderRadius: 999, padding: "6px 11px",
                  cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                }}
              >
                leave
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <a href="/onboarding?mode=create" className="btn3" style={{ flex: 1, fontSize: 12.5, padding: "11px 8px", textAlign: "center" }}>
          start another pool<RippleGlyph />
        </a>
        <a href="/onboarding?mode=join" className="btn3 ghost" style={{ flex: 1, fontSize: 12.5, padding: "11px 8px", textAlign: "center" }}>
          join with a code
        </a>
      </div>

      {error && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--hot)", fontWeight: 700, textAlign: "center" }}>{error}</div>
      )}
    </div>
  );
}
