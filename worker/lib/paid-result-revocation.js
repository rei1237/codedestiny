import * as models from "./models.js";

// 저장된 구매 회차의 재개 검사. 새 구매 권한을 부여하거나 차감하지 않는다.
export async function isPaidResultRevoked(userId, featureKey, requestIds) {
  const tokens = [...new Set(requestIds.filter(Boolean).map(String))];
  if (!userId || !featureKey || !tokens.length) return true;
  const ids = tokens.flatMap(value => ["requestId", "idempotencyKey", "paymentId", "orderId", "executionId", "merchantUid", "impUid"].map(key => ({ [key]: value })));
  const metadataIds = tokens.flatMap(value => ["sourceId", "metadata.requestId", "metadata.idempotencyKey", "metadata.transactionId"].map(key => ({ [key]: value })));
  const markers = ["refundedForServiceExecution", "coinRefundedForUnlockFailure", "monthlyCreditRefundedForServiceExecution", "refundedForUnlockFailure", "monthlyCreditRefundedForUnlockFailure", "monthlyCreditRefundedForLedgerFailure"].map(key => ({ [`metadata.${key}`]: true }));
  const revoked = ["refunded", "cancelled", "canceled", "REFUNDED", "CANCELLED"];
  const results = await Promise.all([
    models.PaidExecutionRecord.findOne({ userId, featureId: featureKey, status: { $in: revoked }, $or: ids }).lean(),
    models.Payment.findOne({ userId, featureKey, status: { $in: revoked }, $or: ids }).lean(),
    models.PointHistory.findOne({ userId, featureKey, $and: [{ $or: metadataIds }, { $or: markers }] }).lean(),
    models.MonthlyCreditLedger.findOne({ userId, $and: [{ $or: [{ serviceKey: featureKey }, { "metadata.featureKey": featureKey }] }, { $or: metadataIds }, { $or: markers }] }).lean(),
  ]);
  return results.some(Boolean);
}
