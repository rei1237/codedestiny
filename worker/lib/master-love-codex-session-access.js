import { MasterLoveCodexSession, Payment, PaidExecutionRecord, PointHistory, MonthlyCreditLedger } from "./models.js";

const USABLE = new Set(["generating", "delivery_pending", "completed", "generation_failed"]);

/** A session is an already purchased run, not a request to buy another run. */
export async function recoverCodexSession({ userId, sessionId, requestId, paymentId, accessType, inputHash, mode }, models = { MasterLoveCodexSession, Payment, PaidExecutionRecord, PointHistory, MonthlyCreditLedger }) {
  if (!userId || (!sessionId && !requestId && !paymentId)) return null;
  const session = await models.MasterLoveCodexSession.findOne({
    userId: String(userId),
    ...(sessionId ? { id: String(sessionId) } : paymentId
      ? { paymentId: String(paymentId), accessType, mode }
      : { idempotencyKey: String(requestId) }),
  }).lean();
  if (!session) return null;
  if (!USABLE.has(session.status)
      || (inputHash && session.inputHash !== inputHash)
      || (mode && (session.mode || "solo") !== mode)) {
    return { denied: true, reason: "PURCHASE_RUN_MISMATCH" };
  }
  if (session.passRefund?.refundedAt || session.billingRefund?.refundedAt) return { denied: true, reason: "PURCHASE_REFUNDED" };
  const tokens = [...new Set([session.paymentId, session.billingRequestId, session.idempotencyKey].filter(Boolean))];
  const featureKey = session.mode === "compat" ? "master-love-codex-compat" : "master-love-codex";
  const ids = tokens.flatMap(value => ["requestId", "idempotencyKey", "paymentId", "orderId", "executionId"].map(key => ({ [key]: value })));
  const metadataIds = tokens.flatMap(value => ["sourceId", "metadata.requestId", "metadata.idempotencyKey", "metadata.transactionId"].map(key => ({ [key]: value })));
  const markers = ["refundedForServiceExecution", "coinRefundedForUnlockFailure", "monthlyCreditRefundedForServiceExecution", "refundedForUnlockFailure", "monthlyCreditRefundedForUnlockFailure", "monthlyCreditRefundedForLedgerFailure"].map(key => ({ [`metadata.${key}`]: true }));
  const blocked = await Promise.all([
    models.PaidExecutionRecord?.findOne({ userId, featureId: featureKey, status: { $in: ["refunded", "cancelled", "canceled", "REFUNDED", "CANCELLED"] }, $or: ids }).lean(),
    models.PointHistory?.findOne({ userId, featureKey, $and: [{ $or: metadataIds }, { $or: markers }] }).lean(),
    models.MonthlyCreditLedger?.findOne({ userId, $and: [{ $or: [{ serviceKey: featureKey }, { "metadata.featureKey": featureKey }] }, { $or: metadataIds }, { $or: markers }] }).lean(),
  ]);
  if (blocked.some(Boolean)) return { denied: true, reason: "PURCHASE_REFUNDED" };
  // Never revive a refunded card purchase through an old session/token.
  if (session.accessType === "paid") {
    const ids = [session.paymentId, session.billingRequestId, session.idempotencyKey].filter(Boolean);
    const featureKey = session.mode === "compat" ? "master-love-codex-compat" : "master-love-codex";
    const refunded = await models.Payment.findOne({
      userId, featureKey,
      $and: [
        { $or: [
          { status: { $in: ["cancelled", "canceled"] } },
          { status: "refunded", orderState: { $nin: ["PARTIAL_CANCELLED", "partial_cancelled"] } },
          { "metadata.unlockRevoked": true },
          { "pricingSnapshot.unlockRevoked": true },
        ] },
        { $or: ids.flatMap(id => [{ merchantUid: id }, { impUid: id }, { requestId: id }, { idempotencyKey: id }]) },
      ],
    }).lean();
    if (refunded) return { denied: true, reason: "PURCHASE_REFUNDED" };
  }
  return { session };
}
