import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { supabaseService } from "@/lib/server/supabase";
import { resolveActiveMembership, setActivePool } from "@/lib/server/membership";

// POST /api/pools/leave { poolId? } — leave one of your pools (defaults to the
// active one). Owners can't leave a pool they own: budget and members hang off them.
export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body: { poolId?: string } = await req.json().catch(() => ({}));

  const active = await resolveActiveMembership(userId);
  if (!active) return Response.json({ error: "You're not in a pool." }, { status: 404 });

  const target = body.poolId
    ? active.memberships.find((m) => m.poolId === body.poolId)
    : active.memberships.find((m) => m.poolId === active.poolId);
  if (!target) {
    return Response.json({ error: "You're not a member of that pool." }, { status: 404 });
  }

  if (target.role === "owner" || target.pool.owner_id === userId) {
    return Response.json(
      { error: "You own this pool — owners can't leave it during the beta." },
      { status: 403 }
    );
  }

  const db = supabaseService();
  const { error: leaveErr } = await db
    .from("pool_members")
    .delete()
    .eq("pool_id", target.poolId)
    .eq("user_id", userId);
  if (leaveErr) return Response.json({ error: leaveErr.message }, { status: 500 });

  // Repoint the active pool if they just left it.
  if (active.poolId === target.poolId) {
    const next = active.memberships.find((m) => m.poolId !== target.poolId);
    await setActivePool(userId, next?.poolId ?? null);
  }

  return Response.json({ left: target.pool.name });
}
