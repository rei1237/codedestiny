/**
 * @jest-environment node
 *
 * POST /api/fortune/pig-coin/refund 권한 상승 회귀 가드.
 *
 * 사고: 폴백 조회가 _id 만 보고 delta·featureKey·기간 필터를 전부 빠뜨려서,
 * 인증된 사용자가 delta:0 감사행(프로필 카드 조작마다 상시 생성)의 _id 만 알면
 * 임의 금액의 레거시 코인을 발행할 수 있었다. 그 잔액은 월정석으로 1:10 전환된다.
 */

const mongoose = require("mongoose");

const TEST_USER_ID = "64f0a1b2c3d4e5f678901234";
const AUDIT_ROW_ID = "64f0a1b2c3d4e5f678900001";       // delta:0 감사행 (공격 재료)
const REAL_SPEND_ID = "64f0a1b2c3d4e5f678900002";      // 정상 차감행 delta:-30
const OTHER_FEATURE_ID = "64f0a1b2c3d4e5f678900003";   // 다른 기능의 차감행
const STALE_SPEND_ID = "64f0a1b2c3d4e5f678900004";     // 48시간 창 밖 차감행

const FEATURE_KEY = "tarot-year-fortune";

let pointHistoryStore;
let userPoints;
let autoId;

function nextId() {
  autoId += 1;
  return `64f0a1b2c3d4e5f6789ff${String(autoId).padStart(3, "0")}`;
}

function readPath(row, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), row);
}

function matchesCondition(value, condition) {
  if (condition && typeof condition === "object" && !(condition instanceof Date)) {
    if ("$lt" in condition && !(Number(value) < Number(condition.$lt))) return false;
    if ("$gte" in condition && !(new Date(value).getTime() >= new Date(condition.$gte).getTime())) return false;
    if ("$ne" in condition && String(value) === String(condition.$ne)) return false;
    return true;
  }
  if (value instanceof Date || condition instanceof Date) {
    return new Date(value).getTime() === new Date(condition).getTime();
  }
  return String(value) === String(condition);
}

function matchOne(query) {
  return pointHistoryStore.find((row) => Object.entries(query).every(([path, condition]) => (
    matchesCondition(readPath(row, path), condition)
  ))) || null;
}

const PointHistoryMock = {
  findOne: jest.fn((query) => {
    const resolve = async () => matchOne(query);
    return { sort: () => ({ lean: resolve }), lean: resolve };
  }),
  create: jest.fn(async (doc) => {
    const row = { _id: nextId(), createdAt: new Date(), ...doc };
    pointHistoryStore.push(row);
    return row;
  }),
};

const UserMock = {
  findById: jest.fn(() => ({ select: () => ({ lean: async () => ({ points: userPoints }) }) })),
  findByIdAndUpdate: jest.fn((_id, update) => ({
    lean: async () => {
      userPoints += Number(update?.$inc?.points || 0);
      return { points: userPoints };
    },
  })),
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
  // fortune.js 의 import 그래프가 models.js 에서 끌어가는 것들 — User/PointHistory 만
  // 실동작이 필요하고 나머지는 존재하기만 하면 된다.
  SAJU_LOCKED_CONTENT_KEYS: {},
  CONTENT_ENTITLEMENT_SERVICE_KEYS: {},
  CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "profile" },
  CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "active" },
  CONTENT_ENTITLEMENT_SOURCES: { PURCHASE: "purchase" },
  User: UserMock,
  PointHistory: PointHistoryMock,
  CmsEntry: {},
  CmsRevision: {},
  ProfileCard: {},
  Payment: {},
  MonthlyCreditLedger: {},
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
  GuardianFortuneChatCreditBalance: {},
  GuardianFortuneChatCreditTransaction: {},
  GuardianFortuneGenerationAttempt: {},
  GuardianFortuneSharedSnapshot: {},
  Insight: {},
  DestinyBiasCard: {},
  ContentOverride: {},
  RECENT_CONSUME_REQUEST_ID_CAP: 200,
}));

const promptStub = { prompt: "", generatedPrompt: "", title: "", digestSource: "refund-escalation-test" };

let handlePigCoinRefund;

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
  handlePigCoinRefund = fortuneMod.__fortuneAccessTestUtils.handlePigCoinRefund;
});

