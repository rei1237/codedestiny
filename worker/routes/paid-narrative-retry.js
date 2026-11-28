// 2026-11-21 C2 retry-first for the shared paid narrative engine (paid-narrative-delivery.js).
// Policy (user, 2026-11-20): a failed paid narrative gets a free retry that regenerates only the missing
// parts and keeps every saved part; at created + 7 days (retryRefundAt) or on a customer request the
// purchase is refunded in full through the existing idempotent settle (settleExecutionById), by the same
// executionId. An incomplete result is never delivered as complete.
// The refund needs evidence the existing refunders can restore: a PointHistory deduct row (coin, pass use),
// a Payment row with a PG reference (card), the pass cycle the route consumed, or (2026-11-25) a moonstone V2
// MonthlyCreditLedger spend for this feature and request, which runMonthlyCreditRefund restores in the same settle. A run without such evidence
// stays held for an operator (PAID_NARRATIVE_REFUND_EVIDENCE_MISSING) instead of being marked refunded.
import { requireAuth } from "../lib/auth.js";
import { connectDb, mongoose, withMongoRetry } from "../lib/db.js";
import { Payment, PointHistory, ServiceExecutionTransaction } from "../lib/models.js";
import { json, readJson, handleRouteError } from "../lib/http.js";
import { RETRY_REFUND_AFTER_MS, retryRefundAt } from "../lib/paid-delivery-stuck.js";
import { isPaidNarrativeExecution } from "../lib/checkpoint-refund-guard.js";
import { settlePaidNarrativeExecution } from "../lib/service-execution-task.js";
import { passUsageEvidenceId } from "../payments/passes.js";
import { findMoonstoneSpendEvidence } from "../lib/moonstone-spend-proof.js";
import { refundEvidenceFeatureKeys } from "../lib/refund-feature-alias.js";

const RETRY_LEASE_MS = 600000, MAX_REOPENS = 3;
// Hold codes the C1 guard writes for a run that cannot progress on its own (checkpoint-refund-guard.js).
export const PAID_NARRATIVE_RETRYABLE_CODES = Object.freeze(["PAID_NARRATIVE_EXHAUSTED", "PAID_NARRATIVE_REVIEW_REQUIRED",
  "PAID_NARRATIVE_RESUME_WINDOW_CLOSED", "PAID_NARRATIVE_CLOSE_REQUESTED"]);
const SETTLE_CODES = Object.freeze([...PAID_NARRATIVE_RETRYABLE_CODES, "PAID_NARRATIVE_EXHAUSTION_CLAIMED"]);
const TASK_ID = /^[A-Za-z0-9_-]{1,80}$/;
// The 10 contract services (consultation-recovery-registry.js narrative entries). Free follow-ups and
// feature-question share the engine but are not retry-first products here.
export const PAID_NARRATIVE_RETRY_FEATURES = Object.freeze(["tarot-prompt-maker", "tarot-prompt-maker-standard", "tarot-prompt-maker-deep",
  "tarot-prompt-maker-master", "tarot-love-relationship", "tarot-mindscan", "dream-psycho-analysis", "yoga-guru-per-use",
  "compat-saju-compatibility", "pet-saju-ai-consultation", "pet-compatibility-ai", "openGeomancyOracle", "geomancy",
  "animal-totem-basic", "animal-totem-deep", "fortune-chat-consultation"]);
const inScope = doc => PAID_NARRATIVE_RETRY_FEATURES.includes(doc?.featureKey);
const allSaved = state => Array.isArray(state?.tasks) && state.tasks.length > 0 && state.tasks.every(task => state.parts?.[task.id]);
const live = (doc, now) => Boolean(doc?.lock?.until && new Date(doc.lock.until).getTime() > now);
const notStarted = doc => !doc.refundStatus || doc.refundStatus === "none";

function exhausted(state) {
  const tasks = Array.isArray(state?.tasks) ? state.tasks : [], parts = state?.parts || {}, attempts = state?.attempts || {};
  if (!tasks.length || tasks.every(task => parts[task.id])) return false;
  return state.deliveryPlanVersion === 2 ? tasks.every(task => parts[task.id] || (attempts[task.id] || 0) >= 4)
    : tasks.some(task => !parts[task.id] && (attempts[task.id] || 0) >= 2);
}

