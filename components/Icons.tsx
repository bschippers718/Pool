// Custom stroke icons drawn for the volt-on-ink theme — replaces generic
// emoji where the UI needs to feel designed, not defaulted.

export function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="3.5" stroke="var(--paper)" strokeWidth="2" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.9" fill="var(--volt)" />
    </svg>
  );
}

export function LedgerIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="12" width="4.5" height="8.5" rx="1.8" fill="var(--dim)" />
      <rect x="9.75" y="5" width="4.5" height="15.5" rx="1.8" fill="var(--volt)" />
      <rect x="16" y="9" width="4.5" height="11.5" rx="1.8" fill="var(--paper)" />
    </svg>
  );
}

export function ReceiptIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3.5h12V20l-2-1.6-2 1.6-2-1.6L10 20l-2-1.6L6 20V3.5Z"
        stroke="var(--paper)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 8h6M9 11.5h6" stroke="var(--dim)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 15h3.5" stroke="var(--volt)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// Small inline ripple for button labels — the brand mark doing the work the
// 8-ball used to do. Inherits the button's text color.
export function RippleGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      style={{ verticalAlign: "-2px", marginLeft: 7 }}
    >
      <circle cx="24" cy="24" r="6" fill="currentColor" />
      <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth="4.5" opacity="0.6" />
      <circle cx="24" cy="24" r="20.5" stroke="currentColor" strokeWidth="3.5" opacity="0.28" />
    </svg>
  );
}
