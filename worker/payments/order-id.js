/**
 * V2 주문 ID 판별 — worker/payments/orders.js deriveOrderId 가 만드는 모양(cd + sha256 hex 38자)이다.
 * 레거시 단건 cd-single-…·자미두수 cd-zwai-…/cd-zwisl-… 는 하이픈이 있어 걸리지 않는다.
 * 의존성 없는 잎 모듈로 둔다 — 레거시 라우트·재조정 크론이 V2 주문 모듈 그래프를 끌어오지 않게.
 * 🔴 deriveOrderId 형식을 바꾸면 여기도 같이 바꾼다(__tests__/worker/payments-v2.orders.test.js 가 둘을 묶는다).
 * 이 판별이 틀리면 V2 주문이 레거시 지급 경로로 조용히 새므로(2026-09-24 W4·W5) 복사하지 말고 가져다 쓴다.
 */
export function isV2OrderId(value) {
  return /^cd[0-9a-f]{38}$/.test(String(value || ""));
}

/**
 * 레거시 단건 주문 ID 판별 — worker/routes/payments.js buildSinglePaymentId 가 만드는 모양(cd-single-…)이다.
 * 🔴 이 주문은 레거시 /single/complete·재조정 크론(settleSinglePaymentForReconcile)만 확정·지급한다. V2 확정·웹훅이
 *    받으면 레거시 지급과 V2 지급이 겹치고, productId 가 클라이언트가 보낸 serviceId 라 결제 금액과 다른 상품이 풀린다(2026-09-24 R3).
 */
export function isLegacySingleOrderId(value) {
  return /^cd-single-/.test(String(value || ""));
}