// Free retry: reopen only the missing parts' attempt budget. Saved parts and their text are untouched,
// and every reset is conditioned on that part still being missing, so a concurrent save is never undone.
export async function reopenPaidNarrativeRetry(env, { userId, resultId, now = Date.now(), model = ServiceExecutionTransaction } = {}) {
  const doc = await withMongoRetry(env, () => model.findOne({ userId, executionKey: resultId, "metadata.paidNarrative": { $exists: true } }).lean());
  if (!doc || !isPaidNarrativeExecution(doc) || !inScope(doc)) return { status: 404, body: { ok: false, reason: "RESULT_NOT_FOUND" } };
  const state = doc.metadata.paidNarrative, retry = doc.metadata.paidNarrativeRetry || {};
  if (doc.status !== "pending" || doc.premiumStatus === "completed") return { status: 409, body: { ok: false, reason: "NOT_RETRYABLE", status: doc.status } };
  if (state.exhaustionClaimed || state.failureResult || !notStarted(doc) || retry.refundApprovedAt || retry.heldAt) {
    return { status: 409, body: { ok: false, reason: "REFUND_IN_PROGRESS" } };
  }
  if (retryRefundAt(doc, now).getTime() <= now) return { status: 409, body: { ok: false, reason: "RETRY_WINDOW_CLOSED", refundRequestAvailable: true } };
  if (live(doc, now)) return { status: 409, body: { ok: false, reason: "BUSY", retryAfterMs: 5000 } };
  if (!PAID_NARRATIVE_RETRYABLE_CODES.includes(doc.reasonCode) && !exhausted(state) && doc.metadata.paidNarrativeRecovery?.reviewRequired !== true) {
    return { status: 409, body: { ok: false, reason: "STILL_GENERATING", resultId } };
  }
  if ((Number(retry.reopens) || 0) >= MAX_REOPENS) return { status: 409, body: { ok: false, reason: "RETRY_LIMIT_REACHED", refundRequestAvailable: true } };
  const missing = (state.tasks || []).filter(task => !state.parts?.[task.id]).map(task => String(task.id));
  if (!missing.length || missing.some(id => !TASK_ID.test(id))) return { status: 409, body: { ok: false, reason: "NOT_RETRYABLE" } };
  const at = new Date(now);
  const filter = { _id: doc._id, userId, status: "pending", refundStatus: { $in: [null, "none"] },
    "metadata.paidNarrative.exhaustionClaimed": { $ne: true }, $or: [{ "lock.until": null }, { "lock.until": { $lte: at } }],
    ...Object.fromEntries(missing.map(id => [`metadata.paidNarrative.parts.${id}`, { $exists: false }])) };
  const updated = await withMongoRetry(env, () => model.findOneAndUpdate(filter, {
    $set: { ...Object.fromEntries(missing.map(id => [`metadata.paidNarrative.attempts.${id}`, 0])),
      "metadata.paidNarrativeRecovery.reviewRequired": false, "metadata.paidNarrativeRetry.reopenedAt": at,
      reasonCode: "", nextRetryAt: at, timeoutAt: new Date(now + RETRY_LEASE_MS), "compensation.adminReviewRequired": false },
    $inc: { "metadata.paidNarrativeRetry.reopens": 1 },
  }, { returnDocument: "after" }).lean(), { retries: 0 });
  if (!updated) return { status: 409, body: { ok: false, reason: "BUSY", retryAfterMs: 5000 } };
  return { status: 200, body: { ok: true, status: "retrying", resultId, featureKey: doc.featureKey, reopenedParts: missing,
    savedParts: Object.keys(state.parts || {}), resumeBody: { resumeResultId: resultId }, refundAt: retryRefundAt(doc, now).toISOString() } };
}

