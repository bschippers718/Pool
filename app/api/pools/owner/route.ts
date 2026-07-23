import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { supabaseService } from "@/lib/server/supabase";
import { resolveActiveMembership } from "@/lib/server/membership";

// POST /api/pools/owner — owner-only controls for the caller's ACTIVE pool.
// Actions: reset_budget, regenerate_invite, remove_member { userId }
export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { action?: string; userId?: string; budgetCents?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const db = supabaseService();
  const membership = await resolveActiveMembership(userId);
  if (!membership || membership.pool.owner_id !== userId) {
    return Response.json({ error: "Only the pool owner can do that." }, { status: 403 });
  }
  const pool = { id: membership.poolId };

  switch (body.action) {
    case "reset_budget": {
      const budgetCents = Number(body.budgetCents ?? process.env.POOL_MONTHLY_BUDGET_CENTS ?? "3000");
      const { error } = await db
        .from("pools")
        .update({ monthly_budget_cents: budgetCents, status: "active" })
        .eq("id", pool.id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true, budgetCents });
    }

    case "regenerate_invite": {
      // "Fresh invite" must mean the old links die, or regenerating is theater.
      const { error: deleteErr } = await db.from("invites").delete().eq("pool_id", pool.id);
      if (deleteErr) return Response.json({ error: deleteErr.message }, { status: 500 });
      const code = Math.random().toString(36).slice(2, 8);
      const { error } = await db.from("invites").insert({ pool_id: pool.id, code, created_by: userId });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true, code });
    }

    case "remove_member": {
      if (!body.userId) return Response.json({ error: "userId required" }, { status: 400 });
      if (body.userId === userId) return Response.json({ error: "You can't remove yourself." }, { status: 400 });
      const { error } = await db
        .from("pool_members")
        .delete()
        .eq("pool_id", pool.id)
        .eq("user_id", body.userId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }
}
