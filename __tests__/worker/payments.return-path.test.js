/**
 * @jest-environment node
 */

// 구 단건 결제(/api/payments/single/start)의 returnPath 는 PG redirectUrl 로 나간다.
// KG이니시스 보안 권고(2026-09-18) 리다이렉트 피싱 항목 — 자사 origin 밖으로 새면 안 된다.

let sanitizeReturnPath;
let buildSinglePaymentRedirectUrl;

beforeAll(async () => {
  const mod = await import("../../worker/routes/payments.js");
  ({ sanitizeReturnPath, buildSinglePaymentRedirectUrl } = mod.__paymentsTestUtils);
});

const SITE = "https://code-destiny.com";
const env = { SITE_BASE_URL: SITE };
const request = new Request(`${SITE}/api/payments/single/start`, { method: "POST" });

describe("sanitizeReturnPath", () => {
  test.each([
    ["/\\evil.com/x"],
    ["/\tevil.com"],
    ["/\t/evil.com"],
    ["//evil.com"],
    ["https://code-destiny.com//evil.com/x"],
    ["javascript:alert(1)"],
    ["evil.com"],
    ["/\u0000/evil.com"],
  ])("외부로 새는 값 %j 는 / 로 떨어진다", (input) => {
    expect(sanitizeReturnPath(input)).toBe("/");
  });

  test.each([
    ["/saju?tab=1#r", "/saju?tab=1#r"],
    ["https://code-destiny.com/yeongnyangi/result?id=1", "/yeongnyangi/result?id=1"],
    ["", "/"],
    [undefined, "/"],
  ])("자사 경로 %j 는 보존된다", (input, expected) => {
    expect(sanitizeReturnPath(input)).toBe(expected);
  });

  test("redirectUrl 은 어떤 입력이든 자사 origin 이다", () => {
    for (const returnPath of ["/\\evil.com", "/\t/evil.com", "https://a//evil.com", "/ok"]) {
      const url = new URL(buildSinglePaymentRedirectUrl({ env, request, returnPath, paymentId: "cd-single-x" }));
      expect(url.origin).toBe(SITE);
    }
  });
});
