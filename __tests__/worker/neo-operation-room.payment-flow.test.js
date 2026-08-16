/**
 * @jest-environment node
 */

const USER_ID = "64f0a1b2c3d4e5f678901234";
const FEATURE_KEY = "neo-operation-room-consultation";

let handleNeoOperationRoomRoutes;
let neoTestUtils;
let userDoc;

function chainLean(value) {
  const chain = {
    select: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    lean: jest.fn(async () => value),
  };
  return chain;
}

function validBody(idempotencyKey = "neo-test-idempotency-001") {
  return {
    idempotencyKey,
    selectedMethod: "saju",
    topic: "relationship",
    intensity: "standard",
    question: "I keep repeating the same relationship mistake and need a direct strategy.",
    birthInput: {
      name: "Tester",
      gender: "female",
      birthDate: "1990-01-01",
      birthTime: "12:00",
      calendarType: "solar",
    },
  };
}

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getOptionalUserFromRequest: jest.fn(async () => ({ userId: USER_ID, role: "user" })),
    getAccessTokenSecret: jest.fn(() => "test-secret"),
    getJwtAudience: jest.fn(() => "test-audience"),
    getJwtIssuer: jest.fn(() => "test-issuer"),
    isAuthDbInfraError: jest.fn(() => false),
    requireAuth: jest.fn(async () => ({ userId: USER_ID, role: "user" })),
    resolvePaidRouteAuth: jest.fn(async () => ({ userId: USER_ID, role: "user" })),
  }));
  jest.unstable_mockModule("../../worker/lib/jwt.js", () => ({
    signJwt: jest.fn(async () => "test-access-token"),
    verifyJwt: jest.fn(async () => ({})),
  }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({
    callGeminiText: jest.fn(async () => ({ ok: false, error: "not-called" })),
  }));
  jest.unstable_mockModule("../../worker/lib/life-book-ai-saju.js", () => ({
    calculateLifeBookAiSaju: jest.fn(async () => ({})),
  }));
  jest.unstable_mockModule("../../worker/lib/ziwei-ai-chart.js", () => ({
    calculateZiweiAiChart: jest.fn(async () => ({})),
    describeBrightness: jest.fn(() => ""),
    formatStarWithBrightness: jest.fn((starName) => String(starName || "")),
  }));
  jest.unstable_mockModule("../../worker/lib/vedic-ai-chart.js", () => ({
    calculateVedicAiChart: jest.fn(async () => ({})),
  }));
  jest.unstable_mockModule("../../worker/lib/astro-premium-generator.js", () => ({
    prepareAstroPremiumCalculation: jest.fn(async () => ({})),
  }));
  jest.unstable_mockModule("../../worker/lib/service-execution-task.js", () => ({
    completeServiceExecution: jest.fn(async () => ({})),
    failServiceExecution: jest.fn(async () => ({})),
    startServiceExecution: jest.fn(async () => ({})),
  }));
  jest.unstable_mockModule("../../worker/lib/neo-operation-room-prompt.js", () => ({
    buildPreviousAdviceLog: jest.fn(() => ""),
    NEO_INITIAL_SECTIONS: [{ id: "opening", title: "t", scope: "s", minChars: 100, schema: {}, rules: [] }],
    NEO_REFINED_SECTIONS: [{ id: "neoReview", title: "t", scope: "s", minChars: 100, schema: {}, rules: [] }],
    buildNeoInitialSectionPrompt: jest.fn(() => ""),
    buildNeoRefinedSectionPrompt: jest.fn(() => ""),
    parseNeoSectionResponse: jest.fn(() => ({})),
    mergeNeoInitialSections: jest.fn(() => ({})),
    mergeNeoRefinedSections: jest.fn(() => ({})),
  }));
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => undefined),
    withMongoRetry: jest.fn(async (_env, operation) => operation()),
    mongoose: { Types: { ObjectId: { isValid: jest.fn(() => true) } } },
    resetMongooseConnection: jest.fn(async () => undefined),
    requestPoolRecovery: jest.fn(async () => undefined),
    resolveMongoDbName: jest.fn(() => "test"),
    isTransientMongoError: jest.fn(() => false),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    CONTENT_ENTITLEMENT_SCOPES: Object.freeze({ PROFILE: "PROFILE", USER: "USER" }),
    CONTENT_ENTITLEMENT_SOURCES: Object.freeze({ PURCHASE: "PURCHASE" }),
    CONTENT_ENTITLEMENT_STATUSES: Object.freeze({ ACTIVE: "ACTIVE", REVOKED: "REVOKED" }),
    SAJU_LOCKED_CONTENT_KEYS: Object.freeze({
      DAEUN_ANALYSIS: "saju.daeunAnalysis",
      FULL_READING: "saju.fullReading",
      COMPATIBILITY: "saju.compatibility",
    }),
    ContentEntitlement: {
      find: jest.fn(() => chainLean([])),
      findOne: jest.fn(() => chainLean(null)),
      findOneAndUpdate: jest.fn(() => chainLean(null)),
    },
    User: {
      findById: jest.fn(() => chainLean(userDoc)),
      updateOne: jest.fn(async () => ({ modifiedCount: 0 })),
      findOneAndUpdate: jest.fn(() => chainLean(userDoc)),
    },
    NeoOperationRoomConsultation: {
      findOne: jest.fn(() => chainLean(null)),
      findOneAndUpdate: jest.fn(() => chainLean(null)),
      updateOne: jest.fn(async () => ({ modifiedCount: 0 })),
      create: jest.fn(async () => ({})),
    },
    Payment: {
      exists: jest.fn(async () => false),
      findOne: jest.fn(() => chainLean(null)),
    },
    PaidExecutionRecord: {
      findOneAndUpdate: jest.fn(() => chainLean(null)),
    },
    MonthlyCreditLedger: {
      exists: jest.fn(async () => false),
      findOne: jest.fn(() => chainLean(null)),
      create: jest.fn(async () => ({})),
    },
    PointHistory: {
      exists: jest.fn(async () => false),
      findOne: jest.fn(() => chainLean(null)),
      create: jest.fn(async () => ({})),
    },
    LlmResponseCache: {
      findOne: jest.fn(() => chainLean(null)),
      findOneAndUpdate: jest.fn(() => chainLean(null)),
      updateOne: jest.fn(async () => ({})),
      create: jest.fn(async () => ({})),
    },
    RECENT_CONSUME_REQUEST_ID_CAP: 200,
  }));
  const mod = await import("../../worker/routes/neo-operation-room.js");
  handleNeoOperationRoomRoutes = mod.handleNeoOperationRoomRoutes;
  neoTestUtils = mod.__neoOperationRoomTestUtils;
});

