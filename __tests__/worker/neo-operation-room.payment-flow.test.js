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
    NEO_COMPAT_INITIAL_SECTIONS: [{ id: "opening", title: "t", scope: "s", minChars: 100, schema: {}, rules: [] }],
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
      // 회당 결제 키는 이제 계정 배열(paidFeatures)로 단축되지 않고 실제 결제 증빙까지 내려간다
      // (paid-feature-access.js). 그 조회를 목에서 빼 두면 판정이 아니라 예외로 500 이 난다.
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

// 궁합 모드 입력 계약. 🔴 여기서 지키는 핵심은 "상대가 없을 때 기존 1인 요청의 inputHash 가
// 한 글자도 바뀌지 않는다"이다 — 바뀌면 30일 LLM 캐시가 통째로 무효화돼 비용이 직격이다.
describe("궁합 모드 입력 정규화", () => {
  const soloBody = {
    selectedMethod: "ziwei",
    topic: "연애 / 재회",
    intensity: "roar",
    question: "재회하면 또 같은 문제로 싸울까",
    birthInput: { gender: "female", birthDate: "1990-03-15", birthTime: "08:30", calendarType: "solar" },
  };
  const partner = { gender: "male", birthDate: "1988-11-02", birthTime: "21:10", calendarType: "solar" };

  test("상대가 없으면 입력에 궁합 키가 생기지 않는다", () => {
    const result = neoTestUtils.normalizeInput(soloBody);
    expect(result.ok).toBe(true);
    expect(result.input).not.toHaveProperty("partnerBirthInfo");
    expect(result.input).not.toHaveProperty("relationshipStatus");
  });

  test("빈 상대 정보나 관계 상태만으로는 1인 요청의 지문이 바뀌지 않는다", () => {
    const base = neoTestUtils.normalizeInput(soloBody).inputHash;
    expect(neoTestUtils.normalizeInput({ ...soloBody, partnerBirthInput: null }).inputHash).toBe(base);
    expect(neoTestUtils.normalizeInput({ ...soloBody, partnerBirthInput: {} }).inputHash).toBe(base);
    expect(neoTestUtils.normalizeInput({ ...soloBody, relationshipStatus: "reconciling" }).inputHash).toBe(base);
  });

  test("상대가 붙으면 지문이 갈라지고, 상대만 바꿔도 또 갈라진다", () => {
    const solo = neoTestUtils.normalizeInput(soloBody).inputHash;
    const withPartner = neoTestUtils.normalizeInput({ ...soloBody, partnerBirthInput: partner });
    expect(withPartner.inputHash).not.toBe(solo);
    expect(withPartner.input.partnerBirthInfo.birthDate).toBe("1988-11-02");

    const other = neoTestUtils.normalizeInput({
      ...soloBody,
      partnerBirthInput: { ...partner, birthDate: "1992-06-06" },
    });
    expect(other.inputHash).not.toBe(withPartner.inputHash);
  });

  test("자미두수가 아니면 상대 정보를 버리고 1인 모드로 돈다", () => {
    for (const method of ["saju", "vedic", "astrology"]) {
      const body = {
        ...soloBody,
        selectedMethod: method,
        birthInput: { ...soloBody.birthInput, timezone: "Asia/Seoul" },
        partnerBirthInput: partner,
        relationshipStatus: "dating",
      };
      const result = neoTestUtils.normalizeInput(body);
      expect(result.ok).toBe(true);
      expect(result.input).not.toHaveProperty("partnerBirthInfo");
    }
  });

  test("불완전한 상대 정보는 422 가 아니라 무시된다(1인 분석을 막지 않는다)", () => {
    const cases = [
      { gender: "male" }, // 생일 없음
      { birthDate: "1988-11-02" }, // 성별 없음
      { gender: "male", birthDate: "1988-11-02" }, // 시간도 미상 표시도 없음
      { gender: "male", birthDate: "말도 안 되는 날짜", birthTime: "21:10" },
    ];
    for (const partnerBirthInput of cases) {
      const result = neoTestUtils.normalizeInput({ ...soloBody, partnerBirthInput });
      expect(result.ok).toBe(true);
      expect(result.input).not.toHaveProperty("partnerBirthInfo");
    }
  });

  test("상대 출생시간 미상은 받아들이고 시각을 비운다", () => {
    const result = neoTestUtils.normalizeInput({
      ...soloBody,
      partnerBirthInput: { gender: "male", birthDate: "1988-11-02", birthTimeUnknown: true },
    });
    expect(result.input.partnerBirthInfo.birthTimeUnknown).toBe(true);
    expect(result.input.partnerBirthInfo.birthTime).toBe("");
  });

  test("관계 상태는 화이트리스트 밖이면 떨어뜨린다", () => {
    const ok = neoTestUtils.normalizeInput({ ...soloBody, partnerBirthInput: partner, relationshipStatus: "reconciling" });
    expect(ok.input.relationshipStatus).toBe("reconciling");
    const bad = neoTestUtils.normalizeInput({ ...soloBody, partnerBirthInput: partner, relationshipStatus: "결혼했음" });
    expect(bad.input).not.toHaveProperty("relationshipStatus");
  });

  // 🔴 궁합 챕터 4개는 관계 전용이다 — 특히 교전 패턴 챕터는 연인 간 대화를 재구성한다.
  //    돈·직업 주제에서 열리면 ₩30,000 짜리 상담이 주제를 통째로 벗어난다.
  test("연애·재회가 아닌 주제면 상대 정보를 버리고 1인 모드로 돈다", () => {
    const otherTopics = ["직업 / 이직", "돈 / 재물", "인간관계", "멘탈 / 자기관리", "인생 방향", "지금 선택", "내가 반복하는 실수"];
    const soloHash = neoTestUtils.normalizeInput(soloBody).inputHash;
    for (const topic of otherTopics) {
      const result = neoTestUtils.normalizeInput({
        ...soloBody,
        topic,
        partnerBirthInput: partner,
        relationshipStatus: "married",
      });
      expect(result.ok).toBe(true);
      expect(result.input).not.toHaveProperty("partnerBirthInfo");
      expect(result.input).not.toHaveProperty("relationshipStatus");
      // 주제가 다르니 해시 자체는 다르지만, 상대가 실렸는지는 같은 주제끼리 비교해야 안다.
      expect(result.inputHash).toBe(neoTestUtils.normalizeInput({ ...soloBody, topic }).inputHash);
    }
    expect(neoTestUtils.normalizeInput({ ...soloBody, partnerBirthInput: partner }).inputHash).not.toBe(soloHash);
  });

  test("주제 표기가 흔들려도 연애·재회면 궁합이 열린다", () => {
    for (const topic of ["연애/재회", "연애 / 재회", "재회", "  연애 / 재회  "]) {
      const result = neoTestUtils.normalizeInput({ ...soloBody, topic, partnerBirthInput: partner });
      expect(result.input.partnerBirthInfo?.birthDate).toBe("1988-11-02");
    }
  });
});
