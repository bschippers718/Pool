import OpenAI from "openai";
import type { ModelId } from "@/lib/pricing";

// Tier routing: the pool never names providers to the client. Each generic
// tier maps to one upstream provider + model. Multiple providers are
// supported — the gateway picks the cheapest capable model per tier.
//
// Current defaults (July 2026 pricing, per 1M tokens):
//   cheap → OpenAI gpt-4o-mini   ($0.15 in / $0.60 out)  — cheapest text model
//   smart → xAI grok-4.3         ($1.25 in / $2.50 out)  — ~4x cheaper than gpt-4o output
//   image → OpenAI gpt-image-1
// If only one provider key is configured, all text tiers fall back to it.

export type ProviderId = "openai" | "xai";

const PROVIDER_CONFIG: Record<ProviderId, { keyEnv: string; defaultBaseUrl: string; baseUrlEnv: string }> = {
  openai: { keyEnv: "OPENAI_API_KEY", defaultBaseUrl: "https://api.openai.com/v1", baseUrlEnv: "OPENAI_BASE_URL" },
  xai: { keyEnv: "XAI_API_KEY", defaultBaseUrl: "https://api.x.ai/v1", baseUrlEnv: "XAI_BASE_URL" },
};

export interface TierRoute {
  provider: ProviderId;
  model: string;
  // Actual upstream cost in cents per token, for pool budget accounting.
  inCentsPerToken: number;
  outCentsPerToken: number;
  // Flat per-call cost (image generations).
  perCallCents?: number;
}

function keyFor(provider: ProviderId): string | undefined {
  return process.env[PROVIDER_CONFIG[provider].keyEnv];
}

function pickProvider(preferred: ProviderId, override?: string): ProviderId {
  if (override === "openai" || override === "xai") return override;
  if (keyFor(preferred)) return preferred;
  // Fall back to whichever provider actually has a key configured.
  const other: ProviderId = preferred === "xai" ? "openai" : "xai";
  return keyFor(other) ? other : preferred;
}

// Known upstream rates in cents per token (retail API list price).
const MODEL_RATES: Record<string, { inCents: number; outCents: number }> = {
  "gpt-4o-mini": { inCents: 0.000015, outCents: 0.00006 },
  "gpt-4o": { inCents: 0.00025, outCents: 0.001 },
  "grok-4.3": { inCents: 0.000125, outCents: 0.00025 },
  "grok-4.5": { inCents: 0.0002, outCents: 0.0006 }, // $2 / $6 per 1M tokens
};

function ratesFor(model: string, fallback: { inCents: number; outCents: number }) {
  return MODEL_RATES[model] ?? fallback;
}

export function tierRoute(tier: ModelId): TierRoute {
  if (tier === "image") {
    return {
      provider: pickProvider("openai", process.env.POOL_PROVIDER_IMAGE),
      model: process.env.POOL_MODEL_IMAGE ?? "gpt-image-1",
      inCentsPerToken: 0,
      outCentsPerToken: 0,
      perCallCents: 4, // ~4¢ per generation at current image pricing
    };
  }
  if (tier === "smart") {
    const provider = pickProvider("xai", process.env.POOL_PROVIDER_SMART);
    const model = process.env.POOL_MODEL_SMART ?? (provider === "xai" ? "grok-4.3" : "gpt-4o");
    const rates = ratesFor(model, MODEL_RATES["gpt-4o"]);
    return { provider, model, inCentsPerToken: rates.inCents, outCentsPerToken: rates.outCents };
  }
  const provider = pickProvider("openai", process.env.POOL_PROVIDER_CHEAP);
  const model = process.env.POOL_MODEL_CHEAP ?? (provider === "xai" ? "grok-4.3" : "gpt-4o-mini");
  const rates = ratesFor(model, MODEL_RATES["gpt-4o-mini"]);
  return { provider, model, inCentsPerToken: rates.inCents, outCentsPerToken: rates.outCents };
}

const clients: Partial<Record<ProviderId, OpenAI>> = {};

export function providerClient(provider: ProviderId): OpenAI {
  const cached = clients[provider];
  if (cached) return cached;
  const cfg = PROVIDER_CONFIG[provider];
  const apiKey = keyFor(provider);
  if (!apiKey) throw new Error(`${cfg.keyEnv} is not configured`);
  const client = new OpenAI({ apiKey, baseURL: process.env[cfg.baseUrlEnv] ?? cfg.defaultBaseUrl });
  clients[provider] = client;
  return client;
}

// Is the provider backing this tier actually usable (key present)?
export function tierConfigured(tier: ModelId): boolean {
  return Boolean(keyFor(tierRoute(tier).provider));
}

export function providerConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.XAI_API_KEY);
}

// Actual upstream cost per exchange, in cents, for pool budget accounting.
// Retail "saved" math lives in lib/pricing.ts — this side is what the pool
// actually pays.
export function actualCostCents(tier: ModelId, inputTokens: number, outputTokens: number): number {
  const route = tierRoute(tier);
  if (route.perCallCents !== undefined) return route.perCallCents;
  return inputTokens * route.inCentsPerToken + outputTokens * route.outCentsPerToken;
}
