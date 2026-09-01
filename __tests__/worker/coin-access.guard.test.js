/**
 * @jest-environment node
 */

let utils;
let signJwt;

beforeAll(async () => {
  const mod = await import("../../worker/lib/fortune-access-guard.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  utils = mod;
  signJwt = jwtMod.signJwt;
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

  test("유효한 access 쿠키가 있으면 consume 인증 컨텍스트를 반환해야 한다", async () => {
    const env = {
      JWT_ACCESS_SECRET: "test-access-secret",
      JWT_ISSUER: "code-destiny-api",
      JWT_AUDIENCE: "code-destiny-web",
      NODE_ENV: "production",
    };

    const accessToken = await signJwt(
      {
        userId: "64f0a1b2c3d4e5f678901234",
        email: "coin-user@example.com",
        role: "user",
      },
      env.JWT_ACCESS_SECRET,
      {
        expiresIn: "10m",
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      },
    );

    const req = new Request("https://example.com/api/fortune/pig-coin/consume", {
      method: "POST",
      headers: {
        Cookie: `fortune_auth_token=${accessToken}`,
      },
    });

    const authCtx = await utils.resolvePigCoinConsumeAuth(req, env);
    expect(authCtx.adminMode).toBe(false);
    expect(authCtx.auth.userId).toBe("64f0a1b2c3d4e5f678901234");
    expect(authCtx.auth.email).toBe("coin-user@example.com");
  });

  test("coin-gate-per-use는 클라이언트 cost가 아닌 서버 가격표를 사용해야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 1,
      featureKey: "coin-gate-per-use",
      reason: "인생의 책 생성 (12챕터)",
    });

    expect(priced.ok).toBe(true);
    expect(priced.cost).toBe(300);
    expect(priced.pricingSource).toBe("coin-gate-reason");
  });

  test("featureKey가 등록된 경우 서버 가격표를 강제해야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 9999,
      featureKey: "love-secret-ai-consultation",
      reason: "연애 비책 AI 상담",
    });

    expect(priced.ok).toBe(true);
    expect(priced.cost).toBe(300);
    expect(priced.pricingSource).toBe("feature-key");
  });

  test("new-year-ai-consultation은 서버 가격 300으로 고정되어야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 1,
      featureKey: "new-year-ai-consultation",
      reason: "신년운세 AI 상담",
    });

    expect(priced.ok).toBe(true);
    expect(priced.cost).toBe(300);
    expect(priced.featureKey).toBe("new-year-ai-consultation");
    expect(priced.pricingSource).toBe("feature-key");
  });

  test("ziwei-ai-consultation은 서버 가격 300으로 고정되어야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 1,
      featureKey: "ziwei-ai-consultation",
      reason: "자미두수 AI 상담",
    });

    expect(priced.ok).toBe(true);
    expect(priced.cost).toBe(300);
    expect(priced.featureKey).toBe("ziwei-ai-consultation");
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

  test("featureKey 없이 들어온 네빌 명상 60분 reason도 서버 가격표로 처리해야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 999,
      featureKey: "pig-coin-unlock",
      reason: "openNevilleMeditationPage 60분 코스",
    });

    expect(priced.ok).toBe(true);
    expect(priced.featureKey).toBe("neville-meditation");
    expect(priced.cost).toBe(50);
    expect(priced.pricingSource).toBe("feature-reason");
  });

  test("coin-gate-per-use 요청도 액션형 reason이면 정규 feature 가격표로 처리해야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 1,
      featureKey: "coin-gate-per-use",
      reason: "openCosmicSoulMeditation 60분 코스",
    });

    expect(priced.ok).toBe(true);
    expect(priced.featureKey).toBe("cosmic-soul-meditation");
    // 60분 코스 200코인(20,000원). requestedCost 를 무시하고 서버 표를 쓴다는 것이 이 테스트의 요점이라,
    // 표가 표시가와 어긋나면 그 어긋난 금액이 그대로 차감된다(2026-05-30~2026-08-17 절반 차감).
    expect(priced.cost).toBe(200);
    expect(priced.pricingSource).toBe("feature-reason");
  });

  test("애니멀 토템 심화 reason은 서버 가격표 50코인으로 처리해야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 1,
      featureKey: "coin-gate-per-use",
      reason: "애니멀 토템 심화 리딩",
    });

    expect(priced.ok).toBe(true);
    expect(priced.cost).toBe(50);
    expect(priced.featureKey).toBe("animal-totem-deep");
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

  test("featureKey가 드리프트되어도 reason이 등록되어 있으면 서버 가격표로 처리해야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 1,
      featureKey: "drifted-feature-key",
      reason: "이집트 신탁 리딩",
    });

    expect(priced.ok).toBe(true);
    expect(priced.cost).toBe(30);
    expect(priced.pricingSource).toBe("feature-reason-fallback");
  });

  test("legacy alias featureKey는 정규화하여 unlock 가격을 찾아야 한다", () => {
    const priced = utils.resolveServerCoinPricing({
      env: { NODE_ENV: "production" },
      productSpec: null,
      requestedCost: 1,
      featureKey: "navigateToZiweiChart",
      reason: "Premium ziwei unlock",
    });

    expect(priced.ok).toBe(true);
    expect(priced.cost).toBe(200);
    expect(priced.pricingSource).toBe("unlock-feature");
  });

  test("관리자 bypass는 운영환경에서 강제 비활성화되어야 한다", () => {
    expect(utils.isAdminPigCoinBypassEnabled({ NODE_ENV: "production", ALLOW_ADMIN_PIG_COIN_BYPASS: "true" })).toBe(false);
    expect(utils.isAdminPigCoinBypassEnabled({ NODE_ENV: "development", ALLOW_ADMIN_PIG_COIN_BYPASS: "true" })).toBe(true);
  });
});
