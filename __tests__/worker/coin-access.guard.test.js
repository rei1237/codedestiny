/**
 * @jest-environment node
 */

let utils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/fortune.js");
  utils = mod.__fortuneAccessTestUtils;
});

describe("Fortune coin access guard", () => {
  test("미로그인으로 consume 인증 컨텍스트 요청 시 401을 반환해야 한다", async () => {
    const req = new Request("https://example.com/api/fortune/pig-coin/consume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cost: 1, featureKey: "tarot-year-fortune" }),
    });

    await expect(utils.resolvePigCoinConsumeAuth(req, { NODE_ENV: "production" })).rejects.toMatchObject({
      status: 401,
      payload: { code: "UNAUTHORIZED" },
    });
  });

  test("coin-gate-per-use는 클라이언트 cost가 아닌 서버 가격표를 사용해야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 1,
      featureKey: "coin-gate-per-use",
      reason: "인생의 책 생성 (13챕터)",
    });

    expect(priced.ok).toBe(true);
    expect(priced.cost).toBe(490);
    expect(priced.pricingSource).toBe("coin-gate-reason");
  });

  test("featureKey가 등록된 경우 서버 가격표를 강제해야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 9999,
      featureKey: "premium-love-secret-couple",
      reason: "사주 프리미엄 궁합 리포트 생성",
    });

    expect(priced.ok).toBe(true);
    expect(priced.cost).toBe(500);
    expect(priced.pricingSource).toBe("feature-key");
  });

  test("베다 궁합 addon featureKey는 서버 가격 300으로 고정되어야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 1,
      featureKey: "premium-veda-compatibility-addon",
      reason: "프리미엄 베다점 궁합 확장 분석 추가",
    });

    expect(priced.ok).toBe(true);
    expect(priced.cost).toBe(300);
    expect(priced.pricingSource).toBe("feature-key");
  });

  test("요가 구루는 reason 기반 서버 가격을 적용해야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 999,
      featureKey: "yoga-guru-per-use",
      reason: "openYogaGuru 60분 코스",
    });

    expect(priced.ok).toBe(true);
    expect(priced.cost).toBe(50);
    expect(priced.pricingSource).toBe("feature-reason");
  });

  test("가격표 없는 featureKey는 운영환경에서 400으로 차단해야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 5,
      featureKey: "unknown-feature",
      reason: "unknown",
    });

    expect(priced.ok).toBe(false);
    expect(priced.status).toBe(400);
    expect(priced.code).toBe("UNKNOWN_FEATURE_KEY");
  });

  test("관리자 bypass는 운영환경에서 강제 비활성화되어야 한다", () => {
    expect(utils.isAdminPigCoinBypassEnabled({ NODE_ENV: "production", ALLOW_ADMIN_PIG_COIN_BYPASS: "true" })).toBe(false);
    expect(utils.isAdminPigCoinBypassEnabled({ NODE_ENV: "development", ALLOW_ADMIN_PIG_COIN_BYPASS: "true" })).toBe(true);
  });
});
