import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { supabaseService } from "@/lib/server/supabase";

// POST /api/pools/join { code } — redeem an invite code.
export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const code = body.code?.trim().toLowerCase();
  if (!code) return Response.json({ error: "Invite code is required" }, { status: 400 });

  const db = supabaseService();
  const { data: invite } = await db
    .from("invites")
    .select("id, pool_id, uses, max_uses, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!invite) return Response.json({ error: "That invite code doesn't exist." }, { status: 404 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return Response.json({ error: "That invite expired." }, { status: 410 });
  }
  if (invite.uses >= invite.max_uses) {
    return Response.json({ error: "That invite is maxed out." }, { status: 410 });
  }

  const { data: memberships } = await db
    .from("pool_members")
    .select("pool_id, pools(name)")
    .eq("user_id", userId);

  const alreadyInThisPool = (memberships ?? []).some((m) => m.pool_id === invite.pool_id);
  const otherPool = (memberships ?? []).find((m) => m.pool_id !== invite.pool_id);

  if (otherPool) {
    const current = otherPool.pools as unknown as { name: string } | null;
    return Response.json(
      { error: `You're already in "${current?.name ?? "another pool"}" — one pool per person during the alpha.` },
      { status: 409 }
    );
  }

  if (!alreadyInThisPool) {
    const { error: joinErr } = await db
      .from("pool_members")
      .insert({ pool_id: invite.pool_id, user_id: userId, role: "member" });
    if (joinErr) return Response.json({ error: joinErr.message }, { status: 500 });
    await db.from("invites").update({ uses: invite.uses + 1 }).eq("id", invite.id);
  }

  const { data: pool } = await db
    .from("pools")
    .select("id, name, emoji")
    .eq("id", invite.pool_id)
    .single();

  return Response.json({ pool });
}
