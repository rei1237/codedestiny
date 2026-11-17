// 생성이 끝난 결과(delivery_pending)의 늦은 이용권 차감이 한도·자격 사유로 거절되면 결과를 버리지 않는다.
// 시작 시점에 이용권 판정을 통과한 사용자에게는 만든 결과를 전달하고(원칙 17), 미차감 사실은
// llmMeta.usageSettlement 와 경고 로그로 남겨 운영에서 확인한다.
// 일시 장애(DB·네트워크 등 그 밖의 오류)는 여기서 null 을 돌려 호출부가 기존처럼 delivery_pending + 503 재시도를 유지한다.
import { normalizeConsultAccessType } from "./entitlement-policy.js";

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
