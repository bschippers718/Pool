import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { supabaseService } from "@/lib/server/supabase";
import { resolveActiveMembership } from "@/lib/server/membership";
import { VALID_TIERS, type ModelId } from "@/lib/pricing";

// GET /api/moments — shared moments for the caller's ACTIVE pool (newest first).
// POST /api/moments { title, response, tier } — share an answer to the squad.

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseService();
  const membership = await resolveActiveMembership(userId);
  if (!membership) return Response.json({ moments: [] });

  const { data: moments, error } = await db
    .from("shared_moments")
    .select("id, title, response, tier, created_at, user_id, profiles(handle, display_name)")
    .eq("pool_id", membership.poolId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    moments: (moments ?? []).map((m) => {
      const profile = m.profiles as unknown as { handle: string; display_name: string } | null;
      return {
        id: m.id,
        title: m.title,
        response: m.response,
        tier: m.tier,
        createdAt: m.created_at,
        author: m.user_id === userId ? "you" : profile?.display_name ?? profile?.handle ?? "member",
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { title?: string; response?: string; tier?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const title = body.title?.trim().slice(0, 200);
  const response = body.response?.trim().slice(0, 4000);
  const tier = body.tier as ModelId;
  if (!title || !response) return Response.json({ error: "title and response are required" }, { status: 400 });
  if (!VALID_TIERS.includes(tier)) return Response.json({ error: "Unsupported tier" }, { status: 400 });

  const db = supabaseService();
  const membership = await resolveActiveMembership(userId);
  if (!membership) return Response.json({ error: "no_pool" }, { status: 400 });

  const { data: moment, error } = await db
    .from("shared_moments")
    .insert({ pool_id: membership.poolId, user_id: userId, title, response, tier })
    .select("id")
    .single();

  if (error || !moment) return Response.json({ error: error?.message ?? "share failed" }, { status: 500 });
  return Response.json({ id: moment.id });
}
