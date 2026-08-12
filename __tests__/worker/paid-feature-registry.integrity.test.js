/**
 * @jest-environment node
 */

let registry;

beforeAll(async () => {
  registry = await import("../../worker/lib/paid-feature-registry.js");
});

describe("Paid feature registry integrity", () => {
  test("프론트엔드 유료 featureKey는 서버 가격표 또는 unlock 제품표에 모두 존재해야 한다", () => {
    const serverKeys = new Set(registry.listServerPricedFeatureKeys());
    const missing = registry.FRONTEND_PAID_FEATURE_KEYS.filter((key) => !serverKeys.has(key));
    expect(missing).toEqual([]);
  });

  test("feature 가격표는 모두 양수 cost를 가져야 한다", () => {
    const invalid = Object.entries(registry.FEATURE_KEY_PRICE_TABLE)
      .filter(([, spec]) => !Number.isFinite(Number(spec?.cost)) || Number(spec?.cost) <= 0)
      .map(([featureKey]) => featureKey)
      .sort();

    expect(invalid).toEqual([]);
  });

  test("unlock product 가격표는 모두 양수 cost를 가져야 한다", () => {
    const invalid = Object.entries(registry.PIG_COIN_UNLOCK_PRODUCTS)
      .filter(([, spec]) => !Number.isFinite(Number(spec?.cost)) || Number(spec?.cost) <= 0)
      .map(([productId]) => productId)
      .sort();

    expect(invalid).toEqual([]);
  });

  test("fortune tea house and neo paid consultation prices are canonical", () => {
    const expected = {
      "fortune-tea-house-tarot-consultation": { cost: 50, amountKRW: 5000 },
      "fortune-tea-house-tarot-five-consultation": { cost: 100, amountKRW: 10000 },
      "fortune-tea-house-saju-consultation": { cost: 100, amountKRW: 10000 },
      "fortune-tea-house-saju-compatibility-consultation": { cost: 200, amountKRW: 20000 },
      "fortune-tea-house-sukuyo-compatibility-consultation": { cost: 200, amountKRW: 20000 },
      "neo-operation-room-consultation": { cost: 300, amountKRW: 30000 },
    };

    Object.entries(expected).forEach(([featureKey, price]) => {
      const spec = registry.FEATURE_KEY_PRICE_TABLE[featureKey];
      expect(spec).toBeTruthy();
      expect(spec.cost).toBe(price.cost);
      expect(spec.amountKRW).toBe(price.amountKRW);
    });
  });
});
