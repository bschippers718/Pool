import { ImageResponse } from "next/og";

// Homepage OG card — the pitch, in pool's look. Shown when joinpool.app
// itself is pasted into a chat (no /m/[id] involved).
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0E0C",
          fontFamily: "sans-serif",
          gap: 34,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 110,
            height: 110,
            borderRadius: 30,
            background: "#3DFF88",
            color: "#0B0E0C",
            fontSize: 66,
            fontWeight: 900,
          }}
        >
          P
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 900,
            color: "#F2F0EA",
            letterSpacing: -2,
            textAlign: "center",
            lineHeight: 1.1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>split ai like a</span>
          <span style={{ color: "#3DFF88" }}>netflix password</span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#6E7A72" }}>
          one shared budget · ⚡ fast · 🧠 smart · 🎨 image
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 900,
            color: "#0B0E0C",
            background: "#3DFF88",
            borderRadius: 14,
            padding: "16px 30px",
          }}
        >
          joinpool.app
        </div>
      </div>
    ),
    { ...size }
  );
}
