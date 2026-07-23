"use client";

import { useState } from "react";
import { MODELS, demoMode, type ModelId } from "@/lib/pricing";
import { shareMoment } from "@/lib/demo-store";

interface ShareSheetProps {
  title: string;
  response: string;
  model: ModelId;
  onClose: () => void;
}

const demo = demoMode();

export default function ShareSheet({ title, response, model, onClose }: ShareSheetProps) {
  const [shared, setShared] = useState<{ id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function shareToSquad(): Promise<string | null> {
    if (demo) {
      const moment = shareMoment({ title, response, model });
      setShared({ id: moment.id });
      return moment.id;
    }
    try {
      const res = await fetch("/api/moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, response, tier: model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setShared({ id: data.id });
      return data.id as string;
    } catch {
      setError("couldn't share right now — try again");
      return null;
    }
  }

  async function handleShare() {
    await shareToSquad();
  }

  async function copyLink() {
    const id = shared?.id ?? (await shareToSquad());
    if (!id) return;
    const url = `${window.location.origin}/m/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <section className="share-sheet" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label="Share this answer">
        <div className="sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div className="display" style={{ fontSize: 18 }}>share the good part</div>
            <div style={{ color: "var(--dim)", fontSize: 11.5, fontWeight: 600, marginTop: 3 }}>
              only this answer — the rest of your chat stays private
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close share sheet">×</button>
        </div>

        <div className="share-preview">
          <div style={{ color: "var(--dim)", fontSize: 11, fontWeight: 700 }}>&ldquo;{title}&rdquo;</div>
          {model === "image" && response.startsWith("http") ? (
            <img
              src={response}
              alt={title}
              style={{ width: "100%", borderRadius: 10, marginTop: 8, border: "1px solid var(--line)" }}
            />
          ) : (
            <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 8 }}>
              {response.length > 190 ? `${response.slice(0, 190)}…` : response}
            </div>
          )}
          <div style={{ color: "var(--volt)", fontSize: 10.5, fontWeight: 800, marginTop: 10 }}>
            {MODELS[model].emoji} {MODELS[model].label} · shared on purpose
          </div>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: 10 }}>{error}</div>}

        <button className="btn3" onClick={handleShare} disabled={shared !== null}>
          {shared ? "added to squad stream ✓" : "share to squad ✨"}
        </button>
        <button className="btn3 ghost" style={{ marginTop: 9 }} onClick={copyLink}>
          {copied ? "link copied ✓" : "copy public link ↗"}
        </button>
        <div style={{ fontSize: 10.5, color: "var(--dim)", fontWeight: 600, marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>
          squad = your pool&apos;s stream · public link = anyone with the url
          {!shared && " (also posts to squad)"}
        </div>
      </section>
    </div>
  );
}
