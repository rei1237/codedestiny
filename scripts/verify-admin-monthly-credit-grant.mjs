#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  __adminMonthlyCreditGrantTestUtils as utils,
  handleAdminMonthlyCreditRoutes,
} from "../worker/routes/admin-monthly-credits.js";

let passed = 0;
const TEST_EMAIL = ["marketing-test", "example.test"].join("@");

async function it(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("관리자 월정석 마케팅 지급 검증");

await it("운영에서는 명시적 플래그 없이는 비활성화된다", () => {
  assert.equal(utils.isAdminMonthlyCreditGrantEnabled({ NODE_ENV: "production" }), false);
  assert.equal(utils.isAdminMonthlyCreditGrantEnabled({ NODE_ENV: "production", ADMIN_MONTHLY_CREDIT_GRANT_ENABLED: "true" }), true);
});

await it("테스트 환경에서는 DB 플래그 없이 입력 검증을 실행할 수 있다", () => {
  assert.equal(utils.isAdminMonthlyCreditGrantEnabled({ NODE_ENV: "test" }), true);
});

await it("정상 입력은 이메일·지급량·사유·멱등키를 정규화한다", () => {
  assert.deepEqual(utils.normalizeAdminMonthlyCreditGrantInput({
    email: ` ${TEST_EMAIL} `,
    amount: 999999,
    reason: "마케팅 캠페인 테스트",
    campaignId: "summer-2026",
    idempotencyKey: "summer-2026-bulegyung",
  }), {
    email: TEST_EMAIL,
    amount: 999999,
    reason: "마케팅 캠페인 테스트",
    campaignId: "summer-2026",
    idempotencyKey: "summer-2026-bulegyung",
  });
});

await it("지급 상한을 초과하면 거부한다", () => {
  assert.throws(
    () => utils.normalizeAdminMonthlyCreditGrantInput({
      email: TEST_EMAIL,
      amount: utils.MAX_MARKETING_GRANT_AMOUNT + 1,
      reason: "campaign",
      idempotencyKey: "campaign-bulegyung",
    }),
    (error) => error?.payload?.code === "INVALID_GRANT_AMOUNT",
  );
});

await it("멱등키가 짧거나 비어 있으면 거부한다", () => {
  assert.throws(
    () => utils.normalizeAdminMonthlyCreditGrantInput({
      email: TEST_EMAIL,
      amount: 100,
      reason: "campaign",
      idempotencyKey: "short",
    }),
    (error) => error?.payload?.code === "INVALID_IDEMPOTENCY_KEY",
  );
});

await it("같은 멱등키는 계정별 동일 sourceId를 만든다", () => {
  assert.equal(
    utils.buildMarketingGrantSourceId("summer-2026-bulegyung"),
    "admin-marketing:summer-2026-bulegyung",
  );
});

await it("운영 플래그가 꺼진 요청은 Mongo 연결 전에 차단한다", async () => {
  const response = await handleAdminMonthlyCreditRoutes(
    "/grant",
    new Request("https://example.com/api/admin/monthly-credits/grant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        amount: 999999,
        reason: "campaign",
        idempotencyKey: "summer-2026-bulegyung",
      }),
    }),
    { NODE_ENV: "production" },
    { userId: "flower-admin" },
  );
  const payload = await response.json();
  assert.equal(response.status, 503);
  assert.equal(payload.code, "ADMIN_MONTHLY_CREDIT_GRANT_DISABLED");
});

console.log(`\n관리자 월정석 마케팅 지급: ${passed}개 통과`);
