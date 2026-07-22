"use client";

import { useState } from "react";
import { demoMode } from "@/lib/pricing";

interface MiscActionProps {
  kind: "invite" | "fairness" | "privacy";
  poolName?: string;
  inviteLink?: string | null; // relative path like /join/x7k2p9 (live mode)
}

const demo = demoMode();

export default function MiscAction({ kind, poolName, inviteLink }: MiscActionProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cooldown, setCooldown] = useState(true);

  const meta = {
    invite: { icon: "🔗", label: "invite link", sub: "every friend drops the price" },
    fairness: { icon: "⚖️", label: "fairness", sub: demo ? "whale threshold · cooldown votes" : "how the 35% whale flag works" },
    privacy: { icon: "🔒", label: "privacy", sub: "what the pool can and can't see" },
  }[kind];

  async function copyInvite() {
    if (!demo && !inviteLink) return;
    const link = `${window.location.origin}${inviteLink ?? "/m/p1"}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      window.prompt("Copy your invite link", link);
      setCopied(true);
    }
  }

  return (
    <>
      <button className="card3 misc-row" onClick={() => setOpen(true)}>
        <span className="misc-icon">{meta.icon}</span>
        <span style={{ textAlign: "left" }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>{meta.label}</span>
          <span style={{ display: "block", fontSize: 11, color: "var(--dim)", fontWeight: 600, marginTop: 1 }}>{meta.sub}</span>
        </span>
        <span style={{ color: "#3A4436", fontSize: 16, fontWeight: 700, marginLeft: "auto" }}>›</span>
      </button>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)} role="presentation">
          <section className="share-sheet" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label={meta.label}>
            <div className="sheet-handle" />
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="display" style={{ fontSize: 18 }}>{meta.icon} {meta.label}</div>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            {kind === "invite" && (
              <>
                <div className="share-preview">
                  <div style={{ fontWeight: 800 }}>{poolName ?? "your pool"} 🌊</div>
                  <div style={{ color: "var(--dim)", fontSize: 12, marginTop: 5 }}>Join our pool for shared AI — fast, smart &amp; image gen. Every friend drops the price.</div>
                  {inviteLink && (
                    <div className="num" style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "var(--volt)", letterSpacing: 0.5 }}>
                      {typeof window !== "undefined" ? window.location.host : ""}{inviteLink}
                    </div>
                  )}
                </div>
                {demo || inviteLink ? (
                  <button className="btn3" onClick={copyInvite}>{copied ? "invite copied ✓" : "copy invite link"}</button>
                ) : (
                  <div style={{ color: "var(--dim)", fontSize: 12, fontWeight: 600, textAlign: "center", padding: "10px 0" }}>
                    no active invite — ask the pool owner for a fresh one
                  </div>
                )}
              </>
            )}
            {kind === "fairness" && (
              <div className="share-preview">
                {demo ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><b>Automatic cooldowns</b><div style={{ color: "var(--dim)", fontSize: 11, marginTop: 3 }}>Vote when someone passes 35% usage</div></div>
                      <button className={`toggle ${cooldown ? "on" : ""}`} onClick={() => setCooldown(!cooldown)} role="switch" aria-checked={cooldown} aria-label="Toggle automatic cooldowns"><span /></button>
                    </div>
                    <div style={{ marginTop: 18, color: "var(--dim)", fontSize: 11.5, lineHeight: 1.6 }}>Current whale threshold: <b style={{ color: "var(--paper)" }}>35%</b>. Changes require a majority pool vote.</div>
                  </>
                ) : (
                  <>
                    <b>Everyone pays the same, so usage stays visible.</b>
                    <div style={{ color: "var(--dim)", fontSize: 11.5, lineHeight: 1.6, marginTop: 8 }}>
                      In pools of 3+, if one member passes <b style={{ color: "var(--paper)" }}>35%</b> of the pool&apos;s usage this month, they get flagged on the ledger (🐋) and see a heads-up in chat. Nothing gets blocked — it&apos;s social pressure, not a paywall. Cooldowns and pool votes land after alpha.
                    </div>
                  </>
                )}
              </div>
            )}
            {kind === "privacy" && (
              <div className="share-preview">
                <b>Chats are private by default.</b>
                <div style={{ color: "var(--dim)", fontSize: 11.5, lineHeight: 1.6, marginTop: 8 }}>The pool sees request counts and estimated cost only. Prompts and answers appear in the stream only when you explicitly share them.</div>
                {demo ? (
                  <button className="btn3 ghost" style={{ marginTop: 16 }} onClick={() => window.localStorage.clear()}>clear demo history</button>
                ) : (
                  <div style={{ color: "var(--dim)", fontSize: 11, lineHeight: 1.6, marginTop: 12 }}>
                    need to leave a pool or delete your data during the alpha? message the pool owner — self-serve controls are coming.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
