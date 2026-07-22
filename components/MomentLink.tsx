"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PLogo } from "@/components/Logo";
import { RippleGlyph } from "@/components/Icons";
import { MODELS, demoMode, liveShareAt, type ModelId } from "@/lib/pricing";
import { getSharedMoments, type SharedMoment } from "@/lib/demo-store";

interface LiveMoment {
  id: string;
  title: string;
  response: string;
  tier: ModelId;
  author: string;
  poolName: string;
  inviteCode?: string | null;
}

const demo = demoMode();

export default function MomentLink({ id }: { id: string }) {
  const [moment] = useState<SharedMoment | null | undefined>(() => {
    if (!demo) return undefined;
    if (typeof window === "undefined") return undefined;
    return getSharedMoments().find((m) => m.id === id) ?? null;
  });
  const [live, setLive] = useState<LiveMoment | null | undefined>(demo ? null : undefined);

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    fetch(`/api/moments/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setLive(data?.moment ?? null);
      })
      .catch(() => {
        if (!cancelled) setLive(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!demo && live === undefined) {
    return (
      <div className="screen" style={{ display: "grid", placeItems: "center", minHeight: "60dvh" }}>
        <div style={{ textAlign: "center" }}>
          <PLogo size={40} />
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--dim)", fontWeight: 600 }}>pulling up this share…</div>
        </div>
      </div>
    );
  }

  if (demo && moment === undefined) {
    return (
      <div className="screen" style={{ display: "grid", placeItems: "center", minHeight: "60dvh" }}>
        <PLogo size={40} />
      </div>
    );
  }

  const resolved = demo
    ? moment
      ? { title: moment.title, response: moment.response, tier: moment.model, author: "jess", poolName: "the gremlins", inviteCode: null }
      : null
    : live;

  if (!resolved) {
    return (
      <div className="screen" style={{ paddingBottom: 40, textAlign: "center", paddingTop: "30dvh" }}>
        <PLogo size={40} />
        <div className="display" style={{ fontSize: 22, marginTop: 16 }}>this share isn&apos;t here</div>
        <p style={{ color: "var(--dim)", fontSize: 12.5, marginTop: 8 }}>
          {demo ? "demo shares live on this device only. open the stream to see it." : "it may have been deleted, or the link is off."}
        </p>
        {demo ? (
          <a href="/stream" className="btn3" style={{ marginTop: 20 }}>back to stream</a>
        ) : (
          <a href="/onboarding" className="btn3" style={{ marginTop: 20 }}>start your own pool<RippleGlyph /></a>
        )}
      </div>
    );
  }

  return (
    <div className="screen" style={{ paddingBottom: 40 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "calc(12px + env(safe-area-inset-top)) 20px 0" }}>
        <PLogo size={26} />
        <div className="display" style={{ fontSize: 15, letterSpacing: 2 }}>pool</div>
      </header>

      <div style={{ margin: "26px 22px 0" }}>
        <span className="tag3 volt">shared from {resolved.poolName}</span>
        <div className="card3" style={{ padding: "26px 22px 22px", marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dim)" }}>&ldquo;{resolved.title}&rdquo;</div>
          <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.55, marginTop: 12, letterSpacing: -0.2 }}>
            {resolved.response}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
            <div className="display avatar" style={{ background: "#B7A6FF" }}>{resolved.author[0].toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{resolved.author}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dim)" }}>
                made with {MODELS[resolved.tier].emoji} {MODELS[resolved.tier].label} · {resolved.poolName}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card3-volt" style={{ margin: "26px 22px 0", padding: "22px 20px", textAlign: "center" }}>
        <div className="display" style={{ fontSize: 18, lineHeight: 1.25 }}>
          fast + smart + image gen from ${liveShareAt(4).toFixed(2)}/mo
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 9, lineHeight: 1.55, opacity: 0.85 }}>
          split with your friends like a netflix password.<br />solo would be <s style={{ opacity: 0.5 }}>${liveShareAt(1).toFixed(0)}/mo</s> · every friend drops the price.
        </div>
        {resolved.inviteCode ? (
          <>
            <a href={`/join/${resolved.inviteCode}`} className="btn3" style={{ marginTop: 16, background: "var(--ink)", color: "var(--volt)" }}>
              join {resolved.poolName} →
            </a>
            <Link href="/sign-up?redirect_url=%2Fonboarding" style={{ display: "block", marginTop: 12, fontSize: 12, fontWeight: 800, color: "var(--ink)", opacity: 0.75, textDecoration: "underline" }}>
              or start your own pool
            </Link>
          </>
        ) : (
          <Link href="/sign-up?redirect_url=%2Fonboarding" className="btn3" style={{ marginTop: 16, background: "var(--ink)", color: "var(--volt)" }}>
            start your pool<RippleGlyph />
          </Link>
        )}
      </div>
    </div>
  );
}
