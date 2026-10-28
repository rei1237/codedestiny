/**
 * @jest-environment node
 *
 * 시크릿 fail-closed 묶음(A1·A5·A6c·A7b·C3·C4) 회귀 테스트. A7(Mongo URI 누락)은 auth.login-security.test.js.
 * NODE_ENV 를 명시한 env 객체만 쓴다 — 미지정 키는 process.env(jest: NODE_ENV=test)로 폴백되기 때문이다.
 */

const { createHmac } = require("node:crypto");

let authLib;
let authRoutes;
let premiumToken;
let debugRoutes;
let kakaoCrmRoutes;
let adminRoutes;

const PLACEHOLDER_ADMIN_SECRET = "flower-admin-dev-secret-placeholder-000000";

function signFlowerAdminToken(secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ v: 1, issued: now, exp: now + 3600 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

beforeAll(async () => {
  authLib = await import("../../worker/lib/auth.js");
  authRoutes = await import("../../worker/routes/auth.js");
  premiumToken = await import("../../worker/lib/premium-access-token.js");
  debugRoutes = await import("../../worker/routes/debug.js");
  kakaoCrmRoutes = await import("../../worker/routes/kakao-crm.js");
  adminRoutes = await import("../../worker/routes/admin.js");
});

describe("A1 관리자 토큰 placeholder 시크릿", () => {
  test("명시적 로컬 개발이 아닌 환경(NODE_ENV 미지정 값)에서는 placeholder 서명 토큰을 거부한다", async () => {
    const request = new Request("https://example.com/api/life-book-ai", {
      headers: { "x-admin-token": signFlowerAdminToken(PLACEHOLDER_ADMIN_SECRET) },
    });

    const auth = await authLib.getOptionalUserFromRequest(request, {
      NODE_ENV: "preview",
      JWT_ACCESS_SECRET: "test-access-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret",
    });

    expect(auth).toBeNull();
  });

  test("관리자 라우트 서명 검증도 같은 환경에서 placeholder 시크릿으로 통과하지 않는다", async () => {
    const request = new Request("https://example.com/api/admin/orders", {
      headers: { "x-admin-token": signFlowerAdminToken(PLACEHOLDER_ADMIN_SECRET) },
    });

    const response = await adminRoutes.handleAdminRoutes(request, {
      NODE_ENV: "preview",
      JWT_ACCESS_SECRET: "test-access-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret",
    });

    expect([401, 403, 503]).toContain(response.status);
  });
});

describe("A5 로컬 dev 인증", () => {
  const localRequest = (headers = {}) => new Request("http://127.0.0.1:8787/api/auth/login", { headers });
  const remoteRequest = (headers = {}) => new Request("https://api.code-destiny.com/api/auth/login", { headers });

  test("명시적 로컬 개발 + 로컬 URL 에서만 켜진다", () => {
    const { isLocalDevAuthEnabled } = authRoutes.__authTestUtils;
    expect(isLocalDevAuthEnabled(localRequest(), { NODE_ENV: "development", LOCAL_DEV_AUTH_ENABLED: "true" })).toBe(true);
  });

  test("운영 런타임에서는 플래그가 켜져 있어도 무시한다", () => {
    const { isLocalDevAuthEnabled } = authRoutes.__authTestUtils;
    expect(isLocalDevAuthEnabled(localRequest(), { NODE_ENV: "production", LOCAL_DEV_AUTH_ENABLED: "true" })).toBe(false);
  });

  test("Host/x-forwarded-host 헤더를 localhost 로 위조해도 원격 URL 이면 꺼진다", () => {
    const { isLocalDevAuthEnabled } = authRoutes.__authTestUtils;
    const env = { NODE_ENV: "development", LOCAL_DEV_AUTH_ENABLED: "true" };
    const spoofed = remoteRequest({ host: "localhost", "x-forwarded-host": "localhost" });
    expect(isLocalDevAuthEnabled(spoofed, env)).toBe(false);
  });
});

describe("A6c CSRF 시크릿", () => {
  test("시크릿이 모두 없으면 운영 런타임에서 공개 문자열로 서명하지 않고 throw 한다", () => {
    expect(() => authRoutes.__authTestUtils.getCsrfSecret({ NODE_ENV: "production" }))
      .toThrow("CSRF secret is required in production.");
  });

  test("placeholder CSRF_SECRET 은 무시하고 액세스 시크릿으로 넘어간다", () => {
    const secret = authRoutes.__authTestUtils.getCsrfSecret({
      NODE_ENV: "production",
      CSRF_SECRET: "change_me",
      JWT_ACCESS_SECRET: "real-access-secret-0123456789",
    });
    expect(secret).toBe("real-access-secret-0123456789");
  });
});

describe("A7b 기능 토큰 시크릿", () => {
  const payload = { userId: "507f1f77bcf86cd799439011", reportType: "fptiPremium", featureKey: "premium-fpti-report" };

  test("운영 런타임에서 시크릿이 없으면 토큰 발급이 거부된다", async () => {
    await expect(premiumToken.createPremiumAccessToken({ NODE_ENV: "production" }, payload)).rejects.toThrow();
  });

  test("운영 런타임에서 'dev-secret' 으로 서명된 토큰은 검증을 통과하지 않는다", async () => {
    const forged = await premiumToken.createPremiumAccessToken({ NODE_ENV: "test" }, payload);
    const result = await premiumToken.verifyPremiumAccessToken(forged, {
      NODE_ENV: "production",
      PREMIUM_ACCESS_TOKEN_SECRET: "real-premium-secret-0123456789",
    }, { userId: payload.userId });
    expect(result.ok).toBe(false);
  });

  test("운영 런타임에서 시크릿이 없으면 검증은 예외 없이 ok:false 를 돌려준다", async () => {
    const forged = await premiumToken.createPremiumAccessToken({ NODE_ENV: "test" }, payload);
    const result = await premiumToken.verifyPremiumAccessToken(forged, { NODE_ENV: "production" }, { userId: payload.userId });
    expect(result.ok).toBe(false);
  });

  test("정상 시크릿이면 발급한 토큰이 그대로 검증된다", async () => {
    const env = { NODE_ENV: "production", PREMIUM_ACCESS_TOKEN_SECRET: "real-premium-secret-0123456789" };
    const token = await premiumToken.createPremiumAccessToken(env, payload);
    const result = await premiumToken.verifyPremiumAccessToken(token, env, { userId: payload.userId });
    expect(result.ok).toBe(true);
  });
});

describe("C4 디버그 라우트", () => {
  const request = () => new Request("https://api.code-destiny.com/api/debug/user-exists");

  test("운영 런타임에서는 DEBUG_MODE 가 켜져 있어도 닫혀 있다", async () => {
    const response = await debugRoutes.handleDebugRoutes(request(), { NODE_ENV: "production", DEBUG_MODE: "true" });
    expect(response.status).toBe(403);
  });

  test("스테이징(APP_ENV=staging)에서는 DEBUG_MODE 로 열린다(게이트 통과 후 email 누락 400)", async () => {
    const response = await debugRoutes.handleDebugRoutes(request(), {
      NODE_ENV: "production",
      APP_ENV: "staging",
      DEBUG_MODE: "true",
    });
    expect(response.status).toBe(400);
  });
});

describe("C3 카카오 CRM 웹훅 인증", () => {
  const webhook = (authorization) => new Request("https://api.code-destiny.com/api/kakao-crm/webhook", {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  test("키가 다르면 같은 길이여도 401", async () => {
    const response = await kakaoCrmRoutes.handleKakaoCrmRoutes(webhook("KakaoAK abcdef"), { KAKAO_CHANNEL_ADMIN_KEY: "abcdeg" });
    expect(response.status).toBe(401);
  });

  test("키가 맞으면 인증을 통과해 본문 검증(400 invalid_event)까지 간다", async () => {
    const response = await kakaoCrmRoutes.handleKakaoCrmRoutes(webhook("KakaoAK abcdef"), { KAKAO_CHANNEL_ADMIN_KEY: "abcdef" });
    expect(response.status).toBe(400);
  });
});
