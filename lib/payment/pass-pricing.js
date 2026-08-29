/**
 * 달빛 이용권(membership_pass) 월 가격의 단일 정본.
 *
 * 여기 있는 이유: 이 값은 워커(주문 생성·금액 검증)와 프론트(상점 화면 표시)가 **함께** 써야 하는데,
 * 프론트는 `worker/` 를 import 할 수 없고 워커는 `app/` 을 import 할 수 없다. 그래서 양쪽이 함께
 * import 할 수 있는 `lib/` 에 둔다 — `lib/music-access-policy.js` 가 쓰는 것과 같은 방식이다.
 *
 * 2026-08-12 이전에는 같은 숫자가 4벌로 흩어져 있었다:
 *   worker/payments/passes.js · worker/routes/payments.js · app/points/PointsClient.tsx · index.html goldenPackages
 * 앞의 셋은 이 파일을 import 하도록 정리했다. 마지막 하나(정적 셸 인라인)는 import 가 불가능해
 * 리터럴로 남아 있으며, `__tests__/worker/payments.subscription-purchase.test.js` 가 셸과 대조한다.
 *
 * 🔴 값을 바꾸면 Play 이용권 SKU(`worker/lib/app-store-pricing.js` 의 PASS_TIER_TABLE `webAmountKRW`)도
 * 함께 바꿔야 한다. `scripts/verify-app-store-pricing.mjs` 가 앱가 = 웹가를 오차 0으로 검사한다
 * (2026-08-29 이전에는 콘텐츠 티어의 20~30% 인상률 밴드를 봤다).
 */
export const PASS_MONTHLY_WON = Object.freeze({
  standard: 9900,
  premium: 29900,
  vvip: 59000,
  family: 149000,
});
