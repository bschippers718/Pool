import Link from "next/link";
import { PLogo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div>
        <PLogo size={46} />
        <div className="display" style={{ fontSize: 30, marginTop: 18 }}>nothing here</div>
        <p style={{ color: "var(--dim)", fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
          this page doesn&apos;t exist — the link may be wrong or expired.
        </p>
        {/* "/" is public: hero for signed-out visitors, redirects members to /chat. */}
        <Link href="/" className="btn3" style={{ marginTop: 22 }}>back to the pool →</Link>
      </div>
    </main>
  );
}
