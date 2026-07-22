"use client";

import { useEffect, useState } from "react";

interface PoolInfo {
  id: string;
  name: string;
  emoji: string;
  monthlyBudgetCents: number;
  usedCents: number;
  retailCents: number;
  members: { userId: string; name: string; isYou: boolean; requests: number }[];
}

// Live pool capacity strip for the misc hub: shows how much of the shared
// monthly budget the pool has burned through.
export default function PoolData() {
  const [pool, setPool] = useState<PoolInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pools/mine")
      .then((res) => (res.ok ? res.json() : { pool: null }))
      .then((data) => {
        if (!cancelled) setPool(data.pool);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pool) return null;

  const pct = Math.min(100, Math.round((pool.usedCents / Math.max(pool.monthlyBudgetCents, 1)) * 100));
  // A few cents of usage rounds to 0% and reads as broken next to "$29.95 left".
  const pctLabel = pool.usedCents > 0 && pct === 0 ? "<1" : `${pct}`;
  const barPct = pool.usedCents > 0 ? Math.max(pct, 1) : pct;
  const remaining = Math.max(0, pool.monthlyBudgetCents - pool.usedCents);

  // Nothing burned yet: an empty bar reads as broken, so tell the story instead.
  if (pool.usedCents === 0) {
    return (
      <div className="card3" style={{ margin: "14px 20px 0", padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="display" style={{ fontSize: 12, letterSpacing: 1, color: "var(--volt)" }}>POOL CAPACITY</div>
          <div className="num" style={{ fontSize: 11, color: "var(--volt)", fontWeight: 700 }}>full 🟢</div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--dim)", fontWeight: 600, lineHeight: 1.5 }}>
          ${(pool.monthlyBudgetCents / 100).toFixed(0)} of shared AI this month, nothing burned yet —{" "}
          <a href="/chat#compose" style={{ color: "var(--volt)", textDecoration: "none", fontWeight: 700 }}>ask something to start the meter ⚡</a>
        </div>
      </div>
    );
  }

  return (
    <div className="card3" style={{ margin: "14px 20px 0", padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="display" style={{ fontSize: 12, letterSpacing: 1, color: "var(--volt)" }}>POOL CAPACITY</div>
        <div className="num" style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700 }}>
          ${(remaining / 100).toFixed(2)} left
        </div>
      </div>
      <div style={{ marginTop: 10, height: 10, borderRadius: 99, background: "#151A16", border: "1.5px solid var(--line)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${barPct}%`,
            borderRadius: 99,
            background: pct > 85 ? "var(--hot)" : "var(--volt)",
            transition: "width 400ms ease",
          }}
        />
      </div>
      <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--dim)", fontWeight: 600 }}>
        {pctLabel}% of the shared monthly budget used · {pool.members.length} member{pool.members.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}
