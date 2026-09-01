/**
 * @jest-environment node
 */

// 관리자 마케팅 월정석 지급(`POST /api/admin/monthly-credits/grant`)의 입력 계약.
//
// 이 라우트는 관리자가 월정석 잔액을 직접 늘리는 경로다(worker/routes/admin.js:5012).
// 지켜야 하는 것 세 가지:
//  1) 운영에서는 명시적 플래그 없이 절대 열리지 않는다 — 그리고 그 차단은 Mongo 연결 **전**이다.
//     차단이 connectDb 뒤로 밀리면 꺼진 기능이 커넥션을 소모한다.
//  2) 지급량 상한과 idempotencyKey 형식은 정규화 단계에서 거른다 — 여기서 새면 원장에
//     오타 한 번으로 상한을 넘는 지급이 남는다.
//  3) sourceId 는 멱등키에서 결정적으로 만든다 — 재시도가 중복 지급이 되지 않는 근거다.
//
// 원래 scripts/verify-admin-monthly-credit-grant.mjs 가 이 단언을 들고 있었으나 package.json 에
// 배선된 적이 없어 아무도 돌리지 않았다. 단언을 여기로 옮기고 그 스크립트는 지웠다.

import {
  __adminMonthlyCreditGrantTestUtils,
  handleAdminMonthlyCreditRoutes,
} from "../../worker/routes/admin-monthly-credits.js";

const {
  MAX_MARKETING_GRANT_AMOUNT,
  buildMarketingGrantSourceId,
  isAdminMonthlyCreditGrantEnabled,
  normalizeAdminMonthlyCreditGrantInput,
} = __adminMonthlyCreditGrantTestUtils;

// 조립해서 쓴다 — 리터럴로 두면 실제 주소로 읽힌다.
const TEST_EMAIL = ["marketing-test", "example.test"].join("@");

describe("관리자 월정석 마케팅 지급 — 활성화 조건", () => {
  test("운영에서는 명시적 플래그 없이는 비활성화된다", () => {
    expect(isAdminMonthlyCreditGrantEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isAdminMonthlyCreditGrantEnabled({
      NODE_ENV: "production",
      ADMIN_MONTHLY_CREDIT_GRANT_ENABLED: "true",
    })).toBe(true);
  });

  test("테스트 환경에서는 DB 플래그 없이 입력 검증을 실행할 수 있다", () => {
    expect(isAdminMonthlyCreditGrantEnabled({ NODE_ENV: "test" })).toBe(true);
  });
});

describe("관리자 월정석 마케팅 지급 — 입력 정규화", () => {
  test("정상 입력은 이메일·지급량·사유·멱등키를 정규화한다", () => {
    expect(normalizeAdminMonthlyCreditGrantInput({
      email: ` ${TEST_EMAIL} `,
      amount: 999999,
      reason: "마케팅 캠페인 테스트",
      campaignId: "summer-2026",
      idempotencyKey: "summer-2026-bulegyung",
    })).toEqual({
      email: TEST_EMAIL,
      amount: 999999,
      reason: "마케팅 캠페인 테스트",
      campaignId: "summer-2026",
      idempotencyKey: "summer-2026-bulegyung",
    });
  });

  test("지급 상한을 초과하면 거부한다", () => {
    expect(() => normalizeAdminMonthlyCreditGrantInput({
      email: TEST_EMAIL,
      amount: MAX_MARKETING_GRANT_AMOUNT + 1,
      reason: "campaign",
      idempotencyKey: "campaign-bulegyung",
    })).toThrow(expect.objectContaining({
      payload: expect.objectContaining({ code: "INVALID_GRANT_AMOUNT" }),
    }));
  });

  test("멱등키가 짧거나 비어 있으면 거부한다", () => {
    expect(() => normalizeAdminMonthlyCreditGrantInput({
      email: TEST_EMAIL,
      amount: 100,
      reason: "campaign",
      idempotencyKey: "short",
    })).toThrow(expect.objectContaining({
      payload: expect.objectContaining({ code: "INVALID_IDEMPOTENCY_KEY" }),
    }));
  });

  test("같은 멱등키는 계정별 동일 sourceId를 만든다", () => {
    expect(buildMarketingGrantSourceId("summer-2026-bulegyung")).toBe("admin-marketing:summer-2026-bulegyung");
  });
});

describe("관리자 월정석 마케팅 지급 — 라우트 차단", () => {
  test("운영 플래그가 꺼진 요청은 Mongo 연결 전에 차단한다", async () => {
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

    expect(response.status).toBe(503);
    expect(payload.code).toBe("ADMIN_MONTHLY_CREDIT_GRANT_DISABLED");
  });
});
