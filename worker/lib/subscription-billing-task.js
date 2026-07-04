// 이용권(멤버십 패스)은 30일 1회성 구매 상품이며 자동 재청구(정기결제)를 지원하지 않는다.
// 이 함수는 과거 카드 자동결제 설계의 흔적으로 남아있던 cron 훅이며, 항상 no-op을 반환한다.
// 자동 재청구 로직을 다시 추가하지 말 것 — 결제 정책(docs/payment-policy-overview.md) 위반이다.
export async function runCardSubscriptionBillingTask() {
  return { ok: true, processed: 0, disabled: true, reason: "membership_pass_non_recurring" };
}
