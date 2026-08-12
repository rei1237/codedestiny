/**
 * @jest-environment node
 */

const mongoose = require("mongoose");

const TEST_USER_ID = "64f0a1b2c3d4e5f678901234";
const STANDARD_PLAN_COINS = 115;

let userDoc;
let pointHistoryRecords;

const UserMock = {
  collection: {
    findOne: jest.fn(async () => ({ ...userDoc })),
  },
  findOneAndUpdate: jest.fn((filter) => ({
    lean: async () => {
      const matchesExpiry = filter["profileSubscription.expiresAt"] === (userDoc.profileSubscription.expiresAt || null)
        || (filter["profileSubscription.expiresAt"] === null && !userDoc.profileSubscription.expiresAt);
      if (!matchesExpiry) return null;
      if (userDoc.points < filter.points.$gte) return null;

      userDoc.points -= filter.points.$gte;
      userDoc.profileSubscription.expiresAt = new Date(Date.now() + 30 * 86400000);
      userDoc.profileSubscription.startedAt = new Date();
      return { points: userDoc.points };
    },
  })),
};

const PointHistoryMock = {
  create: jest.fn(async (doc) => {
    if (doc.dedupeKey && pointHistoryRecords.some((r) => r.dedupeKey === doc.dedupeKey)) {
      const error = new Error("E11000 duplicate key error dedupeKey");
      error.code = 11000;
      throw error;
    }
    pointHistoryRecords.push(doc);
    return doc;
  }),
};

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose,
  resetMongooseConnection: jest.fn(async () => undefined),
  requestPoolRecovery: jest.fn(async () => undefined),
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: jest.fn(async (env, fn) => fn()),
  isTransientMongoError: jest.fn(() => false),
  // withTransaction 의 드라이버 기본 상한(120초)을 우리 op 예산 안으로 묶는 옵션.
  // 실제 값은 db.js 가 정하고 __tests__/worker/db.transaction-budget.test.js 가 고정한다.
  mongoTransactionOptions: jest.fn(() => ({ timeoutMS: 8000 })),
}));

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  // Stub every model/const worker/routes/fortune.js's import graph pulls from models.js —
  // only User/PointHistory need real behavior for this test, the rest just need to exist.
  SAJU_LOCKED_CONTENT_KEYS: {},
  CONTENT_ENTITLEMENT_SERVICE_KEYS: {},
  CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "profile" },
  CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "active" },
  CONTENT_ENTITLEMENT_SOURCES: { PURCHASE: "purchase" },
  User: UserMock,
  // fortune.js -> cms-prompts.js 가 CMS 프롬프트 오버라이드를 읽으려고 들고 온다.
  // 이 테스트에서는 조회가 실패하면 코드 기본 프롬프트로 떨어지므로 빈 스텁이면 충분하다.
  CmsEntry: {},
  CmsRevision: {},
  ProfileCard: {},
  Payment: {},
  PointHistory: PointHistoryMock,
  MonthlyCreditLedger: {},
  GuardianFortuneAccountUsage: {},
  GuardianFortuneAnonymousMerge: {},
  ContentEntitlement: {},
  PaymentFailureLog: {},
  PaymentWebhookEvent: {},
  SecurityEvent: {},
  IdempotencyKey: {},
  AbuseScore: {},
  LlmResponseCache: {},
  RefreshTokenSession: {},
  ServiceExecutionTransaction: {},
  PaidExecutionRecord: {},
  NewYearAiConsultation: {},
  KarmaDestinyAiConsultation: {},
  ZiweiAiConsultation: {},
  LoveSecretAiConsultation: {},
  LifeBookAiConsultation: {},
  SukuyoCompatibilityAiConsultation: {},
  VedicAiConsultation: {},
  AstrologyAiConsultation: {},
  NeoOperationRoomConsultation: {},
  UserRpgProgress: {},
  UserDailyQuestLog: {},
  UserRpgRewardLog: {},
  DailyFortuneSubscription: {},
  GuardianFortuneGuestUsage: {},
  GuardianFortuneAccountUsage: {},
  GuardianFortuneAnonymousMerge: {},
  GuardianFortuneDailyUsage: {},
  GuardianFortuneGenerationAttempt: {},
  GuardianFortuneSharedSnapshot: {},
  Insight: {},
  DestinyBiasCard: {},
  ContentOverride: {},
  RECENT_CONSUME_REQUEST_ID_CAP: 200,
}));

