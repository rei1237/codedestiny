/**
 * @jest-environment node
 */

let handleFortuneRoutes;
let handleUserRoutes;
let handleBillingRoutes;
let signJwt;

const TEST_USER_ID = "507f1f77bcf86cd799439011";

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
  const [fortuneMod, userMod, billingMod, jwtMod] = await Promise.all([
    import("../../worker/routes/fortune.js"),
    import("../../worker/routes/user.js"),
    import("../../worker/routes/billing.js"),
    import("../../worker/lib/jwt.js"),
  ]);

  handleFortuneRoutes = fortuneMod.handleFortuneRoutes;
  handleUserRoutes = userMod.handleUserRoutes;
  handleBillingRoutes = billingMod.handleBillingRoutes;
  signJwt = jwtMod.signJwt;
});

describe("Worker API status normalization", () => {
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

  test("비로그인 /api/user/destiny-profiles 는 401 AUTH_REQUIRED", async () => {
    const request = new Request("https://example.com/api/user/destiny-profiles", {
      method: "GET",
    });

    const response = await handleUserRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.code).toBe("AUTH_REQUIRED");
  });

  test("로그인 상태 + DB 바인딩 누락 /api/fortune/pig-coin/balance 는 500 SERVER_CONFIG_ERROR", async () => {
    const request = await buildAuthRequest("https://example.com/api/fortune/pig-coin/balance", "GET");

    const response = await handleFortuneRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("SERVER_CONFIG_ERROR");
  });

  test("로그인 상태 + DB 바인딩 누락 /api/user/destiny-profiles 는 500 SERVER_CONFIG_ERROR", async () => {
    const request = await buildAuthRequest("https://example.com/api/user/destiny-profiles", "GET");

    const response = await handleUserRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("SERVER_CONFIG_ERROR");
  });

  test("로그인 상태 + DB 바인딩 누락 /api/billing/balance 는 500 SERVER_CONFIG_ERROR", async () => {
    const request = await buildAuthRequest("https://example.com/api/billing/balance", "GET");

    const response = await handleBillingRoutes(request, {});
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.ok).toBe(false);
    expect(payload.error?.code).toBe("SERVER_CONFIG_ERROR");
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
});
