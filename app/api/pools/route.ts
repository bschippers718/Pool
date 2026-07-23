import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { supabaseService } from "@/lib/server/supabase";
import { setActivePool } from "@/lib/server/membership";

const MAX_POOLS = 10;

function inviteCode(): string {
  return Math.random().toString(36).slice(2, 8);
}

// POST /api/pools { name, emoji? } — create a pool, join as owner, make it active.
export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { name?: string; emoji?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const name = body.name?.trim().slice(0, 40);
  if (!name) return Response.json({ error: "Pool name is required" }, { status: 400 });

  const db = supabaseService();

  // Sanity cap so a stuck retry loop can't spawn pools forever.
  const { count: poolCount } = await db
    .from("pool_members")
    .select("pool_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((poolCount ?? 0) >= MAX_POOLS) {
    return Response.json(
      { error: `You're in ${poolCount} pools already — that's the cap for the beta.` },
      { status: 409 }
    );
  }

  const budget = Number(process.env.POOL_MONTHLY_BUDGET_CENTS ?? "3000");

  const { data: pool, error: poolErr } = await db
    .from("pools")
    .insert({ name, emoji: body.emoji ?? "🌊", owner_id: userId, monthly_budget_cents: budget })
    .select("id, name, emoji")
    .single();

  if (poolErr || !pool) {
    return Response.json({ error: poolErr?.message ?? "Could not create pool" }, { status: 500 });
  }

  const { error: memberErr } = await db
    .from("pool_members")
    .insert({ pool_id: pool.id, user_id: userId, role: "owner" });
  if (memberErr) return Response.json({ error: memberErr.message }, { status: 500 });

  // The pool you just made becomes the one you're looking at.
  await setActivePool(userId, pool.id);

  const { data: invite } = await db
    .from("invites")
    .insert({ pool_id: pool.id, code: inviteCode(), created_by: userId })
    .select("code")
    .single();

  return Response.json({ pool, inviteCode: invite?.code ?? null });
}
