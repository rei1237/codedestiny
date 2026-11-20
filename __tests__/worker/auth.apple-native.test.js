/**
 * @jest-environment node
 *
 * iOS 네이티브 Sign in with Apple(2026-11-20, iOS Phase 5) 계약 가드.
 *
 * 실제 Apple 은 부르지 않는다. RSA(JWKS)·EC(.p8) 키를 테스트가 직접 만든다. 여기서 못박는 것:
 *   ① 팀 ID·키·번들 ID 중 하나라도 없으면 503 apple_signin_not_configured 로 닫히고 아무 것도 부르지 않는다.
 *   ② 앱 출처+앱 런타임 헤더가 아니면 같은 출처 가드에서 403 이다(브라우저 호출 차단).
 *   ③ id_token 의 aud 는 번들 ID, nonce 는 원 nonce 의 sha256 hex 여야 한다. exp 가 지나면 401.
 *   ④ 연결된 계정은 1회용 social_grant 를 받고, refresh token 은 봉해서(평문 아님) 저장한다.
 *   ⑤ PII_ENC_KEY 가 없으면 refresh token 을 저장하지 않는다(로그인은 된다).
 *   ⑥ 처음 보는 신원은 가입 마무리 경로를 돌려준다(계정을 만들지 않는다).
 *   ⑦ 탈퇴 revoke 는 설정·토큰이 없으면 건너뛰고, 있으면 번들 ID 로 revoke 를 부른다.
 */

const mockUserFindById = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserUpdateOne = jest.fn();

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
    collection: { findOne: jest.fn() },
  },
}));

const BUNDLE_ID = "com.codedestiny.app";
const TEAM_ID = "TEAM123456";
const KEY_ID = "KEY1234567";
const USER_ID = "64f0a1b2c3d4e5f678901234";
const APPLE_SUB = "001234.apple-sub.0001";
const ORIGIN = "https://code-destiny.com";
const RAW_NONCE = "raw-nonce-abcdefghijklmnopqrstuvwxyz012345";

let authRoutes;
let appleLib;
let piiCrypto;
let nativeEnv;
let rsaKeys;
let tokenRequests = [];
let revokeRequests = [];

const b64u = (bytes) => Buffer.from(bytes).toString("base64url");
const jsonPart = (value) => b64u(Buffer.from(JSON.stringify(value)));

async function signIdToken(claims) {
  const input = `${jsonPart({ alg: "RS256", kid: "apple-k1" })}.${jsonPart(claims)}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", rsaKeys.privateKey, Buffer.from(input));
  return `${input}.${b64u(new Uint8Array(signature))}`;
}

async function identityToken(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return signIdToken({
    iss: "https://appleid.apple.com",
    aud: BUNDLE_ID,
    iat: now,
    exp: now + 600,
    sub: APPLE_SUB,
    email: "abc@privaterelay.appleid.com",
    email_verified: "true",
    nonce: await appleLib.hashAppleNativeNonce(RAW_NONCE),
    ...overrides,
  });
}

function query(doc) {
  const promise = Promise.resolve(doc);
  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    select: () => ({ maxTimeMS: () => ({ lean: async () => doc }) }),
  };
}

function stubApple({ refreshToken = "apple-refresh-1", revokeStatus = 200 } = {}) {
  tokenRequests = [];
  revokeRequests = [];
  global.fetch = jest.fn(async (url, init = {}) => {
    const target = String(url?.url || url);
    if (target === "https://appleid.apple.com/auth/keys") {
      const jwk = await crypto.subtle.exportKey("jwk", rsaKeys.publicKey);
      return new Response(JSON.stringify({ keys: [{ ...jwk, kid: "apple-k1", alg: "RS256", use: "sig" }] }), { status: 200 });
    }
    if (target === "https://appleid.apple.com/auth/token") {
      tokenRequests.push(new URLSearchParams(String(init.body || "")));
      return new Response(JSON.stringify({ id_token: "unused", refresh_token: refreshToken }), { status: 200 });
    }
    if (target === "https://appleid.apple.com/auth/revoke") {
      revokeRequests.push(new URLSearchParams(String(init.body || "")));
      return new Response("", { status: revokeStatus });
    }
    throw new Error(`unexpected fetch ${target}`);
  });
}

function appRequest(body, { app = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (app) {
    headers.Origin = "capacitor://localhost";
    headers["X-Code-Destiny-Runtime"] = "mobile-app";
  } else {
    headers.Origin = "https://evil.example";
    headers["Sec-Fetch-Site"] = "cross-site";
  }
  return new Request(`${ORIGIN}/api/auth/oauth/apple/native`, { method: "POST", headers, body: JSON.stringify(body) });
}

const callNative = async (body, env = nativeEnv) => authRoutes.__authTestUtils.handleAppleNativeSignIn(appRequest(body), env);

beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
  appleLib = await import("../../worker/lib/apple-signin.js");
  piiCrypto = await import("../../worker/lib/pii-crypto.js");
  rsaKeys = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const ecKeys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pkcs8 = Buffer.from(await crypto.subtle.exportKey("pkcs8", ecKeys.privateKey)).toString("base64");
  nativeEnv = {
    JWT_ACCESS_SECRET: "test-access-secret",
    JWT_REFRESH_SECRET: "test-refresh-secret",
    AUTH_SECRET: "test-auth-secret",
    JWT_ISSUER: "code-destiny-api",
    JWT_AUDIENCE: "code-destiny-web",
    AUTH_FRONTEND_BASE_URL: ORIGIN,
    APPLE_TEAM_ID: TEAM_ID,
    APPLE_SIWA_KEY_ID: KEY_ID,
    APPLE_SIWA_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\\n${pkcs8}\\n-----END PRIVATE KEY-----`,
    APPLE_APP_BUNDLE_ID: BUNDLE_ID,
    // 테스트 전용 무작위 키(32바이트). 운영 키가 아니다.
    PII_ENC_KEY: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64"),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  appleLib.resetAppleJwksCacheForTests();
  mockUserFindOne.mockImplementation(() => query(null));
  mockUserFindById.mockReturnValue(query(null));
  mockUserUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
});

