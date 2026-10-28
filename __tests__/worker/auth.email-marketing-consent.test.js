/**
 * @jest-environment node
 *
 * 가입 화면의 이메일 광고 수신(선택) 체크박스가 서버에 어떻게 남는지 고정한다.
 *   - 체크하고 현재 문구 버전으로 제출했을 때만 기록한다(기본 미동의, 정보통신망법 §50).
 *   - 기록이 실패해도 가입은 끝난다.
 *   - 소셜 가입 마무리는 이번 요청이 계정을 새로 만들었을 때만 기록한다 — 티켓 재제출로 받은 기존 계정의 동의를 덮지 않는다.
 * 모듈 목은 auth.signup-phone-backfill.test.js 와 같은 형태다.
 */
const USER_ID = "64f0a1b2c3d4e5f678901234";
const mockRecordConsent = jest.fn(async () => ({ changed: true, granted: true }));
const mockUserCreate = jest.fn(async (doc) => ({ ...doc, _id: USER_ID }));
const mockUserFindOne = jest.fn(async () => null);

jest.unstable_mockModule("../../worker/lib/email-marketing-consent.js", () => ({ recordEmailMarketingConsent: mockRecordConsent }));
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose: {
    connection: { name: "test" },
    Types: {
      ObjectId: class {
        constructor(value) { this.value = String(value || USER_ID); }
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
  encryptPhoneNumber: jest.fn(async (value) => (value ? `v1:enc(${value})` : "")),
  decryptPhoneNumber: jest.fn(async () => ""),
  normalizeKoreanPhoneNumber: jest.fn((value) => {
    const digits = String(value || "").replace(/\D/g, "");
    return /^01\d{8,9}$/.test(digits) ? digits : "";
  }),
  maskKoreanPhoneNumber: jest.fn(() => ""),
  isEncryptedPiiValue: jest.fn((value) => String(value || "").startsWith("v1:")),
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
  IdempotencyKey: {},
  RESTORE_CREDENTIAL_CAP: 10,
  AbuseScore: { findOne: jest.fn(async () => null), findOneAndUpdate: jest.fn(async () => null), updateOne: jest.fn(async () => ({})) },
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
    collection: { findOne: jest.fn(async () => null), updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })) },
  },
  PointHistory: { create: jest.fn(async () => ({})) },
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

let authRoutes;
let VERSION;
beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
  ({ EMAIL_MARKETING_CONSENT_VERSION: VERSION } = await import("../../lib/marketing/email-marketing.mjs"));
});
beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindOne.mockResolvedValue(null);
  mockRecordConsent.mockResolvedValue({ changed: true, granted: true });
  authRoutes.__authTestUtils.clearLoginRateLimitState();
});

function register(extra = {}) {
  return authRoutes.__authTestUtils.handleRegister(new Request("https://example.com/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.90" },
    body: JSON.stringify({
      name: "Tester", email: "tester@example.com", password: "Quiet!Harbor42", phoneNumber: "01071807398",
      birthYear: "1990", termsAccepted: true, privacyAccepted: true, ...extra,
    }),
  }), ENV);
}

async function completeSocialSignup(extra = {}) {
  const { signSocialSignupTicket } = await import("../../worker/lib/social-signup-ticket.js");
  const ticket = await signSocialSignupTicket({
    provider: "google", providerId: "g-marketing-1", email: "social@example.com", name: "소셜 사용자", image: "",
    phoneNumber: "", emailVerified: true, nextPath: "/", flow: "signup",
  }, ENV.JWT_ACCESS_SECRET, "code-destiny-api");
  return authRoutes.__authTestUtils.handleOAuthCompleteSignup(new Request("https://code-destiny.com/api/auth/oauth/complete-signup", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://code-destiny.com" },
    body: JSON.stringify({ socialSignupTicket: ticket, termsAccepted: true, privacyAccepted: true, birthYear: "1990", ...extra }),
  }), ENV);
}

test("email signup records consent only when checked with the current wording", async () => {
  expect((await register({ marketingEmailConsent: { granted: true, version: VERSION } })).status).toBe(201);
  expect(mockRecordConsent).toHaveBeenCalledWith(ENV, USER_ID, { granted: true, source: "signup_email" });

  for (const marketingEmailConsent of [undefined, { granted: false, version: VERSION }, { granted: true, version: "old" }, { granted: "true", version: VERSION }]) {
    mockRecordConsent.mockClear();
    expect((await register({ marketingEmailConsent })).status).toBe(201);
    expect(mockRecordConsent).not.toHaveBeenCalled();
  }
});

test("a failing consent write never blocks signup", async () => {
  mockRecordConsent.mockRejectedValueOnce(new Error("mongo down"));
  expect((await register({ marketingEmailConsent: { granted: true, version: VERSION } })).status).toBe(201);
});

test("social complete-signup records consent for a newly created account", async () => {
  const response = await completeSocialSignup({ marketingEmailConsent: { granted: true, version: VERSION } });
  expect(response.status).toBe(201);
  expect(mockRecordConsent).toHaveBeenCalledWith(ENV, USER_ID, { granted: true, source: "signup_social" });
});

test("social complete-signup leaves an existing account's consent alone", async () => {
  mockUserFindOne.mockResolvedValue({ _id: USER_ID, email: "social@example.com", name: "기존", phoneNumber: "", status: "active", set() {}, save: jest.fn(async () => undefined) });
  await completeSocialSignup({ marketingEmailConsent: { granted: true, version: VERSION } });
  expect(mockUserCreate).not.toHaveBeenCalled();
  expect(mockRecordConsent).not.toHaveBeenCalled();
});
