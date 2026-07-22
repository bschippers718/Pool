import { supabaseConfigured, supabaseService } from "@/lib/server/supabase";
import JoinClient from "./JoinClient";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // Demo mode or unconfigured env: render the invite shell without a DB lookup.
  if (!supabaseConfigured()) {
    return <JoinClient code={code.toLowerCase()} valid={false} poolName={null} poolEmoji={null} />;
  }

  const db = supabaseService();

  const { data: invite } = await db
    .from("invites")
    .select("code, expires_at, uses, max_uses, pools(name, emoji)")
    .eq("code", code.toLowerCase())
    .maybeSingle();

  const pool = invite?.pools as unknown as { name: string; emoji: string } | null;
  const expired = invite?.expires_at ? new Date(invite.expires_at) < new Date() : false;
  const maxed = invite ? invite.uses >= invite.max_uses : false;
  const valid = Boolean(invite) && !expired && !maxed;

  return (
    <JoinClient
      code={code.toLowerCase()}
      valid={valid}
      poolName={pool?.name ?? null}
      poolEmoji={pool?.emoji ?? null}
    />
  );
}