// Evidence the settle chain can restore. Only rows owned by this user for this featureKey (or its single approved
// alias in refund-feature-alias.js, e.g. geomancy → openGeomancyOracle) count.
export async function provePaidNarrativeRefundEvidence(env, doc, { pointHistory = PointHistory, payment = Payment, moonstone = findMoonstoneSpendEvidence } = {}) {
  const userId = doc.userId, featureKey = doc.featureKey, sid = String(doc.sourceTransactionId || "");
  const featureKeys = refundEvidenceFeatureKeys(featureKey);
  if (!featureKeys.length) return { ok: false };
  if (sid && mongoose.Types.ObjectId.isValid(sid)) {
    // A coin deduct (delta < 0) is what runCoinRefund restores; a 0-delta pass row is proven below the way runPassQuotaRefund reads it.
    const row = await withMongoRetry(env, () => pointHistory.findOne({ _id: sid, userId, featureKey: { $in: featureKeys }, kind: "deduct" }).select("_id delta").lean());
    if (row && Number(row.delta) < 0) return { ok: true, kind: "coin" };
    const paid = await withMongoRetry(env, () => payment.findOne({ _id: sid, userId, featureKey: { $in: featureKeys } }).select("impUid merchantUid").lean());
    const impUid = String(paid?.impUid || ""), merchantUid = String(paid?.merchantUid || "");
    if (impUid || merchantUid) return { ok: true, kind: "card", paymentRef: { impUid, merchantUid } };
  }
  const pass = doc.metadata?.passRefund;
  if (pass?.cycleKey && Number(pass.cost) > 0) return { ok: true, kind: "pass" };
  // The pass row id is derived from the key it was deducted under; the first key with a row decides (same order as runPassQuotaRefund).
  let usage = null;
  for (const key of doc.idempotencyKey ? featureKeys : []) {
    const evidenceId = passUsageEvidenceId(userId, key, doc.idempotencyKey);
    usage = evidenceId ? await withMongoRetry(env, () => pointHistory.findOne({ _id: evidenceId, userId, featureKey: key, kind: "deduct" })
      .select("_id delta metadata").lean()) : null;
    if (usage) break;
  }
  const meta = usage?.metadata || {};
  const passUse = usage && meta.refundedForServiceExecution !== true && Number(usage.delta || 0) === 0 && ["PASS", "FAMILY"].includes(String(meta.accessMethod || "").toUpperCase())
    && meta.passBudgetExempt !== true && Number(meta.coinCost) > 0 && meta.passCycleKey;
  if (passUse) return { ok: true, kind: "pass" };
  // A V2 moonstone spend leaves no PointHistory row and no transactionId; its ledger row (not yet refunded) is the
  // evidence runMonthlyCreditRefund finds by the same request tokens. Narrower keys/tokens than the refunder's on purpose.
  const tokens = [sid, String(doc.idempotencyKey || "")].filter(Boolean);
  const spend = tokens.length ? await withMongoRetry(env, () => moonstone(env, { userId, featureKeys, tokens })) : null;
  return spend ? { ok: true, kind: "moonstone" } : { ok: false };
}

// One refund of a held run, by its own executionId. Returns the settle's refundStatus or a hold reason.
export async function settlePaidNarrativeRefund(env, doc, reasonCode, { now = Date.now(), model = ServiceExecutionTransaction, settle = settlePaidNarrativeExecution, evidence = provePaidNarrativeRefundEvidence } = {}) {
  if (!doc || doc.status !== "pending" || !isPaidNarrativeExecution(doc) || doc.premiumStatus === "completed") return "skipped";
  if (!inScope(doc) && !doc.metadata.paidNarrative.exhaustionClaimed) return "skipped";
  if (!notStarted(doc)) return "pending";
  if (live(doc, now)) return "busy";
  const at = new Date(now), state = doc.metadata.paidNarrative;
  const owned = { _id: doc._id, status: "pending", refundStatus: { $in: [null, "none"] }, $or: [{ "lock.until": null }, { "lock.until": { $lte: at } }] };
  // S5 (2026-11-28): alertPending feeds the operator alert (paid-delivery-review-alert.js); a held run leaves SETTLE_CODES and no sweep reads it again.
  const hold = async code => {
    await withMongoRetry(env, () => model.updateOne(owned, { $set: { reasonCode: code, "compensation.adminReviewRequired": true,
      "metadata.paidNarrativeRetry.heldAt": at, "metadata.paidNarrativeRetry.holdCode": code,
      "metadata.paidNarrativeRetry.alertPending": true, nextRetryAt: new Date(now + 86400000) } }), { retries: 0 });
    return "admin_review";
  };
  if (state.exhaustionClaimed) {
    // The product's own onExhausted refund already ran once (feature-question). Close it from that result;
    // an unconfirmed outcome is an operator's call, never a second refund.
    if (state.failureResult?.refundOk !== true) return hold("PAID_NARRATIVE_EXHAUSTION_REFUND_UNCONFIRMED");
    await withMongoRetry(env, () => model.updateOne(owned, { $set: { status: "refunded", premiumStatus: "refunded", deliveryStatus: "refunded",
      refundStatus: "refunded", refundedAt: at, completedAt: at, reasonCode: "PAID_NARRATIVE_EXHAUSTION_REFUNDED", nextRetryAt: at } }), { retries: 0 });
    return "refunded";
  }
  // Every part is saved: the result is complete and goes to delivery, it is not refunded.
  if (allSaved(state)) return "ready";
  const proof = await evidence(env, doc);
  if (!proof.ok) return hold("PAID_NARRATIVE_REFUND_EVIDENCE_MISSING");
  const approved = await withMongoRetry(env, () => model.updateOne(owned, { $set: { "metadata.paidNarrativeRetry.refundApprovedAt": at,
    "metadata.paidNarrativeRetry.refundReason": String(reasonCode).slice(0, 80), ...(proof.paymentRef ? { paymentRef: proof.paymentRef } : {}) } }), { retries: 0 });
  if (!approved?.modifiedCount && !approved?.matchedCount) return "busy";
  const result = await settle(env, doc._id, reasonCode, "Paid narrative retry-first refund");
  if (result?.status === "refunded") return "refunded";
  if (result?.status === "failed") {
    // No refunder restored anything although the evidence looked valid: make it visible to an operator.
    await withMongoRetry(env, () => model.updateOne({ _id: doc._id, status: "failed" }, { $set: { "compensation.adminReviewRequired": true,
      "metadata.paidNarrativeRetry.refundFailedAt": at, "metadata.paidNarrativeRetry.alertPending": true } }), { retries: 0 });
    return "refund_failed";
  }
  return "pending";
}

