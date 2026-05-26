/**
 * @jest-environment node
 */

let registry;
let accessUtils;

beforeAll(async () => {
  registry = await import("../../worker/lib/paid-feature-registry.js");
  const accessMod = await import("../../worker/lib/access-control.js");
  accessUtils = accessMod.__accessControlTestUtils;
});

describe("Premium report pricing registry", () => {
  test("ziwei 리포트 가격은 premium-ziwei-report 기준 590 코인이다", () => {
    const spec = registry.FEATURE_KEY_PRICE_TABLE["premium-ziwei-report"];
    expect(spec).toMatchObject({
      cost: 590,
      reason: "자미두수 프리미엄 PDF 리포트 생성",
    });
  });

  test("접근 제어 대체 결제 규칙의 canonical featureKey는 서버 가격표에 존재한다", () => {
    const serverKeys = new Set(registry.listServerPricedFeatureKeys());

    const checks = [
      { reportType: "sajuNewYear", requestBody: {}, key: "saju_new_year_pdf", cost: 300 },
      { reportType: "lifeBook", requestBody: {}, key: "premium-lifebook-report", cost: 500 },
      { reportType: "loveSecret", requestBody: { mode: "solo" }, key: "premium-love-secret-solo", cost: 300 },
      { reportType: "loveSecret", requestBody: { mode: "compatibility" }, key: "premium-love-secret-couple", cost: 400 },
      { reportType: "ziweiPremium", requestBody: { mode: "personal" }, key: "premium-ziwei-report", cost: 590 },
      { reportType: "ziweiPremium", requestBody: { mode: "compatibility" }, key: "premium-ziwei-report-compat", cost: 690 },
      { reportType: "westernAstrologyPremium", requestBody: { mode: "personal" }, key: "premium-astrology-report", cost: 390 },
      { reportType: "westernAstrologyPremium", requestBody: { mode: "compatibility" }, key: "premium-astrology-report-compat", cost: 490 },
      { reportType: "sookyoPremium", requestBody: { mode: "personal" }, key: "premium-sukuyo-report", cost: 390 },
      { reportType: "sookyoPremium", requestBody: { mode: "compatibility" }, key: "premium-sukuyo-report-compat", cost: 490 },
      { reportType: "vedicPremium", requestBody: { mode: "personal" }, key: "premium-vedic-report", cost: 390 },
      { reportType: "vedicPremium", requestBody: { mode: "compatibility" }, key: "premium-vedic-report", cost: 390 },
    ];

    checks.forEach(({ reportType, requestBody, key, cost }) => {
      const rules = accessUtils.buildAlternativePaymentRules(reportType, requestBody);
      expect(rules).toEqual(expect.arrayContaining([expect.objectContaining({ featureKey: key, minCost: cost })]));
      expect(serverKeys.has(key)).toBe(true);
      expect(registry.FEATURE_KEY_PRICE_TABLE[key]?.cost).toBe(cost);
    });
  });

  test("compatibility 과금 키는 서비스별 정책을 따라야 한다", () => {
    expect(registry.FEATURE_KEY_PRICE_TABLE["premium-ziwei-report-compat"]?.cost).toBe(690);
    expect(registry.FEATURE_KEY_PRICE_TABLE["premium-astrology-report-compat"]?.cost).toBe(490);
    expect(registry.FEATURE_KEY_PRICE_TABLE["premium-sukuyo-report-compat"]?.cost).toBe(490);
    expect(registry.FEATURE_KEY_PRICE_TABLE["premium-vedic-report-compat"]?.cost).toBe(490);

    const sukuyoRequired = accessUtils.buildRequiredPaymentRules("sookyoPremium", { reportMode: "compatibility" });
    const vedicRequired = accessUtils.buildRequiredPaymentRules("vedicPremium", { reportMode: "compatibility" });
    expect(sukuyoRequired).toHaveLength(0);
    expect(vedicRequired).toHaveLength(0);
  });
});
