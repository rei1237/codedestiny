/**
 * @jest-environment node
 *
 * 앱(Capacitor) 전용 리프레시 토큰 경로의 회귀 가드.
 *
 * 앱은 https://localhost 출처라 SameSite=Lax 리프레시 쿠키를 받지도 보내지도 못한다.
 * 그래서 쿠키를 쓸 수 없는 앱에 한해 리프레시 토큰을 JSON 본문으로 내려주고 헤더로
 * 되돌려 받는다. 이 파일이 지키는 것은 두 가지다.
 *
 *   1) 웹은 무엇도 달라지지 않는다 — 쿠키가 언제나 먼저이고, 응답 본문에 리프레시 토큰이
 *      절대 실리지 않는다.
 *   2) 앱 폴백은 "앱 런타임 헤더 + 허용된 앱 출처"가 둘 다 맞을 때만 열린다.
 *
 * 응답 메시지로 어느 경로를 탔는지 구분한다.
 *   "Refresh token is missing."            → 토큰을 아예 못 읽음
 *   "Refresh token is invalid or expired." → 토큰을 읽었고 검증에서 떨어짐
 */

const mockConnectDb = jest.fn(async () => undefined);
const mockResetMongooseConnection = jest.fn(async () => undefined);
const mockWithMongoRetry = jest.fn(async (env, fn) => fn());
const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn(async (doc) => ({ ...doc, _id: "64f0a1b2c3d4e5f678905678" }));
const mockVerifyPassword = jest.fn(async () => true);
const mockRefreshSessionCreate = jest.fn(async (doc) => doc);

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: mockConnectDb,
  mongoose: {
    connection: { name: "test" },
    Types: { ObjectId: class { constructor(id) { this.id = id; } static isValid() { return true; } } },
  },
  resetMongooseConnection: mockResetMongooseConnection,
  requestPoolRecovery: mockResetMongooseConnection,
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: mockWithMongoRetry,
  isTransientMongoError: jest.fn(() => false),
}));

// auth.js 는 4개만 쓰지만 모듈 그래프의 다른 모듈들이 같은 파일에서 더 많은 이름을 가져간다.
// ESM 목은 명명 export 가 정적으로 맞아야 하므로 전부 채워 둔다.
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
  MonthlyCreditLedger: { updateOne: jest.fn(async () => ({ upsertedCount: 1 })) },
  PointHistory: {},
  RefreshTokenSession: {
    create: mockRefreshSessionCreate,
    findOne: jest.fn(async () => null),
    findOneAndUpdate: jest.fn(() => ({ lean: async () => null })),
    updateMany: jest.fn(async () => ({})),
    updateOne: jest.fn(async () => ({})),
  },
  User: {
    collection: { findOne: mockUserFindOne },
    create: mockUserCreate,
  },
}));

jest.unstable_mockModule("../../worker/lib/password.js", () => ({
  hashPassword: jest.fn(async () => "hashed-password"),
  verifyPassword: mockVerifyPassword,
  // 레거시 bcrypt 해시를 로그인 시 PBKDF2로 갈아끼우는 경로. 목 해시는 bcrypt가 아니므로 false.
  needsPasswordRehash: jest.fn(() => false),
}));

const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
};

const APP_ORIGIN = "https://localhost";
const WEB_ORIGIN = "https://code-destiny.com";

let authRoutes;

function buildRefreshRequest({ cookie, origin, runtime, refreshHeader } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (cookie) headers.set("cookie", cookie);
  if (origin) headers.set("origin", origin);
  if (runtime) headers.set("x-code-destiny-runtime", runtime);
  if (refreshHeader) headers.set("x-code-destiny-refresh-token", refreshHeader);
  return new Request("https://code-destiny.com/api/auth/refresh", { method: "POST", headers });
}

async function readRefreshMessage(request) {
  const response = await authRoutes.__authTestUtils.handleRefresh(request, ENV);
  const payload = await response.json();
  return { status: response.status, message: payload.message };
}

beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockWithMongoRetry.mockImplementation(async (env, fn) => fn());
});

describe("웹 경로는 달라지지 않는다", () => {
  test("쿠키도 앱 헤더도 없으면 예전 그대로 'missing'", async () => {
    const { status, message } = await readRefreshMessage(buildRefreshRequest());
    expect(status).toBe(401);
    expect(message).toBe("Refresh token is missing.");
  });

  test("웹 출처에서는 리프레시 헤더를 보내도 무시된다", async () => {
    const { status, message } = await readRefreshMessage(buildRefreshRequest({
      origin: WEB_ORIGIN,
      runtime: "mobile-app",
      refreshHeader: "attacker-supplied-token",
    }));
    expect(status).toBe(401);
    // 헤더를 읽었다면 'invalid or expired'가 나왔을 것이다.
    expect(message).toBe("Refresh token is missing.");
  });

  test("런타임 헤더 없이 앱 출처만으로는 폴백이 열리지 않는다", async () => {
    const { message } = await readRefreshMessage(buildRefreshRequest({
      origin: APP_ORIGIN,
      refreshHeader: "some-token",
    }));
    expect(message).toBe("Refresh token is missing.");
  });

  test("쿠키가 있으면 앱 조건이 맞아도 쿠키를 먼저 읽는다", async () => {
    const { message } = await readRefreshMessage(buildRefreshRequest({
      cookie: "fortune_auth_refresh=cookie-token",
      origin: APP_ORIGIN,
      runtime: "mobile-app",
    }));
    // 쿠키를 읽었으므로 'missing'이 아니라 검증 실패로 떨어져야 한다.
    expect(message).toBe("Refresh token is invalid or expired.");
  });
});

