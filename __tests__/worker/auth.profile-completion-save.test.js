/**
 * @jest-environment node
 *
 * 프로필 보완(/onboarding) 저장이 지켜야 할 계약을 고정한다.
 *
 * 이 엔드포인트는 이름과 휴대폰 번호를 함께 받는 유일한 자리라, 다음이 무너지면 조용히 아프다:
 *   - 번호가 **평문으로** 저장되면(암호화 누락) 개인정보처리방침 문구가 곧바로 거짓이 된다.
 *   - 이미 있는 번호를 덮으면 PG 에 넘긴 구매자 정보와 어긋난다(write-once).
 *   - 키가 없을 때 평문 폴백으로 새면 fail-closed 계약이 깨진다.
 *   - 표식(phonePromptedAt)을 안 남기면 건너뛴 사람이 로그인마다 다시 붙잡힌다.
 */

const ENCRYPTED_PREFIX = "v1:";

const mockEncryptPhoneNumber = jest.fn(async (value) => {
  if (!value) return "";
  return `${ENCRYPTED_PREFIX}enc(${value})`;
});
const mockDecryptPhoneNumber = jest.fn(async (value) => {
  const stored = String(value || "");
  if (!stored) return "";
  const match = stored.match(/^v1:enc\((\d+)\)$/);
  if (match) return match[1];
  return /^01\d{8,9}$/.test(stored) ? stored : "";
});

const mockCollectionFindOne = jest.fn(async () => null);
const mockCollectionFindOneAndUpdate = jest.fn(async () => null);

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
    findOne: jest.fn(async () => null),
    create: jest.fn(async (doc) => ({ ...doc, _id: "64f0a1b2c3d4e5f678901234" })),
    collection: {
      findOne: mockCollectionFindOne,
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
      findOneAndUpdate: mockCollectionFindOneAndUpdate,
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
const TYPED_PHONE = "01071807398";
const EXISTING_PHONE = "01000000000";

let handleProfileCompletion;
let accessToken;

beforeAll(async () => {
  const authLib = await import("../../worker/lib/auth.js");
  ({ handleProfileCompletion } = (await import("../../worker/routes/auth.js")).__authTestUtils);
  // 진짜 액세스 토큰을 발급해 requireAuth 를 정상 경로로 통과시킨다(인증 자체를 대역하지 않는다).
  accessToken = await authLib.signAuthToken(
    { _id: USER_ID, email: "a@b.com", role: "user", name: "Kakao user", points: 0 },
    ENV,
  );
});

beforeEach(() => {
  jest.clearAllMocks();
  // 🔴 clearAllMocks 는 호출 기록만 지우고 mockRejectedValue 로 심은 구현은 남긴다 —
  // fail-closed 테스트의 거부가 다음 테스트로 새므로 매번 정상 구현을 다시 세운다.
  mockEncryptPhoneNumber.mockImplementation(async (value) => (value ? `${ENCRYPTED_PREFIX}enc(${value})` : ""));
  mockCollectionFindOne.mockResolvedValue({ _id: USER_ID, name: "Kakao user", phoneNumber: "" });
  mockCollectionFindOneAndUpdate.mockImplementation(async (filter, update) => ({
    _id: USER_ID,
    name: update?.$set?.name || "Kakao user",
    phoneNumber: update?.$set?.phoneNumber || "",
  }));
});

function makeRequest(body) {
  return new Request("https://code-destiny.com/api/me/profile-completion", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
      origin: "https://code-destiny.com",
    },
    body: JSON.stringify(body),
  });
}

const lastUpdate = () => mockCollectionFindOneAndUpdate.mock.calls[0][1].$set;

