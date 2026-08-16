/**
 * @jest-environment node
 *
 * 프로필 보완(/onboarding) 게이트가 **딱 한 번만** 발동하는지 고정한다.
 *
 * 이 게이트는 로그인 응답의 nextPath 를 갈아끼우는 장치라, 잘못 판정하면 증상이 크다:
 *   - 판정을 저장값 문자열로 하면 암호화 봉투가 늘 "번호 있음"으로 보여 게이트가 죽는다.
 *   - 표식(phonePromptedAt)을 안 남기면 번호를 건너뛴 사람이 **로그인마다** 붙잡힌다.
 *   - 앱(Capacitor)까지 보내면 번들에 없는 경로라 빈 화면이 된다.
 *   - 원래 목적지를 안 실어 보내면 결제/딥링크 복귀가 통째로 사라진다.
 */

const ENCRYPTED_PREFIX = "v1:";

const mockDecryptPhoneNumber = jest.fn(async (value) => {
  const stored = String(value || "");
  if (!stored) return "";
  const match = stored.match(/^v1:enc\((\d+)\)$/);
  if (match) return match[1];
  return /^01\d{8,9}$/.test(stored) ? stored : "";
});

const mockCollectionUpdateOne = jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 }));

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

jest.unstable_mockModule("../../worker/lib/pii-crypto.js", () => ({
  encryptPhoneNumber: jest.fn(async (value) => (value ? `${ENCRYPTED_PREFIX}enc(${value})` : "")),
  decryptPhoneNumber: mockDecryptPhoneNumber,
  normalizeKoreanPhoneNumber: jest.fn((value) => {
    const digits = String(value || "").replace(/\D/g, "");
    return /^01\d{8,9}$/.test(digits) ? digits : "";
  }),
  maskKoreanPhoneNumber: jest.fn(() => ""),
  isEncryptedPiiValue: jest.fn((value) => String(value || "").startsWith(ENCRYPTED_PREFIX)),
  ENCRYPTED_PII_PATTERN: /^v1:.+$/,
}));

jest.unstable_mockModule("../../worker/lib/password.js", () => ({
  hashPassword: jest.fn(async () => "pbkdf2$new"),
  verifyPassword: jest.fn(async () => true),
  needsPasswordRehash: jest.fn(() => false),
}));

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
    create: jest.fn(async (doc) => ({ ...doc, _id: "64f0a1b2c3d4e5f678901234" })),
    collection: {
      findOne: jest.fn(async () => null),
      updateOne: mockCollectionUpdateOne,
      findOneAndUpdate: jest.fn(async () => null),
    },
  },
  PointHistory: { create: jest.fn(async () => ({})) },
  MonthlyCreditLedger: { create: jest.fn(async () => ({})), updateOne: jest.fn(async () => ({})) },
  ProfileCard: {}, Payment: {}, Insight: {}, ContentOverride: {}, DailyFortuneSubscription: {},
  DestinyBiasCard: {}, KarmaDestinyAiConsultation: {}, LifeBookAiConsultation: {}, LlmResponseCache: {},
  LoveSecretAiConsultation: {}, NewYearAiConsultation: {}, PaidExecutionRecord: {},
  ServiceExecutionTransaction: {}, SukuyoCompatibilityAiConsultation: {}, ZiweiAiConsultation: {},
  CONTENT_ENTITLEMENT_SOURCES: {}, CONTENT_ENTITLEMENT_STATUSES: {}, RECENT_CONSUME_REQUEST_ID_CAP: 200,
}));

const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  AUTH_SECRET: "test-auth-secret",
  MONGO_URI: "mongodb://fake/test",
  PII_ENC_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
};

const USER_ID = "64f0a1b2c3d4e5f678901234";
const webRequest = new Request("https://code-destiny.com/api/auth/login", { method: "POST" });
// 앱은 런타임 헤더 + 등록된 출처 조합으로만 판별된다(isMobileAppAuthRequest).
const appRequest = new Request("https://code-destiny.com/api/auth/login", {
  method: "POST",
  headers: { "x-code-destiny-runtime": "mobile-app", origin: "https://localhost" },
});

let utils;

beforeAll(async () => {
  utils = (await import("../../worker/routes/auth.js")).__authTestUtils;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCollectionUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
});

const userWith = (overrides = {}) => ({ _id: USER_ID, phoneNumber: "", ...overrides });

