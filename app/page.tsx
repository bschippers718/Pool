import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { PLogo } from "@/components/Logo";
import { LockIcon, LedgerIcon, ReceiptIcon, RippleGlyph } from "@/components/Icons";
import { liveShareAt } from "@/lib/pricing";

const demo = process.env.NEXT_PUBLIC_POOL_DEMO_MODE !== "false";

function shareAt(members: number): string {
  return liveShareAt(members).toFixed(2);
}

// Public hero for signed-out visitors. Signed-in members skip straight to chat.
export default async function Home() {
  if (demo) redirect("/chat");
  const { userId } = await auth();
  if (userId) redirect("/chat");

  return (
    <div className="screen" style={{ position: "relative", overflow: "hidden", padding: "calc(16px + env(safe-area-inset-top)) 24px calc(28px + env(safe-area-inset-bottom))" }}>
      {/* ambient volt glow */}
      <div style={{ position: "absolute", top: -140, right: -120, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(61,255,136,0.16), transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -160, left: -140, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(61,255,136,0.08), transparent 65%)", pointerEvents: "none" }} />

      <header style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
        <PLogo size={30} />
        <div className="display" style={{ fontSize: 17, letterSpacing: 2 }}>pool</div>
        <Link href="/sign-in" style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 800, color: "var(--volt)", textDecoration: "none", padding: "8px 4px" }}>
          sign in →
        </Link>
      </header>

      <div style={{ marginTop: "7dvh", position: "relative" }}>
        <span className="tag3 volt">closed alpha · free right now</span>
        <h1 className="display" style={{ fontSize: "clamp(32px, 11vw, 44px)", lineHeight: 1.02, letterSpacing: -1, margin: "16px 0 0" }}>
          pool
          <br />
          <span style={{ color: "var(--volt)" }}>intelligence</span>
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--dim)", fontWeight: 600, lineHeight: 1.6, marginTop: 14, maxWidth: 320 }}>
          one shared AI budget for your whole crew — fast ⚡ · smart 🧠 · image 🎨. split it like a netflix password. everyone pays less.
        </p>
      </div>

      <div className="card3" style={{ marginTop: 26, padding: "18px 18px 16px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--dim)" }}>going solo</div>
            <div className="display num" style={{ fontSize: 22, color: "var(--dim)", marginTop: 4 }}>
              <s style={{ textDecorationThickness: 2, opacity: 0.8 }}>${shareAt(1)}</s>
              <span style={{ fontSize: 12, fontWeight: 700 }}>/mo</span>
            </div>
          </div>
          <div style={{ fontSize: 20, color: "var(--dim2)" }}>→</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--volt)" }}>4 of you, one pool</div>
            <div className="display num" style={{ fontSize: 30, color: "var(--volt)", marginTop: 2, letterSpacing: -0.5 }}>
              ${shareAt(4)}
              <span style={{ fontSize: 13, fontWeight: 700 }}>/mo each</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--dim)", fontWeight: 600, lineHeight: 1.55 }}>
          every friend you invite drops the price. flat <b style={{ color: "var(--paper)" }}>$1/member</b> platform fee — that&apos;s the whole business model.
        </div>
      </div>

      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
        <Link href="/sign-up?redirect_url=%2Fonboarding" className="btn3" style={{ display: "block", textAlign: "center" }}>
          start a pool
          <RippleGlyph />
        </Link>
        <Link href="/sign-up?redirect_url=%2Fonboarding%3Fmode%3Djoin" className="btn3 ghost" style={{ display: "block", textAlign: "center" }}>
          join with an invite code
        </Link>
      </div>

      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 9 }}>
        {([
          [<LockIcon key="lock" />, "private until you share", "your chats are yours. the pool only counts requests."],
          [<LedgerIcon key="ledger" />, "the ledger keeps it fair", "who's carrying, who's cooked — no awkward money talk."],
          [<ReceiptIcon key="receipt" />, "the drop", "a monthly receipt that flexes how little you paid."],
        ] as [React.ReactNode, string, string][]).map(([icon, title, sub]) => (
          <div key={title} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "var(--card)", border: "1.5px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
              <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 600, marginTop: 1 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 28, fontSize: 10.5, color: "var(--dim2)", fontWeight: 600 }}>
        pool v0.1 · we count requests, never content
      </div>
    </div>
  );
}