const linkedUser = () => mockUserFindOne.mockImplementation((filter) => query(
  filter["socialAccounts.apple.id"] === APPLE_SUB ? { _id: USER_ID, status: "active", socialAccounts: { apple: { id: APPLE_SUB } } } : null,
));

describe("fail-closed", () => {
  test.each(["APPLE_TEAM_ID", "APPLE_SIWA_KEY_ID", "APPLE_SIWA_PRIVATE_KEY", "APPLE_APP_BUNDLE_ID"])(
    "%s 가 없으면 503 이고 Apple·DB 를 부르지 않는다",
    async (missing) => {
      stubApple();
      const { [missing]: _drop, ...partial } = nativeEnv;
      const response = await callNative({ identityToken: await identityToken(), rawNonce: RAW_NONCE }, partial);
      expect(response.status).toBe(503);
      expect((await response.json()).code).toBe("apple_signin_not_configured");
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockUserFindOne).not.toHaveBeenCalled();
    },
  );

  test("앱 출처+앱 런타임 헤더가 아니면 403 app_only 이고 Apple 을 부르지 않는다", async () => {
    stubApple();
    const response = await authRoutes.__authTestUtils.handleAppleNativeSignIn(
      appRequest({ identityToken: await identityToken(), rawNonce: RAW_NONCE }, { app: false }),
      nativeEnv,
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("app_only");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockUserFindOne).not.toHaveBeenCalled();
  });
});

describe("id_token 검증", () => {
  test.each([
    ["aud 가 웹 Services ID 면", { aud: "com.codedestiny.app.siwa" }, "apple_id_token_bad_audience"],
    ["nonce 가 원 nonce 해시가 아니면", { nonce: RAW_NONCE }, "apple_id_token_bad_nonce"],
    ["만료됐으면", { exp: Math.floor(Date.now() / 1000) - 3600, iat: Math.floor(Date.now() / 1000) - 7200 }, "apple_id_token_expired"],
  ])("%s 401 이고 계정을 찾지 않는다", async (_label, override, code) => {
    stubApple();
    const response = await callNative({ identityToken: await identityToken(override), rawNonce: RAW_NONCE });
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe(code);
    expect(mockUserFindOne).not.toHaveBeenCalled();
  });

  test("원 nonce 가 없으면 400", async () => {
    stubApple();
    const response = await callNative({ identityToken: await identityToken() });
    expect(response.status).toBe(400);
  });
});

