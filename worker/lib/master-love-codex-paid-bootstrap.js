import { MasterLoveCodexSession, Payment, PaidExecutionRecord } from "./models.js";
import { readOrderResumeContext, RESUME_APPROVED_TTL_MS } from "../payments/resume-context.js";
import { paidExecutionIdentity, resolveExecutionRegistration } from "../payments/executions.js";
import { startCodexSession, syncCodexExecution, __masterLoveCodexTestUtils as codex } from "../routes/master-love-codex.js";

/** Trusted scheduled recovery of the paid-approval -> /start gap. No new payment gate. */
export async function bootstrapPaidCodexSessions(env, options = {}) {
  const now = options.now ?? Date.now();
  const Session = options.MasterLoveCodexSession || MasterLoveCodexSession;
  const Orders = options.Payment || Payment;
  const features = ["master-love-codex", "master-love-codex-compat"];
  const orders = await Orders.find({ paymentType: "digital_content", purchaseType: { $ne: "GIFT" },
    featureKey: { $in: features }, status: { $in: ["paid", "success", "fulfilled"] },
    createdAt: { $gt: new Date(now - RESUME_APPROVED_TTL_MS), $lt: new Date(now - 300000) },
    "metadata.codexRecovery.status": { $nin: ["session_created", "input_required"] },
    $or: [{ "metadata.codexRecovery.nextAttemptAt": { $exists: false } }, { "metadata.codexRecovery.nextAttemptAt": { $lte: new Date(now) } }],
  }).sort({ createdAt: 1 }).limit(3).lean();
  const outcomes = [];
  for (const order of orders) {
    if (Date.now() + codex.BATCH_BUDGET_MS > options.deadlineAt) break;
    const orderId = String(order.merchantUid || ""), userId = String(order.userId || "");
    if (!orderId || !userId || !features.includes(order.featureKey) || !["paid", "success", "fulfilled"].includes(order.status) || order.purchaseType === "GIFT") continue;
    const filter = { merchantUid: orderId, userId: order.userId, status: { $in: ["paid", "success", "fulfilled"] } };
    try {
      let session = await Session.findOne({ userId, paymentId: orderId, mode: order.featureKey === features[1] ? "compat" : "solo" }).lean();
      if (!session) {
        const context = await (options.readOrderResumeContext || readOrderResumeContext)(order, env, now);
        if (!context?.resume?.args?.payload) {
          await Orders.updateOne(filter, { $set: { "metadata.codexRecovery": { status: "input_required", at: new Date(now) } } });
          outcomes.push({ orderId, outcome: "input_required" });
          continue; // Purchase rights are preserved; the existing UI accepts re-entered input.
        }
        if (context.resume.kind !== "master-love-codex") throw new Error("PURCHASE_RUN_MISMATCH");
        const input = JSON.parse(context.resume.args.payload), normalized = codex.normalizeInput(input);
        if (!normalized.ok || codex.resolveMode(normalized.mode).featureKey !== order.featureKey) throw new Error("PURCHASE_RUN_MISMATCH");
        const body = { ...input, paymentId: orderId, idempotencyKey: String(context.resume.args.idempotencyKey || order.requestId || order.idempotencyKey), locale: input.locale || "ko" };
        const request = new Request("https://internal.invalid/api/master-love-codex/start", { method: "POST", headers: { "Content-Type": "application/json" } });
        const response = await (options.startCodexSession || startCodexSession)(request, env, { userId }, body), payload = await response.json();
        if (!response.ok || !payload.ok || !payload.sessionId) throw new Error(payload.reason || "START_PENDING");
        session = await Session.findOne({ id: payload.sessionId, userId }).lean();
        if (!session) throw new Error("RESULT_STORAGE_UNAVAILABLE");
      }
      await (options.ensureExecution || ensureCodexExecution)(order, session);
      await (options.syncCodexExecution || syncCodexExecution)(session);
      await Orders.updateOne(filter, { $set: { "metadata.codexRecovery": { status: "session_created", sessionId: session.id, at: new Date(now) } } });
      outcomes.push({ orderId, sessionId: session.id, outcome: "session_created" });
    } catch (error) {
      await Orders.updateOne(filter, { $set: { "metadata.codexRecovery": { status: "recovery_pending", code: String(error?.message || error).slice(0, 120), nextAttemptAt: new Date(now + 600000) } } }).catch(() => {});
      outcomes.push({ orderId, outcome: "recovery_pending" });
    }
  }
  return outcomes;
}

async function ensureCodexExecution(order, session) {
  const paid = await Payment.findOne({ merchantUid: order.merchantUid, userId: order.userId, featureKey: order.featureKey,
    status: { $in: ["paid", "success", "fulfilled"] }, "metadata.unlockRevoked": { $ne: true } }).lean();
  if (!paid) throw new Error("PURCHASE_REFUNDED");
  const identity = paidExecutionIdentity(order);
  const existing = await resolveExecutionRegistration({ ...identity, userId: String(order.userId), featureKey: order.featureKey, paymentId: order.merchantUid });
  await PaidExecutionRecord.findOneAndUpdate({ _id: existing._id }, { $setOnInsert: {
    ...identity, userId: String(order.userId), featureId: order.featureKey, profileId: order.pricingSnapshot?.profileId || "default",
    accessMode: "per_use", accessMethod: "single", paymentId: order.merchantUid, orderId: order.merchantUid,
    amountKRW: Number(order.amount || order.amountKRW || 0), status: "paid_pending_generation", idempotencyKey: identity.executionId, resultId: session.id,
  } }, { upsert: true, new: true }).lean();
}
