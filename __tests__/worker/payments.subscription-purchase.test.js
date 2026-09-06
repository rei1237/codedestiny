/**
 * @jest-environment node
 *
 * 달빛 이용권 상점 — 셸 가격 정본 대조.
 *
 * 🔴 이 파일에 있던 prepare/confirm 회귀 테스트는 2026-09-06 에 삭제했다. 대상이던
 * worker/routes/payments.js 의 handleSubscriptionPrepare/handleSubscriptionConfirm 이
 * 죽은 코드였기 때문이다 — /api/payments/subscription/* 는 worker/index.js 가 V2
 * (worker/payments/index.js)로 가로채고, 그 경로의 회귀는
 * __tests__/worker/payments-v2.subscription.test.js 가 이미 본다.
 *
 * 남은 것은 다른 축이라 옮길 곳이 없다 — 정적 셸 index.html 의 이용권 가격 리터럴이
 * 코드 정본과 갈라지지 않았는지 본다(scripts/verify-i18n-price-drift.mjs 가 이 대조를
 * 이 파일에 위임한다고 주석으로 적어 두었다).
 */

// index.html 의 달빛 이용권 상점 패키지(goldenPackages)와 동일해야 하는 값.
const WEB_PASS_PRICES = {
  standard: 9900,
  premium: 29900,
  vvip: 59000,
  family: 149000,
};

describe("달빛 이용권 상점 — 가격 정본", () => {
  test("이용권 4등급 가격이 홈 셸 goldenPackages 값과 일치해야 한다", async () => {
    const { readFileSync } = await import("node:fs");
    const shell = readFileSync("index.html", "utf8");

    for (const [tier, price] of Object.entries(WEB_PASS_PRICES)) {
      // 셸 패키지 정의: { id: 'standard', ..., price: 9900, ... }
      const pattern = new RegExp(`id:\\s*'${tier}'[^}]*?price:\\s*(\\d+)`);
      const match = shell.match(pattern);
      expect(match).not.toBeNull();
      expect(Number(match[1])).toBe(price);
    }
  });
});
