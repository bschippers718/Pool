import { PLogo } from "@/components/Logo";
import MomentLink from "@/components/MomentLink";
import { STREAM, MEMBERS } from "@/lib/data";
import { MODELS, demoMode } from "@/lib/pricing";

export default async function DeepLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Live mode: resolve through the API (MomentLink fetches /api/moments/[id]).
  if (!demoMode()) return <MomentLink id={id} />;

  const post = STREAM.find((p) => p.id === id);
  if (!post) return <MomentLink id={id} />;
  const member = MEMBERS.find((m) => m.id === post.memberId)!;

  return (
    <div className="screen" style={{ paddingBottom: 40 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "calc(12px + env(safe-area-inset-top)) 20px 0" }}>
        <PLogo size={26} />
        <div className="display" style={{ fontSize: 15, letterSpacing: 2 }}>pool</div>
      </header>

      <div style={{ margin: "26px 22px 0" }}>
        <span className="tag3 volt">a take from the gremlins</span>
        <div className="card3" style={{ padding: "26px 22px 22px", marginTop: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4, letterSpacing: -0.3 }}>
            &ldquo;{post.title}&rdquo;
          </div>
          {post.highlight && (
            <div style={{ marginTop: 12, fontSize: 16, lineHeight: 1.5 }}>
              <span style={{ background: "var(--ink)", color: "var(--volt)", padding: "2px 8px", borderRadius: 8, border: "1.5px solid var(--volt-line)" }}>
                {post.highlight}
              </span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
            <div className="display" style={{ width: 34, height: 34, borderRadius: "50%", background: member.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--ink)" }}>
              {member.name[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{member.name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dim)" }}>
                made with {MODELS[post.model].emoji} {MODELS[post.model].label} · the gremlins pool
              </div>
            </div>
            <div className="display num" style={{ marginLeft: "auto", fontSize: 13, background: "var(--ink)", color: "var(--volt)", padding: "6px 11px", borderRadius: 9, border: "1.5px solid var(--volt-line)" }}>
              $1.20/wk
            </div>
          </div>
        </div>
      </div>

      <div className="card3-volt" style={{ margin: "26px 22px 0", padding: "22px 20px", textAlign: "center" }}>
        <div className="display" style={{ fontSize: 18, lineHeight: 1.25, marginTop: 2 }}>
          fast + smart + image gen for $6/mo
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 9, lineHeight: 1.55, opacity: 0.85 }}>
          split with your friends like a netflix password.<br />retail <s style={{ opacity: 0.5 }}>$60/mo</s> · every friend drops the price.
        </div>
        <a href="/onboarding" className="btn3" style={{ marginTop: 16, background: "var(--ink)", color: "var(--volt)" }}>
          start your pool →
        </a>
        <div style={{ marginTop: 11, fontSize: 10.5, fontWeight: 600, opacity: 0.65 }}>takes 60 seconds · free til 2 friends join</div>
      </div>
    </div>
  );
}
