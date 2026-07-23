import { supabaseService } from "./supabase";

// Users can belong to several pools. profiles.active_pool_id says which one
// the app acts on (chat, ledger, misc). Every server route resolves through
// here so the pointer can never silently drift from real memberships.

export interface MembershipPool {
  id: string;
  name: string;
  emoji: string;
  monthly_budget_cents: number;
  owner_id: string;
  status: string;
}

export interface ActiveMembership {
  poolId: string;
  role: "owner" | "member";
  pool: MembershipPool;
  /** Every pool the user belongs to, oldest membership first. */
  memberships: { poolId: string; role: "owner" | "member"; pool: MembershipPool }[];
}

export async function resolveActiveMembership(userId: string): Promise<ActiveMembership | null> {
  const db = supabaseService();

  const [{ data: rows }, { data: profile }] = await Promise.all([
    db
      .from("pool_members")
      .select("pool_id, role, pools(id, name, emoji, monthly_budget_cents, owner_id, status)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: true }),
    db.from("profiles").select("active_pool_id").eq("id", userId).maybeSingle(),
  ]);

  const memberships = (rows ?? []).map((m) => ({
    poolId: m.pool_id as string,
    role: m.role as "owner" | "member",
    pool: m.pools as unknown as MembershipPool,
  }));
  if (memberships.length === 0) return null;

  const wanted = profile?.active_pool_id as string | null | undefined;
  const active = memberships.find((m) => m.poolId === wanted) ?? memberships[0];

  // Heal a stale/missing pointer (left the pool, first login after migration).
  if (wanted !== active.poolId) {
    await db.from("profiles").update({ active_pool_id: active.poolId }).eq("id", userId);
  }

  return { poolId: active.poolId, role: active.role, pool: active.pool, memberships };
}

export async function setActivePool(userId: string, poolId: string | null) {
  const db = supabaseService();
  await db.from("profiles").update({ active_pool_id: poolId }).eq("id", userId);
}