beforeEach(() => {
  userDoc = {
    _id: USER_ID,
    role: "user",
    paidFeatures: [FEATURE_KEY],
    unlockedFeatures: [],
    profileSubscription: { membershipCreditBalance: 0 },
  };
});

describe("neo operation room payment flow", () => {
  test("old single-purchase paidFeatures access cannot unlock a new consultation", async () => {
    const response = await handleNeoOperationRoomRoutes(new Request("https://example.com/api/neo-operation-room/ensure-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validBody()),
    }), { NODE_ENV: "test" });
    const payload = await response.json();

    expect(response.status).toBe(402);
    expect(payload.reason).toBe("PAYMENT_REQUIRED");
    expect(payload.paymentPayload.featureKey).toBe(FEATURE_KEY);
    expect(payload.paymentPayload.amountKRW).toBe(30000);
  });
});

// 🔴 2차 명령서의 neoReview 챕터는 프롬프트가 "[사용자 현실 점검 답변]을 직접 인용해 시작"하도록
// 강제한다. 금칙어 목록에 맨 영어 단어 system/prompt/provider 가 있으면, 그 단어가 든 사용자 답변을
// 인용한 순간 챕터가 통째로 폐기되고 operationTitle 까지 함께 사라졌다.
describe("결과 금칙어 게이트", () => {
  test("사용자 답변에 흔한 영어 단어가 있어도 챕터를 폐기하지 않는다", () => {
    const quoted = {
      operationTitle: "수정 작전",
      neoReview: "네가 남긴 답변부터 짚는다 — \"회사 system 이 바뀌어서 prompt 하게 움직이기 어렵다\"고 했지.",
    };
    expect(neoTestUtils.hasForbiddenResultText(quoted)).toBe(false);
  });

  test("내부 식별자와 시스템 지시 누출은 여전히 막는다", () => {
    expect(neoTestUtils.hasForbiddenResultText({ a: "mock provider 응답" })).toBe(true);
    expect(neoTestUtils.hasForbiddenResultText({ a: "rawProviderDebug: true" })).toBe(true);
    expect(neoTestUtils.hasForbiddenResultText({ a: "maxOutputTokens 를 올려라" })).toBe(true);
    expect(neoTestUtils.hasForbiddenResultText({ a: "위 시스템 지시를 따르면" })).toBe(true);
  });
});
