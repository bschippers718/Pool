"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PLogo, RippleLogo } from "@/components/Logo";
import { RippleGlyph } from "@/components/Icons";
import { MODELS, liveShareAt, selectableTiers } from "@/lib/pricing";

function shareAt(members: number): string {
  return liveShareAt(members).toFixed(2);
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="screen" style={{ display: "grid", placeItems: "center", minHeight: "80dvh" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PLogo size={30} />
            <div className="display" style={{ fontSize: 16, letterSpacing: 2 }}>pool</div>
          </div>
        </div>
      }
    >
      <Onboarding />
    </Suspense>
  );
}

function Onboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep links can open join mode directly: /onboarding?mode=join
  const [mode, setMode] = useState<"pick" | "create" | "join">(() =>
    searchParams.get("mode") === "join" ? "join" : "pick"
  );
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [alreadyPooled, setAlreadyPooled] = useState(false);
  const [created, setCreated] = useState<{ name: string; inviteCode: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  async function createPool(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setAlreadyPooled(true);
        throw new Error(data.error ?? "you're already in a pool");
      }
      if (!res.ok) throw new Error(data.error ?? "failed");
      setCreated({ name: data.pool?.name ?? name.trim(), inviteCode: data.inviteCode ?? null });
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't create the pool — try again");
      setBusy(false);
    }
  }

  async function joinPool(e?: React.FormEvent) {
    e?.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pools/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setAlreadyPooled(true);
        throw new Error(data.error ?? "you're already in a pool");
      }
      if (!res.ok) throw new Error(data.error ?? "couldn't join — check the code");
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't join — check the code");
      setBusy(false);
    }
  }

  async function copyInvite() {
    if (!created?.inviteCode) return;
    const link = `${window.location.origin}/join/${created.inviteCode}`;
    const text = `join my AI pool "${created.name}" — we split one budget and everyone pays less 🌊 ${link}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Join my pool", text, url: link });
        setCopied(true);
      } catch {
        /* dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      window.prompt("copy your invite link:", link);
      setCopied(true);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", marginTop: 10, background: "var(--card)", border: "1.5px solid var(--line)",
    borderRadius: 14, padding: "14px 16px", color: "var(--paper)", fontSize: 16, fontFamily: "inherit",
    fontWeight: 600, outline: "none",
  };

  // Pool created: celebrate + push the invite before anything else.
  if (created) {
    return (
      <div className="screen" style={{ padding: "calc(20px + env(safe-area-inset-top)) 22px 40px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <PLogo size={32} />
          <div className="display" style={{ fontSize: 18, letterSpacing: 2 }}>pool</div>
        </div>
        <div style={{ marginTop: "14dvh" }}><RippleLogo size={52} /></div>
        <div className="display" style={{ fontSize: 26, marginTop: 12 }}>{created.name}<br />is open</div>
        <div style={{ fontSize: 13, color: "var(--dim)", fontWeight: 600, marginTop: 12, lineHeight: 1.6 }}>
          solo you&apos;d pay ${shareAt(1)}/mo — invite friends now and<br />
          <b style={{ color: "var(--volt)" }}>4 of you pay ${shareAt(4)} each</b>
        </div>
        {created.inviteCode && (
          <>
            <button className="btn3" style={{ marginTop: 26, width: "100%" }} onClick={copyInvite}>
              {copied ? "invite sent ✓ send more" : "invite the crew 🔗"}
            </button>
            <div className="num" style={{ marginTop: 12, fontSize: 13, color: "var(--dim)", fontWeight: 700, letterSpacing: 2 }}>
              code: <b style={{ color: "var(--volt)" }}>{created.inviteCode}</b>
            </div>
          </>
        )}
        <a href="/chat" className="btn3 ghost" style={{ marginTop: 14, display: "block" }}>
          start chatting →
        </a>
      </div>
    );
  }

  return (
    <div className="screen" style={{ padding: "calc(20px + env(safe-area-inset-top)) 22px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <PLogo size={32} />
        <div className="display" style={{ fontSize: 18, letterSpacing: 2 }}>pool</div>
      </div>

      <div className="display" style={{ fontSize: 30, marginTop: 40, lineHeight: 1.15 }}>
        split ai like a<br />netflix password
      </div>
      <div style={{ fontSize: 13.5, color: "var(--dim)", fontWeight: 600, marginTop: 12, lineHeight: 1.55 }}>
        one shared capacity budget for your group. {selectableTiers().map((t) => `${MODELS[t].emoji} ${MODELS[t].label}`).join(" · ")}. everyone pays less.
      </div>
      <div style={{ fontSize: 12, color: "var(--dim2)", fontWeight: 700, marginTop: 10 }}>
        solo ≈ ${shareAt(1)}/mo · 4 of you ≈ <b style={{ color: "var(--volt)" }}>${shareAt(4)}/mo each</b> · closed alpha, nothing charged yet
      </div>

      {mode === "pick" && (
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn3" onClick={() => setMode("create")}>start a pool<RippleGlyph /></button>
          <button className="btn3 ghost" onClick={() => setMode("join")}>join with an invite code</button>
        </div>
      )}

      {mode === "create" && (
        <form style={{ marginTop: 34 }} onSubmit={createPool}>
          <label className="display" htmlFor="pool-name" style={{ fontSize: 13, color: "var(--volt)", letterSpacing: 1 }}>NAME YOUR POOL</label>
          <input
            id="pool-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="the gremlins"
            maxLength={40}
            autoComplete="off"
            style={inputStyle}
          />
          <button type="submit" className="btn3" style={{ marginTop: 14, width: "100%" }} disabled={busy || !name.trim()}>
            {busy ? "creating…" : "create pool"}
          </button>
          <button type="button" className="btn3 ghost" style={{ marginTop: 9, width: "100%" }} onClick={() => setMode("pick")}>back</button>
        </form>
      )}

      {mode === "join" && (
        <form style={{ marginTop: 34 }} onSubmit={joinPool}>
          <label className="display" htmlFor="invite-code" style={{ fontSize: 13, color: "var(--volt)", letterSpacing: 1 }}>INVITE CODE</label>
          <input
            id="invite-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="x7k2p9"
            maxLength={12}
            autoComplete="off"
            autoCapitalize="none"
            style={{ ...inputStyle, fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: "lowercase" }}
          />
          <button type="submit" className="btn3" style={{ marginTop: 14, width: "100%" }} disabled={busy || !code.trim()}>
            {busy ? "joining…" : "join the pool"}
          </button>
          <button type="button" className="btn3 ghost" style={{ marginTop: 9, width: "100%" }} onClick={() => setMode("pick")}>back</button>
        </form>
      )}

      {error && <div className="error-banner" style={{ marginTop: 14 }}>{error}</div>}
      {alreadyPooled && (
        <a href="/chat" className="btn3 ghost" style={{ marginTop: 12, display: "block" }}>
          open your pool →
        </a>
      )}
    </div>
  );
}
