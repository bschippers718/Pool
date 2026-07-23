import { requireUserId } from "@/lib/server/auth";
import { supabaseService } from "@/lib/server/supabase";
import { resolveActiveMembership } from "@/lib/server/membership";

// GET /api/usage — the caller's monthly usage + pool aggregate for ledger,
// receipt, and billing pages. Scoped to the caller's ACTIVE pool.
export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseService();
  const membership = await resolveActiveMembership(userId);
  if (!membership) {
    return Response.json({ usage: null });
  }
  const pool = membership.pool;

  const [{ count: memberCount }, { data: invite }] = await Promise.all([
    db
      .from("pool_members")
      .select("user_id", { count: "exact", head: true })
      .eq("pool_id", membership.poolId),
    db.from("invites").select("code").eq("pool_id", membership.poolId).limit(1).maybeSingle(),
  ]);

  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);

  const { data: events } = await db
    .from("usage_events")
    .select("user_id, estimated_retail_cents")
    .eq("pool_id", membership.poolId)
    .gte("created_at", since.toISOString());

  const rows = events ?? [];
  const mine = rows.filter((e) => e.user_id === userId);
  const count = Math.max(1, memberCount ?? 1);

  return Response.json({
    usage: {
      requests: mine.length,
      savedDollars: mine.reduce((s, e) => s + Number(e.estimated_retail_cents), 0) / 100,
      poolRequests: rows.length,
      poolSavedDollars: rows.reduce((s, e) => s + Number(e.estimated_retail_cents), 0) / 100,
      poolName: pool?.name ?? "your pool",
      memberCount: count,
      shareDollars: (pool?.monthly_budget_cents ?? 3000) / 100 / count + 1,
      budgetDollars: (pool?.monthly_budget_cents ?? 3000) / 100,
      inviteCode: invite?.code ?? null,
    },
  });
}
