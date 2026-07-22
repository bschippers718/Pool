import { formatCents } from "@/lib/pricing";

export default function SavedChip({ dollars, gold }: { dollars: number; gold?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 800,
        color: gold ? "var(--gold)" : "var(--volt)",
        background: gold ? "rgba(255,194,77,0.08)" : "var(--volt-dim)",
        border: `1px solid ${gold ? "rgba(255,194,77,0.35)" : "var(--volt-line)"}`,
        padding: "3.5px 8px",
        borderRadius: 999,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      ≈ saved {formatCents(dollars)}
    </span>
  );
}
