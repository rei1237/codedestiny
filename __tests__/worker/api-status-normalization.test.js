/**
 * @jest-environment node
 */

const { createSajuAIPromptModuleMock } = require("../fixtures/saju-ai-prompt-mock.js");

let handleFortuneRoutes;
let handleUserRoutes;
let handleBillingRoutes;
let handleAuthRoutes;
let signJwt;
let REFRESH_COOKIE_NAME;

const TEST_USER_ID = "507f1f77bcf86cd799439011";

async function buildRefreshOnlyRequest(url) {
  const refreshToken = await signJwt(
    { userId: TEST_USER_ID, typ: "refresh" },
    "dev-secret",
    { issuer: "code-destiny-api", audience: "code-destiny-web", expiresIn: "14d" },
  );
  return new Request(url, {
    method: "GET",
    headers: { Cookie: `${REFRESH_COOKIE_NAME}=${refreshToken}` },
  });
}

async function buildAuthRequest(url, method = "GET", body) {
  const token = await signJwt(
    {
      userId: TEST_USER_ID,
      email: "tester@example.com",
      role: "user",
      points: 0,
    },
    "dev-secret",
    {
      issuer: "code-destiny-api",
      audience: "code-destiny-web",
      expiresIn: "10m",
    },
  );

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  return new Request(url, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeAll(async () => {
  const promptBuildResult = {
    prompt: "",
    generatedPrompt: "",
    title: "",
    digestSource: "status-normalization-test",
  };

  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/ziwei-ai-prompt.js", () => ({
      ZIWEI_AI_PROMPT_FEATURE_KEY: "ziwei_ai_prompt_generator",
      ZIWEI_AI_PROMPT_PRICE: 100,
      buildZiweiAIPrompt: () => promptBuildResult,
      buildZiweiAIPromptWithDomain: () => promptBuildResult,
    })),
    jest.unstable_mockModule("../../worker/lib/sukuyo-ai-prompt.js", () => ({
      SUKUYO_AI_PROMPT_FEATURE_KEY: "sukuyo_ai_prompt_generator",
      SUKUYO_AI_PROMPT_PRICE: 0,
      buildSukuyoAIPrompt: () => promptBuildResult,
      buildSukuyoAIPromptWithDomain: () => promptBuildResult,
    })),
    jest.unstable_mockModule(
      "../../worker/lib/saju-ai-prompt.js",
      () => createSajuAIPromptModuleMock(promptBuildResult),
    ),
    jest.unstable_mockModule("../../worker/lib/astrology-ai-prompt.js", () => ({
      ASTROLOGY_AI_PROMPT_FEATURE_KEY: "astrology_ai_prompt_generator",
      ASTROLOGY_AI_PROMPT_PRICE: 100,
      buildAstrologyAIPrompt: () => promptBuildResult,
      buildAstrologyAIPromptWithDomain: () => promptBuildResult,
    })),
    jest.unstable_mockModule("../../worker/lib/vedic-ai-prompt.js", () => ({
      VEDIC_AI_PROMPT_FEATURE_KEY: "vedic_ai_prompt_generator",
      VEDIC_AI_PROMPT_PRICE: 100,
      buildVedicAIPrompt: () => promptBuildResult,
    })),
    jest.unstable_mockModule("../../worker/lib/vedic-prashna-prompt.js", () => ({
      VEDIC_PRASHNA_PROMPT_FEATURE_KEY: "vedic_prashna_prompt",
      VEDIC_PRASHNA_PROMPT_PRICE: 50,
      VEDIC_PRASHNA_PROMPT_AMOUNT_KRW: 5000,
      VEDIC_PRASHNA_PROMPT_PRODUCT_CODE: "PRASHNA_PROMPT_1",
      VEDIC_PRASHNA_PROMPT_PRODUCT_NAME: "프라슈나 프롬프트",
      createPrashnaSnapshot: () => ({}),
      generatePrashnaPromptResult: async () => promptBuildResult,
    })),
  ]);

  const [fortuneMod, userMod, billingMod, authMod, jwtMod, authLibMod] = await Promise.all([
    import("../../worker/routes/fortune.js"),
    import("../../worker/routes/user.js"),
    import("../../worker/routes/billing.js"),
    import("../../worker/routes/auth.js"),
    import("../../worker/lib/jwt.js"),
    import("../../worker/lib/auth.js"),
  ]);

  handleFortuneRoutes = fortuneMod.handleFortuneRoutes;
  handleUserRoutes = userMod.handleUserRoutes;
  handleBillingRoutes = billingMod.handleBillingRoutes;
  handleAuthRoutes = authMod.handleAuthRoutes;
  signJwt = jwtMod.signJwt;
  REFRESH_COOKIE_NAME = authLibMod.REFRESH_COOKIE_NAME;
});

