/**
 * @jest-environment node
 *
 * 카드 단건 결제로 연 상담이 생성에 실패했을 때 자동 환불이 실제로 불리는지 본다.
 *
 * 🔴 이 두 라우트는 startRefundableExecution 이 billing-gate(월정석·이용권) 전용이라
 *    카드 결제는 ServiceExecutionTransaction 이 아예 없고, 실패해도 정산기가 닿지 않는다.
 *    그래서 라우트가 직접 autoRefundSinglePaymentDeliveryFailure 를 부르는지가 유일한 방어선이다.
 *    이 테스트가 무는 것: ① 카드일 때 정확히 1회 호출 ② 월정석·이용권·토큰에서는 0회
 *    ③ 조회가 {_id, userId, featureKey, status} 로 좁혀져 있는지(조작된 식별자 차단).
 *
 * PortOne·Gemini·DB 는 전부 목이다 — 실호출 0건.
 */

const USER_ID = "64f0a1b2c3d4e5f678901234";
const PAYMENT_DOC_ID = "64f0a1b2c3d4e5f678905555";

let astrologyUtils;
let neoUtils;
let autoRefundSinglePaymentDeliveryFailure;
let paymentFindOne;
let paymentDoc;

function chainLean(value) {
  const chain = {
    select: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    lean: jest.fn(async () => value),
  };
  return chain;
}

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({
    autoRefundSinglePaymentDeliveryFailure: jest.fn(async () => ({ refunded: true, cancelled: true })),
  }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getOptionalUserFromRequest: jest.fn(async () => ({ userId: USER_ID, role: "user" })),
    getAccessTokenSecret: jest.fn(() => "test-secret"),
    getJwtAudience: jest.fn(() => "test-audience"),
    getJwtIssuer: jest.fn(() => "test-issuer"),
    isAuthDbInfraError: jest.fn(() => false),
    peekAccessTokenUserId: jest.fn(() => USER_ID),
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
  // CMS 프롬프트 모듈은 models.js 의 CmsEntry 를 직접 잡는다 — models 목이 그 모델을 갖고 있지 않으므로
  // 여기서 통째로 갈아 끼운다(이 테스트는 프롬프트를 한 줄도 쓰지 않는다).
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({
    cmsPromptModelConfig: jest.fn(async () => ({})),
    cmsPromptText: jest.fn(async () => ""),
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
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({
    findMoonstoneSpendEvidence: jest.fn(async () => null),
  }));
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => undefined),
    withMongoRetry: jest.fn(async (_env, operation) => operation()),
    // 라우트가 실제로 쓰는 것은 ObjectId 유효성 판정 하나다 — 24자리 hex 만 통과시켜
    // "빈 paymentDocId 는 환불 대상이 아니다" 를 테스트가 실제로 물게 한다.
    mongoose: { Types: { ObjectId: { isValid: (value) => /^[0-9a-fA-F]{24}$/.test(String(value || "")) } } },
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
      findById: jest.fn(() => chainLean(null)),
      updateOne: jest.fn(async () => ({ modifiedCount: 0 })),
      findOneAndUpdate: jest.fn(() => chainLean(null)),
    },
    AstrologyAiConsultation: {
      findOne: jest.fn(() => chainLean(null)),
      findOneAndUpdate: jest.fn(() => chainLean(null)),
      updateOne: jest.fn(async () => ({ modifiedCount: 0 })),
      create: jest.fn(async () => ({})),
    },
    NeoOperationRoomConsultation: {
      findOne: jest.fn(() => chainLean(null)),
      findOneAndUpdate: jest.fn(() => chainLean(null)),
      updateOne: jest.fn(async () => ({ modifiedCount: 0 })),
      create: jest.fn(async () => ({})),
    },
    Payment: {
      exists: jest.fn(async () => false),
      findOne: jest.fn((query) => {
        paymentFindOne(query);
        return chainLean(paymentDoc);
      }),
      find: jest.fn(() => chainLean([])),
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

  ({ autoRefundSinglePaymentDeliveryFailure } = await import("../../worker/lib/payment-refund.js"));
  ({ __astrologyAiTestUtils: astrologyUtils } = await import("../../worker/routes/astrology-ai.js"));
  ({ __neoOperationRoomTestUtils: neoUtils } = await import("../../worker/routes/neo-operation-room.js"));
});