describe("로그인", () => {
  test("연결된 계정은 social_grant 를 받고 refresh token 은 봉해서 저장한다", async () => {
    stubApple();
    linkedUser();
    const response = await callNative({
      identityToken: await identityToken(),
      authorizationCode: "native-code-1",
      rawNonce: RAW_NONCE,
      nextPath: "/records/",
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.socialGrant).toBeTruthy();
    expect(body.nextPath).toBe("/records/");

    // 네이티브 교환: client_id·sub 는 번들 ID, redirect_uri 는 싣지 않는다.
    const sent = tokenRequests[0];
    expect(sent.get("client_id")).toBe(BUNDLE_ID);
    expect(sent.has("redirect_uri")).toBe(false);
    const payload = JSON.parse(Buffer.from(sent.get("client_secret").split(".")[1], "base64url"));
    expect(payload).toMatchObject({ iss: TEAM_ID, sub: BUNDLE_ID });

    const [, update] = mockUserUpdateOne.mock.calls.find(([filter]) => filter["socialAccounts.apple.id"] === APPLE_SUB);
    const stored = update.$set["socialAccounts.apple.refreshTokenEnc"];
    expect(stored).toMatch(/^secret-v1:/);
    expect(stored).not.toContain("apple-refresh-1");
    await expect(piiCrypto.decryptBoundSecret(stored, "apple-refresh", APPLE_SUB, nativeEnv)).resolves.toBe("apple-refresh-1");
    // 다른 계정(binding)으로 옮겨 붙이면 풀리지 않는다.
    await expect(piiCrypto.decryptBoundSecret(stored, "apple-refresh", "other-sub", nativeEnv)).rejects.toBeTruthy();
  });

  test("PII_ENC_KEY 가 없으면 refresh token 을 저장하지 않지만 로그인은 된다", async () => {
    stubApple();
    linkedUser();
    const { PII_ENC_KEY, ...noKey } = nativeEnv;
    const response = await callNative({ identityToken: await identityToken(), authorizationCode: "c", rawNonce: RAW_NONCE }, noKey);
    expect(response.status).toBe(200);
    expect((await response.json()).socialGrant).toBeTruthy();
    expect(mockUserUpdateOne.mock.calls.some(([, u]) => u?.$set?.["socialAccounts.apple.refreshTokenEnc"])).toBe(false);
  });

  test("코드 교환이 실패해도 로그인은 막지 않는다", async () => {
    stubApple();
    linkedUser();
    const base = global.fetch;
    global.fetch = jest.fn(async (url, init) => {
      if (String(url?.url || url) === "https://appleid.apple.com/auth/token") return new Response("{\"error\":\"invalid_grant\"}", { status: 400 });
      return base(url, init);
    });
    const response = await callNative({ identityToken: await identityToken(), authorizationCode: "used", rawNonce: RAW_NONCE });
    expect(response.status).toBe(200);
  });

  test("처음 보는 Apple 신원은 계정을 만들지 않고 가입 마무리 경로를 돌려준다", async () => {
    stubApple();
    const response = await callNative({ identityToken: await identityToken(), rawNonce: RAW_NONCE, givenName: "길동", familyName: "홍" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.socialGrant).toBeUndefined();
    const signup = new URL(body.signupPath, ORIGIN);
    expect(signup.pathname).toBe("/signup");
    expect(signup.searchParams.get("social_signup")).toBeTruthy();
  });

  test("이메일이 같은 기존 계정이 있으면 409 apple_link_required", async () => {
    stubApple();
    mockUserFindOne.mockImplementation((filter) => query(
      filter.email === "same@example.com" ? { _id: USER_ID, status: "active", email: "same@example.com", set: jest.fn(), save: jest.fn() } : null,
    ));
    const response = await callNative({ identityToken: await identityToken({ email: "same@example.com" }), rawNonce: RAW_NONCE });
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("apple_link_required");
  });
});

describe("탈퇴 revoke", () => {
  const revoke = (env, user) => authRoutes.__authTestUtils.revokeAppleTokenForWithdraw(env, user);

  test("Apple 연결이 없으면 아무것도 부르지 않는다", async () => {
    stubApple();
    await expect(revoke(nativeEnv, { socialAccounts: {} })).resolves.toBe("no_apple");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("저장 토큰이 없으면 건너뛴다(웹 SIWA·네이티브 가입 직후 계정)", async () => {
    stubApple();
    await expect(revoke(nativeEnv, { socialAccounts: { apple: { id: APPLE_SUB } } })).resolves.toBe("skipped_no_token");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("설정이 없으면 건너뛴다", async () => {
    stubApple();
    const stored = await piiCrypto.encryptBoundSecret("apple-refresh-1", "apple-refresh", APPLE_SUB, nativeEnv);
    const { APPLE_APP_BUNDLE_ID, ...partial } = nativeEnv;
    await expect(revoke(partial, { socialAccounts: { apple: { id: APPLE_SUB, refreshTokenEnc: stored } } })).resolves.toBe("skipped_not_configured");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("토큰이 있으면 번들 ID 로 refresh token 을 revoke 한다", async () => {
    stubApple();
    const stored = await piiCrypto.encryptBoundSecret("apple-refresh-1", "apple-refresh", APPLE_SUB, nativeEnv);
    await expect(revoke(nativeEnv, { socialAccounts: { apple: { id: APPLE_SUB, refreshTokenEnc: stored } } })).resolves.toBe("revoked");
    expect(revokeRequests[0].get("client_id")).toBe(BUNDLE_ID);
    expect(revokeRequests[0].get("token")).toBe("apple-refresh-1");
    expect(revokeRequests[0].get("token_type_hint")).toBe("refresh_token");
  });

  test("revoke 가 실패해도 던지지 않는다(탈퇴는 진행)", async () => {
    stubApple({ revokeStatus: 500 });
    const stored = await piiCrypto.encryptBoundSecret("apple-refresh-1", "apple-refresh", APPLE_SUB, nativeEnv);
    await expect(revoke(nativeEnv, { socialAccounts: { apple: { id: APPLE_SUB, refreshTokenEnc: stored } } })).resolves.toBe("failed");
  });
});
