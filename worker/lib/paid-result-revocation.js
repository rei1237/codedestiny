import * as models from "./models.js";

// 결제창만 열고 떠난 주문을 크론이 30분 뒤 닫은 흔적(worker/payments/reconcile.js expireStalePendingOrders →
// markOrderCancelled 는 대기 주문만 닫는다). 결제된 적이 없어 회수할 권한도 없고, 취소 주문은 결제로 되살아나지
// 않는다(orders.js markOrderPaid). 쿼리마다 새 객체를 돌려준다 — Mongoose 가 필터를 제자리에서 캐스팅한다.
export function neverPaidExpiredOrder() {
  return { status: "cancelled", failureCode: "ORDER_EXPIRED", paidAt: null };
}

// 저장된 구매 회차의 재개 검사. 새 구매 권한을 부여하거나 차감하지 않는다.
// ignoreNeverPaidExpiry: 같은 요청 키로 재결제하는 기능(자미두수)만 켠다 — 만료된 옛 회차가 새로 결제된 회차를 막지 않게.
export async function isPaidResultRevoked(userId, featureKey, requestIds, { ignoreNeverPaidExpiry = false } = {}) {
  const tokens = [...new Set(requestIds.filter(Boolean).map(String))];
  if (!userId || !featureKey || !tokens.length) return true;
  const ids = tokens.flatMap(value => ["requestId", "idempotencyKey", "paymentId", "orderId", "executionId", "merchantUid", "impUid"].map(key => ({ [key]: value })));
  const metadataIds = tokens.flatMap(value => ["sourceId", "metadata.requestId", "metadata.idempotencyKey", "metadata.transactionId"].map(key => ({ [key]: value })));
  const markers = ["refundedForServiceExecution", "coinRefundedForUnlockFailure", "monthlyCreditRefundedForServiceExecution", "refundedForUnlockFailure", "monthlyCreditRefundedForUnlockFailure", "monthlyCreditRefundedForLedgerFailure"].map(key => ({ [`metadata.${key}`]: true }));
  const revoked = ["refunded", "cancelled", "canceled", "REFUNDED", "CANCELLED"];
  const cancelled = ["cancelled", "canceled", "CANCELLED"];
  const refunded = ["refunded", "REFUNDED"];
  const partialCancellation = ["PARTIAL_CANCELLED", "partial_cancelled"];
  const results = await Promise.all([
    models.PaidExecutionRecord.findOne({ userId, featureId: featureKey, status: { $in: revoked }, $or: ids }).lean(),
    models.Payment.findOne({ userId, featureKey, $and: [
      { $or: [
        { status: { $in: cancelled } },
        { status: { $in: refunded }, orderState: { $nin: partialCancellation } },
        { "metadata.unlockRevoked": true },
        { "pricingSnapshot.unlockRevoked": true },
      ] },
      { $or: ids },
    ], ...(ignoreNeverPaidExpiry ? { $nor: [neverPaidExpiredOrder()] } : {}) }).lean(),
    models.PointHistory.findOne({ userId, featureKey, $and: [{ $or: metadataIds }, { $or: markers }] }).lean(),
    models.MonthlyCreditLedger.findOne({ userId, $and: [{ $or: [{ serviceKey: featureKey }, { "metadata.featureKey": featureKey }] }, { $or: metadataIds }, { $or: markers }] }).lean(),
  ]);
  return results.some(Boolean);
}

const RESULT_EVIDENCE_PATHS = Object.freeze([
  "id",
  "_id",
  "requestId",
  "idempotencyKey",
  "attemptId",
  "paymentId",
  "orderId",
  "executionId",
  "executionKey",
  "billingRequestId",
  "purchaseId",
  "transactionId",
  "sessionId",
  "reportId",
  "llmMeta.requestId",
  "llmMeta.transactionId",
  "llmMeta.access.evidenceId",
  "llmMeta.access.purchaseId",
  "llmMeta.access.paymentId",
  "payment.paymentId",
  "payment.requestId",
]);

function readPath(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

// 과거 완료본 재열람 전용 판정. 새 품질 기준이나 현재 이용권 상태를 다시 요구하지 않고,
// 저장본에 연결된 원래 구매 증거가 나중에 취소·환불됐는지만 확인한다.
export async function isStoredPaidResultRevoked(userId, featureKey, record, options = {}) {
  const storedStatus = String(record?.status || "").trim().toLowerCase();
  if (["cancelled", "canceled", "refunded", "revoked"].includes(storedStatus)) return true;
  const tokens = RESULT_EVIDENCE_PATHS.map(path => readPath(record, path)).filter(Boolean);
  // 식별자가 전혀 없는 구버전 완료본은 새 증빙 문턱을 소급하지 않는다.
  if (!tokens.length) return false;
  return isPaidResultRevoked(userId, featureKey, tokens, options);
}
