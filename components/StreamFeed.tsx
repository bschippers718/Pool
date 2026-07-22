"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MEMBERS, STREAM, type StreamPost } from "@/lib/data";
import { MODELS, demoMode, type ModelId } from "@/lib/pricing";
import { getSharedMoments, type SharedMoment } from "@/lib/demo-store";

const KIND_META: Record<string, { tag: string; color: string }> = {
  school: { tag: "📐 school", color: "var(--volt)" },
  art: { tag: "🎨 art", color: "var(--gold)" },
  wisdom: { tag: "🧠 wisdom", color: "#B7A6FF" },
  take: { tag: "💬 take", color: "var(--paper)" },
};

interface LiveMoment {
  id: string;
  title: string;
  response: string;
  tier: ModelId;
  createdAt: string;
  author: string;
}

const demo = demoMode();

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function StreamFeed() {
  const [shared, setShared] = useState<SharedMoment[]>([]);
  const [live, setLive] = useState<LiveMoment[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(demo ? "ready" : "loading");
  // Demo posts start from their seeded 🔥 counts so the feed doesn't look dead.
  const [reactions, setReactions] = useState<Record<string, number>>(() =>
    demo ? Object.fromEntries(STREAM.filter((p) => p.reacts["🔥"]).map((p) => [p.id, p.reacts["🔥"]])) : {}
  );

  useEffect(() => {
    if (demo) {
      const refresh = () => setShared(getSharedMoments());
      refresh();
      window.addEventListener("pool:shared", refresh);
      return () => window.removeEventListener("pool:shared", refresh);
    }
    let cancelled = false;
    fetch("/api/moments")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setLive(data.moments ?? []);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="stream-list">
      {demo &&
        shared.map((moment) => (
          <article key={moment.id}>
            <PostHeader name="you" color="#B7A6FF" time={moment.sharedAt} tag="💬 take" tagColor="var(--paper)" />
            <div className="card3" style={{ padding: "16px 16px 14px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dim)" }}>&ldquo;{moment.title}&rdquo;</div>
              <div style={{ marginTop: 9, fontSize: 14, lineHeight: 1.55, fontWeight: 600 }}>{moment.response}</div>
            </div>
            <PostFooter id={moment.id} model={moment.model} reach="squad only" reactions={reactions} setReactions={setReactions} />
          </article>
        ))}

      {!demo &&
        live.map((moment) => (
          <article key={moment.id}>
            <PostHeader
              name={moment.author}
              color={moment.author === "you" ? "#B7A6FF" : "#8FD6FF"}
              time={timeAgo(moment.createdAt)}
              tag={`${MODELS[moment.tier].emoji} ${MODELS[moment.tier].label}`}
              tagColor={moment.tier === "image" ? "var(--gold)" : "var(--volt)"}
            />
            <div className="card3" style={{ padding: "16px 16px 14px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dim)" }}>&ldquo;{moment.title}&rdquo;</div>
              <div style={{ marginTop: 9, fontSize: 14, lineHeight: 1.55, fontWeight: 600 }}>{moment.response}</div>
            </div>
            <PostFooter id={moment.id} model={moment.tier} reach="squad only" reactions={reactions} setReactions={setReactions} />
          </article>
        ))}

      {!demo && status === "loading" && (
        <div style={{ textAlign: "center", padding: 24, fontSize: 11, color: "var(--dim)", fontWeight: 600 }}>
          loading the stream…
        </div>
      )}

      {!demo && status === "error" && (
        <div className="card3" style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 30 }}>📡</div>
          <div className="display" style={{ fontSize: 15, marginTop: 8 }}>couldn&apos;t load the stream</div>
          <button className="btn3 ghost" style={{ marginTop: 14 }} onClick={() => window.location.reload()}>retry</button>
        </div>
      )}

      {!demo && status === "ready" && live.length === 0 && (
        <div className="card3" style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 30 }}>✨</div>
          <div className="display" style={{ fontSize: 15, marginTop: 8 }}>no shared intelligence yet</div>
          <div style={{ fontSize: 12, color: "var(--dim)", fontWeight: 600, marginTop: 6, lineHeight: 1.55 }}>
            get a great answer in chat, hit <b style={{ color: "var(--paper)" }}>↗ share</b> under it, and it lands here for the squad.
          </div>
          <Link href="/chat" className="btn3" style={{ marginTop: 16, display: "block" }}>go ask something ⚡</Link>
        </div>
      )}

      {demo && STREAM.map((post) => <DemoPost key={post.id} post={post} reactions={reactions} setReactions={setReactions} />)}
    </div>
  );
}

function PostHeader({ name, color, time, tag, tagColor }: { name: string; color: string; time: string; tag: string; tagColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
      <div className="display avatar" style={{ background: color }}>{name[0].toUpperCase()}</div>
      <div style={{ fontSize: 12.5, color: "var(--dim)", fontWeight: 600 }}>
        <b style={{ color: "var(--paper)" }}>{name}</b> · {time}
      </div>
      <span className="tag3" style={{ marginLeft: "auto", color: tagColor, borderColor: tagColor }}>{tag}</span>
    </div>
  );
}

function PostFooter({ id, model, reach, reactions, setReactions }: {
  id: string;
  model: keyof typeof MODELS;
  reach: string;
  reactions: Record<string, number>;
  setReactions: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11 }}>
        <button
          type="button"
          className="react-pill"
          aria-label={`fire reaction${reactions[id] ? `, ${reactions[id]}` : ""}`}
          onClick={() => setReactions((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }))}
        >
          🔥{reactions[id] ? ` ${reactions[id]}` : ""}
        </button>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--dim)", fontWeight: 700 }}>{reach}</span>
        <Link href={`/m/${id}`} style={{ fontSize: 10.5, fontWeight: 800, color: "var(--volt)", textTransform: "uppercase", letterSpacing: 0.5, textDecoration: "none" }}>
          open ↗
        </Link>
      </div>
      <div style={{ marginTop: 6, fontSize: 10, color: "var(--dim3)", fontWeight: 600 }}>
        via {MODELS[model].emoji} {MODELS[model].label} · shared on purpose
      </div>
    </>
  );
}

function DemoPost({ post, reactions, setReactions }: {
  post: StreamPost;
  reactions: Record<string, number>;
  setReactions: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}) {
  const member = MEMBERS.find((item) => item.id === post.memberId)!;
  const meta = KIND_META[post.kind];

  return (
    <article>
      <PostHeader name={member.name} color={member.color} time={post.time} tag={meta.tag} tagColor={meta.color} />
      <div className="card3" style={{ padding: "16px 16px 14px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dim)" }}>&ldquo;{post.title}&rdquo;</div>
        {post.kind === "school" && (
          <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.65, fontWeight: 600 }}>
            {post.body.map((step, index) => <div key={step} style={{ marginTop: 6 }}>{index + 1}. {step}</div>)}
          </div>
        )}
        {post.kind === "art" && <div className="art-demo">🪿🕶️</div>}
        {post.kind === "wisdom" && <div style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.55, fontWeight: 600 }}>{post.body[0]}</div>}
        {post.highlight && <div className="highlight">{post.highlight}</div>}
        {post.note && <div style={{ marginTop: 11, fontSize: 10.5, fontWeight: 700, color: "var(--dim2)" }}>{post.note}</div>}
      </div>
      <PostFooter id={post.id} model={post.model} reach={post.reach} reactions={reactions} setReactions={setReactions} />
    </article>
  );
}
