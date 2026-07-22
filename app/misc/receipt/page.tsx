"use client";

import { useEffect, useState } from "react";
import TabBar from "@/components/TabBar";
import { PLogo } from "@/components/Logo";
import { RippleGlyph } from "@/components/Icons";
import ReceiptActions from "@/components/ReceiptActions";
import InviteCrewCTA from "@/components/InviteCrewCTA";
import { getUsage } from "@/lib/demo-store";
import { demoMode } from "@/lib/pricing";

const demo = demoMode();

interface LiveUsage {
  requests: number;
  savedDollars: number;
  poolRequests: number;
  poolSavedDollars: number;
  poolName: string;
  memberCount: number;
  shareDollars: number;
  budgetDollars: number;
  inviteCode: string | null;
}

function Barcode() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 18, height: 38, alignItems: "flex-end" }}>
        {[3, 1.5, 5, 2, 1.5, 4, 2, 6, 1.5, 3, 2, 5, 1.5, 3, 6, 2, 1.5, 4, 2, 3, 1.5, 5, 2, 4, 1.5, 3, 5, 2, 1.5, 4, 2, 5, 1.5, 3, 2, 5].map((w, i) => (
        <div key={i} style={{ width: w, height: 38, background: "var(--ink)" }} />
        ))}
      </div>
      <div style={{ textAlign: "center", fontSize: 9.5, color: "#7A7568", marginTop: 9, letterSpacing: 1.5, fontWeight: 800, textTransform: "uppercase" }}>
        thank u for not paying full price 🫡
      </div>
    </>
  );
}

function monthLabel(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase();
}