describe("Worker API status normalization", () => {
  test("비로그인 /api/fortune/pig-coin/prices 는 200 + 가격표를 반환해야 한다", async () => {
    const request = new Request("https://example.com/api/fortune/pig-coin/prices", {
      method: "GET",
    });

    const response = await handleFortuneRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.prices)).toBe(true);
    expect(payload.prices.length).toBeGreaterThan(0);
  });

  test("비로그인 /api/fortune/pig-coin/balance 는 401 AUTH_REQUIRED", async () => {
    const request = new Request("https://example.com/api/fortune/pig-coin/balance", {
      method: "GET",
    });

    const response = await handleFortuneRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.code).toBe("AUTH_REQUIRED");
  });

  test("비로그인 /api/fortune/pig-coin/profile-subscription/status 는 401 AUTH_REQUIRED", async () => {
    const request = new Request("https://example.com/api/fortune/pig-coin/profile-subscription/status", {
      method: "GET",
    });

    const response = await handleFortuneRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.code).toBe("AUTH_REQUIRED");
  });

  test("비로그인 /api/fortune/pig-coin/profile-subscription/me 는 401 AUTH_REQUIRED", async () => {
    const request = new Request("https://example.com/api/fortune/pig-coin/profile-subscription/me", {
      method: "GET",
    });

    const response = await handleFortuneRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.code).toBe("AUTH_REQUIRED");
  });

  test("비로그인 /api/fortune/pig-coin/profile-subscription/plans 는 200 + 플랜 목록", async () => {
    const request = new Request("https://example.com/api/fortune/pig-coin/profile-subscription/plans", {
      method: "GET",
    });

    const response = await handleFortuneRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.plans)).toBe(true);
    const ids = payload.plans.map((plan) => String(plan.planId || ""));
    expect(ids).toEqual(expect.arrayContaining(["free", "honey_standard", "honey_premium", "honey_vvip"]));
  });

  test("비로그인 /api/fortune/pig-coin/profile-subscription/subscribe 는 401 AUTH_REQUIRED", async () => {
    const request = new Request("https://example.com/api/fortune/pig-coin/profile-subscription/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId: "honey_premium" }),
    });

    const response = await handleFortuneRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.code).toBe("UNAUTHORIZED");
  });

  test("비로그인 /api/user/destiny-profiles 는 401 AUTH_REQUIRED", async () => {
    const request = new Request("https://example.com/api/user/destiny-profiles", {
      method: "GET",
    });

    const response = await handleUserRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.code).toBe("AUTH_REQUIRED");
  });

  test("로그인 상태 + DB 바인딩 누락 /api/fortune/pig-coin/balance 는 200 DB_FALLBACK", async () => {
    const request = await buildAuthRequest("https://example.com/api/fortune/pig-coin/balance", "GET");

    const response = await handleFortuneRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.code).toBe("DB_FALLBACK");
    expect(payload.degraded).toBe(true);
    // 이 경로는 withMongoRetry 의 실제 백오프를 그대로 탄다(목 없이 연결 실패를 재현하는 테스트라
    // 재시도를 끄면 검증 대상이 사라진다). 기본 5s 로는 재시도가 끝나기 전에 잘린다.
  }, 20000);

  test("로그인 상태 + DB 바인딩 누락 /api/fortune/pig-coin/profile-subscription/status 는 안정 free로 확정하지 않는다", async () => {
    const request = await buildAuthRequest("https://example.com/api/fortune/pig-coin/profile-subscription/status", "GET");

    const response = await handleFortuneRoutes(request, {});
    const payload = await response.json();

    // 503 이 아니라 200 + degraded:true 다(worker/routes/fortune.js buildDbFallbackSubscriptionStatus).
    // 503 으로 내리면 클라이언트가 본문을 읽기 전에 !response.ok 에서 끊겨 degraded 를 보지 못한다.
    // 이 응답은 "구독 없음"이 아니라 "지금은 확인 못 함"이며, 소비자는 degraded 를 보고 기존 값을
    // 유지한다 — app/_lib/auth-store.ts refreshProfileSubscriptionCache, js/destiny-profile.js 양쪽.
    // 따라서 이 테스트가 지켜야 하는 것은 상태 코드가 아니라 "free 로 확정되지 않는다"는 신호다.
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("DB_FALLBACK");
    expect(payload.degraded).toBe(true);
    expect(payload.tier).toBe("free");
    expect(payload.isActive).toBe(false);
  });

  test("refresh 토큰만 있고 DB에 닿지 못하면 /api/fortune/pig-coin/balance 는 401 AUTH_REQUIRED가 아니라 degraded여야 한다", async () => {
    const request = await buildRefreshOnlyRequest("https://example.com/api/fortune/pig-coin/balance");

    const response = await handleFortuneRoutes(request, {});
    const payload = await response.json();

    expect(response.status).not.toBe(401);
    expect(payload.authenticated).toBe(true);
    expect(payload.degraded).toBe(true);
  });

  test("refresh 토큰만 있고 DB에 닿지 못하면 /api/fortune/pig-coin/profile-subscription/status 는 401 AUTH_REQUIRED가 아니라 degraded여야 한다", async () => {
    const request = await buildRefreshOnlyRequest("https://example.com/api/fortune/pig-coin/profile-subscription/status");

    const response = await handleFortuneRoutes(request, {});
    const payload = await response.json();

    expect(response.status).not.toBe(401);
    expect(payload.authenticated).toBe(true);
    expect(payload.degraded).toBe(true);
  });

  test("로그인 상태 + DB 바인딩 누락 /api/user/destiny-profiles 는 200 DB_FALLBACK", async () => {
    const request = await buildAuthRequest("https://example.com/api/user/destiny-profiles", "GET");

    const response = await handleUserRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("DB_FALLBACK");
    expect(payload.degraded).toBe(true);
  });

  test("로그인 상태 + DB 바인딩 누락 /api/billing/balance 는 200 응답으로 강건하게 처리", async () => {
    const request = await buildAuthRequest("https://example.com/api/billing/balance", "GET");

    const response = await handleBillingRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data?.raw?.code).toBe("DB_FALLBACK");
    expect(payload.data?.raw?.degraded).toBe(true);
  });

  test("비로그인 /api/auth/me 는 500 대신 200 + user:null 로 응답해야 한다", async () => {
    const request = new Request("https://example.com/api/auth/me", {
      method: "GET",
    });

    const response = await handleAuthRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.user).toBeNull();
    expect(payload.authenticated).toBe(false);
  });

  test("/api/billing/purchase 에 미등록 featureKey 요청 시 400 UNKNOWN_FEATURE_KEY", async () => {
    const request = new Request("https://example.com/api/billing/purchase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        featureKey: "not-registered-feature-key",
      }),
    });

    const response = await handleBillingRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error?.code).toBe("UNKNOWN_FEATURE_KEY");
    expect(payload.featureKey).toBe("not-registered-feature-key");
  });

  test("/api/billing/charge 에 미등록 featureKey 요청 시 400 UNKNOWN_FEATURE_KEY", async () => {
    const request = new Request("https://example.com/api/billing/charge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        featureKey: "not-registered-feature-key",
      }),
    });

    const response = await handleBillingRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error?.code).toBe("UNKNOWN_FEATURE_KEY");
  });

  test("비로그인 /api/billing/refund 는 401 AUTH_REQUIRED", async () => {
    const request = new Request("https://example.com/api/billing/refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        transactionId: "507f1f77bcf86cd799439011",
      }),
    });

    const response = await handleBillingRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
    expect(payload.error?.code).toBe("AUTH_REQUIRED");
  });
  test("authenticated coin-gate membership pass falls back to 503 instead of payment_required when pass lookup is unavailable", async () => {
    const request = await buildAuthRequest("https://example.com/api/billing/coin-gate", "POST", {
      featureKey: "saju_ai_prompt_generator",
      paymentMode: "membership_pass",
      forceDeduct: false,
    });

    const response = await handleBillingRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("PASS_STATUS_TEMPORARILY_UNAVAILABLE");
    expect(payload.error?.code).toBe("PASS_STATUS_TEMPORARILY_UNAVAILABLE");
    expect(payload.degraded).toBe(true);
  });
});
