/**
 * 환불 증빙 기능 키 별칭 — 단일 정본 (2026-11-26 사용자 승인 "지오맨시는 (a) 권장안으로 진행해줘").
 *
 * 지오맨시는 실행(ServiceExecutionTransaction)을 "geomancy" 로 열지만, 결제 게이트는 이용권·카드·월정석을
 * "openGeomancyOracle" 로 차감한다(worker/lib/access-control.js PREMIUM_PASS_GATE_FEATURE_KEYS).
 * 그래서 환불 증빙 조회와 환불기 4종(코인·이용권·월정석·카드)은 실행 키 → 추가로 인정할 증빙 키를
 * 여기서만 읽는다.
 *
 * 🔴 정확히 일치하는 1:1 단방향 표만 둔다. 와일드카드·접두사·대소문자 정규화를 넣으면 다른 상품의
 *    결제 행이 이 실행의 환불 증빙으로 인정돼 이중·교차 환불이 된다. 항목을 늘리려면 별도 승인을 받는다.
 */
const REFUND_EVIDENCE_FEATURE_ALIASES = Object.freeze({
  geomancy: Object.freeze(["openGeomancyOracle"]),
});

/** 실행 키 자신이 먼저, 그다음 승인된 별칭 — 순서가 곧 증빙 조회 우선순위다. */
export function refundEvidenceFeatureKeys(executionFeatureKey) {
  const key = String(executionFeatureKey || "").trim();
  if (!key) return [];
  const aliases = Object.prototype.hasOwnProperty.call(REFUND_EVIDENCE_FEATURE_ALIASES, key) ? REFUND_EVIDENCE_FEATURE_ALIASES[key] : [];
  return [key, ...aliases];
}

export function isRefundEvidenceFeature(executionFeatureKey, rowFeatureKey) {
  const row = String(rowFeatureKey || "").trim();
  return Boolean(row) && refundEvidenceFeatureKeys(executionFeatureKey).includes(row);
}