export default function ReceiptPage() {
  const [demoUsage] = useState(() =>
    demo && typeof window !== "undefined" ? getUsage() : { requests: 0, savedDollars: 0 }
  );
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

  // --- live mode: real numbers from the gateway ledger -----------------------
  if (!demo) {
    if (live === undefined) {
      return (
        <>
          <div className="screen" style={{ display: "grid", placeItems: "center", minHeight: "60dvh", color: "var(--dim)", fontSize: 12, fontWeight: 600 }}>
            printing your receipt…
          </div>
          <TabBar />
        </>
      );
    }
    if (live === "error") {
      return (
        <>
          <div className="screen" style={{ display: "grid", placeItems: "center", minHeight: "60dvh", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 34 }}>📡</div>
              <div className="display" style={{ fontSize: 18, marginTop: 10 }}>couldn&apos;t print the receipt</div>
              <button className="btn3 ghost" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>retry</button>
            </div>
          </div>
          <TabBar />
        </>
      );
    }
    if (live === null) {
      return (
        <>
          <div className="screen" style={{ textAlign: "center", paddingTop: "24dvh" }}>
            <div style={{ fontSize: 34 }}>🧾</div>
            <div className="display" style={{ fontSize: 18, marginTop: 10 }}>no receipt yet</div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", fontWeight: 600, marginTop: 8, maxWidth: 260, marginLeft: "auto", marginRight: "auto", lineHeight: 1.55 }}>
              join or start a pool and the savings receipt prints itself.
            </div>
            <a href="/onboarding" className="btn3" style={{ margin: "20px auto 0", maxWidth: 240 }}>start a pool<RippleGlyph /></a>
          </div>
          <TabBar />
        </>
      );
    }

    const pct = live.poolSavedDollars > 0
      ? Math.min(99, Math.round((1 - live.shareDollars / (live.poolSavedDollars + live.shareDollars)) * 100))
      : 0;

    return (
      <>
        <div className="screen">
          <header style={{ padding: "calc(14px + env(safe-area-inset-top)) 22px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a href="/misc" style={{ fontSize: 14, color: "var(--volt)", fontWeight: 700, textDecoration: "none" }}>‹ misc</a>
            <div className="display" style={{ fontSize: 15 }}>the drop</div>
            <div style={{ width: 50 }} />
          </header>

          <div
            style={{
              margin: "14px 30px 0", background: "var(--paper)", color: "var(--ink)", borderRadius: 16,
              padding: "24px 22px 18px", position: "relative",
              boxShadow: "8px 8px 0 rgba(61,255,136,0.25), 8px 8px 0 3px var(--ink)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
              <PLogo size={28} color="#0B0E0C" knockout="#F2F0EA" />
              <div className="display" style={{ fontSize: 22, letterSpacing: 3 }}>Pool</div>
            </div>
            <div style={{ textAlign: "center", fontSize: 10.5, color: "#7A7568", marginTop: 5, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>
              {live.poolName} · {monthLabel()}
            </div>

            <div style={{ borderTop: "2px dashed #B8B2A2", margin: "16px 0" }} />

            {([
              [`your requests × ${live.requests}`, live.savedDollars > 0 ? `≈$${live.savedDollars.toFixed(2)} retail` : "—"],
              [`pool requests × ${live.poolRequests}`, live.poolSavedDollars > 0 ? `≈$${live.poolSavedDollars.toFixed(2)} retail` : "—"],
              [`members splitting the bill`, `× ${live.memberCount}`],
            ] as [string, string][]).map(([lbl, val]) => (
              <div key={lbl} className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", fontWeight: 500 }}>
                <span style={{ color: "#4A463C" }}>{lbl}</span>
                <span style={{ fontWeight: 700 }}>{val}</span>
              </div>
            ))}

            <div style={{ textAlign: "center", margin: "14px 0 4px", padding: "14px 10px 12px", background: "var(--volt)", border: "3px solid var(--ink)", borderRadius: 14, boxShadow: "4px 4px 0 var(--ink)" }}>
              <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, textTransform: "uppercase", opacity: 0.7 }}>you pay</div>
              <div className="display num" style={{ fontSize: 56, letterSpacing: -2, lineHeight: 1.05, marginTop: 2 }}>
                ${live.shareDollars.toFixed(live.shareDollars % 1 === 0 ? 0 : 2)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                {live.memberCount === 1
                  ? "solo for now · invite friends to drop this"
                  : `split ${live.memberCount} ways`}
                {live.savedDollars > 0 &&
                  (live.savedDollars > live.shareDollars
                    ? ` · saved ≈$${live.savedDollars.toFixed(2)}`
                    : ` · ≈$${live.savedDollars.toFixed(2)} of ai used`)}
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 800, marginTop: 5, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6 }}>
                closed alpha · nothing charged yet
              </div>
            </div>

            {live.memberCount > 1 && (
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                {([
                  [`≈$${live.poolSavedDollars.toFixed(0)}`, "retail value"],
                  [live.poolSavedDollars >= live.shareDollars * 2 && pct > 0 ? `${pct}%` : "—", "cheaper"],
                  [`${live.memberCount}`, "members"],
                ] as [string, string][]).map(([n, l]) => (
                  <div key={l} style={{ flex: 1, background: "#EDE9DC", border: "2px solid var(--ink)", borderRadius: 10, padding: "9px 6px", textAlign: "center" }}>
                    <div className="display num" style={{ fontSize: 15 }}>{n}</div>
                    <div style={{ fontSize: 8.5, color: "#7A7568", marginTop: 3, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" }}>{l}</div>
                  </div>
                ))}
              </div>
            )}

            {live.inviteCode && live.memberCount < 6 && (
              <InviteCrewCTA
                poolName={live.poolName}
                inviteCode={live.inviteCode}
                memberCount={live.memberCount}
                budgetDollars={live.budgetDollars}
                currentShare={live.shareDollars}
              />
            )}

            <Barcode />
          </div>

          <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--dim3)", margin: "18px 24px 0", fontWeight: 500 }}>
            screenshot it, flex it — the invite link does the rest
          </div>
        </div>
        <TabBar />
      </>
    );
  }

  // --- demo mode: the original mock receipt -----------------------------------
  const totalSaved = 48.8 + demoUsage.savedDollars;
  const totalRequests = 1592 + demoUsage.requests;

  const LINES: [string, string][] = [
    ["ChatGPT Plus (retail)", "$20.00"],
    ["Claude Pro (retail)", "$20.00"],
    ["Midjourney (retail)", "$10.00"],
    ["Image gens × 46", "incl."],
    [`Requests routed × ${totalRequests.toLocaleString()}`, "incl."],
  ];
  return (
    <>
      <div className="screen">
        <header style={{ padding: "calc(14px + env(safe-area-inset-top)) 22px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="/misc" style={{ fontSize: 14, color: "var(--volt)", fontWeight: 700, textDecoration: "none" }}>‹ misc</a>
          <div className="display" style={{ fontSize: 15 }}>weekly drop</div>
          <div style={{ width: 50 }} />
        </header>

        <div
          style={{
            margin: "14px 30px 0", background: "var(--paper)", color: "var(--ink)", borderRadius: 16,
            padding: "24px 22px 18px", position: "relative",
            boxShadow: "8px 8px 0 rgba(61,255,136,0.25), 8px 8px 0 3px var(--ink)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
            <PLogo size={28} color="#0B0E0C" knockout="#F2F0EA" />
            <div className="display" style={{ fontSize: 22, letterSpacing: 3 }}>Pool</div>
          </div>
          <div style={{ textAlign: "center", fontSize: 10.5, color: "#7A7568", marginTop: 5, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>
            the gremlins · week of jul 14–21
          </div>

          <div style={{ borderTop: "2px dashed #B8B2A2", margin: "16px 0" }} />

          {LINES.map(([lbl, val]) => (
            <div key={lbl} className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", fontWeight: 500 }}>
              <span style={{ color: "#4A463C" }}>{lbl}</span>
              <span style={{ fontWeight: 700 }}>{val}</span>
            </div>
          ))}
          <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", fontWeight: 700, color: "#B04A44" }}>
            <span>SOLO TOTAL</span>
            <span style={{ textDecoration: "line-through", textDecorationThickness: 2 }}>$50.00</span>
          </div>

          <div style={{ textAlign: "center", margin: "14px 0 4px", padding: "14px 10px 12px", background: "var(--volt)", border: "3px solid var(--ink)", borderRadius: 14, boxShadow: "4px 4px 0 var(--ink)" }}>
            <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, textTransform: "uppercase", opacity: 0.7 }}>you paid</div>
            <div className="display num" style={{ fontSize: 56, letterSpacing: -2, lineHeight: 1.05, marginTop: 2 }}>$1.20</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>split 6 ways · saved ${totalSaved.toFixed(2)} this week</div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {[["$214", "pool saved"], ["92%", "cheaper"], ["🐋", "matt, 38%"]].map(([n, l]) => (
              <div key={l} style={{ flex: 1, background: "#EDE9DC", border: "2px solid var(--ink)", borderRadius: 10, padding: "9px 6px", textAlign: "center" }}>
                <div className="display num" style={{ fontSize: 15 }}>{n}</div>
                <div style={{ fontSize: 8.5, color: "#7A7568", marginTop: 3, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" }}>{l}</div>
              </div>
            ))}
          </div>

          <Barcode />
        </div>

        <ReceiptActions />
      </div>
      <TabBar />
    </>
  );
}
