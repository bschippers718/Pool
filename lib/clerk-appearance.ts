// Shared Clerk appearance mapped to the Pool volt palette.
// Uses the `variables` API so the whole component (text, inputs, links,
// social buttons) renders dark — not just the card shell.
export const clerkAppearance = {
  variables: {
    colorBackground: "#151A16",
    colorText: "#F2F0EA",
    colorTextSecondary: "#8B9184",
    colorPrimary: "#3DFF88",
    colorTextOnPrimaryBackground: "#0B0E0C",
    colorInputBackground: "#10140F",
    colorInputText: "#F2F0EA",
    colorNeutral: "#F2F0EA",
    colorDanger: "#FF6B2C",
    borderRadius: "14px",
    fontFamily: "'Space Grotesk', -apple-system, sans-serif",
  },
  elements: {
    card: { border: "1.5px solid #28312A", boxShadow: "none" },
    formButtonPrimary: {
      background: "#3DFF88",
      color: "#0B0E0C",
      fontWeight: 800,
      textTransform: "lowercase" as const,
      "&:hover": { background: "#35E67A" },
    },
    footer: { background: "transparent" },
    footerActionLink: { color: "#3DFF88" },
    headerTitle: { color: "#F2F0EA" },
    headerSubtitle: { color: "#8B9184" },
    socialButtonsBlockButton: {
      background: "#10140F",
      border: "1.5px solid #28312A",
      color: "#F2F0EA",
    },
    dividerLine: { background: "#28312A" },
    dividerText: { color: "#55604F" },
    formFieldLabel: { color: "#8B9184" },
    formFieldInput: {
      background: "#10140F",
      border: "1.5px solid #28312A",
      color: "#F2F0EA",
      fontSize: "16px", // ≥16px prevents iOS focus auto-zoom
    },
    identityPreview: { background: "#10140F", border: "1.5px solid #28312A" },
    identityPreviewText: { color: "#F2F0EA" },
    otpCodeFieldInput: {
      background: "#10140F",
      border: "1.5px solid #28312A",
      color: "#F2F0EA",
      fontSize: "16px",
    },
  },
};
