/**
 * @jest-environment node
 */

const { createHmac } = require("node:crypto");

const mockConnectDb = jest.fn(async () => undefined);
const mockResetMongooseConnection = jest.fn(async () => undefined);
const mockFindOne = jest.fn();
const mockVerifyPassword = jest.fn(async () => false);

// db.js·models.js 는 이 목이 작성된 뒤에 export 가 늘었다. ESM 목은 명명 export 가 정적으로
// 맞아야 로드되므로, 빠진 이름 하나가 이 파일 전체를 로드 실패로 떨어뜨린다.
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: mockConnectDb,
  mongoose: { connection: { name: "test" } },
  resetMongooseConnection: mockResetMongooseConnection,
  requestPoolRecovery: mockResetMongooseConnection,
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: jest.fn(async (env, fn) => fn()),
  isTransientMongoError: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  AbuseScore: {},
  CONTENT_ENTITLEMENT_SOURCES: {},
  CONTENT_ENTITLEMENT_STATUSES: {},
  ContentOverride: {},
  DailyFortuneSubscription: {},
  DestinyBiasCard: {},
  Insight: {},
  KarmaDestinyAiConsultation: {},
  LifeBookAiConsultation: {},
  LlmResponseCache: {},
  LoveSecretAiConsultation: {},
  NewYearAiConsultation: {},
  PaidExecutionRecord: {},
  Payment: {},
  ProfileCard: {},
  RECENT_CONSUME_REQUEST_ID_CAP: 200,
  ServiceExecutionTransaction: {},
  SukuyoCompatibilityAiConsultation: {},
  ZiweiAiConsultation: {},
  MonthlyCreditLedger: {},
  PointHistory: {},
  RefreshTokenSession: {},
  User: {
    collection: {
      findOne: mockFindOne,
    },
  },
}));

jest.unstable_mockModule("../../worker/lib/password.js", () => ({
  hashPassword: jest.fn(async () => "hashed-password"),
  verifyPassword: mockVerifyPassword,
  // 레거시 bcrypt 해시를 로그인 시 PBKDF2로 갈아끼우는 경로. 목 해시는 bcrypt가 아니므로 false.
  needsPasswordRehash: jest.fn(() => false),
}));

let authRoutes;
let authLib;

async function readResponse(response) {
  const payload = await response.json();
  return { status: response.status, payload, headers: response.headers };
}

function buildLoginRequest(email = "tester@example.com") {
  return new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.10",
    },
    body: JSON.stringify({
      email,
      password: "wrong-password",
    }),
  });
}

function signFlowerAdminToken(secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ v: 1, issued: now, exp: now + 3600 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
  authLib = await import("../../worker/lib/auth.js");
});

beforeEach(() => {
  jest.clearAllMocks();
  authRoutes.__authTestUtils.clearLoginRateLimitState();
});

describe("auth production secret guard", () => {
  test("production must not fall back to dev-secret for access tokens", () => {
    expect(() => authLib.getAccessTokenSecret({ NODE_ENV: "production" }))
      .toThrow("JWT access token secret is required in production.");
  });

  test("production must not fall back to dev-secret for refresh tokens", () => {
    expect(() => authLib.getRefreshTokenSecret({ NODE_ENV: "production" }))
      .toThrow("JWT refresh token secret is required in production.");
  });

  test("production flower admin bypass must fail closed without FLOWER_ADMIN_SECRET", async () => {
    const token = signFlowerAdminToken("flower-admin-dev-secret-placeholder-000000");
    const request = new Request("https://example.com/api/life-book-ai", {
      headers: { "x-admin-token": token },
    });

    const auth = await authLib.getOptionalUserFromRequest(request, {
      NODE_ENV: "production",
      JWT_ACCESS_SECRET: "test-access-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret",
    });

    expect(auth).toBeNull();
  });
});

describe("login enumeration and brute-force guard", () => {
  const env = {
    JWT_ACCESS_SECRET: "test-access-secret",
    JWT_REFRESH_SECRET: "test-refresh-secret",
    AUTH_LOGIN_RATE_LIMIT_MAX: "1",
    AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: "60000",
  };

  test("unknown account returns generic invalid_credentials", async () => {
    mockFindOne.mockResolvedValue(null);

    const response = await authRoutes.__authTestUtils.handleLogin(buildLoginRequest(), env);
    const { status, payload } = await readResponse(response);

    expect(status).toBe(401);
    expect(payload.code).toBe("invalid_credentials");
    expect(payload.message).toBe("Email or password is incorrect.");
  });

  test("wrong password returns the same generic invalid_credentials", async () => {
    mockFindOne.mockResolvedValue({
      _id: "64f0a1b2c3d4e5f678901234",
      email: "tester@example.com",
      passwordHash: "hashed",
      localAuth: { enabled: true },
    });
    mockVerifyPassword.mockResolvedValue(false);

    const response = await authRoutes.__authTestUtils.handleLogin(buildLoginRequest(), env);
    const { status, payload } = await readResponse(response);

    expect(status).toBe(401);
    expect(payload.code).toBe("invalid_credentials");
    expect(payload.message).toBe("Email or password is incorrect.");
  });

  test("withdrawn local account returns generic invalid_credentials", async () => {
    mockFindOne.mockResolvedValue({
      _id: "64f0a1b2c3d4e5f678901234",
      email: "tester@example.com",
      passwordHash: "hashed",
      localAuth: { enabled: true },
      status: "withdrawn",
    });
    mockVerifyPassword.mockResolvedValue(true);

    const response = await authRoutes.__authTestUtils.handleLogin(buildLoginRequest(), env);
    const { status, payload } = await readResponse(response);

    expect(status).toBe(401);
    expect(payload.code).toBe("invalid_credentials");
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  test("withdrawn account access token is rejected for protected routes", async () => {
    const token = await authLib.signAuthToken({
      _id: "64f0a1b2c3d4e5f678901234",
      email: "tester@example.com",
      role: "user",
      name: "Tester",
    }, env);
    mockFindOne.mockResolvedValue({
      _id: "64f0a1b2c3d4e5f678901234",
      email: "tester@example.com",
      role: "user",
      name: "Tester",
      status: "withdrawn",
    });

    const auth = await authLib.getOptionalUserFromRequest(new Request("https://example.com/api/payments/me", {
      headers: { authorization: `Bearer ${token}` },
    }), env);

    expect(auth).toBeNull();
  });

  test("repeated login failures are rate limited before another DB lookup", async () => {
    mockFindOne.mockResolvedValue(null);

    const first = await authRoutes.__authTestUtils.handleLogin(buildLoginRequest(), env);
    expect(first.status).toBe(401);

    mockFindOne.mockClear();
    const second = await authRoutes.__authTestUtils.handleLogin(buildLoginRequest(), env);
    const { status, payload, headers } = await readResponse(second);

    expect(status).toBe(429);
    expect(payload.code).toBe("rate_limited");
    expect(Number(headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(mockFindOne).not.toHaveBeenCalled();
  });
});
