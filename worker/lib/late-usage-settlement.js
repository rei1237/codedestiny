// 생성이 끝난 결과(delivery_pending)의 늦은 이용권 차감이 한도·자격 사유로 거절되면 결과를 버리지 않는다.
// 시작 시점에 이용권 판정을 통과한 사용자에게는 만든 결과를 전달하고(원칙 17), 미차감 사실은
// llmMeta.usageSettlement 와 경고 로그로 남겨 운영에서 확인한다.
// 일시 장애(DB·네트워크 등 그 밖의 오류)는 여기서 null 을 돌려 호출부가 기존처럼 delivery_pending + 503 재시도를 유지한다.
import { normalizeConsultAccessType } from "./entitlement-policy.js";
import { consultationRefundState } from "./consultation-refund-state.js";

const PASS_SETTLEMENT_DENIAL_CODES = new Set(["MONTHLY_PASS_LIMIT_EXCEEDED", "PAYMENT_REQUIRED", "PRICE_EXCEEDS_PASS_LIMIT"]);

export function lateUsageSettlementFailure(error, { service = "", sessionId = "", accessType = "" } = {}) {
  if (normalizeConsultAccessType(accessType) !== "pass") return null;
  const reason = String(error?.code || "").trim();
  if (!PASS_SETTLEMENT_DENIAL_CODES.has(reason)) return null;
  console.warn("paid_delivery_usage_settlement_failed", { service, sessionId, reason });
  return { usageSettlement: "failed", usageSettlementReason: reason, usageSettlementFailedAt: new Date().toISOString() };
}

// 부분 갱신($set 점 경로)을 쓰는 저장 함수용.
export function usageSettlementSetFields(settlement) {
  if (!settlement) return {};
  return Object.fromEntries(Object.entries(settlement).map(([key, value]) => [`llmMeta.${key}`, value]));
}

// 생성이 끝난(delivery_pending) 이용권 상담의 전달 직전 접근 재확인이 한도·자격 사유로 거절된 경우의 전달 정산.
// 시작 때 이용권으로 통과해 본문까지 만든 결과는 그 뒤 한도 소진만으로 막지 않는다(원칙 17).
// 🔴 fail-closed — 아래를 모두 확인할 때만 정산을 돌려주고, 그 밖의 사유·조회 실패는 null(호출부는 기존 402·503 유지):
//   재확인 사유가 한도·자격(PASS_SETTLEMENT_DENIAL_CODES, 사유 없이 null 을 돌려주는 라우트는 null) · 저장된 시작 접근이 pass ·
//   상담 자체 환불 표시 없음 · 회원 탈퇴 아님 · 이 요청(멱등키)의 취소·환불 증빙 없음 · 상담 시작 뒤 환불·취소된 이용권 주문 없음.
// 라우트마다 취소 증빙을 PAYMENT_REQUIRED·null 로도 돌려주므로 사유만 믿지 않고 증빙을 여기서 직접 다시 본다.
// models 는 호출 라우트가 이미 가진 mongoose 모델({ User, Payment, PaidExecutionRecord, PointHistory })을 넘긴다.
export async function lateAccessDenialSettlement({ fresh, doc, userId, idempotencyKey = "", service = "", models = {} } = {}) {
  // 상수는 함수 안에 둔다 — 라우트 동작 테스트가 함수 선언만 떼어 vm 에 싣는다.
  const REVOKED_STATUSES = ["refunded", "cancelled", "canceled", "REFUNDED", "CANCELLED"];
  const REVOKED_USE_MARKERS = ["refundedForServiceExecution", "refundedForUnlockFailure", "coinRefundedForUnlockFailure", "monthlyCreditRefundedForServiceExecution"];
  try {
    if (fresh && (fresh.ok !== false || !PASS_SETTLEMENT_DENIAL_CODES.has(String(fresh.reason || "").trim()))) return null;
    if (doc?.status !== "delivery_pending" || normalizeConsultAccessType(doc.accessType) !== "pass") return null;
    if (consultationRefundState(doc)) return null;
    const key = String(idempotencyKey || doc.idempotencyKey || "").trim();
    if (!key || !userId) return null;
    const { User, Payment, PaidExecutionRecord, PointHistory } = models;
    const user = await User.findOne({ _id: userId }).select("status withdrawnAt").lean();
    if (!user || user.status === "withdrawn" || user.withdrawnAt) return null;
    const startedAt = doc.createdAt ? new Date(doc.createdAt) : new Date(0);
    const since = Number.isNaN(startedAt.getTime()) ? new Date(0) : startedAt;
    const revoked = await Promise.all([
      PaidExecutionRecord.findOne({ userId: String(userId), status: { $in: REVOKED_STATUSES }, $or: [{ requestId: key }, { executionId: key }, { idempotencyKey: key }] }).lean(),
      PointHistory.findOne({ userId, $and: [{ $or: [{ "metadata.requestId": key }, { "metadata.idempotencyKey": key }] }, { $or: REVOKED_USE_MARKERS.map(marker => ({ [`metadata.${marker}`]: true })) }] }).lean(),
      Payment.findOne({ userId, paymentType: "membership_pass", status: { $in: REVOKED_STATUSES }, updatedAt: { $gte: since } }).lean(),
    ]);
    if (revoked.some(Boolean)) return null;
    const reason = String(fresh?.reason || "PAYMENT_REQUIRED").trim();
    console.warn("paid_delivery_usage_settlement_failed", { service, sessionId: String(doc.id || doc._id || ""), reason, stage: "access_recheck" });
    return { usageSettlement: "failed", usageSettlementReason: reason, usageSettlementFailedAt: new Date().toISOString() };
  } catch (_) {
    return null;
  }
}