describe("shouldPromptProfileCompletion", () => {
  test("번호가 없고 아직 묻지 않았으면 대상이다", async () => {
    await expect(utils.shouldPromptProfileCompletion(userWith(), ENV, webRequest)).resolves.toBe(true);
  });

  test("🔴 봉투로 저장된 번호는 '있음'으로 읽어야 한다 — 문자열로 판정하면 여기서 깨진다", async () => {
    const user = userWith({ phoneNumber: `${ENCRYPTED_PREFIX}enc(01071807398)` });
    await expect(utils.shouldPromptProfileCompletion(user, ENV, webRequest)).resolves.toBe(false);
  });

  test("마이그레이션 전 평문 번호도 '있음'이다", async () => {
    const user = userWith({ phoneNumber: "01071807398" });
    await expect(utils.shouldPromptProfileCompletion(user, ENV, webRequest)).resolves.toBe(false);
  });

  test("레거시 phone 필드만 있어도 '있음'이다", async () => {
    const user = { _id: USER_ID, phone: "01071807398" };
    await expect(utils.shouldPromptProfileCompletion(user, ENV, webRequest)).resolves.toBe(false);
  });

  test("이미 한 번 물어봤으면 번호가 없어도 다시 붙잡지 않는다", async () => {
    const user = userWith({ phonePromptedAt: new Date("2026-08-16T00:00:00Z") });
    await expect(utils.shouldPromptProfileCompletion(user, ENV, webRequest)).resolves.toBe(false);
  });

  test("🔴 앱 런타임은 제외한다 — 앱 번들에 /onboarding 이 없어 빈 화면이 된다", async () => {
    await expect(utils.shouldPromptProfileCompletion(userWith(), ENV, appRequest)).resolves.toBe(false);
  });
});

describe("buildProfileCompletionNextPath", () => {
  test("원래 목적지를 next 로 실어 보낸다", () => {
    expect(utils.buildProfileCompletionNextPath("/points/")).toBe("/onboarding/?next=%2Fpoints%2F");
  });

  test("쿼리가 붙은 목적지도 통째로 보존한다", () => {
    expect(utils.buildProfileCompletionNextPath("/points/?plan=basic&cdco=1"))
      .toBe("/onboarding/?next=%2Fpoints%2F%3Fplan%3Dbasic%26cdco%3D1");
  });

  test("홈이면 next 를 붙이지 않는다", () => {
    expect(utils.buildProfileCompletionNextPath("/")).toBe("/onboarding/");
  });

  test("이미 온보딩을 가리키면 중첩시키지 않는다", () => {
    expect(utils.buildProfileCompletionNextPath("/onboarding/")).toBe("/onboarding/");
    expect(utils.buildProfileCompletionNextPath("/onboarding")).toBe("/onboarding/");
  });

  test("바깥 사이트는 sanitizeNextPath 가 떨궈 홈으로 접힌다", () => {
    expect(utils.buildProfileCompletionNextPath("https://evil.example/x")).toBe("/onboarding/");
    expect(utils.buildProfileCompletionNextPath("//evil.example/x")).toBe("/onboarding/");
  });
});

describe("applyProfileCompletionGate", () => {
  test("대상이면 경로를 갈아끼우고 표식을 남긴다", async () => {
    const result = await utils.applyProfileCompletionGate(userWith(), ENV, "/points/", webRequest);
    expect(result).toBe("/onboarding/?next=%2Fpoints%2F");
    expect(mockCollectionUpdateOne).toHaveBeenCalledTimes(1);
    const [, update] = mockCollectionUpdateOne.mock.calls[0];
    expect(update.$set.phonePromptedAt).toBeInstanceOf(Date);
  });

  test("대상이 아니면 목적지도 표식도 건드리지 않는다", async () => {
    const user = userWith({ phoneNumber: `${ENCRYPTED_PREFIX}enc(01071807398)` });
    await expect(utils.applyProfileCompletionGate(user, ENV, "/points/", webRequest)).resolves.toBe("/points/");
    expect(mockCollectionUpdateOne).not.toHaveBeenCalled();
  });

  test("🔴 표식 쓰기가 실패해도 로그인은 진행된다(곁다리 쓰기)", async () => {
    mockCollectionUpdateOne.mockRejectedValue(new Error("MongoNetworkError: down"));
    await expect(utils.applyProfileCompletionGate(userWith(), ENV, "/points/", webRequest))
      .resolves.toBe("/onboarding/?next=%2Fpoints%2F");
  });

  // 🔴 실제로 로그인을 깬 회귀다(auth.app-refresh-token 스위트가 401 로 잡았다): 표식 쓰기가
  // **동기로** 터지면 withOptionalAuthSideEffect 는 잡지 못한다 — 프로미스를 인자로 받기 때문에
  // 그 프로미스를 만드는 도중의 예외는 이미 헬퍼 밖이다. 로그인은 그래도 성공해야 한다.
  test("🔴 표식 쓰기가 동기로 터져도 로그인은 진행된다", async () => {
    mockCollectionUpdateOne.mockImplementation(() => { throw new TypeError("updateOne is not a function"); });
    await expect(utils.applyProfileCompletionGate(userWith(), ENV, "/points/", webRequest))
      .resolves.toBe("/onboarding/?next=%2Fpoints%2F");
  });
});
