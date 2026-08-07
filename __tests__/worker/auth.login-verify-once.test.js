/**
 * @jest-environment node
 *
 * 로그인 재시도가 비밀번호 검증(KDF)을 다시 태우면 안 된다.
 *
 * handleLogin 은 인프라 실패에 대해 최대 3회 재시도한다. 그런데 verifyPassword 는 절대 throw 하지
 * 않고 false 를 돌려주므로(worker/lib/password.js) **재시도 사유가 될 수 없다** — 실제로 루프를
 * 다시 도는 현실적 경로는 세션 발급(RefreshTokenSession.create) 타임아웃이다. 그럼에도 예전 구현은
 * try 블록 전체를 재실행해 PBKDF2 600k(~89ms) 또는 레거시 bcryptjs.compare(~270ms)를 매 시도마다
 * 재계산했다. 3회면 최악 CPU 270~810ms 이고, 이 워커는 과거 그 CPU 로
 * error 1102(Worker exceeded resource limits)를 맞은 이력이 있다(worker/lib/password.js 주석).
 *
 * 여기서 고정하는 성질:
 *   ① 세션 발급이 두 번 타임아웃해 3번째 시도까지 가도 verifyPassword 는 **정확히 1회** 호출된다.
 *   ② 그럼에도 검증은 **세션 발급보다 먼저** 일어난다(검증을 건너뛰고 세션이 나가면 안 된다).
 *   ③ 비밀번호가 틀리면 재시도 캐시와 무관하게 그대로 거절된다.
 */

const callOrder = [];
let sessionCreateAttempts = 0;

const mockVerifyPassword = jest.fn(async () => {
  callOrder.push("verifyPassword");
  return true;
});

const mockFindOne = jest.fn(async () => ({
  _id: "64f0a1b2c3d4e5f678901234",
  email: "tester@example.com",
  name: "Tester",
  passwordHash: "pbkdf2$stored",
  localAuth: { enabled: true },
  role: "user",
  points: 0,
}));

const mockSessionCreate = jest.fn(async () => {
  sessionCreateAttempts += 1;
  callOrder.push(`sessionCreate#${sessionCreateAttempts}`);
  // 앞의 두 번은 인프라 타임아웃으로 떨어뜨려 재시도 루프를 강제한다.
  // isAuthInfraFailure 는 메시지에 "timeout" 이 있으면 인프라 실패로 분류한다.
  if (sessionCreateAttempts < 3) throw new Error("mongo operation timeout");
  return { _id: "session-id" };
});

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose: { connection: { name: "test" }, Types: { ObjectId: class {} } },
  resetMongooseConnection: jest.fn(async () => undefined),
  requestPoolRecovery: jest.fn(async () => undefined),
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: jest.fn(async (env, fn) => fn()),
  isTransientMongoError: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/password.js", () => ({
  hashPassword: jest.fn(async () => "hashed-password"),
  verifyPassword: mockVerifyPassword,
  needsPasswordRehash: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  AbuseScore: {
    findOne: jest.fn(async () => null),
    findOneAndUpdate: jest.fn(async () => null),
    updateOne: jest.fn(async () => ({})),
  },
  RefreshTokenSession: {
    create: mockSessionCreate,
    updateOne: jest.fn(async () => ({})),
    updateMany: jest.fn(async () => ({})),
    findOne: jest.fn(() => ({ lean: async () => null })),
    findOneAndUpdate: jest.fn(async () => null),
    deleteMany: jest.fn(async () => ({})),
  },
  User: { collection: { findOne: mockFindOne }, findOne: jest.fn(async () => null) },
  PointHistory: { create: jest.fn(async () => ({})) },
  MonthlyCreditLedger: {},
  ProfileCard: {},
  Payment: {},
  Insight: {},
  ContentOverride: {},
  DailyFortuneSubscription: {},
  DestinyBiasCard: {},
  KarmaDestinyAiConsultation: {},
  LifeBookAiConsultation: {},
  LlmResponseCache: {},
  LoveSecretAiConsultation: {},
  NewYearAiConsultation: {},
  PaidExecutionRecord: {},
  ServiceExecutionTransaction: {},
  SukuyoCompatibilityAiConsultation: {},
  ZiweiAiConsultation: {},
  CONTENT_ENTITLEMENT_SOURCES: {},
  CONTENT_ENTITLEMENT_STATUSES: {},
  RECENT_CONSUME_REQUEST_ID_CAP: 200,
}));

let authRoutes;

beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
});

beforeEach(() => {
  callOrder.length = 0;
  sessionCreateAttempts = 0;
  mockVerifyPassword.mockClear();
  authRoutes.__authTestUtils.clearLoginRateLimitState();
});

function buildLoginRequest() {
  return new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.77" },
    body: JSON.stringify({ email: "tester@example.com", password: "correct-horse" }),
  });
}

const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  AUTH_SECRET: "test-auth-secret",
  MONGO_URI: "mongodb://fake/test",
};

test("login retries must not recompute the password KDF", async () => {
  await authRoutes.__authTestUtils.handleLogin(buildLoginRequest(), ENV);

  // ① 세션 발급이 3번 시도됐는데(= 루프를 3번 돌았는데) 검증은 1번뿐이다.
  expect(sessionCreateAttempts).toBe(3);
  expect(callOrder.filter((entry) => entry === "verifyPassword")).toHaveLength(1);

  // ② 검증이 첫 세션 발급보다 앞선다 — 검증을 건너뛰고 세션이 나가지 않는다.
  expect(callOrder.indexOf("verifyPassword")).toBeGreaterThanOrEqual(0);
  expect(callOrder.indexOf("verifyPassword")).toBeLessThan(callOrder.indexOf("sessionCreate#1"));
});

test("a wrong password is still rejected and never issues a session", async () => {
  mockVerifyPassword.mockImplementationOnce(async () => {
    callOrder.push("verifyPassword");
    return false;
  });

  const response = await authRoutes.__authTestUtils.handleLogin(buildLoginRequest(), ENV);

  expect(response.status).toBe(401);
  expect(callOrder.filter((entry) => entry === "verifyPassword")).toHaveLength(1);
  expect(sessionCreateAttempts).toBe(0);
});
