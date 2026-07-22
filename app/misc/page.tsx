"use client";

import { useEffect, useState } from "react";
import TabBar from "@/components/TabBar";
import MiscAction from "@/components/MiscAction";
import OwnerControls from "@/components/OwnerControls";
import SignOutRow from "@/components/SignOutRow";
import PoolData from "@/components/PoolData";
import { PLogo, RippleLogo } from "@/components/Logo";
import { RippleGlyph } from "@/components/Icons";
import { MEMBERS } from "@/lib/data";
import { POOL, memberShare, monthlySavings, demoMode } from "@/lib/pricing";

const demo = demoMode();

const AVATAR_COLORS = ["#3DFF88", "#B7A6FF", "#FFC24D", "#8FD6FF", "#FF9AB5", "#FFE98A"];

interface LivePool {
  name: string;
  emoji: string;
  monthlyBudgetCents: number;
  retailCents: number;
  isOwner: boolean;
  inviteCode: string | null;
  members: { userId: string; name: string; isYou: boolean }[];
}

export default function MiscPage() {
  const [live, setLive] = useState<LivePool | null | undefined | "error">(demo ? null : undefined);
  const [inviteFeedback, setInviteFeedback] = useState<"shared" | "copied" | null>(null);

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    fetch("/api/pools/mine")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setLive(data.pool ?? null);
      })
      .catch(() => {
        if (!cancelled) setLive("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- live: loading ----------------------------------------------------------
  if (!demo && live === undefined) {
    return (
      <>
        <div className="screen" style={{ display: "grid", placeItems: "center", minHeight: "60dvh", color: "var(--dim)", fontSize: 12, fontWeight: 600 }}>
          loading…
        </div>
        <TabBar />
      </>
    );
  }

  // --- live: fetch failed — don't pretend the user has no pool -----------------
  if (!demo && live === "error") {
    return (
      <>
        <div className="screen" style={{ display: "grid", placeItems: "center", minHeight: "60dvh", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 34 }}>📡</div>
            <div className="display" style={{ fontSize: 18, marginTop: 10 }}>couldn&apos;t load your pool</div>
            <button className="btn3 ghost" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>retry</button>
          </div>
        </div>
        <TabBar />
      </>
    );
  }

  // --- live: no pool yet — make the next step unmissable -----------------------
  if (!demo && live === null) {
    return (
      <>
        <div className="screen">
          <header style={{ padding: "calc(14px + env(safe-area-inset-top)) 22px 0" }}>
            <div className="display" style={{ fontSize: 26 }}>misc</div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, fontWeight: 600 }}>the pool, the money, the scoreboard</div>
          </header>
          <div className="card3" style={{ margin: "22px 22px 0", padding: "28px 22px", textAlign: "center" }}>
            <RippleLogo size={38} />
            <div className="display" style={{ fontSize: 18, marginTop: 10 }}>no pool yet</div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", fontWeight: 600, marginTop: 8, lineHeight: 1.55 }}>
              the ledger, the drop, and the billing all light up once you&apos;re in a pool.
            </div>
            <a href="/onboarding" className="btn3" style={{ marginTop: 20 }}>start a pool<RippleGlyph /></a>
            <a href="/onboarding?mode=join" className="btn3 ghost" style={{ marginTop: 9 }}>join with an invite code</a>
          </div>
          <div style={{ margin: "18px 20px 0" }}>
            <SignOutRow />
          </div>
          <div style={{ textAlign: "center", margin: "22px 0 0", fontSize: 10.5, color: "#3A4436", fontWeight: 600 }}>
            pool v0.1 · we count requests, never content
          </div>
        </div>
        <TabBar />
      </>
    );
  }

  // --- shared shell: demo uses mocks, live uses the fetched pool ---------------
  const lp = demo ? null : (live as LivePool);
  const poolName = demo ? POOL.name : lp!.name;
  const count = demo ? POOL.members : Math.max(1, lp!.members.length);
  const share = demo ? memberShare() : lp!.monthlyBudgetCents / 100 / count + 1;
  const shareWithTwoMore = demo
    ? memberShare(POOL.members + 2)
    : lp!.monthlyBudgetCents / 100 / (count + 2) + 1;
  const savedSoFar = demo ? monthlySavings() : (lp!.retailCents ?? 0) / 100;
  // Demo has no real invite — reuse the shareable demo moment like MiscAction does.
  const inviteLink = demo ? "/m/p1" : lp!.inviteCode ? `/join/${lp!.inviteCode}` : null;
  const soloLive = !demo && count === 1;

  function flashFeedback(kind: "shared" | "copied") {
    setInviteFeedback(kind);
    window.setTimeout(() => setInviteFeedback(null), 2500);
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    const url = `${window.location.origin}${inviteLink}`;
    const text = `join my AI pool "${poolName}" — we split one budget and everyone pays less 🌊 ${url}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Join my pool", text, url });
        flashFeedback("shared");
      } catch {
        /* dismissed the sheet — not a success, don't fake one */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      flashFeedback("copied");
    } catch {
      window.prompt("copy your invite link:", url);
      flashFeedback("copied");
    }
  }

  const avatars = demo
    ? MEMBERS.map((m) => ({ key: m.id, initial: m.name[0], color: m.color }))
    : lp!.members.map((m, i) => ({ key: m.userId, initial: m.name[0] ?? "?", color: AVATAR_COLORS[i % AVATAR_COLORS.length] }));

  const rows = [
    {
      icon: "📊", volt: true, label: "the ledger", sub: "who's carrying, who's cooked",
      badge: demo ? "🐋 matt" : undefined, href: "/misc/ledger",
    },
    {
      icon: "🧾", volt: true, label: demo ? "weekly drop" : "the drop", sub: "your savings receipt",
      value: savedSoFar > 0 ? `≈$${savedSoFar.toFixed(2)}\n${demo ? "saved" : "retail value"}` : undefined, href: "/misc/receipt",
    },
    {
      icon: "💳", label: "billing", sub: demo ? "the $1 promise, in plain sight" : "the $1 promise · $0 due in alpha",
      value: demo ? "visa 4412\npaid ✓" : `$${share.toFixed(2)}\nur share`, href: "/misc/billing",
    },
  ];

  return (
    <>
      <div className="screen">
        <header style={{ padding: "calc(14px + env(safe-area-inset-top)) 22px 0" }}>
          <div className="display" style={{ fontSize: 26 }}>misc</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, fontWeight: 600 }}>the pool, the money, the scoreboard</div>
        </header>

        <div className="card3" style={{ margin: "16px 20px 0", padding: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -70, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(61,255,136,0.18), transparent 65%)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 11, position: "relative" }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: "var(--volt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PLogo size={26} color="var(--ink)" knockout="var(--volt)" />
            </div>
            <div>
              <div className="display" style={{ fontSize: 15 }}>{poolName}</div>
              <div style={{ fontSize: 10.5, color: "var(--dim)", fontWeight: 600 }}>
                {count} member{count === 1 ? "" : "s"}{demo ? ` · ${POOL.tier.toLowerCase()} tier` : " · closed alpha"}
              </div>
            </div>
            {soloLive ? (
              <div style={{ marginLeft: "auto", textAlign: "right", position: "relative" }}>
                <div className="display num" style={{ fontSize: 20, color: "var(--volt)", letterSpacing: -0.5 }}>
                  invite 2 → ${shareWithTwoMore.toFixed(0)}
                </div>
                <div style={{ fontSize: 9, color: "var(--dim)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  solo = ${share.toFixed(0)} · temporary
                </div>
              </div>
            ) : (
              <div style={{ marginLeft: "auto", textAlign: "right", position: "relative" }}>
                <div className="display num" style={{ fontSize: 26, color: "var(--volt)", letterSpacing: -0.5 }}>${share.toFixed(0)}</div>
                <div style={{ fontSize: 9, color: "var(--dim)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6 }}>ur share/mo</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", marginTop: 15, alignItems: "center", position: "relative" }}>
            {avatars.map((a, i) => (
              <div
                key={a.key}
                className="display"
                style={{
                  width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--ink)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                  color: "var(--ink)", marginLeft: i === 0 ? 0 : -9, background: a.color,
                }}
              >
                {a.initial.toUpperCase()}
              </div>
            ))}
            <button
              onClick={copyInviteLink}
              disabled={!inviteLink}
              aria-label={`Invite a friend — 2 more drops everyone's share to $${shareWithTwoMore.toFixed(2)}`}
              style={{
                // Invisible padding extends the tap target past the 32px circle.
                padding: 6, margin: `-6px -6px -6px ${avatars.length ? -15 : -6}px`,
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <span
                style={{
                  width: 32, height: 32, borderRadius: "50%", border: "1.5px dashed var(--volt-line)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--volt)", fontSize: 15, background: "var(--card)",
                }}
              >
                +
              </span>
            </button>
            <button
              onClick={copyInviteLink}
              disabled={!inviteLink}
              aria-live="polite"
              style={{ marginLeft: 10, fontSize: 11, color: "var(--dim)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "8px 0", textAlign: "left" }}
            >
              {inviteFeedback ? (
                <b style={{ color: "var(--volt)" }}>invite {inviteFeedback} ✓</b>
              ) : (
                <>2 more = <b style={{ color: "var(--volt)" }}>${shareWithTwoMore.toFixed(2)} each</b></>
              )}
            </button>
          </div>
        </div>

        {!demo && <PoolData />}

        <div style={{ margin: "18px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => (
            <a key={r.label} href={r.href} className="card3" style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 16px", textDecoration: "none", color: "inherit" }}>
              <div
                style={{
                  width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, flexShrink: 0,
                  background: r.volt ? "var(--volt-dim)" : "var(--card)",
                  border: `1.5px solid ${r.volt ? "var(--volt-line)" : "var(--line)"}`,
                }}
              >
                {r.icon}
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.label}</div>
                <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 600, marginTop: 1 }}>{r.sub}</div>
              </div>
              {r.badge && (
                <span className="display" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink)", background: "var(--volt)", borderRadius: 999, padding: "4px 9px" }}>
                  {r.badge}
                </span>
              )}
              {r.value && (
                <div className="num" style={{ marginLeft: "auto", fontSize: 12, color: "var(--dim)", fontWeight: 700, textAlign: "right", lineHeight: 1.4 }}>
                  {r.value.split("\n").map((l, i) => (
                    <div key={i} style={i === 0 ? { color: "var(--volt)" } : {}}>{l}</div>
                  ))}
                </div>
              )}
              <div style={{ color: "#3A4436", fontSize: 16, fontWeight: 700 }}>›</div>
            </a>
          ))}
          <MiscAction kind="invite" poolName={poolName} inviteLink={inviteLink} />
          <MiscAction kind="fairness" />
          <MiscAction kind="privacy" />
          {!demo && lp!.isOwner && (
            <OwnerControls
              inviteCode={lp!.inviteCode}
              onCodeChange={(code) =>
                setLive((prev) => (prev && typeof prev === "object" ? { ...prev, inviteCode: code } : prev))
              }
            />
          )}
          {!demo && <SignOutRow />}
        </div>

        <div style={{ textAlign: "center", margin: "22px 0 0", fontSize: 10.5, color: "#3A4436", fontWeight: 600 }}>
          pool v0.1 · we count requests, never content
        </div>
      </div>
      <TabBar />
    </>
  );
}
