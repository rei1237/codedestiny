/**
 * @jest-environment node
 *
 * 웹 Sign in with Apple(2026-11-19, iOS Phase 2 R3) 계약 가드.
 *
 * 실제 Apple 은 부르지 않는다. 테스트가 RSA(JWKS)·EC(.p8) 키를 직접 만들어 토큰 엔드포인트와
 * JWKS 를 흉내 낸다. 여기서 못박는 것:
 *   ① 키가 하나라도 없으면 start 는 503 으로 닫히고 providers 는 apple:false 다.
 *   ② start 는 form_post·nonce 를 싣고, 묶음 쿠키를 SameSite=None; Secure 로 굽는다(사이트 간 POST 콜백).
 *   ③ client_secret 은 .p8 키로 서명한 ES256 JWT 다(iss=팀, sub=Services ID, aud=Apple).
 *   ④ id_token 의 nonce·aud 가 틀리거나 묶음 쿠키가 없으면 로그인하지 않는다.
 *   ⑤ 🔴 이메일이 같은 기존 계정에 자동으로 붙이지 않는다 — 연결 안내로 보낸다.
 *   ⑥ 링크 모드는 로그인한 본인에게만, 다른 계정에 붙은 Apple 신원은 옮기지 않는다.
 */

const mockUserFindById = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserUpdateOne = jest.fn();
const mockCollectionFindOne = jest.fn();

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose: {
    connection: { name: "test" },
    Types: {
      ObjectId: class {
        constructor(id) { this.id = String(id || ""); }
        toString() { return this.id; }
        static isValid(value) { return /^[a-f0-9]{24}$/.test(String(value || "")); }
      },
    },
  },
  resetMongooseConnection: jest.fn(async () => undefined),
  requestPoolRecovery: jest.fn(async () => undefined),
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: jest.fn(async (env, fn) => fn()),
  isTransientMongoError: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/password.js", () => ({
  hashPassword: jest.fn(async () => "hashed"),
  verifyPassword: jest.fn(async () => true),
  needsPasswordRehash: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  IdempotencyKey: {},
  RESTORE_CREDENTIAL_CAP: 10,
  AbuseScore: {}, ContentOverride: {}, DailyFortuneSubscription: {}, DestinyBiasCard: {},
  Insight: {}, KarmaDestinyAiConsultation: {}, LifeBookAiConsultation: {}, LlmResponseCache: {},
  LoveSecretAiConsultation: {}, NewYearAiConsultation: {}, PaidExecutionRecord: {}, Payment: {},
  ProfileCard: {}, ServiceExecutionTransaction: {}, SukuyoCompatibilityAiConsultation: {},
  ZiweiAiConsultation: {}, MonthlyCreditLedger: {}, PointHistory: {},
  CONTENT_ENTITLEMENT_SOURCES: {}, CONTENT_ENTITLEMENT_STATUSES: {}, RECENT_CONSUME_REQUEST_ID_CAP: 200,
  RefreshTokenSession: {
    create: jest.fn(async (doc) => doc),
    findOne: jest.fn(() => ({ lean: async () => null })),
    findOneAndUpdate: jest.fn(() => ({ lean: async () => null })),
    updateMany: jest.fn(async () => ({})),
    updateOne: jest.fn(async () => ({})),
  },
  User: {
    findById: mockUserFindById,
    findOne: mockUserFindOne,
    updateOne: mockUserUpdateOne,
    collection: { findOne: mockCollectionFindOne },
  },
}));

const SERVICES_ID = "com.codedestiny.app.siwa";
const TEAM_ID = "TEAM123456";
const KEY_ID = "KEY1234567";
const USER_ID = "64f0a1b2c3d4e5f678901234";
const OTHER_USER_ID = "64f0a1b2c3d4e5f678909999";
const APPLE_SUB = "001234.apple-sub.0001";
const ORIGIN = "https://code-destiny.com";

const BASE_ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  AUTH_SECRET: "test-auth-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
  AUTH_FRONTEND_BASE_URL: ORIGIN,
};

let authRoutes;
let appleLib;
let accessToken;
let appleEnv;
let rsaKeys;
let ecKeys;

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function jsonPart(value) {
  return toBase64Url(Buffer.from(JSON.stringify(value)));
}

