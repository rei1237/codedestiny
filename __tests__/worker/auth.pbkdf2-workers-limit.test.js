/**
 * @jest-environment node
 *
 * 🔴 Cloudflare Workers 의 WebCrypto 는 PBKDF2 반복수를 **100,000 으로 하드 제한**한다.
 * 초과하면 `crypto.subtle.deriveBits` 가 즉시 throw 한다:
 *   `Pbkdf2 failed: iteration counts above 100000 are not supported (requested 600000).`
 *
 * 이 제한은 워커 런타임에만 있다. jest 는 Node 에서 돌고 Node 의 PBKDF2 에는 상한이 없어서,
 * 600,000 으로 굳어 있던 상수가 전체 테스트를 통과한 채 프로덕션에 나갔고 이메일 회원가입이
 * 500(`unknown_error`)으로 죽어 있었다. 로그인은 기존 bcrypt 해시를 `bcrypt.compare` 로
 * 검증하므로 멀쩡해 보였고, 로그인 후의 PBKDF2 재해싱은 예외가 삼켜져 아무도 알아채지 못했다.
 *
 * 그래서 여기서는 **워커의 상한을 흉내 내는 스텁을 깔고** 검증한다. 이 스텁이 없으면
 * 이 테스트는 Node 에서 아무것도 잡아내지 못한다.
 */

const WORKERS_PBKDF2_MAX_ITERATIONS = 100000;

const mockCollectionFindOne = jest.fn(async () => null);
const mockCollectionUpdateOne = jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 }));
const mockUserCreate = jest.fn(async (doc) => ({ ...doc, _id: "64f0a1b2c3d4e5f678901234" }));

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose: {
    connection: { name: "test" },
    Types: {
      ObjectId: class {
        constructor(value) { this.value = String(value || "64f0a1b2c3d4e5f678901234"); }
        toString() { return this.value; }
        static isValid() { return true; }
      },
    },
  },
  resetMongooseConnection: jest.fn(async () => undefined),
  requestPoolRecovery: jest.fn(async () => undefined),
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: jest.fn(async (env, fn) => fn()),
  isTransientMongoError: jest.fn(() => false),
}));

// 🔴 실제 HIBP 로 나가지 않도록 반드시 막는다(테스트에서 외부 API 호출 금지).
jest.unstable_mockModule("../../worker/lib/password-breach.js", () => ({
  checkPasswordBreached: jest.fn(async () => ({ breached: false, source: "none", checked: true })),
  isLocallyBlockedPassword: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  AbuseScore: {
    findOne: jest.fn(async () => null),
    findOneAndUpdate: jest.fn(async () => null),
    updateOne: jest.fn(async () => ({})),
  },
  RefreshTokenSession: {
    create: jest.fn(async () => ({ _id: "session-id" })),
    updateOne: jest.fn(async () => ({})),
    updateMany: jest.fn(async () => ({})),
    findOne: jest.fn(() => ({ lean: async () => null })),
    findOneAndUpdate: jest.fn(async () => null),
    deleteMany: jest.fn(async () => ({})),
  },
  User: {
    findOne: jest.fn(async () => null),
    create: mockUserCreate,
    updateOne: jest.fn(async () => ({})),
    collection: { findOne: mockCollectionFindOne, updateOne: mockCollectionUpdateOne },
  },
  PointHistory: { create: jest.fn(async () => ({})) },
  MonthlyCreditLedger: { create: jest.fn(async () => ({})) },
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

const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  AUTH_SECRET: "test-auth-secret",
  MONGO_URI: "mongodb://fake/test",
  PII_ENC_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
};

let passwordModule;
let authRoutes;
let originalDeriveBits;

beforeAll(async () => {
  // workerd 와 같은 자리에서 같은 문구로 실패시킨다.
  originalDeriveBits = crypto.subtle.deriveBits.bind(crypto.subtle);
  crypto.subtle.deriveBits = async (algorithm, key, length) => {
    const iterations = Number(algorithm?.iterations || 0);
    if (algorithm?.name === "PBKDF2" && iterations > WORKERS_PBKDF2_MAX_ITERATIONS) {
      throw new Error(
        `Pbkdf2 failed: iteration counts above ${WORKERS_PBKDF2_MAX_ITERATIONS} are not supported (requested ${iterations}).`,
      );
    }
    return originalDeriveBits(algorithm, key, length);
  };

  passwordModule = await import("../../worker/lib/password.js");
  authRoutes = await import("../../worker/routes/auth.js");
});

afterAll(() => {
  if (originalDeriveBits) crypto.subtle.deriveBits = originalDeriveBits;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCollectionFindOne.mockResolvedValue(null);
  mockUserCreate.mockImplementation(async (doc) => ({ ...doc, _id: "64f0a1b2c3d4e5f678901234" }));
  authRoutes.__authTestUtils.clearLoginRateLimitState();
});

describe("PBKDF2 반복수 — Cloudflare Workers 상한", () => {
  test("스텁이 실제로 상한을 강제한다(이 테스트의 전제)", async () => {
    await expect(crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(16), iterations: WORKERS_PBKDF2_MAX_ITERATIONS + 1 },
      await crypto.subtle.importKey("raw", new TextEncoder().encode("x"), { name: "PBKDF2" }, false, ["deriveBits"]),
      256,
    )).rejects.toThrow(/iteration counts above 100000 are not supported/);
  });

  test("hashPassword 가 워커에서 성공하고, 반복수가 상한 이하로 기록된다", async () => {
    const hash = await passwordModule.hashPassword("Quiet!Harbor42");

    const [prefix, iterationsRaw] = hash.split("$");
    expect(prefix).toBe("pbkdf2-sha256");
    expect(Number(iterationsRaw)).toBeLessThanOrEqual(WORKERS_PBKDF2_MAX_ITERATIONS);
    expect(Number(iterationsRaw)).toBeGreaterThan(0);
  });

  test("방금 만든 해시를 verifyPassword 가 되받는다", async () => {
    const hash = await passwordModule.hashPassword("Quiet!Harbor42");

    await expect(passwordModule.verifyPassword("Quiet!Harbor42", hash)).resolves.toBe(true);
    await expect(passwordModule.verifyPassword("Quiet!Harbor43", hash)).resolves.toBe(false);
  });

  test("상한을 넘겨 저장된 레거시 해시는 검증 불가로 떨어질 뿐 throw 하지 않는다", async () => {
    // 시드 스크립트가 Node 에서 만들어 둔 600k 해시가 이 형태다. 워커에서는 검증할 방법이 없어
    // "비밀번호 틀림"과 같아진다 — 조사는 scripts/audit-legacy-pbkdf2-hashes.mjs 로 한다.
    const legacy = "pbkdf2-sha256$600000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    await expect(passwordModule.verifyPassword("Quiet!Harbor42", legacy)).resolves.toBe(false);
  });
});

