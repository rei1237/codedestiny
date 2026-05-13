/**
 * @jest-environment node
 */

let registry;

beforeAll(async () => {
  registry = await import("../../worker/lib/paid-feature-registry.js");
});

describe("Premium report pricing registry", () => {
  test("ziwei-premium is fixed to premium_pdf_ziwei / 590 coins", () => {
    const spec = registry.getPremiumReportPriceByKind("ziwei-premium");
    expect(spec).toMatchObject({
      reportKind: "ziwei-premium",
      legacyReportType: "ziweiPremium",
      featureType: "jamidusu_premium",
      featureKey: "premium_pdf_ziwei",
      priceCoins: 590,
    });
  });

  test("all premium PDF feature keys are present in the server price table", () => {
    const serverKeys = new Set(registry.listServerPricedFeatureKeys());
    Object.values(registry.PREMIUM_REPORT_PRICES).forEach((spec) => {
      expect(serverKeys.has(spec.featureKey)).toBe(true);
      expect(Number(spec.priceCoins)).toBeGreaterThanOrEqual(0);
    });
  });

  test("love-secret compatibility mode resolves to the compatibility price key", () => {
    const spec = registry.getPremiumReportPriceByReportType("loveSecret", "compatibility");
    expect(spec.featureKey).toBe("premium_pdf_saju_love_secret_compat");
    expect(spec.priceCoins).toBe(400);
  });
});
