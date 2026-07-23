/* Live-DB smoke test for the Pool Capacity Gateway.
 * Creates a throwaway profile + pool, runs the full metering path
 * (resolve context → capacity → record exchange → history/usage reads),
 * then cleans up. Run: npx tsx --env-file=.env.local scripts/smoke-live.ts
 */
import { resolvePoolContext, assertCapacity, recordExchange } from "../lib/server/pool-gateway";
import { supabaseService } from "../lib/server/supabase";

const TEST_USER = "smoke_test_user_000";
const TEST_FRIEND = "smoke_test_friend_000";

async function main() {
  const db = supabaseService();
  const fail = (step: string, msg: string) => {
    throw new Error(`${step}: ${msg}`);
  };

  console.log("1. create test profile…");
  {
    const { error } = await db.from("profiles").upsert({ id: TEST_USER, handle: "smoketest", display_name: "Smoke Test" });
    if (error) fail("profile", error.message);
  }

  console.log("2. create test pool + membership + invite…");
  const inviteCode = "smk" + Date.now().toString(36);
  const { data: pool, error: poolErr } = await db
    .from("pools")
    .insert({ name: "smoke test pool", owner_id: TEST_USER, monthly_budget_cents: 3000 })
    .select("id")
    .single();
  if (poolErr || !pool) fail("pool", poolErr?.message ?? "no pool");
  const poolId = pool!.id as string;
  let friendPoolId: string | null = null;

  try {
    {
      const { error } = await db.from("pool_members").insert({ pool_id: poolId, user_id: TEST_USER, role: "owner" });
      if (error) fail("membership", error.message);
    }
    {
      const { error } = await db.from("invites").insert({ pool_id: poolId, code: inviteCode, created_by: TEST_USER });
      if (error) fail("invite", error.message);
    }

    console.log("3. resolvePoolContext…");
    const ctx = await resolvePoolContext(TEST_USER);
    if (ctx.poolId !== poolId) fail("context", `wrong pool ${ctx.poolId}`);
    if (ctx.remainingCents !== 3000) fail("context", `expected 3000 remaining, got ${ctx.remainingCents}`);

    console.log("4. assertCapacity for each tier…");
    for (const tier of ["cheap", "smart", "image"] as const) assertCapacity(ctx, tier);

    console.log("5. recordExchange (the path that just failed on your phone)…");
    const rec = await recordExchange(ctx, "smart", "smoke test prompt", {
      text: "smoke test response",
      inputTokens: 100,
      outputTokens: 200,
    });
    if (!rec.threadId) fail("record", "no thread id");
    if (rec.actualCents <= 0) fail("record", "actual cost not positive");

    console.log("   second exchange reuses the same thread…");
    const rec2 = await recordExchange(ctx, "cheap", "second prompt", { text: "second response", inputTokens: 50, outputTokens: 80 });
    if (rec2.threadId !== rec.threadId) fail("record2", "created a duplicate thread");

    console.log("6. history read (chat/history query shape)…");
    const { data: msgs, error: histErr } = await db
      .from("messages")
      .select("role, content, tier, estimated_cost_cents, created_at")
      .eq("thread_id", rec.threadId)
      .order("created_at", { ascending: true })
      .limit(60);
    if (histErr) fail("history", histErr.message);
    if ((msgs ?? []).length !== 4) fail("history", `expected 4 messages, got ${msgs?.length}`);

    console.log("7. usage events + linked message id…");
    const { data: events, error: evErr } = await db
      .from("usage_events")
      .select("tier, message_id, actual_cost_cents, estimated_retail_cents")
      .eq("pool_id", poolId);
    if (evErr) fail("usage", evErr.message);
    if ((events ?? []).length !== 2) fail("usage", `expected 2 events, got ${events?.length}`);
    if (!events!.every((e) => e.message_id)) fail("usage", "usage event missing linked ai message id");

    console.log("8. budget reflects spend on re-resolve…");
    const ctx2 = await resolvePoolContext(TEST_USER);
    if (ctx2.usedCents <= 0) fail("budget", "usedCents did not increase");

    console.log("9. shared moment insert + public read (moments API shape)…");
    const { data: moment, error: momErr } = await db
      .from("shared_moments")
      .insert({ pool_id: poolId, user_id: TEST_USER, title: "smoke", response: "smoke", tier: "cheap" })
      .select("id")
      .single();
    if (momErr || !moment) fail("moment", momErr?.message ?? "no moment");
    const { data: publicMoment, error: pubErr } = await db
      .from("shared_moments")
      .select("id, title, response, tier, created_at, profiles(display_name, handle), pools(name)")
      .eq("id", moment!.id)
      .maybeSingle();
    if (pubErr) fail("moment read", pubErr.message);
    if (!publicMoment) fail("moment read", "not found");

    console.log("10. invite flow: friend redeems the code (join API logic)…");
    {
      const { error } = await db.from("profiles").upsert({ id: TEST_FRIEND, handle: "smokefriend", display_name: "Smoke Friend" });
      if (error) fail("friend profile", error.message);

      // Same checks the /api/pools/join route performs.
      const { data: invite } = await db
        .from("invites")
        .select("id, pool_id, uses, max_uses, expires_at")
        .eq("code", inviteCode)
        .maybeSingle();
      if (!invite) fail("invite lookup", "code not found");
      if (invite!.uses >= invite!.max_uses) fail("invite lookup", "invite unexpectedly maxed");

      const { error: joinErr } = await db
        .from("pool_members")
        .insert({ pool_id: invite!.pool_id, user_id: TEST_FRIEND, role: "member" });
      if (joinErr) fail("friend join", joinErr.message);
      await db.from("invites").update({ uses: invite!.uses + 1 }).eq("id", invite!.id);

      const { data: after } = await db.from("invites").select("uses").eq("id", invite!.id).single();
      if (after?.uses !== 1) fail("invite uses", `expected 1, got ${after?.uses}`);
    }

    console.log("11. friend can use the pool + shows up in the ledger…");
    {
      const friendCtx = await resolvePoolContext(TEST_FRIEND);
      if (friendCtx.poolId !== poolId) fail("friend context", "wrong pool");
      if (friendCtx.memberCount !== 2) fail("friend context", `expected 2 members, got ${friendCtx.memberCount}`);
      await recordExchange(friendCtx, "cheap", "friend prompt", { text: "friend response", inputTokens: 40, outputTokens: 60 });

      const { data: members } = await db
        .from("pool_members")
        .select("user_id, role, profiles(handle)")
        .eq("pool_id", poolId);
      if ((members ?? []).length !== 2) fail("ledger members", `expected 2, got ${members?.length}`);
    }

    console.log("12. multi-pool: second membership, active-pool switching…");
    {
      // Rejoining the same pool must still violate the primary key.
      const again = await db.from("pool_members").insert({ pool_id: poolId, user_id: TEST_FRIEND, role: "member" });
      if (!again.error) fail("guard", "duplicate membership insert should violate the primary key");

      // Friend starts their own pool (create route logic) — both memberships coexist.
      const { data: second, error: secondErr } = await db
        .from("pools")
        .insert({ name: "smoke friend pool", owner_id: TEST_FRIEND, monthly_budget_cents: 3000 })
        .select("id")
        .single();
      if (secondErr || !second) fail("second pool", secondErr?.message ?? "no pool");
      friendPoolId = second!.id as string;
      {
        const { error } = await db.from("pool_members").insert({ pool_id: friendPoolId, user_id: TEST_FRIEND, role: "owner" });
        if (error) fail("second membership", error.message);
      }

      // Creating a pool makes it active — the gateway must follow the pointer.
      await db.from("profiles").update({ active_pool_id: friendPoolId }).eq("id", TEST_FRIEND);
      const ownCtx = await resolvePoolContext(TEST_FRIEND);
      if (ownCtx.poolId !== friendPoolId) fail("switch", `expected friend's own pool, got ${ownCtx.poolId}`);

      // Switch back to the shared pool.
      await db.from("profiles").update({ active_pool_id: poolId }).eq("id", TEST_FRIEND);
      const backCtx = await resolvePoolContext(TEST_FRIEND);
      if (backCtx.poolId !== poolId) fail("switch back", `expected shared pool, got ${backCtx.poolId}`);

      // Stale pointer heals to the oldest membership instead of erroring.
      await db.from("profiles").update({ active_pool_id: null }).eq("id", TEST_FRIEND);
      const healedCtx = await resolvePoolContext(TEST_FRIEND);
      if (healedCtx.poolId !== poolId) fail("heal", `expected oldest membership, got ${healedCtx.poolId}`);
      const { data: healedProfile } = await db.from("profiles").select("active_pool_id").eq("id", TEST_FRIEND).single();
      if (healedProfile?.active_pool_id !== poolId) fail("heal", "active_pool_id pointer was not repaired");
    }

    console.log("\nALL CHECKS PASSED");
  } finally {
    console.log("cleanup…");
    if (friendPoolId) await db.from("pools").delete().eq("id", friendPoolId);
    await db.from("pools").delete().eq("id", poolId); // cascades members/invites/threads/messages/usage/moments
    await db.from("profiles").delete().eq("id", TEST_USER);
    await db.from("profiles").delete().eq("id", TEST_FRIEND);
  }
}

main().catch((err) => {
  console.error("SMOKE TEST FAILED:", err.message);
  process.exit(1);
});
