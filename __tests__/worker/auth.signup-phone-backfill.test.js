/**
 * @jest-environment node
 *
 * 회원가입 화면에서 받은 휴대폰 번호가 계정에 실제로 저장되는지 고정한다.
 *
 * 증상: "가입할 때 번호를 입력했는데 첫 단건결제 직전에 또 물어본다."
 * 원인은 결제창 모달이 아니라 **가입 경로에서 그 번호를 버리는 두 갈래**였다.
 *   ① findExistingSocialUser 가 백필에 공급자 값(profile.phoneNumber)만 봤다 — 구글·카카오는
 *      번호를 거의 주지 않으므로, 기존 계정 분기로 들어가면 사용자가 방금 입력한 값이 사라졌다.
 *   ② 이메일 재가입 idempotent 경로가 세션만 내주고 입력한 번호를 무시했다.
 *
 * 여기서 고정하는 성질:
 *   - 두 경로 모두 **입력값을 공급자 값보다 우선**해 저장한다.
 *   - 이미 읽히는 번호가 있으면 **덮어쓰지 않는다**.
 *   - 저장은 항상 암호화 봉투로만 나간다(평문 폴백 없음).
 */

const ENCRYPTED_PREFIX = "v1:";

const mockEncryptPhoneNumber = jest.fn(async (value) => (value ? `${ENCRYPTED_PREFIX}enc(${value})` : ""));
const mockDecryptPhoneNumber = jest.fn(async (value) => {
  const stored = String(value || "");
  if (!stored) return "";
  const match = stored.match(/^v1:enc\((\d+)\)$/);
  if (match) return match[1];
  return /^01\d{8,9}$/.test(stored) ? stored : "";
});

const mockUserSave = jest.fn(async () => undefined);
const mockUserCreate = jest.fn(async (doc) => ({ ...doc, _id: "64f0a1b2c3d4e5f678901234" }));
const mockUserFindOne = jest.fn(async () => null);
const mockCollectionFindOne = jest.fn(async () => null);
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
  encryptPhoneNumber: mockEncryptPhoneNumber,
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
    findOne: mockUserFindOne,
    create: mockUserCreate,
    collection: { findOne: mockCollectionFindOne, updateOne: mockCollectionUpdateOne },
  },
  PointHistory: { create: jest.fn(async () => ({})) },
  // updateOne 은 신규 생성 경로(가입 보너스 원장)에서만 쓰인다 — 없으면 라우트가 삼키고 로그만 남긴다.
  MonthlyCreditLedger: { create: jest.fn(async () => ({})), updateOne: jest.fn(async () => ({})) },
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

const TYPED_PHONE = "01071807398";
const PROVIDER_PHONE = "01000000000";

let authRoutes;

beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUserCreate.mockImplementation(async (doc) => ({ ...doc, _id: "64f0a1b2c3d4e5f678901234" }));
  mockUserFindOne.mockResolvedValue(null);
  mockCollectionFindOne.mockResolvedValue(null);
  mockCollectionUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
  authRoutes.__authTestUtils.clearLoginRateLimitState();
});

function makeExistingSocialUser(storedPhone) {
  const doc = {
    _id: "64f0a1b2c3d4e5f678901234",
    email: "social@example.com",
    name: "Social User",
    phoneNumber: storedPhone,
    status: "active",
    set: jest.fn(function set(key, value) { this[key] = value; }),
    save: mockUserSave,
  };
  return doc;
}

