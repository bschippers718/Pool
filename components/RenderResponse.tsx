import { type ModelId } from "@/lib/pricing";

// Detects if a response is a bare image URL (xAI Imagine returns URLs, not base64).
// The URL pattern is: https://imagen.x.ai/xai-imagen/...jpeg (or .png/.webp)
export function isImageUrl(text: string): boolean {
  return /^https?:\/\/[^\s]+\.(jpe?g|png|webp|gif)$/i.test(text.trim());
}

interface RenderResponseProps {
  response: string;
  tier: ModelId;
  style?: React.CSSProperties;
}

// Renders the response appropriately: images as <img>, text as formatted text.
export default function RenderResponse({ response, tier, style }: RenderResponseProps) {
  if (tier === "image" && isImageUrl(response)) {
    return (
      <img
        src={response}
        alt="generated image"
        style={{
          width: "100%",
          maxWidth: 500,
          borderRadius: 12,
          border: "1.5px solid var(--line)",
          ...style,
        }}
      />
    );
  }
  return <div style={style}>{response}</div>;
}
