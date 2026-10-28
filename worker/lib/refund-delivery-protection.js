/**
 * Check the funding reference across products before an automatic restoration.
 * The caller supplies its existing DB context so balance restoration stays in
 * one transaction. No network calls or second DB admission are opened here.
 */
export async function findProtectedFundingExecution({ userId, ids, executionId = "", failedRequestId = "" }, findOne) {
  const references = [...new Set(ids.filter(Boolean).map(String))];
  if (!references.length) return null;
  const activeOther = {
    status: "pending",
    ...(executionId ? { _id: { $ne: executionId } } : {}),
    ...(failedRequestId ? {
      executionKey: { $ne: failedRequestId },
      idempotencyKey: { $ne: failedRequestId },
    } : {}),
  };
  const paths = [
    "coinTransactionId", "sourceTransactionId", "paymentId", "orderId", "merchantUid",
    "executionKey", "idempotencyKey", "paymentRef.impUid", "paymentRef.merchantUid",
    "metadata.paidNarrative.body.sourceTransactionId", "metadata.paidNarrative.body.transactionId",
    "metadata.paidNarrative.paymentProof.sourceTransactionId", "metadata.paidNarrativeProof.transactionId",
  ];
  const service = await findOne("ServiceExecutionTransaction", {
    userId,
    $and: [
      { $or: [
        { status: { $in: ["success", "completed", "delivered"] } },
        { deliveryStatus: "delivered" }, { premiumStatus: "completed" }, activeOther,
        { "metadata.paidNarrative.parts": { $exists: true, $ne: {} } },
        { "metadata.celestialDelivery.delivery.parts": { $exists: true, $ne: {} } },
      ] },
      { $or: paths.map(path => ({ [path]: { $in: references } })) },
    ],
  });
  if (service) return service;
  return findOne("PaidExecutionRecord", {
    userId: String(userId),
    $and: [
      { $or: [
        { status: { $in: ["completed", "partial", "delivery_pending"] } },
        { status: { $in: ["paid_pending_generation", "generating"] },
          ...(failedRequestId ? { requestId: { $ne: failedRequestId } } : {}) },
      ] },
      { $or: ["paymentId", "requestId", "idempotencyKey", "orderId"].map(path => ({ [path]: { $in: references } })) },
    ],
  });
}
