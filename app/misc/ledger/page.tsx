"use client";

import { useEffect, useState } from "react";
import TabBar from "@/components/TabBar";
import { MEMBERS, ME } from "@/lib/data";
import { getUsage } from "@/lib/demo-store";
import { demoMode } from "@/lib/pricing";

interface LiveMember {
  userId: string;
  name: string;
  isYou: boolean;
  requests: number;
}

const demo = demoMode();

const AVATAR_COLORS = ["#3DFF88", "#B7A6FF", "#FFC24D", "#8FD6FF", "#FF9AB5", "#FFE98A"];

export default function LedgerPage() {
  const [myRequests, setMyRequests] = useState(() => (demo && typeof window !== "undefined" ? getUsage().requests : 0));
  // null = loading, "error" = fetch failed, "no_pool" = genuinely not in a pool.
  const [liveMembers, setLiveMembers] = useState<LiveMember[] | null | "error" | "no_pool">(null);

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    fetch("/api/pools/mine")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data.pool) {
          setLiveMembers("no_pool");
          return;
        }
        const members = (data.pool.members ?? []) as LiveMember[];
        setLiveMembers(members);
        const you = members.find((m) => m.isYou);
        if (you) setMyRequests(you.requests);
      })
      .catch(() => {
        if (!cancelled) setLiveMembers("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!demo && liveMembers === null) {
    return (
      <>
        <div className="screen" style={{ display: "grid", placeItems: "center", minHeight: "60dvh", color: "var(--dim)", fontSize: 12, fontWeight: 600 }}>
          loading the ledger…
        </div>
        <TabBar />
      </>
    );
  }

  if (!demo && liveMembers === "error") {
    return (
      <>
        <div className="screen" style={{ display: "grid", placeItems: "center", minHeight: "60dvh", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 34 }}>📡</div>
            <div className="display" style={{ fontSize: 18, marginTop: 10 }}>couldn&apos;t load the ledger</div>
            <button className="btn3 ghost" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>retry</button>
          </div>
        </div>
        <TabBar />
      </>
    );
  }

  if (!demo && liveMembers === "no_pool") {
    return (
      <>
        <div className="screen" style={{ textAlign: "center", paddingTop: "24dvh" }}>
          <div style={{ fontSize: 34 }}>⚖️</div>
          <div className="display" style={{ fontSize: 18, marginTop: 10 }}>no ledger yet</div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", fontWeight: 600, marginTop: 8, maxWidth: 260, marginLeft: "auto", marginRight: "auto", lineHeight: 1.55 }}>
            join or start a pool and the scoreboard lights up.
          </div>
          <a href="/onboarding" className="btn3" style={{ margin: "20px auto 0", maxWidth: 240 }}>start a pool</a>
        </div>
        <TabBar />
      </>
    );
  }

  if (!demo && Array.isArray(liveMembers)) {
    const total = liveMembers.reduce((s, m) => s + m.requests, 0);
    const rows = [...liveMembers].sort((a, b) => b.requests - a.requests);
    const whale = rows[0];
    // Whale-shaming only makes sense with a real group — solo/duo usage is
    // always "100%" and would flag everyone.
    const whaleEligible = rows.length >= 3;

    return (
      <>
        <div className="screen">
          <header style={{ padding: "calc(14px + env(safe-area-inset-top)) 22px 0" }}>
            <a href="/misc" style={{ fontSize: 14, color: "var(--volt)", fontWeight: 700, textDecoration: "none" }}>‹ misc</a>
            <div className="display" style={{ fontSize: 24, marginTop: 8 }}>the ledger</div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, fontWeight: 600 }}>who&apos;s carrying the pool &amp; who&apos;s cooked</div>
          </header>

          {total === 0 ? (
            <div className="card3" style={{ margin: "18px 22px 0", padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 30 }}>⚖️</div>
              <div className="display" style={{ fontSize: 15, marginTop: 8 }}>clean slate</div>
              <div style={{ fontSize: 12, color: "var(--dim)", fontWeight: 600, marginTop: 6 }}>
                {rows.length === 1
                  ? "just you for now — the scoreboard gets spicy once friends join."
                  : "no usage yet this month. the scoreboard starts when someone sends a message."}
              </div>
            </div>
          ) : (
            <>
              {whaleEligible && whale && total > 0 && whale.requests / total > 0.35 && (
                <div className="card3" style={{ margin: "18px 22px 0", padding: "16px 18px", borderColor: "rgba(255,107,44,0.4)", background: "linear-gradient(120deg, rgba(255,107,44,0.12), rgba(255,107,44,0.03))" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ fontSize: 36 }}>🐋</div>
                    <div>
                      <div className="display" style={{ fontSize: 15 }}>{whale.name}{whale.isYou ? " (you)" : ""} is in whale territory</div>
                      <div style={{ fontSize: 11.5, color: "#C9A996", marginTop: 2, fontWeight: 600 }}>past the 35% fair-use line this month</div>
                    </div>
                    <div className="display num" style={{ marginLeft: "auto", fontSize: 30, color: "var(--hot)" }}>
                      {Math.round((whale.requests / total) * 100)}%
                    </div>
                  </div>
                </div>
              )}

              <div style={{ margin: "20px 22px 0", display: "flex", flexDirection: "column", gap: 14 }}>
                {rows.map((m, i) => {
                  const share = total > 0 ? m.requests / total : 0;
                  return (
                    <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <div className="display num" style={{ width: 24, fontSize: 16, color: whaleEligible && i === 0 && share > 0.35 ? "var(--hot)" : "#4E564C" }}>{i + 1}</div>
                      <div
                        className="display"
                        style={{
                          width: 38, height: 38, borderRadius: "50%", background: AVATAR_COLORS[i % AVATAR_COLORS.length], flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--ink)",
                        }}
                      >
                        {m.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}{m.isYou && " (you)"}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "2.5px 7px", borderRadius: 999, background: "var(--card)", color: "var(--dim)", textTransform: "uppercase" }}>
                            {m.requests} req
                          </span>
                        </div>
                        <div style={{ marginTop: 6, height: 10, borderRadius: 99, background: "#151A16", border: "1.5px solid var(--line)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(100, share * 100)}%`, borderRadius: 99, background: whaleEligible && i === 0 && share > 0.35 ? "var(--hot)" : m.isYou ? "var(--volt)" : "#3A4436" }} />
                        </div>
                      </div>
                      <div className="display num" style={{ width: 44, textAlign: "right", fontSize: 15, color: whaleEligible && i === 0 && share > 0.35 ? "var(--hot)" : "var(--paper)" }}>
                        {Math.round(share * 100)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div style={{ textAlign: "center", margin: "18px 30px 0", fontSize: 10.5, color: "var(--dim3)", fontWeight: 600 }}>
            🔒 counts only. the ledger never sees what anyone asked.
          </div>
        </div>
        <TabBar />
      </>
    );
  }

  // --- demo path ---
  const whale = MEMBERS[0];
  const totalBaseline = MEMBERS.reduce((sum, m) => sum + m.requests, 0);
  const myTotal = ME.requests + myRequests;
  const grandTotal = totalBaseline + myRequests;

  const rows = MEMBERS.map((m) => ({
    ...m,
    liveRequests: m.id === ME.id ? myTotal : m.requests,
    liveShare: grandTotal > 0 ? (m.id === ME.id ? myTotal : m.requests) / grandTotal : 0,
  })).sort((a, b) => b.liveRequests - a.liveRequests);

  return (
    <>
      <div className="screen">
        <header style={{ padding: "calc(14px + env(safe-area-inset-top)) 22px 0" }}>
          <a href="/misc" style={{ fontSize: 14, color: "var(--volt)", fontWeight: 700, textDecoration: "none" }}>‹ misc</a>
          <div className="display" style={{ fontSize: 24, marginTop: 8 }}>the ledger</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, fontWeight: 600 }}>who&apos;s carrying the pool &amp; who&apos;s cooked</div>
        </header>

        <div className="card3" style={{ margin: "18px 22px 0", padding: "16px 18px", borderColor: "rgba(255,107,44,0.4)", background: "linear-gradient(120deg, rgba(255,107,44,0.12), rgba(255,107,44,0.03))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 36 }}>🐋</div>
            <div>
              <div className="display" style={{ fontSize: 15 }}>{whale.name} is cooked 💀</div>
              <div style={{ fontSize: 11.5, color: "#C9A996", marginTop: 2, fontWeight: 600 }}>benched til tuesday · voted 4–1</div>
            </div>
            <div className="display num" style={{ marginLeft: "auto", fontSize: 30, color: "var(--hot)" }}>
              {Math.round((whale.requests / grandTotal) * 100)}%
            </div>
          </div>
        </div>

        <div style={{ margin: "20px 22px 0", display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div className="display num" style={{ width: 24, fontSize: 16, color: i === 0 ? "var(--hot)" : "#4E564C" }}>{i + 1}</div>
              <div
                className="display"
                style={{
                  width: 38, height: 38, borderRadius: "50%", background: m.color, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--ink)",
                }}
              >
                {m.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}{m.id === ME.id && " (you)"}</span>
                  {m.id === ME.id && myRequests > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 800, padding: "2.5px 7px", borderRadius: 999, background: "var(--volt-dim)", color: "var(--volt)", textTransform: "uppercase" }}>
                      +{myRequests} live
                    </span>
                  )}
                  {m.tag === "benched" && <span style={{ fontSize: 9, fontWeight: 800, padding: "2.5px 7px", borderRadius: 999, background: "rgba(255,107,44,0.15)", color: "var(--hot)", textTransform: "uppercase" }}>benched</span>}
                  {m.tag === "carrying" && m.id !== ME.id && <span style={{ fontSize: 9, fontWeight: 800, padding: "2.5px 7px", borderRadius: 999, background: "var(--volt-dim)", color: "var(--volt)", textTransform: "uppercase" }}>carrying</span>}
                  {m.tag === "ghost" && <span style={{ fontSize: 9, fontWeight: 800, padding: "2.5px 7px", borderRadius: 999, background: "var(--card)", color: "var(--dim)", textTransform: "uppercase" }}>ghost 👻</span>}
                </div>
                <div style={{ marginTop: 6, height: 10, borderRadius: 99, background: "#151A16", border: "1.5px solid var(--line)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, m.liveShare * 100)}%`, borderRadius: 99, background: i === 0 ? "var(--hot)" : m.id === ME.id ? "var(--volt)" : "#3A4436" }} />
                </div>
              </div>
              <div className="display num" style={{ width: 44, textAlign: "right", fontSize: 15, color: i === 0 ? "var(--hot)" : "var(--paper)" }}>
                {Math.round(m.liveShare * 100)}%
              </div>
            </div>
          ))}
        </div>

        <div className="card3" style={{ margin: "22px 22px 0", padding: "15px 17px", display: "flex", gap: 11, alignItems: "center" }}>
          <div style={{ fontSize: 20 }}>⚖️</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, color: "#B9C0B2" }}>
            nobody had the awkward &ldquo;you&apos;re using it too much&rdquo; talk this week. the ledger did it for you.
          </div>
        </div>

        <div style={{ textAlign: "center", margin: "18px 30px 0", fontSize: 10.5, color: "var(--dim3)", fontWeight: 600 }}>
          🔒 counts only. the ledger never sees what anyone asked.
        </div>
      </div>
      <TabBar />
    </>
  );
}
