import type { ModelId } from "@/lib/pricing";
import { estimateCost } from "@/lib/pricing";
import { supabaseService } from "./supabase";
import { actualCostCents, providerClient, tierRoute } from "./providers";

// The Pool Capacity Gateway: every AI request in the product flows through
// here. It resolves the caller's pool, enforces the shared monthly budget and
// per-member fair-use soft cap, routes to the configured tier provider,
// streams the response, and records message + usage atomically afterward.

export class GatewayError extends Error {
  code: "unauthorized" | "no_pool" | "budget_exhausted" | "rate_limited" | "provider_error";
  constructor(code: GatewayError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export interface PoolContext {
  userId: string;
  poolId: string;
  poolName: string;
  monthlyBudgetCents: number;
  usedCents: number;
  remainingCents: number;
  memberUsedCents: number;
  memberCount: number;
  whaleWarning: boolean;
}

function monthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function resolvePoolContext(userId: string): Promise<PoolContext> {
  const db = supabaseService();

  const { data: membership, error: memberErr } = await db
    .from("pool_members")
    .select("pool_id, pools(id, name, monthly_budget_cents, status)")
    .eq("user_id", userId)
    // Alpha is one pool per user, but if that ever slips, always resolve the
    // oldest membership instead of an arbitrary one.
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberErr) throw new GatewayError("provider_error", memberErr.message);
  if (!membership) throw new GatewayError("no_pool", "you're not in a pool yet — create or join one");

  const pool = membership.pools as unknown as {
    id: string;
    name: string;
    monthly_budget_cents: number;
    status: string;
  };

  const since = monthStart();
  const { data: events, error: usageErr } = await db
    .from("usage_events")
    .select("user_id, actual_cost_cents")
    .eq("pool_id", pool.id)
    .gte("created_at", since);

  if (usageErr) throw new GatewayError("provider_error", usageErr.message);

  const rows = events ?? [];
  const usedCents = rows.reduce((sum, e) => sum + Number(e.actual_cost_cents), 0);
  const memberUsedCents = rows
    .filter((e) => e.user_id === userId)
    .reduce((sum, e) => sum + Number(e.actual_cost_cents), 0);

  const { count: memberCount } = await db
    .from("pool_members")
    .select("user_id", { count: "exact", head: true })
    .eq("pool_id", pool.id);

  const remainingCents = pool.monthly_budget_cents - usedCents;
  const softShare = Number(process.env.POOL_MEMBER_SOFT_SHARE ?? "0.35");
  // The 35% flag only means something in a real group — solo/duo usage is
  // trivially above any threshold.
  const whaleWarning =
    (memberCount ?? 1) >= 3 && usedCents > 0 && memberUsedCents / Math.max(usedCents, 1) > softShare;

  return {
    userId,
    poolId: pool.id,
    poolName: pool.name,
    monthlyBudgetCents: pool.monthly_budget_cents,
    usedCents,
    remainingCents,
    memberUsedCents,
    memberCount: memberCount ?? 1,
    whaleWarning,
  };
}

export function assertCapacity(ctx: PoolContext, tier: ModelId) {
  // Hard stop only when the shared pool budget is exhausted. The per-member
  // cap is a soft warning surfaced in the UI (whale territory), not a block.
  const projected = actualCostCents(tier, 1000, tier === "image" ? 0 : 500);
  if (ctx.remainingCents - projected < 0) {
    throw new GatewayError(
      "budget_exhausted",
      "pool's out of juice this month — it refills on the 1st"
    );
  }
}

export interface CompletedExchange {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export async function recordExchange(
  ctx: PoolContext,
  tier: ModelId,
  prompt: string,
  exchange: CompletedExchange
) {
  const db = supabaseService();
  const route = tierRoute(tier);

  // One thread per member per pool: find-or-create.
  const { data: existing } = await db
    .from("chat_threads")
    .select("id")
    .eq("pool_id", ctx.poolId)
    .eq("user_id", ctx.userId)
    .limit(1)
    .maybeSingle();

  let threadId: string;
  if (existing) {
    threadId = existing.id;
  } else {
    const { data: created, error: createErr } = await db
      .from("chat_threads")
      .insert({ pool_id: ctx.poolId, user_id: ctx.userId, title: prompt.slice(0, 60) })
      .select("id")
      .single();
    if (createErr || !created) throw new GatewayError("provider_error", createErr?.message ?? "thread failed");
    threadId = created.id;
  }

  const actualCents = actualCostCents(tier, exchange.inputTokens, exchange.outputTokens);
  const retailCents = estimateCost(tier, exchange.outputTokens) * 100;

  const { data: inserted, error: msgErr } = await db
    .from("messages")
    .insert([
      // Explicit zeros: PostgREST bulk inserts send every column present in any
      // row, so omitted columns become null instead of using table defaults.
      { thread_id: threadId, role: "user", content: prompt, tier, input_tokens: 0, output_tokens: 0, estimated_cost_cents: 0 },
      {
        thread_id: threadId,
        role: "ai",
        content: exchange.text,
        tier,
        provider: route.provider,
        input_tokens: exchange.inputTokens,
        output_tokens: exchange.outputTokens,
        estimated_cost_cents: actualCents,
      },
    ])
    .select("id, role");

  if (msgErr) throw new GatewayError("provider_error", msgErr.message);
  const aiMessageId = inserted?.find((r) => r.role === "ai")?.id ?? null;

  const { error: usageErr } = await db.from("usage_events").insert({
    pool_id: ctx.poolId,
    user_id: ctx.userId,
    message_id: aiMessageId,
    tier,
    input_tokens: exchange.inputTokens,
    output_tokens: exchange.outputTokens,
    actual_cost_cents: actualCents,
    estimated_retail_cents: retailCents,
  });

  if (usageErr) throw new GatewayError("provider_error", usageErr.message);

  return { threadId, actualCents, retailCents };
}

// Stream a chat completion for a tier, calling onDelta for each text chunk
// and resolving with the completed exchange for metering.
export async function streamTierCompletion(
  tier: ModelId,
  prompt: string,
  history: { role: "user" | "ai"; text: string }[],
  onDelta: (text: string) => void
): Promise<CompletedExchange> {
  if (tier === "image") {
    // Image gens are metered per-call; the alpha renders the variant grid on
    // the client, so the gateway returns a stub description for history.
    const text = `4 variants for "${prompt.slice(0, 120)}" — pick one to upscale.`;
    onDelta(text);
    return { text, inputTokens: 0, outputTokens: 0 };
  }

  const route = tierRoute(tier);
  const client = providerClient(route.provider);

  const messages = [
    ...history.slice(-12).map((m) => ({
      role: (m.role === "ai" ? "assistant" : "user") as "assistant" | "user",
      content: m.text,
    })),
    { role: "user" as const, content: prompt },
  ];

  let stream;
  try {
    stream = await client.chat.completions.create({
      model: route.model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: 900,
    });
  } catch (err) {
    throw new GatewayError("provider_error", err instanceof Error ? err.message : "provider failed");
  }

  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      text += delta;
      onDelta(delta);
    }
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
      outputTokens = chunk.usage.completion_tokens ?? outputTokens;
    }
  }

  if (!outputTokens) outputTokens = Math.round(text.split(/\s+/).length * 1.3);
  if (!inputTokens) inputTokens = Math.round(prompt.split(/\s+/).length * 1.3);

  return { text, inputTokens, outputTokens };
}
