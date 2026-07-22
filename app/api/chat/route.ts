import { NextRequest } from "next/server";
import { DEMO_REPLIES } from "@/lib/data";
import { ModelId, VALID_TIERS, estimateCost } from "@/lib/pricing";
import {
  assertCapacity,
  GatewayError,
  recordExchange,
  resolvePoolContext,
  streamTierCompletion,
} from "@/lib/server/pool-gateway";
import { requireUserId } from "@/lib/server/auth";
import { tierConfigured } from "@/lib/server/providers";

const demoMode = process.env.NEXT_PUBLIC_POOL_DEMO_MODE !== "false";

interface ChatBody {
  model?: string;
  turn?: number;
  prompt?: string;
  history?: { role: "user" | "ai"; text: string }[];
}

async function parseBody(req: NextRequest): Promise<ChatBody | Response> {
  try {
    return await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req);
  if (parsed instanceof Response) return parsed;
  const body = parsed;

  if (body.model && !VALID_TIERS.includes(body.model as ModelId)) {
    return Response.json({ error: "Unsupported model" }, { status: 400 });
  }
  const model: ModelId = (body.model as ModelId | undefined) ?? "cheap";
  // Live mode has no real image provider yet — reject at the API too, so the
  // stub can't be reached (or billed) by hand-rolled requests.
  if (!demoMode && model === "image") {
    return Response.json({ error: "Unsupported model" }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 4000) : "";
  if (!prompt) return Response.json({ error: "Prompt is required" }, { status: 400 });

  return demoMode ? demoChat(model, body, prompt) : liveChat(model, body, prompt);
}

// --- Demo path: canned replies, zero keys needed -----------------------------

function demoChat(model: ModelId, body: ChatBody, prompt: string): Response {
  const turn = Number.isFinite(body.turn) ? Math.max(0, Math.floor(body.turn!)) : 0;
  const bank = DEMO_REPLIES[model];
  const text = demoReply(prompt, model, bank[turn % bank.length]);
  const words = text.split(" ");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(JSON.stringify({ delta: w + " " }) + "\n"));
        await new Promise((r) => setTimeout(r, 24));
      }
      const tokens = Math.round(words.length * 1.3);
      controller.enqueue(
        encoder.encode(JSON.stringify({ done: true, tokens, saved: estimateCost(model, tokens) }) + "\n")
      );
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}

function demoReply(prompt: string, model: ModelId, fallback: string): string {
  if (model === "image") {
    return `4 variants for “${prompt || "your idea"}” — pick one to upscale.`;
  }
  const lower = prompt.toLowerCase();
  if (/math|solve|equation|algebra|homework/.test(lower)) {
    return `let's work through “${prompt}” step by step:\n\n1. identify what the question gives us\n2. isolate the unknown\n3. check the result against the original\n\nsend the exact equation and i'll show every step — not just the answer.`;
  }
  if (/workout|health|sleep|diet|pain/.test(lower)) {
    return `for “${prompt},” the useful starting point is consistency over intensity. watch sleep, recovery, and any symptoms that persist. this is general guidance, not a diagnosis — a clinician should handle anything severe or specific.`;
  }
  if (/caption|post|instagram|tiktok|photo/.test(lower)) return fallback;
  return `here's my read on “${prompt || "that"}”:\n\n${fallback}`;
}

// --- Live path: auth → pool context → budget → provider → metering -----------

async function liveChat(model: ModelId, body: ChatBody, prompt: string): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: object) => controller.enqueue(encoder.encode(JSON.stringify(evt) + "\n"));
      try {
        const ctx = await resolvePoolContext(userId);
        assertCapacity(ctx, model);

        if (ctx.whaleWarning) {
          send({ notice: "whale_warning", message: "heads up: you're past 35% of pool usage this month 🐋" });
        }

        const history = Array.isArray(body.history) ? body.history.slice(-12) : [];

        // Without a provider key for this tier, still meter through the
        // gateway using canned replies so the closed alpha works early.
        let exchange;
        if (tierConfigured(model)) {
          exchange = await streamTierCompletion(model, prompt, history, (delta) => send({ delta }));
        } else {
          const bank = DEMO_REPLIES[model];
          const text = demoReply(prompt, model, bank[0]);
          for (const w of text.split(" ")) {
            send({ delta: w + " " });
            await new Promise((r) => setTimeout(r, 12));
          }
          const tokens = Math.round(text.split(/\s+/).length * 1.3);
          exchange = { text, inputTokens: Math.round(prompt.split(/\s+/).length * 1.3), outputTokens: tokens };
        }

        const { retailCents } = await recordExchange(ctx, model, prompt, exchange);

        send({
          done: true,
          tokens: exchange.outputTokens,
          saved: retailCents / 100,
          pool: {
            remainingCents: ctx.remainingCents,
            budgetCents: ctx.monthlyBudgetCents,
          },
        });
      } catch (err) {
        if (err instanceof GatewayError) {
          send({ error: err.code, message: err.message });
        } else {
          send({ error: "provider_error", message: "something went wrong upstream — try again" });
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