beforeEach(() => {
  paymentFindOne = jest.fn();
  paymentDoc = { _id: PAYMENT_DOC_ID, userId: USER_ID, status: "paid", impUid: "imp_test_1" };
  autoRefundSinglePaymentDeliveryFailure.mockClear();
});

const ROUTES = [
  { name: "astrology-ai", utils: () => astrologyUtils, stage: "astrology_ai_generation" },
  { name: "neo-operation-room", utils: () => neoUtils, stage: "neo_operation_room_generation" },
];

describe.each(ROUTES)("$name 카드 단건 자동 환불", ({ utils, stage }) => {
  const env = { NODE_ENV: "test" };
  const auth = { userId: USER_ID };
  const error = new Error("generation failed");

  test("카드 결제(source=payment)가 실패하면 자동 환불을 정확히 1회 부른다", async () => {
    const result = await utils().refundCardPaymentOnFailure(
      env,
      auth,
      { source: "payment", accessType: "paid", paymentDocId: PAYMENT_DOC_ID },
      error,
    );

    expect(result.refunded).toBe(true);
    expect(autoRefundSinglePaymentDeliveryFailure).toHaveBeenCalledTimes(1);
    const [, passedPayment, , , failureStage] = autoRefundSinglePaymentDeliveryFailure.mock.calls[0];
    expect(passedPayment).toBe(paymentDoc);
    expect(failureStage).toBe(stage);
  });

  test("환불 대상 조회는 {_id, userId, featureKey, status} 로 좁혀져 있다", async () => {
    await utils().refundCardPaymentOnFailure(
      env,
      auth,
      { source: "payment", accessType: "paid", paymentDocId: PAYMENT_DOC_ID },
      error,
    );

    expect(paymentFindOne).toHaveBeenCalledTimes(1);
    const query = paymentFindOne.mock.calls[0][0];
    expect(query._id).toBe(PAYMENT_DOC_ID);
    expect(query.userId).toBe(USER_ID);
    expect(query.featureKey).toBe(utils().FEATURE_KEY);
    expect(query.status).toEqual({ $in: ["paid", "success", "fulfilled"] });
  });

  // 🔴 두 케이스 모두 유효한 paymentDocId 를 일부러 실어 보낸다 — 그러지 않으면 ObjectId 검사에 먼저
  //    걸려 통과해 버려서, source 판정을 지워도 테스트가 물지 않는다(실제로 변이로 확인했다).
  test("월정석·이용권(billing-gate)과 토큰 재입장은 환불을 부르지 않는다", async () => {
    const monthly = await utils().refundCardPaymentOnFailure(
      env,
      auth,
      { source: "billing-gate", accessType: "subscription", executionSourceTransactionId: "tx-1", paymentDocId: PAYMENT_DOC_ID },
      error,
    );
    const token = await utils().refundCardPaymentOnFailure(
      env,
      auth,
      { source: "token", accessType: "paid", paymentDocId: PAYMENT_DOC_ID },
      error,
    );

    expect(monthly).toEqual(expect.objectContaining({ refunded: false, reason: "NOT_CARD_PAYMENT" }));
    expect(token).toEqual(expect.objectContaining({ refunded: false, reason: "NOT_CARD_PAYMENT" }));
    expect(paymentFindOne).not.toHaveBeenCalled();
    expect(autoRefundSinglePaymentDeliveryFailure).not.toHaveBeenCalled();
  });

  test("결제 문서를 못 찾으면 환불을 부르지 않는다", async () => {
    paymentDoc = null;
    const result = await utils().refundCardPaymentOnFailure(
      env,
      auth,
      { source: "payment", accessType: "paid", paymentDocId: PAYMENT_DOC_ID },
      error,
    );

    expect(result.refunded).toBe(false);
    expect(result.reason).toBe("PAYMENT_NOT_FOUND");
    expect(autoRefundSinglePaymentDeliveryFailure).not.toHaveBeenCalled();
  });

  // 환불해 놓고 "결제 권한은 보존" 이라고 안내하면 사용자는 재시도가 무료라고 믿고 결제창을 다시 만난다.
  test("환불 안내 문구는 결제 보존을 약속하지 않는다", () => {
    expect(utils().CARD_REFUNDED_MESSAGE).toEqual(expect.stringContaining("환불"));
    expect(utils().CARD_REFUNDED_MESSAGE).not.toEqual(expect.stringContaining("보존"));
  });
});
