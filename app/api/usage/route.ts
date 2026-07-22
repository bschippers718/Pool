import { requireUserId } from "@/lib/server/auth";
import { supabaseService } from "@/lib/server/supabase";

// GET /api/usage — the caller's monthly usage + pool aggregate for ledger,
// receipt, and billing pages.
export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseService();
  const { data: membership } = await db
    .from("pool_members")
    .select("pool_id, pools(name, monthly_budget_cents)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return Response.json({ usage: null });
  }
  const pool = membership.pools as unknown as { name: string; monthly_budget_cents: number };

  const [{ count: memberCount }, { data: invite }] = await Promise.all([
    db
      .from("pool_members")
      .select("user_id", { count: "exact", head: true })
      .eq("pool_id", membership.pool_id),
    db.from("invites").select("code").eq("pool_id", membership.pool_id).limit(1).maybeSingle(),
  ]);

  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);

  const { data: events } = await db
    .from("usage_events")
    .select("user_id, estimated_retail_cents")
    .eq("pool_id", membership.pool_id)
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
