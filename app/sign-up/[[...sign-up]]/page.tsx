import { SignUp } from "@clerk/nextjs";
import { PLogo } from "@/components/Logo";
import { clerkAppearance } from "@/lib/clerk-appearance";

const demoMode = process.env.NEXT_PUBLIC_POOL_DEMO_MODE !== "false";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  const joiningPool = redirect_url?.includes("/join/") ?? false;
  if (demoMode) {
    return (
      <div className="screen" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "24dvh", gap: 18, textAlign: "center" }}>
        <PLogo size={40} />
        <div className="display" style={{ fontSize: 22 }}>demo mode</div>
        <p style={{ color: "var(--dim)", fontSize: 12.5, fontWeight: 600, maxWidth: 260, lineHeight: 1.55 }}>
          auth is off while <code>NEXT_PUBLIC_POOL_DEMO_MODE=true</code>. set up Clerk and flip the flag to go live.
        </p>
        <a href="/chat" className="btn3">back to the demo →</a>
      </div>
    );
  }
  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "10dvh", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <PLogo size={34} />
        <div className="display" style={{ fontSize: 20, letterSpacing: 2 }}>pool</div>
      </div>
      <div style={{ textAlign: "center", maxWidth: 300 }}>
        <div className="display" style={{ fontSize: 17, lineHeight: 1.3 }}>
          {joiningPool ? "one step from the pool" : "split ai like a netflix password"}
        </div>
        <p style={{ color: "var(--dim)", fontSize: 12.5, fontWeight: 600, marginTop: 8, lineHeight: 1.55 }}>
          {joiningPool
            ? "finish signing up and you land straight in your friend's pool."
            : "one shared ai budget for your crew — fast ⚡ smart 🧠 image 🎨. closed alpha, free right now."}
        </p>
      </div>
      {/* forceRedirectUrl keeps query-bearing destinations (e.g. /join/CODE?auto=1) intact. */}
      <SignUp appearance={clerkAppearance} forceRedirectUrl={redirect_url} />
    </div>
  );
}