describe("앱 폴백은 런타임 헤더 + 앱 출처가 모두 맞을 때만 열린다", () => {
  test("두 조건이 맞으면 헤더의 리프레시 토큰을 읽는다", async () => {
    const { status, message } = await readRefreshMessage(buildRefreshRequest({
      origin: APP_ORIGIN,
      runtime: "mobile-app",
      refreshHeader: "app-supplied-token",
    }));
    expect(status).toBe(401);
    // 'missing'이 아니라는 것이 곧 헤더를 읽었다는 증거다.
    expect(message).toBe("Refresh token is invalid or expired.");
  });

  test("조건이 맞아도 헤더 자체가 없으면 'missing'", async () => {
    const { message } = await readRefreshMessage(buildRefreshRequest({
      origin: APP_ORIGIN,
      runtime: "mobile-app",
    }));
    expect(message).toBe("Refresh token is missing.");
  });
});

describe("로그인 응답 본문의 리프레시 토큰 노출 범위", () => {
  function buildLoginRequest({ origin, runtime } = {}) {
    const headers = new Headers({
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.20",
    });
    if (origin) headers.set("origin", origin);
    if (runtime) headers.set("x-code-destiny-runtime", runtime);
    return new Request("https://code-destiny.com/api/auth/login", {
      method: "POST",
      headers,
      body: JSON.stringify({ email: "tester@example.com", password: "correct-horse" }),
    });
  }

  beforeEach(() => {
    authRoutes.__authTestUtils.clearLoginRateLimitState();
    mockUserFindOne.mockResolvedValue({
      _id: "64f0a1b2c3d4e5f678901234",
      email: "tester@example.com",
      name: "Tester",
      role: "user",
      passwordHash: "hashed",
      localAuth: { enabled: true },
      points: 0,
    });
    mockVerifyPassword.mockResolvedValue(true);
  });

  test("웹 로그인 응답에는 refreshToken이 실리지 않는다", async () => {
    const response = await authRoutes.__authTestUtils.handleLogin(buildLoginRequest({ origin: WEB_ORIGIN }), ENV);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.accessToken).toBeUndefined();
    expect(payload.refreshToken).toBeUndefined();
    // 쿠키 경로는 그대로 살아 있어야 한다.
    expect(String(response.headers.get("set-cookie") || "")).toContain("fortune_auth_refresh=");
  });

  test("앱 로그인 응답에는 refreshToken이 실린다", async () => {
    const response = await authRoutes.__authTestUtils.handleLogin(
      buildLoginRequest({ origin: APP_ORIGIN, runtime: "mobile-app" }),
      ENV,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.refreshToken).toEqual(expect.any(String));
    expect(payload.refreshToken).not.toBe(payload.accessToken);
  });
});

describe("회원가입 응답 본문의 리프레시 토큰 노출 범위", () => {
  // 앱 회원가입은 SignupClient가 이 refreshToken을 저장해야 콜드스타트 세션이 유지된다.
  // register도 login과 같은 createAuthSuccessResponse/appRefreshTokenField를 타므로,
  // 여기서 register 경로 자체가 앱 요청에 refreshToken을 내려주는지 못박는다.
  function buildRegisterRequest({ origin, runtime } = {}) {
    const headers = new Headers({
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.21",
    });
    if (origin) headers.set("origin", origin);
    if (runtime) headers.set("x-code-destiny-runtime", runtime);
    return new Request("https://code-destiny.com/api/auth/register", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "테스터",
        email: "newbie@example.com",
        password: "correct-horse-battery",
        phoneNumber: "01012345678",
        ageAttested: true,
        termsAccepted: true,
        privacyAccepted: true,
      }),
    });
  }

  beforeEach(() => {
    // 신규 가입이므로 기존 유저 조회는 null.
    mockUserFindOne.mockResolvedValue(null);
  });

  test("웹 회원가입 응답에는 refreshToken이 실리지 않는다", async () => {
    const response = await authRoutes.__authTestUtils.handleRegister(
      buildRegisterRequest({ origin: WEB_ORIGIN }),
      ENV,
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.accessToken).toBeUndefined();
    expect(payload.refreshToken).toBeUndefined();
    expect(String(response.headers.get("set-cookie") || "")).toContain("fortune_auth_refresh=");
  });

  test("앱 회원가입 응답에는 refreshToken이 실린다", async () => {
    const response = await authRoutes.__authTestUtils.handleRegister(
      buildRegisterRequest({ origin: APP_ORIGIN, runtime: "mobile-app" }),
      ENV,
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.refreshToken).toEqual(expect.any(String));
    expect(payload.refreshToken).not.toBe(payload.accessToken);
  });
});
