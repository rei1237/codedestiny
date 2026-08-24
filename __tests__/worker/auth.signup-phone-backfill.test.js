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
  // 🔴 2026-08-19 정책: 공급자 값이 사용자 입력값을 이긴다. 공급자 값은 우리 서버가 카카오/네이버
  // API 에서 직접 받아 티켓에 서명해 둔 것이라, 폼으로 올라온 값보다 신뢰도가 높다.
  test("공급자가 준 번호가 사용자 입력값보다 우선 저장된다", async () => {
    const existing = makeExistingSocialUser("");
    mockUserFindOne.mockResolvedValueOnce(existing);

    await authRoutes.__authTestUtils.findOrCreateSocialUser(
      "google",
      { providerId: "g-1", email: "social@example.com", phoneNumber: PROVIDER_PHONE, emailVerified: true },
      ENV,
      { createIfMissing: true, signupProfile: { name: "Social User", phoneNumber: TYPED_PHONE } },
    );

    expect(mockEncryptPhoneNumber).toHaveBeenCalledWith(PROVIDER_PHONE, ENV);
    expect(mockEncryptPhoneNumber).not.toHaveBeenCalledWith(TYPED_PHONE, ENV);
    expect(existing.phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${PROVIDER_PHONE})`);
    expect(mockUserSave).toHaveBeenCalled();
  });

  // 🔴 2026-08-19 결정: 한 번호로 계정을 여러 개 만드는 것을 허용한다. 가족 공용 번호가
  // 백필에서 막히면 그 계정만 영영 번호 없이 남아 첫 결제마다 모달을 타게 된다.
  test("다른 계정이 이미 쓰는 번호라도 그대로 백필한다", async () => {
    const existing = makeExistingSocialUser("");
    mockUserFindOne.mockResolvedValueOnce(existing);

    const result = await authRoutes.__authTestUtils.findOrCreateSocialUser(
      "google",
      { providerId: "g-1", email: "social@example.com", phoneNumber: PROVIDER_PHONE, emailVerified: true },
      ENV,
      { createIfMissing: true },
    );

    expect(result.user).toBe(existing);
    expect(existing.phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${PROVIDER_PHONE})`);
    expect(mockUserSave).toHaveBeenCalled();
  });

  test("공급자가 번호를 안 주면 사용자 입력값으로 백필한다", async () => {
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
      birthYear: "1990",
      termsAccepted: true,
      privacyAccepted: true,
      ...overrides,
    }),
  });
}

/**
 * 2026-08-19 정책: 휴대폰 번호는 회원가입 필수 항목이다(카카오 개인정보 동의항목 심사 대응 —
 * "자체 회원가입에서도 전화번호를 수집한다"를 코드로 만족시키기 위해서다).
 * 직전 정책(2026-08-15)은 "가입 화면이 번호를 묻지 않고 첫 결제 때 1회 받는다"였고, 그때는
 * 번호 없는 본문을 거절하면 안 됐다. 이 describe 가 그 뒤집힌 계약을 고정한다.
 */
