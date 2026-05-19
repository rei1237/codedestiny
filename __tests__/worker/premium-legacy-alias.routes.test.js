/**
 * @jest-environment node
 */

let handlePremiumRoutes;
let signJwt;
let createPremiumAccessToken;

const env = {
  JWT_ACCESS_SECRET: "dev-secret",
  PREMIUM_ACCESS_TOKEN_SECRET: "dev-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
};

const userId = "507f1f77bcf86cd799439011";

beforeAll(async () => {
  const premiumMod = await import("../../worker/routes/premium.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  const accessTokenMod = await import("../../worker/lib/premium-access-token.js");
  handlePremiumRoutes = premiumMod.handlePremiumRoutes;
  signJwt = jwtMod.signJwt;
  createPremiumAccessToken = accessTokenMod.createPremiumAccessToken;
});

async function makeAuthHeaders(reportType) {
  const authToken = await signJwt({
    userId,
    email: "legacy-alias@example.com",
    role: "user",
  }, env.JWT_ACCESS_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: "30m",
  });

  const premiumAccessToken = await createPremiumAccessToken(env, {
    userId,
    reportType,
    featureKey: "test-premium-access",
    chargedCoins: 590,
  });

  return {
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authToken}`,
    },
    premiumAccessToken,
  };
}

describe("premium legacy alias routes", () => {
  test("POST /api/premium/ziwei/generate reaches the ziwei generator instead of router 404", async () => {
    const { headers, premiumAccessToken } = await makeAuthHeaders("ziweiPremium");
    const req = new Request("https://example.com/api/premium/ziwei/generate", {
      method: "POST",
      headers,
      body: JSON.stringify({
        mode: "personal",
        premiumAccessToken,
      }),
    });

    const res = await handlePremiumRoutes(req, env);
    const data = await res.json();

    expect(res.status).not.toBe(404);
    expect(data.error).not.toBe("not_found");
    expect(data.code || "").not.toBe("PAYMENT_REQUIRED");
  });

  test("GET /api/premium/ziwei/status is handled by the legacy status adapter", async () => {
    const { headers } = await makeAuthHeaders("ziweiPremium");
    const req = new Request("https://example.com/api/premium/ziwei/status?reportId=missing", {
      method: "GET",
      headers,
    });

    const res = await handlePremiumRoutes(req, env);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).not.toBe("not_found");
    expect(String(data.message || "")).toBeTruthy();
  });
});
