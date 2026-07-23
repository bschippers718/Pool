import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { supabaseService } from "@/lib/server/supabase";
import { setActivePool } from "@/lib/server/membership";

// POST /api/pools/switch { poolId } — point the app at another of your pools.
export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { poolId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.poolId) return Response.json({ error: "poolId is required" }, { status: 400 });

  const db = supabaseService();
  const { data: membership } = await db
    .from("pool_members")
    .select("pool_id, pools(name)")
    .eq("user_id", userId)
    .eq("pool_id", body.poolId)
    .maybeSingle();

  if (!membership) {
    return Response.json({ error: "You're not a member of that pool." }, { status: 403 });
  }

  await setActivePool(userId, body.poolId);
  const pool = membership.pools as unknown as { name: string } | null;
  return Response.json({ ok: true, name: pool?.name ?? "pool" });
}
