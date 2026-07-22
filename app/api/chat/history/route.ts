import { requireUserId } from "@/lib/server/auth";
import { supabaseService } from "@/lib/server/supabase";

// GET /api/chat/history — the caller's chat thread in their pool.
export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseService();
  const { data: thread } = await db
    .from("chat_threads")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!thread) return Response.json({ messages: [] });

  const { data: messages, error } = await db
    .from("messages")
    .select("id, role, content, tier, estimated_cost_cents, created_at")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true })
    .limit(60);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // "saved" in the UI means estimated retail value, which lives on the usage
  // event — messages only carry actual provider cost. Keep the two in sync.
  const aiIds = (messages ?? []).filter((m) => m.role === "ai").map((m) => m.id);
  const retailByMessage = new Map<string, number>();
  if (aiIds.length > 0) {
    const { data: events } = await db
      .from("usage_events")
      .select("message_id, estimated_retail_cents")
      .in("message_id", aiIds);
    for (const e of events ?? []) {
      if (e.message_id) retailByMessage.set(e.message_id, Number(e.estimated_retail_cents));
    }
  }

  return Response.json({
    messages: (messages ?? []).map((m) => ({
      role: m.role,
      text: m.content,
      model: m.tier,
      // Only expose "saved" when we have the retail figure — substituting
      // provider cost would silently change what the chip means.
      saved:
        m.role === "ai" && retailByMessage.has(m.id)
          ? retailByMessage.get(m.id)! / 100
          : undefined,
    })),
  });
}