describe("소셜 가입 마무리 — 기존 계정 분기", () => {
  test("사용자가 입력한 번호가 공급자 값보다 우선 저장된다", async () => {
    const existing = makeExistingSocialUser("");
    mockUserFindOne.mockResolvedValueOnce(existing);

    await authRoutes.__authTestUtils.findOrCreateSocialUser(
      "google",
      { providerId: "g-1", email: "social@example.com", phoneNumber: PROVIDER_PHONE, emailVerified: true },
      ENV,
      { createIfMissing: true, signupProfile: { name: "Social User", phoneNumber: TYPED_PHONE } },
    );

    expect(mockEncryptPhoneNumber).toHaveBeenCalledWith(TYPED_PHONE, ENV);
    expect(mockEncryptPhoneNumber).not.toHaveBeenCalledWith(PROVIDER_PHONE, ENV);
    expect(existing.phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${TYPED_PHONE})`);
    expect(mockUserSave).toHaveBeenCalled();
  });

  test("입력값이 없으면 공급자 값으로 백필하는 기존 동작은 유지된다", async () => {
    const existing = makeExistingSocialUser("");
    mockUserFindOne.mockResolvedValueOnce(existing);

    await authRoutes.__authTestUtils.findOrCreateSocialUser(
      "kakao",
      { providerId: "k-1", email: "social@example.com", phoneNumber: PROVIDER_PHONE, emailVerified: true },
      ENV,
      { createIfMissing: false },
    );

    expect(existing.phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${PROVIDER_PHONE})`);
  });

  test("이미 읽히는 번호가 있으면 덮어쓰지 않는다", async () => {
    const existing = makeExistingSocialUser(`${ENCRYPTED_PREFIX}enc(01099998888)`);
    mockUserFindOne.mockResolvedValueOnce(existing);

    await authRoutes.__authTestUtils.findOrCreateSocialUser(
      "naver",
      { providerId: "n-1", email: "social@example.com", phoneNumber: PROVIDER_PHONE, emailVerified: true },
      ENV,
      { createIfMissing: true, signupProfile: { name: "Social User", phoneNumber: TYPED_PHONE } },
    );

    expect(existing.phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(01099998888)`);
    expect(mockEncryptPhoneNumber).not.toHaveBeenCalled();
  });
});

function buildRegisterRequest(overrides = {}) {
  return new Request("https://example.com/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.77" },
    body: JSON.stringify({
      name: "Tester",
      email: "tester@example.com",
      password: "Quiet!Harbor42",
      phoneNumber: TYPED_PHONE,
      ageAttested: true,
      termsAccepted: true,
      privacyAccepted: true,
      ...overrides,
    }),
  });
}

/**
 * 2026-08-15 정책 전환: 가입 화면이 번호를 묻지 않는다. 서버는 번호 없는 본문을 거절하면 안 되고,
 * 그 계정은 phoneNumber: "" 로 만들어져 첫 단건결제 때 POST /api/me/payment-phone 로 1회 채운다.
 * 예전에는 두 가입 경로가 각각 400 invalid_phone_number 로 막았다.
 */
describe("번호 없는 가입", () => {
  test("이메일 가입 — 번호가 없어도 계정이 만들어진다", async () => {
    const request = buildRegisterRequest({ phoneNumber: undefined });
    const response = await authRoutes.__authTestUtils.handleRegister(request, ENV);

    expect(response.status).toBe(201);
    expect(mockUserCreate).toHaveBeenCalledTimes(1);
    expect(mockUserCreate.mock.calls[0][0].phoneNumber).toBe("");
    // 🔴 번호가 없으면 암호화 키를 만질 이유도 없다. 여기서 호출되면 키 부재가 곧 가입 실패가 된다.
    expect(mockEncryptPhoneNumber).toHaveBeenCalledWith("", ENV);
  });

  test("이메일 가입 — 번호를 실어 보내면(구버전 앱) 여전히 암호화 저장한다", async () => {
    const response = await authRoutes.__authTestUtils.handleRegister(buildRegisterRequest(), ENV);

    expect(response.status).toBe(201);
    expect(mockUserCreate.mock.calls[0][0].phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${TYPED_PHONE})`);
  });

  test("소셜 가입 — 공급자도 사용자도 번호를 안 주면 번호 없이 생성된다", async () => {
    await authRoutes.__authTestUtils.findOrCreateSocialUser(
      "google",
      { providerId: "g-2", email: "nophone@example.com", phoneNumber: "", emailVerified: true },
      ENV,
      { createIfMissing: true, signupProfile: { name: "No Phone", phoneNumber: "" } },
    );

    expect(mockUserCreate).toHaveBeenCalledTimes(1);
    // 조건부 스프레드라 키 자체가 붙지 않는다(스키마 default "" 가 그대로 적용된다).
    expect(mockUserCreate.mock.calls[0][0]).not.toHaveProperty("phoneNumber");
    expect(mockEncryptPhoneNumber).not.toHaveBeenCalled();
  });

  test("소셜 가입 — 공급자가 번호를 주면 암호화해 저장한다", async () => {
    await authRoutes.__authTestUtils.findOrCreateSocialUser(
      "kakao",
      { providerId: "k-2", email: "withphone@example.com", phoneNumber: PROVIDER_PHONE, emailVerified: true },
      ENV,
      { createIfMissing: true, signupProfile: { name: "With Phone", phoneNumber: "" } },
    );

    expect(mockEncryptPhoneNumber).toHaveBeenCalledWith(PROVIDER_PHONE, ENV);
    expect(mockUserCreate.mock.calls[0][0].phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${PROVIDER_PHONE})`);
  });
});

describe("이메일 재가입(idempotent) 경로", () => {

  test("번호가 비어 있던 기존 계정에 입력한 번호를 백필한다", async () => {
    mockCollectionFindOne.mockResolvedValueOnce({
      _id: "64f0a1b2c3d4e5f678901234",
      email: "tester@example.com",
      name: "Tester",
      phoneNumber: "",
      passwordHash: "pbkdf2$stored",
      localAuth: { enabled: true },
      status: "active",
      role: "user",
      points: 0,
    });

    const response = await authRoutes.__authTestUtils.handleRegister(buildRegisterRequest(), ENV);
    expect(response.status).toBe(200);

    const backfillCall = mockCollectionUpdateOne.mock.calls.find(
      ([, update]) => update?.$set && "phoneNumber" in update.$set,
    );
    expect(backfillCall).toBeDefined();
    expect(backfillCall[1].$set.phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${TYPED_PHONE})`);
    // 🔴 평문이 그대로 저장되면 안 된다.
    expect(backfillCall[1].$set.phoneNumber).not.toBe(TYPED_PHONE);
    // 그 사이 다른 요청이 채웠으면 덮어쓰지 않도록 필터에 읽은 값이 함께 들어간다.
    expect(backfillCall[0]).toHaveProperty("phoneNumber");
  });

  test("이미 번호가 있으면 백필하지 않는다", async () => {
    mockCollectionFindOne.mockResolvedValueOnce({
      _id: "64f0a1b2c3d4e5f678901234",
      email: "tester@example.com",
      name: "Tester",
      phoneNumber: `${ENCRYPTED_PREFIX}enc(01099998888)`,
      passwordHash: "pbkdf2$stored",
      localAuth: { enabled: true },
      status: "active",
      role: "user",
      points: 0,
    });

    const response = await authRoutes.__authTestUtils.handleRegister(buildRegisterRequest(), ENV);
    expect(response.status).toBe(200);

    const backfillCall = mockCollectionUpdateOne.mock.calls.find(
      ([, update]) => update?.$set && "phoneNumber" in update.$set,
    );
    expect(backfillCall).toBeUndefined();
  });
});
