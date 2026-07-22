"use client";

import { useEffect, useState } from "react";
import TabBar from "@/components/TabBar";
import { PLogo } from "@/components/Logo";
import { RippleGlyph } from "@/components/Icons";
import { POOL, memberShare, monthlySavings, demoMode } from "@/lib/pricing";

const demo = demoMode();

interface LiveUsage {
  poolName: string;
  memberCount: number;
  shareDollars: number;
  savedDollars: number;
  poolSavedDollars: number;
}

export default function BillingPage() {
  const [live, setLive] = useState<LiveUsage | null | undefined | "error">(demo ? null : undefined);

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    fetch("/api/usage")
      .then((res) => {
        if (res.status === 404 || res.status === 401) return null; // genuinely no pool
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setLive(data === null ? null : (data?.usage ?? null));
      })
      .catch(() => {
        if (!cancelled) setLive("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!demo && live === undefined) {
    return (
      <>
        <div className="screen" style={{ display: "grid", placeItems: "center", minHeight: "60dvh", color: "var(--dim)", fontSize: 12, fontWeight: 600 }}>
          loading billing…
        </div>
        <TabBar />
      </>
    );
  }

  if (!demo && live === "error") {
    return (
      <>
        <div className="screen" style={{ display: "grid", placeItems: "center", minHeight: "60dvh", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 34 }}>📡</div>
            <div className="display" style={{ fontSize: 18, marginTop: 10 }}>couldn&apos;t load billing</div>
            <button className="btn3 ghost" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>retry</button>
          </div>
        </div>
        <TabBar />
      </>
    );
  }

  if (!demo && live === null) {
    return (
      <>
        <div className="screen" style={{ textAlign: "center", paddingTop: "24dvh" }}>
          <div style={{ fontSize: 34 }}>💳</div>
          <div className="display" style={{ fontSize: 18, marginTop: 10 }}>nothing to bill yet</div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", fontWeight: 600, marginTop: 8, maxWidth: 260, marginLeft: "auto", marginRight: "auto", lineHeight: 1.55 }}>
            join or start a pool first — then your share shows up here.
          </div>
          <a href="/onboarding" className="btn3" style={{ margin: "20px auto 0", maxWidth: 240 }}>start a pool<RippleGlyph /></a>
        </div>
        <TabBar />
      </>
    );
  }

  const lu = live as LiveUsage; // past the guards above, live is a real usage object
  const poolName = demo ? POOL.name : lu.poolName;
  const members = demo ? POOL.members : lu.memberCount;
  const capacityCost = demo ? POOL.tierCost : Math.max(0, (lu.shareDollars - 1) * members);
  const feeTotal = 1 * members;
  const total = capacityCost + feeTotal;
  const share = demo ? memberShare() : lu.shareDollars;
  const saved = demo ? monthlySavings() : lu.savedDollars;

  return (
    <>
      <div className="screen">
        <header style={{ padding: "calc(14px + env(safe-area-inset-top)) 22px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/misc" style={{ fontSize: 20, color: "var(--volt)", fontWeight: 700, textDecoration: "none" }}>‹</a>
          <div className="display" style={{ fontSize: 22 }}>billing</div>
        </header>

        <div className="card3" style={{ margin: "18px 22px 0", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: "var(--volt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PLogo size={22} color="var(--ink)" knockout="var(--volt)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{poolName}</div>
                <div style={{ fontSize: 10.5, color: "var(--dim)", fontWeight: 600 }}>{members} member{members === 1 ? "" : "s"}{demo ? ` · ${POOL.tier} tier` : " · closed alpha"}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
              {demo ? nextBillLabel() : "no charge · alpha"}
            </div>
          </div>
          <div style={{ padding: "8px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", fontSize: 14, borderBottom: "1.5px dashed var(--line-soft)" }}>
              <div style={{ color: "#B9C0B2", fontWeight: 600 }}>
                Shared AI capacity
                <div style={{ fontSize: 10.5, color: "var(--dim2)", marginTop: 2, fontWeight: 500 }}>fast + smart + image gen, one shared monthly budget</div>
              </div>
              <div className="num" style={{ fontWeight: 700 }}>${capacityCost.toFixed(2)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", fontSize: 14 }}>
              <div style={{ color: "var(--volt)", fontWeight: 600 }}>
                Platform fee — {members} × $1
                <div style={{ fontSize: 10.5, color: "var(--dim2)", marginTop: 2, fontWeight: 500 }}>that&apos;s the whole business model. no ads, no data games.</div>
              </div>
              <div className="num" style={{ fontWeight: 700, color: "var(--volt)" }}>${feeTotal.toFixed(2)}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 20px", background: "var(--card2)", borderTop: "1.5px solid var(--line)" }}>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--dim)" }}>pool total</div>
            <div className="display num" style={{ fontSize: 24, letterSpacing: -0.5 }}>${total.toFixed(2)}</div>
          </div>
        </div>

        <div className="card3-volt" style={{ margin: "14px 22px 0", padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.7 }}>
            your share · {members === 1 ? "solo for now" : `split ${members} ways`}
          </div>
          <div className="display num" style={{ fontSize: 52, letterSpacing: -1.5, lineHeight: 1.05, marginTop: 4 }}>
            <sup style={{ fontSize: 22 }}>$</sup>{share.toFixed(share % 1 === 0 ? 0 : 2)}<span style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 700 }}>/mo</span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 6 }}>
            {demo ? (
              <>retail <s style={{ opacity: 0.5 }}>${POOL.retailValue}</s> · you save ${saved.toFixed(0)} every month</>
            ) : saved > share ? (
              <>saved ≈${saved.toFixed(2)} vs pay-per-use this month</>
            ) : members === 1 ? (
              <>every friend you invite drops this number 📉</>
            ) : (
              <>vs $20–60/mo for solo subscriptions</>
            )}
          </div>
        </div>

        <div className="card3" style={{ margin: "18px 22px 0", padding: "16px 18px" }}>
          <div className="display" style={{ fontSize: 12, letterSpacing: 1, color: "var(--volt)", display: "flex", alignItems: "center", gap: 8 }}>🫡 the $1 promise</div>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: "#B9C0B2", marginTop: 9, fontWeight: 500 }}>
            we take <b style={{ color: "var(--paper)" }}>$1 per member per month</b>. it&apos;s on every bill, in plain sight. no percentage skims, no &ldquo;premium features&rdquo; ransom, no selling your data. if we ever change it, your pool votes first.
          </div>
        </div>

        {demo ? (
          <>
            <div className="card3" style={{ margin: "20px 22px 0", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--card)", border: "1.5px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>💳</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Visa ··4412</div>
                <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 600, marginTop: 1 }}>charged aug 1 · one line: &ldquo;The Gremlins&rdquo;</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "var(--volt)", textTransform: "uppercase", letterSpacing: 0.5 }}>paid ✓</div>
            </div>

            <div style={{ margin: "22px 22px 0" }}>
              <div className="display" style={{ fontSize: 12, color: "var(--dim)", letterSpacing: 1 }}>history</div>
              {[
                ["july", 54.0, 6.0],
                ["june", 54.0, 6.0],
                ["may", 49.5, 10.5],
              ].map(([month, savedAmt, amt]) => (
                <div key={month as string} className="num" style={{ display: "flex", justifyContent: "space-between", padding: "11px 2px", borderBottom: "1.5px solid #151A16", fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>{month}</span>
                  <span style={{ color: "var(--volt)", fontWeight: 700 }}>saved ${(savedAmt as number).toFixed(2)}</span>
                  <span style={{ color: "var(--dim)", fontWeight: 600 }}>${(amt as number).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="card3" style={{ margin: "20px 22px 0", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--card)", border: "1.5px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🧪</div>
            <div style={{ fontSize: 12, color: "var(--dim)", fontWeight: 600, lineHeight: 1.5 }}>
              closed alpha — no card on file, nothing gets charged. payments arrive with the beta.
            </div>
          </div>
        )}
      </div>
      <TabBar />
    </>
  );
}

function nextBillLabel(): string {
  const next = new Date();
  next.setMonth(next.getMonth() + 1, 1);
  return next.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase();
}
