import { MasterLoveCodexSession, Payment } from "./models.js";

const USABLE = new Set(["generating", "completed", "generation_failed"]);

/** A session is an already purchased run, not a request to buy another run. */
export async function recoverCodexSession({ userId, sessionId, requestId, paymentId, accessType, inputHash, mode }, models = { MasterLoveCodexSession, Payment }) {
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
  // Never revive a refunded card purchase through an old session/token.
  if (session.accessType === "paid") {
    const ids = [session.paymentId, session.billingRequestId, session.idempotencyKey].filter(Boolean);
    const featureKey = session.mode === "compat" ? "master-love-codex-compat" : "master-love-codex";
    const refunded = await models.Payment.findOne({
      userId, featureKey, status: { $in: ["refunded", "cancelled", "canceled"] },
      $or: ids.flatMap(id => [{ merchantUid: id }, { impUid: id }, { requestId: id }, { idempotencyKey: id }]),
    }).lean();
    if (refunded) return { denied: true, reason: "PURCHASE_REFUNDED" };
  }
  return { session };
}