// Cron (consultation-delivery-refund.js): held runs past created + 7 days, and explicit closes with nothing saved.
export async function settleDuePaidNarrativeRetryRefunds(env, { now = Date.now(), limit = 5, model = ServiceExecutionTransaction, settle, evidence } = {}) {
  await connectDb(env);
  const dueBefore = new Date(now - RETRY_REFUND_AFTER_MS);
  const due = await withMongoRetry(env, () => model.find({ status: "pending", reasonCode: { $in: [...SETTLE_CODES] },
    "metadata.paidNarrative": { $exists: true }, refundStatus: { $in: [null, "none"] },
    $and: [{ $or: [{ featureKey: { $in: [...PAID_NARRATIVE_RETRY_FEATURES] } }, { reasonCode: "PAID_NARRATIVE_EXHAUSTION_CLAIMED" }] },
      { $or: [{ createdAt: { $lte: dueBefore } }, { reasonCode: "PAID_NARRATIVE_CLOSE_REQUESTED" }] }] })
    .sort({ createdAt: 1 }).limit(limit).lean());
  const outcomes = [];
  for (const doc of due) {
    try {
      const reason = doc.reasonCode === "PAID_NARRATIVE_CLOSE_REQUESTED" ? "paid_narrative_close_refund" : "paid_narrative_retry_window_expired";
      outcomes.push({ service: "paid-narrative", featureKey: doc.featureKey, refundStatus: await settlePaidNarrativeRefund(env, doc, reason, { now, model, ...(settle ? { settle } : {}), ...(evidence ? { evidence } : {}) }) });
    } catch { outcomes.push({ service: "paid-narrative", featureKey: doc.featureKey, refundStatus: "pending" }); }
  }
  return outcomes;
}

export async function handlePaidNarrativeRetryRoutes(request, env) {
  try {
    const path = new URL(request.url).pathname;
    if (request.method !== "POST") return json({ ok: false, reason: "METHOD_NOT_ALLOWED" }, { status: 405 });
    const retry = path === "/api/paid-narrative/retry", refundRequest = path === "/api/paid-narrative/refund-request";
    if (!retry && !refundRequest) return json({ ok: false, reason: "NOT_FOUND" }, { status: 404 });
    const auth = await requireAuth(request, env);
    const body = await readJson(request).catch(() => ({}));
    const resultId = typeof body?.resultId === "string" ? body.resultId : "";
    if (!/^[a-zA-Z0-9:_-]{8,120}$/.test(resultId)) return json({ ok: false, reason: "INVALID_RESULT_ID" }, { status: 422 });
    await connectDb(env);
    const userId = auth.userId;
    if (retry) {
      const outcome = await reopenPaidNarrativeRetry(env, { userId, resultId });
      return json(outcome.body, { status: outcome.status });
    }
    const doc = await withMongoRetry(env, () => ServiceExecutionTransaction.findOne({ userId, executionKey: resultId, "metadata.paidNarrative": { $exists: true } }).lean());
    if (!doc || !isPaidNarrativeExecution(doc) || !inScope(doc)) return json({ ok: false, reason: "RESULT_NOT_FOUND" }, { status: 404 });
    if (doc.status === "refunded") return json({ ok: true, refundStatus: "refunded", resultId });
    if (doc.status !== "pending" || doc.premiumStatus === "completed") return json({ ok: false, reason: "NOT_REFUNDABLE", status: doc.status }, { status: 409 });
    const refundStatus = await settlePaidNarrativeRefund(env, doc, "paid_narrative_refund_request");
    if (refundStatus === "busy") return json({ ok: false, reason: "BUSY", retryAfterMs: 5000 }, { status: 409 });
    if (refundStatus === "ready") return json({ ok: false, reason: "RESULT_READY", resumeBody: { resumeResultId: resultId } }, { status: 409 });
    return json({ ok: refundStatus === "refunded", refundStatus, resultId, ...(refundStatus === "admin_review" ? { nextAction: "support" } : {}) },
      { status: refundStatus === "refunded" ? 200 : 202 });
  } catch (error) {
    return handleRouteError(error, { request, env });
  }
}
