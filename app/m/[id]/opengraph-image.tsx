import { ImageResponse } from "next/og";
import { supabaseService } from "@/lib/server/supabase";

// OG card for shared moments. Generated on demand when a /m/[id] link is
// pasted into iMessage/Twitter/Slack — the card IS the ad, so it leans into
// the pool's look (ink bg, volt accents) and teases the answer instead of
// repeating the title.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TIER_META: Record<string, { emoji: string; label: string }> = {
  cheap: { emoji: "⚡", label: "fast" },
  smart: { emoji: "🧠", label: "smart" },
  image: { emoji: "🎨", label: "image" },
};

// AI answers arrive as markdown; a link preview wants plain prose. Drop
// formatting glyphs and table scaffolding before truncating.
function stripMarkdown(s: string): string {
  return s
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/(\*\*|__|\*|_|`)/g, "") // emphasis + code marks
    .replace(/^\s*\|.*\|\s*$/gm, " ") // table rows
    .replace(/^\s*[-|:\s]+$/gm, " ") // table separator rows
    .replace(/^\s*[-*+]\s+/gm, "") // list bullets
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1"); // links → text
}

function truncate(s: string, n: number): string {
  const clean = stripMarkdown(s).replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1).trimEnd() + "…" : clean;
}

async function fetchMoment(id: string) {
  try {
    const db = supabaseService();
    const { data } = await db
      .from("shared_moments")
      .select("title, response, tier, profiles(display_name, handle), pools(name)")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const profile = data.profiles as unknown as { display_name: string; handle: string } | null;
    const pool = data.pools as unknown as { name: string } | null;
    return {
      title: data.title as string,
      response: data.response as string,
      tier: data.tier as string,
      author: profile?.display_name ?? profile?.handle ?? "a member",
      pool: pool?.name ?? "a pool",
    };
  } catch {
    return null;
  }
}

// Satori requires display: flex on every div that contains more than one
// child — including plain text children — so every div here is explicit.
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const moment = await fetchMoment(id);

  const tier = TIER_META[moment?.tier ?? "smart"] ?? TIER_META.smart;
  const question = moment ? truncate(moment.title, 110) : "this share is gone";
  const isImage = moment?.tier === "image";
  const teaser = moment && !isImage ? truncate(moment.response, 240) : null;
  const attribution = moment
    ? `made with ${tier.emoji} ${tier.label}`
    : "pool — split ai like a netflix password";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0E0C",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#3DFF88",
              color: "#0B0E0C",
              fontSize: 38,
              fontWeight: 900,
            }}
          >
            P
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: "#F2F0EA", letterSpacing: 4 }}>pool</div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              color: moment ? "#3DFF88" : "#6E7A72",
              border: "2px solid #28312A",
              borderRadius: 999,
              padding: "10px 22px",
            }}
          >
            {moment ? `shared from ${truncate(moment.pool, 24)}` : "joinpool.app"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#9AA79E", lineHeight: 1.35 }}>
            {`“${question}”`}
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#F2F0EA", lineHeight: 1.3, letterSpacing: -0.5 }}>
            {isImage ? "🎨 4 variants — tap to see them" : teaser ?? "the answer lived here once"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#B7A6FF",
              color: "#0B0E0C",
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            {moment ? moment.author[0].toUpperCase() : "P"}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 800, color: "#F2F0EA" }}>
              {moment?.author ?? "pool"}
            </div>
            <div style={{ display: "flex", fontSize: 19, fontWeight: 600, color: "#6E7A72" }}>{attribution}</div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              background: "#3DFF88",
              color: "#0B0E0C",
              borderRadius: 14,
              padding: "14px 24px",
              fontSize: 23,
              fontWeight: 900,
            }}
          >
            split ai like a netflix password →
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