test("🔴 번호는 봉투로만 저장된다 — 평문이 DB 로 나가면 실패", async () => {
  const response = await handleProfileCompletion(makeRequest({ name: "홍길동", phoneNumber: TYPED_PHONE, phoneConsent: true }), ENV);
  expect(response.status).toBe(200);

  const update = lastUpdate();
  // 저장값은 반드시 encryptPhoneNumber 의 반환물이어야 한다. 실제 암호문의 성질(봉투 형식·IV
  // 랜덤·평문 미포함)은 여기 대역이 아니라 scripts/verify-phone-encryption.mjs 가 진짜 키로 검증한다.
  expect(mockEncryptPhoneNumber).toHaveBeenCalledWith(TYPED_PHONE, ENV);
  expect(update.phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${TYPED_PHONE})`);
  expect(update.name).toBe("홍길동");
  expect(update.phonePromptedAt).toBeInstanceOf(Date);
  expect(update.phoneUpdatedAt).toBeInstanceOf(Date);
});

test("🔴 이미 번호가 있으면 덮지 않는다(write-once) — 이름만 반영된다", async () => {
  mockCollectionFindOne.mockResolvedValue({
    _id: USER_ID, name: "Kakao user", phoneNumber: `${ENCRYPTED_PREFIX}enc(${EXISTING_PHONE})`,
  });

  const response = await handleProfileCompletion(makeRequest({ name: "홍길동", phoneNumber: TYPED_PHONE, phoneConsent: true }), ENV);
  expect(response.status).toBe(200);

  const update = lastUpdate();
  expect(update.phoneNumber).toBeUndefined();
  expect(update.phoneUpdatedAt).toBeUndefined();
  expect(update.name).toBe("홍길동");
});

test("🔴 암호화 키가 없으면 503 이고 아무것도 쓰지 않는다(fail-closed)", async () => {
  mockEncryptPhoneNumber.mockRejectedValue(new Error("pii_encryption_key_missing"));

  const response = await handleProfileCompletion(makeRequest({ phoneNumber: TYPED_PHONE, phoneConsent: true }), ENV);
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ ok: false, code: "phone_encryption_unavailable" });
  expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
});

test("건너뛰기(빈 본문)도 정상이며 표식만 남는다", async () => {
  const response = await handleProfileCompletion(makeRequest({}), ENV);
  expect(response.status).toBe(200);

  const update = lastUpdate();
  expect(update.phonePromptedAt).toBeInstanceOf(Date);
  expect(update.name).toBeUndefined();
  expect(update.phoneNumber).toBeUndefined();
  expect(mockEncryptPhoneNumber).not.toHaveBeenCalled();
});

test("이름만 저장할 수도 있다", async () => {
  const response = await handleProfileCompletion(makeRequest({ name: "홍길동" }), ENV);
  expect(response.status).toBe(200);
  expect(lastUpdate()).toMatchObject({ name: "홍길동" });
  expect(lastUpdate().phoneNumber).toBeUndefined();
});

test("형식이 틀린 번호는 400 이고 저장이 일어나지 않는다", async () => {
  const response = await handleProfileCompletion(makeRequest({ phoneNumber: "010-1234" }), ENV);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "invalid_phone_number" });
  expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
});

test("1자 이름은 400 이다(스키마 minlength 2 와 같은 기준)", async () => {
  const response = await handleProfileCompletion(makeRequest({ name: "홍" }), ENV);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "invalid_name" });
  expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
});

test("🔴 동의 없이 온 번호는 400 이고 아무것도 저장하지 않는다 (제15조·제22조)", async () => {
  const response = await handleProfileCompletion(makeRequest({ name: "홍길동", phoneNumber: TYPED_PHONE }), ENV);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ ok: false, code: "phone_consent_required" });
  expect(mockEncryptPhoneNumber).not.toHaveBeenCalled();
  expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
});

test("🔴 phoneConsent 가 truthy 문자열이어도 통과시키지 않는다 (=== true 만 인정)", async () => {
  const response = await handleProfileCompletion(makeRequest({ phoneNumber: TYPED_PHONE, phoneConsent: "true" }), ENV);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "phone_consent_required" });
});

test("🔴 동의를 받으면 그 사실이 legalConsents 에 남는다 (제22조 입증책임)", async () => {
  const response = await handleProfileCompletion(makeRequest({ phoneNumber: TYPED_PHONE, phoneConsent: true }), ENV);
  expect(response.status).toBe(200);

  const update = lastUpdate();
  expect(update["legalConsents.phoneAcceptedAt"]).toBeInstanceOf(Date);
  // 버전은 사용자가 그때 본 방침을 가리켜야 한다 — 값 자체보다 "비어 있지 않다"가 계약이다.
  expect(String(update["legalConsents.phoneVersion"] || "")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("🔴 번호 없는 요청은 동의 없이도 통과한다 — 건너뛰기가 막히면 안 된다", async () => {
  const response = await handleProfileCompletion(makeRequest({ name: "홍길동" }), ENV);
  expect(response.status).toBe(200);

  const update = lastUpdate();
  expect(update["legalConsents.phoneAcceptedAt"]).toBeUndefined();
  expect(update["legalConsents.phoneVersion"]).toBeUndefined();
});

test("이미 번호가 있어 저장을 건너뛰면 동의 기록도 남기지 않는다", async () => {
  mockCollectionFindOne.mockResolvedValue({
    _id: USER_ID, name: "Kakao user", phoneNumber: `${ENCRYPTED_PREFIX}enc(${EXISTING_PHONE})`,
  });

  const response = await handleProfileCompletion(makeRequest({ phoneNumber: TYPED_PHONE, phoneConsent: true }), ENV);
  expect(response.status).toBe(200);
  expect(lastUpdate()["legalConsents.phoneAcceptedAt"]).toBeUndefined();
});

test("하이픈이 섞여 들어와도 정규화해 저장한다", async () => {
  const response = await handleProfileCompletion(makeRequest({ phoneNumber: "010-7180-7398", phoneConsent: true }), ENV);
  expect(response.status).toBe(200);
  expect(mockEncryptPhoneNumber).toHaveBeenCalledWith(TYPED_PHONE, ENV);
});
