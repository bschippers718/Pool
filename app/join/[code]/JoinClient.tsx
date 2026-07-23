"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLogo } from "@/components/Logo";

interface Props {
  code: string;
  valid: boolean;
  poolName: string | null;
  poolEmoji: string | null;
}

export default function JoinClient({ code, valid, poolName, poolEmoji }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [alreadyPooled, setAlreadyPooled] = useState(false);
  const autoTried = useRef(false);

  // Coming back from sign-up (?auto=1): they already tapped join once,
  // so finish the join for them instead of asking for a second tap.
  useEffect(() => {
    if (!valid || autoTried.current) return;
    if (new URLSearchParams(window.location.search).get("auto") === "1") {
      autoTried.current = true;
      join(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid]);

  async function join(auto = false) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pools/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      // Signed out: bounce through sign-up and come right back to this invite.
      if (res.status === 401) {
        if (auto) {
          // Auto attempt while still signed out — don't loop, let them tap.
          setBusy(false);
          return;
        }
        router.push(`/sign-up?redirect_url=${encodeURIComponent(`/join/${code}?auto=1`)}`);
        return;
      }

      const data = await res.json().catch(() => null);
      if (res.status === 409) {
        setAlreadyPooled(true);
        setError(data?.error ?? "you're already in a pool");
        setBusy(false);
        return;
      }
      if (!res.ok) {
        const friendly =
          res.status === 404
            ? "that code doesn't exist — double-check the link"
            : res.status === 410
              ? "this invite expired or maxed out — ask for a fresh one"
              : "couldn't join — try again in a sec";
        throw new Error(data?.error && res.status < 500 ? data.error : friendly);
      }
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't join — try again");
      setBusy(false);
    }
  }

  return (
    <div className="screen" style={{ padding: "calc(20px + env(safe-area-inset-top)) 22px 40px", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <PLogo size={30} />
        <div className="display" style={{ fontSize: 16, letterSpacing: 2 }}>pool</div>
      </div>

      <div style={{ marginTop: "18dvh" }}>
        {valid ? (
          <>
            <div style={{ fontSize: 52 }}>{poolEmoji ?? "🌊"}</div>
            <div className="display" style={{ fontSize: 26, marginTop: 12 }}>
              you&apos;re invited to<br />{poolName ?? "a pool"}
            </div>
            <div style={{ fontSize: 13, color: "var(--dim)", fontWeight: 600, marginTop: 10, lineHeight: 1.55 }}>
              fast ⚡ · smart 🧠 · image 🎨 — one shared budget,<br />everyone pays less.
            </div>
            <button className="btn3" style={{ marginTop: 26, width: "100%" }} disabled={busy} onClick={() => join()}>
              {busy ? "joining…" : "join the pool →"}
            </button>
            <Link
              href="/sign-up?redirect_url=%2Fonboarding%3Fmode%3Dcreate"
              style={{ display: "block", marginTop: 14, fontSize: 12, fontWeight: 700, color: "var(--dim)", textDecoration: "none", padding: "6px 0" }}
            >
              or start a pool of your own <span style={{ color: "var(--volt)" }}>→</span>
            </Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: 44 }}>😬</div>
            <div className="display" style={{ fontSize: 22, marginTop: 14 }}>this invite is cooked</div>
            <div style={{ fontSize: 13, color: "var(--dim)", fontWeight: 600, marginTop: 10 }}>
              it&apos;s expired, maxed out, or never existed.<br />ask for a fresh one.
            </div>
            <Link className="btn3 ghost" style={{ marginTop: 26, display: "block" }} href="/sign-up?redirect_url=%2Fonboarding">
              start your own pool
            </Link>
          </>
        )}
        {error && <div className="error-banner" style={{ marginTop: 14 }}>{error}</div>}
        {alreadyPooled && (
          <a href="/chat" className="btn3 ghost" style={{ marginTop: 12, display: "block" }}>
            open your pool →
          </a>
        )}
      </div>
    </div>
  );
}
