import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/server/supabase";

// GET /api/moments/[id] — public read for the /m/:id deep-link page.
// Only explicitly shared moments are exposed here; chat content never is.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseService();

  const { data: moment } = await db
    .from("shared_moments")
    .select("id, pool_id, title, response, tier, created_at, profiles(display_name, handle), pools(name)")
    .eq("id", id)
    .maybeSingle();

  if (!moment) return Response.json({ error: "not_found" }, { status: 404 });

  const profile = moment.profiles as unknown as { display_name: string; handle: string } | null;
  const pool = moment.pools as unknown as { name: string } | null;

  // Invite codes are shareable by design (capped by max_uses) — surfacing one
  // here lets a viewer join the sharer's squad instead of starting from zero.
  const { data: invite } = await db
    .from("invites")
    .select("code, uses, max_uses, expires_at")
    .eq("pool_id", moment.pool_id)
    .limit(1)
    .maybeSingle();
  const inviteUsable =
    invite &&
    invite.uses < invite.max_uses &&
    (!invite.expires_at || new Date(invite.expires_at) > new Date());

  return Response.json({
    moment: {
      id: moment.id,
      title: moment.title,
      response: moment.response,
      tier: moment.tier,
      createdAt: moment.created_at,
      author: profile?.display_name ?? profile?.handle ?? "a member",
      poolName: pool?.name ?? "a pool",
      inviteCode: inviteUsable ? invite!.code : null,
    },
  });
}
