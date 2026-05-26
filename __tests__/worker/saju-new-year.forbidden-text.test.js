/**
 * @jest-environment node
 */

let utils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  utils = mod.__premiumReportTestUtils;
});

describe("Saju new year forbidden phrase guard", () => {
  test("금지 문구가 있으면 차단한다", () => {
    expect(() => utils.assertNoSajuNewYearForbiddenText("이 문서는 fallback 본문입니다.")).toThrow();
    expect(() => utils.assertNoSajuNewYearForbiddenText("결제 필요 안내 문구가 포함됨")).toThrow();
    expect(() => utils.assertNoSajuNewYearForbiddenText("requestId: newyear:12345")).toThrow();
  });

  test("정상 상담문은 통과한다", () => {
    expect(() => utils.assertNoSajuNewYearForbiddenText("올해는 핵심 과제를 2개로 좁히고 월별 점검 루틴으로 성과 편차를 줄이세요.")).not.toThrow();
  });
});