describe("이메일 회원가입 — 500 회귀 고정", () => {
  function buildRegisterRequest() {
    return new Request("https://example.com/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.90" },
      body: JSON.stringify({
        name: "Tester",
        email: "pbkdf2-tester@example.com",
        password: "Quiet!Harbor42",
        phoneNumber: "01071807398",
        ageAttested: true,
        termsAccepted: true,
        privacyAccepted: true,
      }),
    });
  }

  test("신규 이메일 가입이 201 로 끝난다(비밀번호 해싱이 워커에서 죽지 않는다)", async () => {
    const response = await authRoutes.__authTestUtils.handleRegister(buildRegisterRequest(), ENV);
    const payload = await response.json();

    expect(payload.code).not.toBe("unknown_error");
    expect(response.status).toBe(201);
    expect(mockUserCreate).toHaveBeenCalledTimes(1);

    const created = mockUserCreate.mock.calls[0][0];
    expect(String(created.passwordHash)).toMatch(/^pbkdf2-sha256\$\d+\$/);
    // 🔴 평문이 저장되면 안 된다.
    expect(String(created.passwordHash)).not.toContain("Quiet!Harbor42");
  });

  test("User.create 가 타임아웃으로 실패하면 500 이 아니라 503 이다", async () => {
    // withAuthOpTimeout 이 만드는 형태의 오류. 재시도가 의미 있는 인프라 실패라
    // OAuth 가입 경로(handleOAuthCompleteSignup)와 같은 503 으로 나가야 한다.
    mockUserCreate.mockRejectedValueOnce(new Error("auth_register_create_user_timeout"));

    const response = await authRoutes.__authTestUtils.handleRegister(buildRegisterRequest(), ENV);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.code).toBe("db_write_failed");
  });

  test("스키마 검증 실패처럼 재시도가 무의미한 오류는 500 으로 남는다", async () => {
    const validationError = new Error("User validation failed: name: Path `name` is required.");
    validationError.name = "ValidationError";
    mockUserCreate.mockRejectedValueOnce(validationError);

    const response = await authRoutes.__authTestUtils.handleRegister(buildRegisterRequest(), ENV);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe("db_write_failed");
  });
});
