/**
 * 차감 직후의 판정(coverage)과 차감 전 사용자 문서로 refundPassCoverage 의 restorePass 를 만든다.
 *
 * 마지막 차감이 월 예산을 채우면 이용권이 그 자리에서 종료된다(buildPassTerminationFields).
 * 환불이 쿼터 숫자만 돌리고 이용권을 되살리지 못하면, 실패한 시도 하나가 남은 이용권 전부를 잃게
 * 만든다 — 그래서 차감한 쪽이 되살릴 모양(등급·만료일·한도)을 함께 들고 있어야 한다.
 * 사이클 키·등급이 없으면(예산을 못 세는 상태) 되살릴 것도 없으므로 undefined.
 *
 * 의존성이 없는 순수 함수다 — 환불 호출부 여러 곳이 같은 모양을 쓰도록 한 곳에 둔다.
 */
export function buildPassRestoreSnapshot(coverage, user) {
  const cycleKey = String(coverage?.cycleKey || "").trim();
  const tier = String(coverage?.tier || "").trim();
  if (!cycleKey || !tier) return undefined;
  const sub = user?.profileSubscription && typeof user.profileSubscription === "object" ? user.profileSubscription : {};
  return {
    tier,
    expiresAt: cycleKey,
    monthlyLimitCoin: Math.max(0, Math.floor(Number(coverage.budgetCoin) || 0)),
    profileLimit: Math.max(0, Math.floor(Number(sub.profileLimit) || 0)),
    maxCoveredCoin: Math.max(0, Math.floor(Number(coverage.perItemLimit) || 0)),
    passPolicyVersion: String(sub.passPolicyVersion || ""),
  };
}