async function signIdToken(claims, { kid = "apple-k1" } = {}) {
  const input = `${jsonPart({ alg: "RS256", kid })}.${jsonPart(claims)}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", rsaKeys.privateKey, Buffer.from(input));
  return `${input}.${toBase64Url(new Uint8Array(signature))}`;
}

/** findOne 은 await 로도, .select().maxTimeMS().lean() 체인으로도 불린다. */
function query(doc) {
  const promise = Promise.resolve(doc);
  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    select: () => ({ maxTimeMS: () => ({ lean: async () => doc }) }),
  };
}

function startRequest(queryString = "", { token = "" } = {}) {
  const headers = new Headers();
  if (token) {
    headers.set("cookie", `fortune_auth_token=${token}`);
    headers.set("authorization", `Bearer ${token}`);
  }
  return new Request(`${ORIGIN}/api/auth/oauth/apple/start${queryString}`, { headers });
}

async function begin(queryString = "", options = {}, env = appleEnv) {
  const response = await authRoutes.__authTestUtils.handleOAuthStart(startRequest(queryString, options), env, "apple");
  const location = new URL(response.headers.get("location"));
  const setCookie = response.headers.get("set-cookie") || "";
  return { response, location, setCookie, state: location.searchParams.get("state"), cookie: setCookie.split(";")[0] };
}

function callbackRequest({ state, cookie, code = "apple-code-1", error = "", user = "" }) {
  const body = new URLSearchParams({ state, code });
  if (error) body.set("error", error);
  if (user) body.set("user", user);
  return new Request(`${ORIGIN}/api/auth/oauth/apple/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://appleid.apple.com",
      "Sec-Fetch-Site": "cross-site",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body.toString(),
  });
}

const callCallback = (args, env = appleEnv) => authRoutes.__authTestUtils.handleAppleOAuthCallback(callbackRequest(args), env);

let tokenRequests = [];
function stubApple({ claims = {} } = {}) {
  tokenRequests = [];
  global.fetch = jest.fn(async (url, init = {}) => {
    const target = String(url?.url || url);
    if (target === "https://appleid.apple.com/auth/keys") {
      const jwk = await crypto.subtle.exportKey("jwk", rsaKeys.publicKey);
      return new Response(JSON.stringify({ keys: [{ ...jwk, kid: "apple-k1", alg: "RS256", use: "sig" }] }), { status: 200 });
    }
    if (target === "https://appleid.apple.com/auth/token") {
      tokenRequests.push(new URLSearchParams(String(init.body || "")));
      const now = Math.floor(Date.now() / 1000);
      const idToken = await signIdToken({
        iss: "https://appleid.apple.com",
        aud: SERVICES_ID,
        iat: now,
        exp: now + 600,
        sub: APPLE_SUB,
        email: "same@example.com",
        email_verified: "true",
        nonce: claims.nonce,
        ...claims,
      });
      return new Response(JSON.stringify({ id_token: idToken, token_type: "Bearer" }), { status: 200 });
    }
    throw new Error(`unexpected fetch ${target}`);
  });
}

async function nonceFor(cookie) {
  return appleLib.deriveAppleNonce(cookie.split("=")[1]);
}

beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
  appleLib = await import("../../worker/lib/apple-signin.js");
  const { signJwt } = await import("../../worker/lib/jwt.js");
  accessToken = await signJwt(
    { userId: USER_ID, email: "tester@example.com", role: "user" },
    BASE_ENV.JWT_ACCESS_SECRET,
    { expiresIn: "30m", issuer: BASE_ENV.JWT_ISSUER, audience: BASE_ENV.JWT_AUDIENCE },
  );
  rsaKeys = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  ecKeys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pkcs8 = Buffer.from(await crypto.subtle.exportKey("pkcs8", ecKeys.privateKey)).toString("base64");
  appleEnv = {
    ...BASE_ENV,
    APPLE_TEAM_ID: TEAM_ID,
    APPLE_SIWA_SERVICES_ID: SERVICES_ID,
    APPLE_SIWA_KEY_ID: KEY_ID,
    // 대시보드에 한 줄로 붙여 넣은 형태("\n" 글자)도 읽혀야 한다.
    APPLE_SIWA_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\\n${pkcs8}\\n-----END PRIVATE KEY-----`,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  appleLib.resetAppleJwksCacheForTests();
  mockCollectionFindOne.mockResolvedValue({ _id: USER_ID, email: "tester@example.com", role: "user", status: "active" });
  mockUserFindOne.mockImplementation(() => query(null));
  mockUserFindById.mockReturnValue(query({ _id: USER_ID, socialAccounts: {} }));
  mockUserUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
});

describe("설정이 없으면 닫힌다", () => {
  test("키가 하나라도 없으면 start 는 503, providers 는 apple:false", async () => {
    const { APPLE_SIWA_PRIVATE_KEY, ...partial } = appleEnv;
    const response = await authRoutes.__authTestUtils.handleOAuthStart(startRequest(), partial, "apple");
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("apple_signin_not_configured");

    const providers = await authRoutes.handleAuthRoutes(new Request(`${ORIGIN}/api/auth/oauth/providers`), partial);
    expect(await providers.json()).toEqual({ ok: true, providers: { apple: false } });
    const configured = await authRoutes.handleAuthRoutes(new Request(`${ORIGIN}/api/auth/oauth/providers`), appleEnv);
    expect(await configured.json()).toEqual({ ok: true, providers: { apple: true } });
  });

  test("Apple 은 GET 콜백을 받지 않는다", async () => {
    const response = await authRoutes.__authTestUtils.handleOAuthCallback(
      new Request(`${ORIGIN}/api/auth/oauth/apple/callback?code=x&state=y`),
      appleEnv,
      "apple",
    );
    expect(new URL(response.headers.get("location")).searchParams.get("social_error")).toBe("invalid_callback");
  });
});

describe("start", () => {
  test("form_post·nonce 를 싣고 묶음 쿠키를 SameSite=None 으로 굽는다", async () => {
    const { response, location, setCookie, cookie } = await begin();
    expect(response.status).toBe(302);
    expect(location.origin + location.pathname).toBe("https://appleid.apple.com/auth/authorize");
    expect(location.searchParams.get("client_id")).toBe(SERVICES_ID);
    expect(location.searchParams.get("response_mode")).toBe("form_post");
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("scope")).toBe("name email");
    expect(location.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/oauth/apple/callback`);
    expect(location.searchParams.get("nonce")).toBe(await nonceFor(cookie));
    expect(setCookie).toMatch(/^cd_oauth_browser_apple=[a-f0-9]{64};/);
    expect(setCookie).toContain("SameSite=None");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("HttpOnly");
  });
});

