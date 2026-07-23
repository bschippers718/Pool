import { requireUserId } from "@/lib/server/auth";
import { supabaseService } from "@/lib/server/supabase";

// POST /api/pools/leave — a member leaves their pool (so they can start their own).
// Owners can't leave: the pool's budget and members hang off them.
export async function POST() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseService();
  const { data: membership } = await db
    .from("pool_members")
    .select("pool_id, role, pools(name, owner_id)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return Response.json({ error: "You're not in a pool." }, { status: 404 });
  }

  const pool = membership.pools as unknown as { name: string; owner_id: string } | null;
  if (membership.role === "owner" || pool?.owner_id === userId) {
    return Response.json(
      { error: "You own this pool — owners can't leave it during the alpha." },
      { status: 403 }
    );
  }

  const { error: leaveErr } = await db
    .from("pool_members")
    .delete()
    .eq("pool_id", membership.pool_id)
    .eq("user_id", userId);
  if (leaveErr) return Response.json({ error: leaveErr.message }, { status: 500 });

  return Response.json({ left: pool?.name ?? "your pool" });
}
