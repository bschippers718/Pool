import { requireUserId } from "@/lib/server/auth";
import { supabaseService } from "@/lib/server/supabase";

// GET /api/pools/mine — the caller's pool with live monthly usage and invite.
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
    .select("role, pools(id, name, emoji, monthly_budget_cents, owner_id)")
    .eq("user_id", userId)
    // Match the gateway: oldest membership wins if a user ever has several.
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return Response.json({ pool: null });

  const pool = membership.pools as unknown as {
    id: string;
    name: string;
    emoji: string;
    monthly_budget_cents: number;
    owner_id: string;
  };

  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);

  const [{ data: members }, { data: usage }, { data: invite }] = await Promise.all([
    db
      .from("pool_members")
      .select("user_id, role, profiles(handle, display_name, avatar_url)")
      .eq("pool_id", pool.id),
    db
      .from("usage_events")
      .select("user_id, actual_cost_cents, estimated_retail_cents")
      .eq("pool_id", pool.id)
      .gte("created_at", since.toISOString()),
    db.from("invites").select("code").eq("pool_id", pool.id).limit(1).maybeSingle(),
  ]);

  const rows = usage ?? [];
  const usedCents = rows.reduce((s, e) => s + Number(e.actual_cost_cents), 0);
  const retailCents = rows.reduce((s, e) => s + Number(e.estimated_retail_cents), 0);
  const byUser = new Map<string, { requests: number; costCents: number }>();
  for (const e of rows) {
    const cur = byUser.get(e.user_id) ?? { requests: 0, costCents: 0 };
    cur.requests += 1;
    cur.costCents += Number(e.actual_cost_cents);
    byUser.set(e.user_id, cur);
  }

  return Response.json({
    pool: {
      id: pool.id,
      name: pool.name,
      emoji: pool.emoji,
      monthlyBudgetCents: pool.monthly_budget_cents,
      usedCents,
      retailCents,
      myRole: membership.role,
      isOwner: pool.owner_id === userId,
      inviteCode: invite?.code ?? null,
      members: (members ?? []).map((m) => {
        const profile = m.profiles as unknown as { handle: string; display_name: string; avatar_url: string } | null;
        return {
          userId: m.user_id,
          role: m.role,
          name: profile?.display_name ?? profile?.handle ?? "member",
          handle: profile?.handle ?? "member",
          isYou: m.user_id === userId,
          requests: byUser.get(m.user_id)?.requests ?? 0,
          costCents: byUser.get(m.user_id)?.costCents ?? 0,
        };
      }),
    },
  });
}