describe("로그인 콜백", () => {
  test("Apple 로 연결된 계정은 social_grant 로 넘어가고 client_secret 은 ES256 으로 서명된다", async () => {
    const { state, cookie } = await begin();
    stubApple({ claims: { nonce: await nonceFor(cookie) } });
    mockUserFindOne.mockImplementation((filter) => query(
      filter["socialAccounts.apple.id"] === APPLE_SUB ? { _id: USER_ID, status: "active", socialAccounts: { apple: { id: APPLE_SUB } } } : null,
    ));

    const response = await callCallback({ state, cookie });
    const location = new URL(response.headers.get("location"));
    expect(location.pathname).toBe("/auth/apple/callback");
    expect(location.searchParams.get("social_grant")).toBeTruthy();

    const sent = tokenRequests[0];
    expect(sent.get("client_id")).toBe(SERVICES_ID);
    expect(sent.get("grant_type")).toBe("authorization_code");
    const [header, payload, signature] = sent.get("client_secret").split(".");
    expect(JSON.parse(Buffer.from(header, "base64url"))).toMatchObject({ alg: "ES256", kid: KEY_ID });
    expect(JSON.parse(Buffer.from(payload, "base64url"))).toMatchObject({ iss: TEAM_ID, sub: SERVICES_ID, aud: "https://appleid.apple.com" });
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      ecKeys.publicKey,
      Buffer.from(signature, "base64url"),
      Buffer.from(`${header}.${payload}`),
    );
    expect(valid).toBe(true);
  });

  // 🔴 R3: 같은 이메일이어도 자동 연결하지 않는다.
  test("이메일이 같은 기존 계정이 있으면 연결하지 않고 안내로 보낸다", async () => {
    const { state, cookie } = await begin();
    stubApple({ claims: { nonce: await nonceFor(cookie) } });
    const existing = { _id: USER_ID, status: "active", email: "same@example.com", set: jest.fn(), save: jest.fn() };
    mockUserFindOne.mockImplementation((filter) => query(filter.email === "same@example.com" ? existing : null));

    const response = await callCallback({ state, cookie });
    const location = new URL(response.headers.get("location"));
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("social_error")).toBe("apple_link_required");
    expect(location.searchParams.get("next")).toBe("/account/apple/");
    expect(existing.set).not.toHaveBeenCalled();
    expect(existing.save).not.toHaveBeenCalled();
  });

  test("처음 보는 Apple 신원은 가입 마무리(생년 확인)로 간다", async () => {
    const { state, cookie } = await begin();
    stubApple({ claims: { nonce: await nonceFor(cookie), email: "abc@privaterelay.appleid.com" } });
    const response = await callCallback({ state, cookie, user: JSON.stringify({ name: { firstName: "길동", lastName: "홍" } }) });
    const location = new URL(response.headers.get("location"));
    expect(location.pathname).toBe("/signup");
    expect(location.searchParams.get("social_signup")).toBeTruthy();
  });

  test.each([
    ["nonce 가 다르면", { nonce: "f".repeat(64) }, "apple_id_token_bad_nonce"],
    ["aud 가 다르면", { aud: "com.other.app" }, "apple_id_token_bad_audience"],
    ["iss 가 다르면", { iss: "https://evil.example" }, "apple_id_token_bad_issuer"],
  ])("%s 로그인하지 않는다", async (_label, override, reason) => {
    const { state, cookie } = await begin();
    stubApple({ claims: { nonce: await nonceFor(cookie), ...override } });
    const response = await callCallback({ state, cookie });
    expect(new URL(response.headers.get("location")).searchParams.get("social_error")).toBe(reason);
    expect(mockUserFindOne).not.toHaveBeenCalled();
  });

  test("묶음 쿠키가 없는 브라우저는 토큰 교환 전에 끊는다", async () => {
    const { state } = await begin();
    stubApple();
    const response = await callCallback({ state, cookie: "" });
    expect(new URL(response.headers.get("location")).searchParams.get("social_error")).toBe("oauth_browser_mismatch");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("사용자가 취소하면 cancelled 로 돌아간다", async () => {
    const { state, cookie } = await begin();
    stubApple();
    const response = await callCallback({ state, cookie, code: "", error: "user_cancelled_authorize" });
    expect(new URL(response.headers.get("location")).searchParams.get("social_error")).toBe("cancelled");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("기존 계정 연결(링크 모드)", () => {
  test("로그인하지 않았으면 로그인 화면으로 보낸다", async () => {
    const { response, location } = await begin("?mode=link");
    expect(response.status).toBe(302);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/account/apple/");
  });

  test("로그인한 본인에게 Apple 신원을 붙인다", async () => {
    const { state, cookie } = await begin("?mode=link", { token: accessToken });
    stubApple({ claims: { nonce: await nonceFor(cookie) } });
    const response = await callCallback({ state, cookie });
    const location = new URL(response.headers.get("location"));
    expect(location.pathname).toBe("/account/apple/");
    expect(location.searchParams.get("appleLink")).toBe("linked");
    expect(mockUserUpdateOne).toHaveBeenCalledWith(
      { _id: USER_ID, "socialAccounts.apple.id": { $in: ["", null] } },
      { $set: { "socialAccounts.apple.id": APPLE_SUB, "socialAccounts.apple.connectedAt": expect.any(Date) } },
    );
  });

  test("다른 계정에 붙은 Apple 신원은 옮기지 않는다", async () => {
    const { state, cookie } = await begin("?mode=link", { token: accessToken });
    stubApple({ claims: { nonce: await nonceFor(cookie) } });
    mockUserFindOne.mockImplementation(() => query({ _id: OTHER_USER_ID }));
    const response = await callCallback({ state, cookie });
    expect(new URL(response.headers.get("location")).searchParams.get("appleLink")).toBe("apple_already_linked");
    expect(mockUserUpdateOne).not.toHaveBeenCalled();
  });
});

// R4: 구글·네이버·카카오의 이메일 자동 연결은 그대로다.
test("구글은 검증된 같은 이메일 계정에 그대로 이어 붙인다", async () => {
  const existing = { _id: USER_ID, status: "active", email: "same@example.com", set: jest.fn(), save: jest.fn(async () => undefined) };
  mockUserFindOne.mockImplementation((filter) => query(filter.email === "same@example.com" ? existing : null));
  const result = await authRoutes.__authTestUtils.findOrCreateSocialUser(
    "google",
    { providerId: "g-1", email: "same@example.com", emailVerified: true, name: "x", image: "", phoneNumber: "" },
    appleEnv,
  );
  expect(result.user).toBe(existing);
  expect(existing.set).toHaveBeenCalledWith("socialAccounts.google.id", "g-1");
  expect(existing.save).toHaveBeenCalled();
});