beforeEach(() => {
  jest.clearAllMocks();
  autoId = 0;
  userPoints = 0;
  const now = Date.now();
  pointHistoryStore = [
    {
      // profile.js 가 프로필 카드 조작마다 남기는 이용권 감사행 — 금전 이동이 없다.
      _id: AUDIT_ROW_ID,
      userId: TEST_USER_ID,
      kind: "deduct",
      delta: 0,
      featureKey: "profile-card-manage",
      createdAt: new Date(now - 60 * 1000),
    },
    {
      _id: REAL_SPEND_ID,
      userId: TEST_USER_ID,
      kind: "deduct",
      delta: -30,
      featureKey: FEATURE_KEY,
      createdAt: new Date(now - 60 * 1000),
    },
    {
      _id: OTHER_FEATURE_ID,
      userId: TEST_USER_ID,
      kind: "deduct",
      delta: -50,
      featureKey: "tarot-mindscan",
      createdAt: new Date(now - 60 * 1000),
    },
    {
      _id: STALE_SPEND_ID,
      userId: TEST_USER_ID,
      kind: "deduct",
      delta: -30,
      featureKey: FEATURE_KEY,
      createdAt: new Date(now - 72 * 60 * 60 * 1000),
    },
  ];
});

function refundRequest(body) {
  return new Request("https://example.com/api/fortune/pig-coin/refund", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const auth = { userId: TEST_USER_ID, email: "refund-user@example.com", role: "user" };

describe("pig-coin refund 권한 상승 차단", () => {
  test("delta:0 감사행의 _id 로는 환불되지 않는다 (권한 상승 차단)", async () => {
    const response = await handlePigCoinRefund(
      refundRequest({
        cost: 100000,
        featureKey: "profile-card-manage",
        sourceTransactionId: AUDIT_ROW_ID,
      }),
      auth,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "NO_REFUNDABLE_DEDUCTION" });
    expect(userPoints).toBe(0);
    expect(UserMock.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("실제 차감행이라도 요청 금액을 부풀리면 차감액만큼만 환불된다 (금액 위조 차단)", async () => {
    const response = await handlePigCoinRefund(
      refundRequest({
        cost: 100000,             // 1차 조회(delta:-100000)는 빗나가고 폴백으로 넘어간다
        featureKey: FEATURE_KEY,
        sourceTransactionId: REAL_SPEND_ID,
      }),
      auth,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ refundedCoins: 30 });
    expect(userPoints).toBe(30);
  });

  test("다른 기능의 차감행 _id 로는 환불되지 않는다", async () => {
    const response = await handlePigCoinRefund(
      refundRequest({
        cost: 50,
        featureKey: FEATURE_KEY,   // 요청 featureKey 와 행의 featureKey 불일치
        sourceTransactionId: OTHER_FEATURE_ID,
      }),
      auth,
    );

    expect(response.status).toBe(409);
    expect(userPoints).toBe(0);
  });

  test("48시간 창을 벗어난 차감행은 폴백으로도 환불되지 않는다", async () => {
    const response = await handlePigCoinRefund(
      refundRequest({
        cost: 999,                 // 폴백 유도
        featureKey: FEATURE_KEY,
        sourceTransactionId: STALE_SPEND_ID,
      }),
      auth,
    );

    expect(response.status).toBe(409);
    expect(userPoints).toBe(0);
  });

  test("정상 자동환불(금액 일치)은 그대로 동작한다 (회귀 없음)", async () => {
    const response = await handlePigCoinRefund(
      refundRequest({
        cost: 30,
        featureKey: FEATURE_KEY,
        sourceTransactionId: REAL_SPEND_ID,
        requestId: "refund:regression-1",
      }),
      auth,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      refundedCoins: 30,
      sourceTransactionId: REAL_SPEND_ID,
    });
    expect(userPoints).toBe(30);
    expect(PointHistoryMock.create).toHaveBeenCalledTimes(1);
  });

  test("같은 차감행을 두 번 환불하지 않는다", async () => {
    const first = await handlePigCoinRefund(
      refundRequest({ cost: 30, featureKey: FEATURE_KEY, sourceTransactionId: REAL_SPEND_ID }),
      auth,
    );
    expect(first.status).toBe(200);
    expect(userPoints).toBe(30);

    const second = await handlePigCoinRefund(
      refundRequest({ cost: 30, featureKey: FEATURE_KEY, sourceTransactionId: REAL_SPEND_ID }),
      auth,
    );

    await expect(second.json()).resolves.toMatchObject({ code: "REFUND_ALREADY_PROCESSED" });
    expect(userPoints).toBe(30);
  });
});