describe("번호 필수 가입", () => {
  test("이메일 가입 — 번호가 없으면 phone_required 로 거절한다", async () => {
    const request = buildRegisterRequest({ phoneNumber: undefined });
    const response = await authRoutes.__authTestUtils.handleRegister(request, ENV);

    expect(response.status).toBe(400);
    // 🔴 뭉뚱그린 invalid_request_body 로 내보내면 클라이언트가 "이름·비밀번호 확인"으로 접는다.
    expect((await response.json()).code).toBe("phone_required");
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  // 🔴 앱은 dist/ 를 통째로 번들하므로 스토어에 남은 구버전 앱에는 번호 입력칸이 아예 없다.
  // "정확히 입력해 주세요"만 보내면 입력할 곳이 없어 영영 막힌다.
  test("구버전 앱에는 업데이트 안내를 준다", async () => {
    const request = new Request("https://example.com/api/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.78",
        // 앱 판정은 런타임 헤더 + 허용 Origin 조합이다(isMobileAppAuthRequest).
        "x-code-destiny-runtime": "mobile-app",
        origin: "https://localhost",
      },
      body: JSON.stringify({
        name: "Tester",
        email: "app@example.com",
        password: "Quiet!Harbor42",
        birthYear: "1990",
        termsAccepted: true,
        privacyAccepted: true,
      }),
    });
    const response = await authRoutes.__authTestUtils.handleRegister(request, ENV);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("phone_required");
    expect(payload.message).toContain("업데이트");
  });

  test("이메일 가입 — 형식이 어긋난 번호도 거절한다", async () => {
    for (const phoneNumber of ["02-123-4567", "0101234", "번호없음"]) {
      jest.clearAllMocks();
      const response = await authRoutes.__authTestUtils.handleRegister(buildRegisterRequest({ phoneNumber }), ENV);
      expect(response.status).toBe(400);
      expect(mockUserCreate).not.toHaveBeenCalled();
    }
  });

  test("이메일 가입 — 번호는 암호화 봉투와 해시를 함께 저장한다", async () => {
    const response = await authRoutes.__authTestUtils.handleRegister(buildRegisterRequest(), ENV);

    expect(response.status).toBe(201);
    const created = mockUserCreate.mock.calls[0][0];
    expect(created.phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${TYPED_PHONE})`);
    expect(created.phoneSource).toBe("signup");
    // 번호 수집 동의는 계정 생성과 같은 쓰기에 담긴다(개인정보 보호법 제22조 입증책임).
    expect(created.legalConsents.phoneAcceptedAt).toBeInstanceOf(Date);
  });

  // 🔴 2026-08-19 결정: 번호 중복은 허용한다. 가족이 한 번호를 나눠 쓰는 경우를 막지 않는다.
  test("이메일 가입 — 다른 계정이 쓰는 번호여도 그대로 가입된다", async () => {
    const response = await authRoutes.__authTestUtils.handleRegister(buildRegisterRequest(), ENV);

    expect(response.status).toBe(201);
    expect(mockUserCreate).toHaveBeenCalled();
    expect(mockUserCreate.mock.calls[0][0].phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${TYPED_PHONE})`);
  });

  test("소셜 가입 — 공급자도 사용자도 번호를 안 주면 번호 없이 생성된다", async () => {
    // 🔴 이 갈래는 계정 생성 함수의 계약이고, "둘 다 없으면 거절"은 그 앞단
    // (handleOAuthCompleteSignup)이 판정한다 — 소셜 로그인 백필 경로가 같은 함수를 쓰기 때문에
    // 여기서 던지면 번호 없는 기존 회원의 로그인까지 막힌다.
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

  test("소셜 가입 — 공급자가 번호를 주면 암호화·해시해 저장한다", async () => {
    await authRoutes.__authTestUtils.findOrCreateSocialUser(
      "kakao",
      { providerId: "k-2", email: "withphone@example.com", phoneNumber: PROVIDER_PHONE, emailVerified: true },
      ENV,
      { createIfMissing: true, signupProfile: { name: "With Phone", phoneNumber: "" } },
    );

    expect(mockEncryptPhoneNumber).toHaveBeenCalledWith(PROVIDER_PHONE, ENV);
    const created = mockUserCreate.mock.calls[0][0];
    expect(created.phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${PROVIDER_PHONE})`);
    // 공급자가 준 값과 사용자가 적어 넣은 값을 구분해 둔다(카카오 심사 보고용).
    expect(created.phoneSource).toBe("social");
  });

  test("소셜 가입 — 사용자가 입력한 번호로 만들어지면 출처는 signup 이다", async () => {
    await authRoutes.__authTestUtils.findOrCreateSocialUser(
      "google",
      { providerId: "g-3", email: "typed@example.com", phoneNumber: "", emailVerified: true },
      ENV,
      { createIfMissing: true, signupProfile: { name: "Typed", phoneNumber: TYPED_PHONE } },
    );

    expect(mockUserCreate.mock.calls[0][0].phoneSource).toBe("signup");
  });

  test("소셜 가입 — 다른 계정이 쓰는 번호여도 계정을 만든다", async () => {
    await authRoutes.__authTestUtils.findOrCreateSocialUser(
      "kakao",
      { providerId: "k-3", email: "dup@example.com", phoneNumber: PROVIDER_PHONE, emailVerified: true },
      ENV,
      { createIfMissing: true, signupProfile: { name: "Dup", phoneNumber: "" } },
    );

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
