// Savings math: what each request WOULD cost at pay-per-use retail rates,
// vs. what the member actually pays (their flat pool share).
// Baselines are rough published per-token rates; "≈" does the honesty work in UI.

export type ModelId = "cheap" | "smart" | "image";

export const MODELS: Record<
  ModelId,
  { label: string; emoji: string; perRequestCost: number; perTokenOut: number; blurb: string }
> = {
  // id stays "cheap" (DB + API contract); "fast" is just the display name.
  cheap: { label: "fast", emoji: "⚡", perRequestCost: 0.008, perTokenOut: 0.00002, blurb: "instant answers, everyday stuff" },
  smart: { label: "smart", emoji: "🧠", perRequestCost: 0.022, perTokenOut: 0.00005, blurb: "stronger reasoning" },
  image: { label: "image", emoji: "🎨", perRequestCost: 0.22, perTokenOut: 0, blurb: "4 variants per gen" },
};

export const VALID_TIERS: ModelId[] = ["cheap", "smart", "image"];

// Tiers a user can actually pick in the composer. Image is demo-only for now:
// the live gateway has no real image provider wired, so it stays hidden (and
// unbillable) until one exists.
export function selectableTiers(): ModelId[] {
  return ["cheap", "smart", "image"];
}

// Estimated pay-per-use retail cost for one exchange
export function estimateCost(model: ModelId, outputTokens: number): number {
  const m = MODELS[model];
  return m.perRequestCost + outputTokens * m.perTokenOut;
}

// What the member paid per request this month: share ÷ their request count.
// For the chip we show the simpler story: "this would've cost ≈X, you paid ~0".
export function savedFor(model: ModelId, outputTokens: number): number {
  return estimateCost(model, outputTokens);
}

export function formatCents(dollars: number): string {
  if (dollars < 0.995) return `${Math.max(1, Math.round(dollars * 100))}¢`;
  return `$${dollars.toFixed(2)}`;
}

// Pool economics
export const POOL = {
  name: "The Gremlins",
  emoji: "🌊",
  tier: "Full Stack",
  tierCost: 30,
  feePerMember: 1,
  members: 6,
  retailValue: 60,
};

export function memberShare(memberCount = POOL.members): number {
  return (POOL.tierCost + POOL.feePerMember * memberCount) / memberCount;
}

export function monthlySavings(memberCount = POOL.members): number {
  return POOL.retailValue - memberShare(memberCount);
}

export function demoMode(): boolean {
  return process.env.NEXT_PUBLIC_POOL_DEMO_MODE !== "false";
}

// Live-mode marketing math — one source of truth so the hero, moment pages,
// and onboarding never quote different prices for the same crew size.
export const LIVE_BUDGET_DOLLARS = Number(process.env.NEXT_PUBLIC_POOL_BUDGET_DOLLARS ?? "30");

export function liveShareAt(members: number): number {
  return LIVE_BUDGET_DOLLARS / members + 1;
}