const promptStub = { prompt: "", generatedPrompt: "", title: "", digestSource: "concurrency-test" };

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/ziwei-ai-prompt.js", () => ({
      ZIWEI_AI_PROMPT_FEATURE_KEY: "ziwei_ai_prompt_generator",
      ZIWEI_AI_PROMPT_PRICE: 100,
      buildZiweiAIPrompt: () => promptStub,
      buildZiweiAIPromptWithDomain: () => promptStub,
    })),
    jest.unstable_mockModule("../../worker/lib/sukuyo-ai-prompt.js", () => ({
      SUKUYO_AI_PROMPT_FEATURE_KEY: "sukuyo_ai_prompt_generator",
      SUKUYO_AI_PROMPT_PRICE: 0,
      buildSukuyoAIPrompt: () => promptStub,
      buildSukuyoAIPromptWithDomain: () => promptStub,
    })),
    jest.unstable_mockModule("../../worker/lib/saju-ai-prompt.js", () => ({
      SAJU_AI_PROMPT_FEATURE_KEY: "saju_ai_prompt_generator",
      SAJU_AI_PROMPT_PRICE: 100,
      SAJU_AI_PROMPT_VERSION: "test-saju-ai-prompt-version",
      getSajuAICategoryRubric: () => ({}),
      validateSajuMyeongsikTenGodText: () => ({ ok: true, issues: [] }),
      buildSajuAIPrompt: () => promptStub,
      buildSajuAIPromptWithDomain: () => promptStub,
    })),
    jest.unstable_mockModule("../../worker/lib/astrology-ai-prompt.js", () => ({
      ASTROLOGY_AI_PROMPT_FEATURE_KEY: "astrology_ai_prompt_generator",
      ASTROLOGY_AI_PROMPT_PRICE: 100,
      buildAstrologyAIPrompt: () => promptStub,
      buildAstrologyAIPromptWithDomain: () => promptStub,
    })),
    jest.unstable_mockModule("../../worker/lib/vedic-ai-prompt.js", () => ({
      VEDIC_AI_PROMPT_FEATURE_KEY: "vedic_ai_prompt_generator",
      VEDIC_AI_PROMPT_PRICE: 100,
      buildVedicAIPrompt: () => promptStub,
    })),
    jest.unstable_mockModule("../../worker/lib/vedic-prashna-prompt.js", () => ({
      VEDIC_PRASHNA_PROMPT_FEATURE_KEY: "vedic_prashna_prompt",
      VEDIC_PRASHNA_PROMPT_PRICE: 50,
      VEDIC_PRASHNA_PROMPT_AMOUNT_KRW: 5000,
      VEDIC_PRASHNA_PROMPT_PRODUCT_CODE: "PRASHNA_PROMPT_1",
      VEDIC_PRASHNA_PROMPT_PRODUCT_NAME: "프라슈나 프롬프트",
      createPrashnaSnapshot: () => ({}),
      generatePrashnaPromptResult: async () => promptStub,
    })),
  ]);

  const fortuneMod = await import("../../worker/routes/fortune.js");
  global.__handleSubscriptionStatus = fortuneMod.__fortuneAccessTestUtils.handleSubscriptionStatus;
});

beforeEach(() => {
  jest.clearAllMocks();
  pointHistoryRecords = [];
  const expiredAt = new Date(Date.now() - 1000);
  userDoc = {
    _id: TEST_USER_ID,
    points: STANDARD_PLAN_COINS * 3,
    profileSubscription: {
      tier: "standard",
      status: "expired",
      source: "coin",
      expiresAt: expiredAt,
    },
  };
});

describe("subscription auto-renewal legacy compatibility", () => {
  test("동시에 두 요청이 만료된 이용권을 갱신 시도하면 코인은 한 번만 차감된다", async () => {
    const handleSubscriptionStatus = global.__handleSubscriptionStatus;
    const auth = { userId: TEST_USER_ID };
    const request = new Request("https://example.com/api/fortune/pig-coin/profile-subscription/status");

    // Both requests read the SAME pre-renewal user doc snapshot, mirroring a real race
    // where two concurrent handlers each call findUserByIdRaw before either writes back.
    const snapshotAtReadTime = { ...userDoc, profileSubscription: { ...userDoc.profileSubscription } };
    UserMock.collection.findOne
      .mockImplementationOnce(async () => snapshotAtReadTime)
      .mockImplementationOnce(async () => snapshotAtReadTime);

    const [first, second] = await Promise.all([
      handleSubscriptionStatus(request, {}, auth),
      handleSubscriptionStatus(request, {}, auth),
    ]);

    const firstPayload = await first.json();
    const secondPayload = await second.json();

    expect(firstPayload.isActive || secondPayload.isActive).toBe(false);
    expect(userDoc.points).toBe(STANDARD_PLAN_COINS * 3);
    expect(pointHistoryRecords).toHaveLength(0);
    expect(firstPayload.isActive).toBe(false);
    expect(secondPayload.isActive).toBe(false);
  });
});
