export function RippleLogo({ size = 32, color = "#3DFF88" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Pool">
      <circle cx="24" cy="24" r="6" fill={color} />
      <circle cx="24" cy="24" r="13" fill="none" stroke={color} strokeWidth="4" opacity="0.7" />
      <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="3" opacity="0.35" />
    </svg>
  );
}

export function PLogo({
  size = 26,
  color = "#3DFF88",
  knockout = "#0B0E0C",
}: {
  size?: number;
  color?: string;
  knockout?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Pool">
      <path
        d="M13 44V4h16a13 13 0 0 1 0 26H13Z"
        fill={color}
      />
      <path d="M21 1v46" stroke={knockout} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}
