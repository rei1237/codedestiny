// Local disposable replica only. Run with scripts/lib/mock-network-guard.cjs preloaded.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { User, PointHistory, MasterLoveCodexSession, Payment, PaidExecutionRecord } from "../worker/lib/models.js";
import { handleBillingRoutes } from "../worker/routes/billing.js";
import { signAuthToken } from "../worker/lib/auth.js";
import { __masterLoveCodexTestUtils, handleMasterLoveCodexRoutes } from "../worker/routes/master-love-codex.js";
import { consumePassForFeature } from "../worker/lib/pass-consumption.js";
import { MONTHLY_PASS_LIMITS } from "../worker/lib/profile-limits.js";
import { __namingPromptExecutionTestUtils } from "../worker/routes/naming-prompt.js";
import { grantPurchaseEntitlement } from "../worker/payments/executions.js";

if (!process.execArgv.some(arg => arg.includes("mock-network-guard"))) throw new Error("Run with mock-network-guard preloaded");
const localRequire = createRequire(resolve("build-cache/p0-replica/package.json"));
const { MongoMemoryReplSet } = localRequire("mongodb-memory-server");
const replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger", ip: "127.0.0.1" } });
try {
  const uri = replica.getUri("payment_p0_disposable");
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:/);
  await mongoose.connect(uri, { autoIndex: false });
  const userId = new mongoose.Types.ObjectId();
  const at = new Date(Date.now() + 10 * 86400000);
  const subscription = { tier: "family", passTier: "family", isActive: true, expiresAt: at,
    premiumUseCycleKey: at.toISOString(), monthlySpendCoin: 0, monthlyLimitCoin: 0 };
  await User.collection.insertOne({ _id: userId, profileSubscription: subscription, recentConsumeRequestIds: [] });
  const user = await User.collection.findOne({ _id: userId });
  const input = { user, userId: String(userId), entitlement: { ...subscription },
    featureKey: "master-love-codex-compat", requestId: "one-purchase", coinCost: 300 };
  const outcomes = await Promise.all(Array.from({ length: 5 }, () => consumePassForFeature(input)));
  assert.ok(outcomes.every(item => item.covered));
  assert.equal((await User.collection.findOne({ _id: userId })).profileSubscription.monthlySpendCoin, 300);
  assert.equal(await PointHistory.collection.countDocuments({ userId }), 1);

  // A DB write failure must roll back the budget as well as its marker.
  const original = PointHistory.collection.findOneAndUpdate;
  PointHistory.collection.findOneAndUpdate = async () => { throw new Error("injected evidence write timeout"); };
  try {
    await assert.rejects(consumePassForFeature({ ...input, requestId: "failed-write", user: await User.collection.findOne({ _id: userId }) }), /injected/);
  } finally { PointHistory.collection.findOneAndUpdate = original; }
  assert.equal((await User.collection.findOne({ _id: userId })).profileSubscription.monthlySpendCoin, 300);

  await User.collection.updateOne({ _id: userId }, { $set: {
    recentConsumeRequestIds: [], "profileSubscription.monthlySpendCoin": MONTHLY_PASS_LIMITS.family,
    "profileSubscription.isActive": false, "profileSubscription.tier": "free",
  } });
  const ended = await User.collection.findOne({ _id: userId });
  assert.equal((await consumePassForFeature({ ...input, user: ended, entitlement: { isActive: false, tier: "free" } })).replayed, true);
  assert.equal((await consumePassForFeature({ ...input, requestId: "new-purchase", user: ended, entitlement: { isActive: false, tier: "free" } })).covered, false);
  // Production schema defaults progress to null. Reproduce the original first
  // batch failure against Mongo itself, then exercise the real patched lock.
  await MasterLoveCodexSession.collection.insertOne({ id: "kakaopay-compat", userId: String(userId),
    mode: "compat", accessType: "paid", status: "generating", generationProgress: null, chapters: [] });
  await assert.rejects(MasterLoveCodexSession.findOneAndUpdate({ id: "kakaopay-compat" }, {
    $set: { "generationProgress.lockedAt": new Date(), "generationProgress.lockToken": "original" },
  }), error => error.code === 28);
  const locks = await Promise.all(Array.from({ length: 5 }, () => __masterLoveCodexTestUtils.acquireBatchLock("kakaopay-compat", String(userId))));
  assert.equal(locks.filter(lock => lock.ok).length, 1);
  await MasterLoveCodexSession.collection.updateOne({ id: "kakaopay-compat" }, { $set: { status: "generation_failed", generationProgress: null } });
  assert.equal((await __masterLoveCodexTestUtils.acquireBatchLock("kakaopay-compat", String(userId))).ok, true);
  const env = { MONGO_URI: uri, MONGODB_URI: uri, MONGO_DB_NAME: "payment_p0_disposable", JWT_SECRET: "local-mock-only-payment-p0-secret-12345678" };
  const token = await signAuthToken({ _id: userId, role: "user", name: "Local fixture" }, env);
  await Payment.collection.insertOne({ merchantUid: "local-kakaopay-order", userId,
    featureKey: "master-love-codex-compat", status: "paid", paymentAmount: 30000,
    requestId: "local-kakaopay-run", paymentMethod: "kakaopay", paymentType: "digital_content" });
  await PaidExecutionRecord.collection.createIndex({ executionId: 1 }, { unique: true });
  await PaidExecutionRecord.collection.createIndex({ paymentId: 1 }, { unique: true, partialFilterExpression: { paymentId: { $type: "string", $gt: "" } } });
  const register = () => handleBillingRoutes(new Request("http://localhost/api/billing/coin-gate/deferred/register", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ featureKey: "master-love-codex-compat", requestId: "local-kakaopay-run", paymentId: "local-kakaopay-order", merchantUid: "local-kakaopay-order", paymentMethod: "DIRECT_KRW" }),
  }), env);
  const registrations = await Promise.all(Array.from({ length: 5 }, register));
  for (const registration of registrations) assert.equal(registration.status, 200, JSON.stringify(await registration.json()));
  assert.equal((await register()).status, 200);
  assert.equal(await PaidExecutionRecord.collection.countDocuments({ userId: String(userId), requestId: "local-kakaopay-run" }), 1);
  await MasterLoveCodexSession.collection.updateOne({ id: "kakaopay-compat" }, { $set: {
    generationProgress: null, paymentId: "local-kakaopay-order", idempotencyKey: "local-kakaopay-run",
  } });
  let generated = 0;
  let failChapters = true;
  const dependencies = { generateChapter: async (_env, { chapter }) => {
    generated += 1;
    if (failChapters) return { status: "fallback", chapter: null };
    return { status: "ok", chapter: { ...chapter, body: "Mock analysis. ".repeat(30), chars: 450, ok: true, provider: "mock" } };
  } };
  const generate = () => handleMasterLoveCodexRoutes(new Request("http://localhost/api/master-love-codex/generate", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionId: "kakaopay-compat" }),
  }), env, dependencies);
  assert.equal((await generate()).status, 503);
  assert.equal((await MasterLoveCodexSession.collection.findOne({ id: "kakaopay-compat" })).status, "generation_failed");
  assert.equal((await PaidExecutionRecord.collection.findOne({ requestId: "local-kakaopay-run" })).consumedAt, null);
  failChapters = false;
  let complete = false;
  for (let batch = 0; batch < 20 && !complete; batch += 1) {
    const response = await generate();
    const payload = await response.json();
    assert.equal(response.status, 200, JSON.stringify(payload));
    complete = payload.done === true;
  }
  assert.equal(complete, true);
  const totalCalls = generated;
  assert.equal((await (await generate()).json()).done, true);
  assert.equal(generated, totalCalls, "completed purchase must not regenerate or charge");
  for (const status of ["refunded", "cancelled", "canceled"]) {
    await Payment.collection.updateOne({ merchantUid: "local-kakaopay-order" }, { $set: { status } });
    assert.equal((await generate()).status, 402, `${status} blocks old session without invoking the mock LLM`);
    const read = await handleMasterLoveCodexRoutes(new Request("http://localhost/api/master-love-codex/session?sessionId=kakaopay-compat", {
      headers: { Authorization: `Bearer ${token}` },
    }), env);
    assert.equal(read.status, 402, `${status} blocks reopening a completed result`);
    assert.equal(generated, totalCalls);
  }
  // Cancellation during generation must not deliver or consume the just-produced chapters.
  await Payment.collection.updateOne({ merchantUid: "local-kakaopay-order" }, { $set: { status: "paid" } });
  await MasterLoveCodexSession.collection.updateOne({ id: "kakaopay-compat" }, { $set: { status: "generating", chapters: [], generationProgress: null } });
  const cancelledInFlight = await handleMasterLoveCodexRoutes(new Request("http://localhost/api/master-love-codex/generate", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionId: "kakaopay-compat" }),
  }), env, { generateChapter: async (_env, { chapter }) => {
    await Payment.collection.updateOne({ merchantUid: "local-kakaopay-order" }, { $set: { status: "cancelled" } });
    return { status: "ok", chapter: { ...chapter, body: "Mock cancelled analysis", ok: true } };
  } });
  assert.equal(cancelledInFlight.status, 402);
  assert.equal((await MasterLoveCodexSession.collection.findOne({ id: "kakaopay-compat" })).chapters.length, 0);
  await Payment.collection.updateOne({ merchantUid: "local-kakaopay-order" }, { $set: { status: "paid" } });
  await PaidExecutionRecord.collection.updateOne({ requestId: "local-kakaopay-run" }, { $set: { status: "paid_pending_generation", consumedAt: null, completedAt: null } });
  const stagingEnv = { ...env, APP_ENV: "staging", STAGING_LLM_MOCK_ENABLED: "true", WORKERS_AI_ENABLED: "false" };
  let stagingDone = false;
  for (let batch = 0; batch < 20 && !stagingDone; batch += 1) {
    const response = await handleMasterLoveCodexRoutes(new Request("http://localhost/api/master-love-codex/generate", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId: "kakaopay-compat" }),
    }), stagingEnv);
    const payload = await response.json();
    assert.equal(response.status, 200, JSON.stringify(payload));
    stagingDone = payload.done === true;
  }
  assert.equal(stagingDone, true);
  const stagedBook = await MasterLoveCodexSession.collection.findOne({ id: "kakaopay-compat" });
  assert.equal(stagedBook.chapters.length, 20);
  assert.ok(stagedBook.chapters.every(chapter => chapter.provider === "staging-mock" && chapter.body.includes("스테이징 검증")));
  assert.ok((await PaidExecutionRecord.collection.findOne({ requestId: "local-kakaopay-run" })).consumedAt);
  console.log("[payment-p0-replica] PASS: staging-mode actual generator -> 20 structured chapters and completion, zero external calls");
  const namingOrder = { merchantUid: "local-naming-order", userId, featureKey: "premium-naming-prompt",
    requestId: "local-naming-run", status: "paid", paymentAmount: 30000 };
  await Payment.collection.insertOne(namingOrder);
  const nativeDb = {
    findOne: (Model, filter) => Model.collection.findOne(filter),
    findOneAndUpdate: (Model, filter, update, options) => Model.collection.findOneAndUpdate(filter, update, options),
    updateOne: (Model, filter, update) => Model.collection.updateOne(filter, update),
  };
  const namingRights = await Promise.all(Array.from({ length: 5 }, () => grantPurchaseEntitlement(nativeDb, namingOrder, { featureKey: namingOrder.featureKey })));
  assert.equal(new Set(namingRights.map(right => String(right._id))).size, 1);
  const namingRight = namingRights[0];
  assert.equal(await PaidExecutionRecord.collection.countDocuments({ paymentId: namingOrder.merchantUid }), 0);
  const namingAccess = { accessMethod: "single", paymentId: namingOrder.merchantUid,
    evidenceId: namingOrder.merchantUid, requestId: namingOrder.requestId, profileId: "default" };
  const namingArgs = [env, { userId: String(userId) }, namingAccess, "local-input-hash", {}, {}, "Mock prompt", new Date()];
  const namingClaims = await Promise.all(Array.from({ length: 5 }, () => __namingPromptExecutionTestUtils.beginNamingGeneration(...namingArgs)));
  assert.equal(namingClaims.filter(row => row.state === "claimed").length, 1);
  assert.equal((await PaidExecutionRecord.collection.findOne({ paymentId: namingOrder.merchantUid })).consumedAt, null);
  await __namingPromptExecutionTestUtils.upsertExecutionRecord(env, { userId: String(userId) }, namingAccess,
    "local-input-hash", {}, {}, "Mock prompt", "Mock successful report", new Date());
  const namingDone = await PaidExecutionRecord.collection.findOne({ paymentId: namingOrder.merchantUid });
  assert.equal(namingDone.paymentId, namingRight.paymentId);
  assert.equal(namingDone.status, "completed");
  assert.ok(namingDone.consumedAt);
  assert.equal((await __namingPromptExecutionTestUtils.beginNamingGeneration(...namingArgs)).state, "completed");
  assert.equal(await PaidExecutionRecord.collection.countDocuments({ paymentId: namingOrder.merchantUid }), 1);
  assert.equal((await grantPurchaseEntitlement(nativeDb, namingOrder, { featureKey: namingOrder.featureKey })).status, "granted");
  console.log("[payment-p0-replica] PASS: purchase right does not preempt naming execution; concurrent claim=1, consume only on success, completed replay");

  await Payment.collection.insertOne({ merchantUid: "local-input-bound-order", userId,
    featureKey: "master-love-codex", status: "paid", paymentAmount: 30000, requestId: "original-input-run" });
  const startInput = { birthInfo: { gender: "female", birthDate: "1993-05-14", birthTime: "07:20" }, paymentId: "local-input-bound-order" };
  const startRun = (key, input = startInput) => handleMasterLoveCodexRoutes(new Request("http://localhost/api/master-love-codex/start", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...input, idempotencyKey: key }),
  }), env);
  const firstStart = await startRun("browser-key-1");
  const firstBook = await firstStart.json();
  assert.equal(firstStart.status, 200, JSON.stringify(firstBook));
  assert.equal((await (await startRun("browser-key-2")).json()).sessionId, firstBook.sessionId);
  assert.equal((await startRun("browser-key-3", { ...startInput, birthInfo: { ...startInput.birthInfo, birthDate: "1994-05-14" } })).status, 409);
  assert.equal(await MasterLoveCodexSession.collection.countDocuments({ paymentId: "local-input-bound-order" }), 1);
  console.log("[payment-p0-replica] PASS: changed browser request key resumes one funded session; different input cannot reuse payment");
  console.log("[payment-p0-replica] PASS: KakaoPay owned session -> all mock chapters -> completed replay -> refund blocked; no access token required");
  console.log("[payment-p0-replica] PASS: authenticated KakaoPay purchase -> deferred registration -> replay one record");
  console.log("[payment-p0-replica] PASS: original null-progress Mongo code 28 reproduced; fixed first batch and failed-run retry; concurrent lock=1");
  console.log("[payment-p0-replica] PASS: concurrent consume=1, evidence=1, atomic rollback, expired-pass recovery, new-purchase rejection");
} finally {
  await mongoose.disconnect();
  await replica.stop();
}
