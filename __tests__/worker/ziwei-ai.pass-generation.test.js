/**
 * @jest-environment node
 *
 * 전체 자미두수 상담의 실제 라우트 계약을 한 번에 고정한다.
 * 결제·LLM은 provider-free mock이고, registry·이용권 정책·명반 계산·라우트 orchestration은 실제 코드다.
 */

import { jest } from "@jest/globals";

const USER_ID = "64f0a1b2c3d4e5f678901234";
const FEATURE_KEY = "ziwei-ai-consultation";
const ACCESS_TOKEN = "fixture-ziwei-pass-access-token";
const REQUEST_ID = "ziwei-family-pass-route-001";

const structuredLlmMock = jest.fn();
const proseLlmMock = jest.fn();
const consumePassForFeatureMock = jest.fn();
const fetchPortOnePaymentMock = jest.fn();
const getPortOnePublicConfigMock = jest.fn();
const paymentCreateMock = jest.fn();
const paymentUpdateMock = jest.fn();

let signedAccessPayload = null;
let consultation = null;
let handleZiweiAiRoutes;
let getBillingFeaturePricing;

const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const familyUser = {
  _id: USER_ID,
  role: "user",
  name: "테스트 사용자",
  email: "tester@example.com",
  phoneNumber: "",
  points: 0,
  recentConsumeRequestIds: [],
  profileSubscription: {
    tier: "family",
    passTier: "family",
    status: "active",
    isActive: true,
    expiresAt,
    premiumUseCycleKey: expiresAt.toISOString(),
    monthlySpendCoin: 0,
    monthlyLimitCoin: 0,
    membershipCreditBalance: 0,
  },
};

function query(read) {
  const chain = {
    select: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    lean: jest.fn(async () => read()),
  };
  return chain;
}

function matchesConsultation(filter = {}) {
  if (!consultation) return false;
  if (filter.id && consultation.id !== filter.id) return false;
  if (filter.userId && consultation.userId !== filter.userId) return false;
  if (filter.idempotencyKey && consultation.idempotencyKey !== filter.idempotencyKey) return false;
  if (filter.status && consultation.status !== filter.status) return false;
  return true;
}

const consultationModel = {
  findOne: jest.fn((filter = {}) => query(() => (matchesConsultation(filter) ? consultation : null))),
  find: jest.fn(() => query(() => (consultation ? [consultation] : []))),
  create: jest.fn(async (seed) => {
    const now = new Date();
    consultation = { ...seed, usageAppliedAt: null, createdAt: now, updatedAt: now };
    return consultation;
  }),
  updateOne: jest.fn(async (filter = {}, update = {}) => {
    if (!matchesConsultation(filter)) return { matchedCount: 0, modifiedCount: 0 };
    if (Object.hasOwn(filter, "usageAppliedAt") && filter.usageAppliedAt === null && consultation.usageAppliedAt != null) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    Object.assign(consultation, update.$set || {}, { updatedAt: new Date() });
    return { matchedCount: 1, modifiedCount: 1 };
  }),
  findOneAndUpdate: jest.fn((filter = {}, update = {}) => query(() => {
    if (!matchesConsultation(filter)) return null;
    Object.assign(consultation, update.$set || {}, { updatedAt: new Date() });
    return consultation;
  })),
};

const SECTION_LABELS = {
  reading_guide: "읽는 순서",
  structure_core: "핵심 구조",
  influence_factors: "영향 요인",
  evidence_basis: "판단 근거",
  personality_profile: "핵심 성향",
  essence: "타고난 본질",
  flow: "사화 흐름",
  triad_axis: "삼방 축",
  twelve_palaces: "열두 궁 연결",
  career: "직업 흐름",
  wealth: "재물 흐름",
  domain_matrix: "생활 영역",
  relationship: "관계 흐름",
  dayun_now: "현재 대한",
  timing_strategy: "시기 전략",
  caution: "주의할 패턴",
  core_answer: "핵심 답",
  action_plan: "실행 계획",
  prescription: "마지막 처방",
};

function sectionBody(key) {
  const label = SECTION_LABELS[key] || key;
  const grounding = key === "reading_guide"
    ? "명궁 형제궁 부부궁 자녀궁 재백궁 질액궁 천이궁 노복궁 관록궁 전택궁 복덕궁 부모궁을 삼방사정으로 연결하고 자미 천기 태양 무곡 천동 염정 천부 태음 탐랑 거문 천상 천량 칠살 파군 문창 문곡의 강약 ◎을 근거로 읽습니다. "
    : "";
  let body = grounding;
  let index = 1;
  while (body.length < 1280) {
    body += `${label} ${index}에서는 선택의 기준과 현실에서 확인할 장면을 구체적으로 나누고, 서두르기보다 기록과 대화를 통해 판단을 검증한 뒤 다음 행동을 작게 실행하는 방향을 짚습니다. `;
    index += 1;
  }
  return body.slice(0, 1280);
}

function mockStructuredResponse(prompt) {
  if (prompt.includes("sections 는 빈 객체 그대로 두세요")) {
    return JSON.stringify({
      meta: {
        name: "테스트 사용자",
        gender: "female",
        mingong: { branch: "자", main_stars: ["자미"], description: "선택의 중심을 세우는 흐름입니다." },
        shengong: { palace: "명궁", main_stars: ["자미"] },
        sihua: {
          lu: { star: "천기", palace: "명궁" },
          quan: { star: "태양", palace: "관록궁" },
          ke: { star: "무곡", palace: "재백궁" },
          ji: { star: "태음", palace: "복덕궁" },
        },
        dayun: { current_palace: "관록궁", age_range: "31-40", main_stars: ["태양"], theme: "선택을 현실의 구조로 옮기는 때입니다." },
        scores: { career: 16, wealth: 15, relationship: 14, health: 13, overall: 76 },
      },
      sections: {},
    });
  }

  const match = prompt.match(/- 위 JSON 의 ([^\n]+?) 만 작성합니다\./);
  if (!match) throw new Error("section group prompt was not recognized");
  const keys = match[1].split(",").map((key) => key.trim()).filter(Boolean);
  return JSON.stringify({
    sections: Object.fromEntries(keys.map((key) => [key, {
      title: SECTION_LABELS[key] || key,
      body: sectionBody(key),
    }])),
  });
}

function requestBody(accessToken = "") {
  return {
    idempotencyKey: REQUEST_ID,
    focusArea: "overall",
    topic: "전체 명반 해석",
    userQuestion: "앞으로의 큰 흐름과 지금 준비할 선택을 알고 싶습니다.",
    birthInfo: {
      name: "테스트 사용자",
      gender: "female",
      birthDate: "1990-01-01",
      birthTime: "12:00",
      birthTimeUnknown: false,
      calendarType: "solar",
      isLeapMonth: false,
    },
    ...(accessToken ? { accessToken } : {}),
  };
}

function post(path, body) {
  return new Request(`https://code-destiny.test/api/ziwei-ai${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": REQUEST_ID },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getOptionalUserFromRequest: jest.fn(async () => ({ userId: USER_ID, role: "user" })),
    getAccessTokenSecret: jest.fn(() => "fixture-secret"),
    getJwtAudience: jest.fn(() => "fixture-audience"),
    getJwtIssuer: jest.fn(() => "fixture-issuer"),
    isAuthDbInfraError: jest.fn(() => false),
    peekAccessTokenUserId: jest.fn(async () => USER_ID),
  }));
  jest.unstable_mockModule("../../worker/lib/jwt.js", () => ({
    signJwt: jest.fn(async (payload) => {
      signedAccessPayload = payload;
      return ACCESS_TOKEN;
    }),
    verifyJwt: jest.fn(async (token) => {
      if (token !== ACCESS_TOKEN || !signedAccessPayload) throw new Error("invalid fixture token");
      return signedAccessPayload;
    }),
  }));
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => undefined),
    isTransientMongoError: jest.fn(() => false),
    mongoose: { Types: { ObjectId: { isValid: jest.fn(() => true) } } },
    withMongoRetry: jest.fn(async (_env, operation) => operation()),
  }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({
    cmsPromptModelConfig: jest.fn(async () => ({ temperature: 0.5, maxOutputTokens: 48000 })),
    cmsPromptText: jest.fn(async (_env, _key, fallback) => fallback),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    MonthlyCreditLedger: {
      findOne: jest.fn(() => query(() => null)),
      updateOne: jest.fn(async () => ({ modifiedCount: 0 })),
    },
    Payment: {
      create: (...args) => paymentCreateMock(...args),
      findByIdAndUpdate: (...args) => paymentUpdateMock(...args),
      findOne: jest.fn(() => query(() => null)),
      updateOne: (...args) => paymentUpdateMock(...args),
    },
    PointHistory: {
      create: jest.fn(async () => ({})),
      findOne: jest.fn(() => query(() => null)),
      updateMany: jest.fn(async () => ({ modifiedCount: 0 })),
      updateOne: jest.fn(async () => ({ modifiedCount: 0 })),
    },
    User: {
      findById: jest.fn(() => query(() => familyUser)),
      findByIdAndUpdate: jest.fn(() => query(() => null)),
    },
    ZiweiAiConsultation: consultationModel,
  }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({
    findMoonstoneSpendEvidence: jest.fn(async () => null),
  }));
  jest.unstable_mockModule("../../worker/lib/pii-crypto.js", () => ({
    decryptPhoneNumber: jest.fn(async (value) => value),
  }));
  jest.unstable_mockModule("../../worker/lib/monthly-credit-store.js", () => ({
    restoreMonthlyCreditLot: jest.fn(async () => ({ restored: false })),
  }));
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({
    consumePassForFeature: (...args) => consumePassForFeatureMock(...args),
    passDenialCode: jest.fn(() => ""),
  }));
  jest.unstable_mockModule("../../worker/lib/portone.js", () => ({
    fetchPortOnePayment: (...args) => fetchPortOnePaymentMock(...args),
    getPortOnePublicConfig: (...args) => getPortOnePublicConfigMock(...args),
  }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({
    callGeminiText: (...args) => proseLlmMock(...args),
  }));
  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({
    callGeminiJsonWithRetry: (...args) => structuredLlmMock(...args),
  }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({
    createLlmCacheStore: jest.fn(() => ({})),
  }));

  ({ handleZiweiAiRoutes } = await import("../../worker/routes/ziwei-ai.js"));
  ({ getBillingFeaturePricing } = await import("../../worker/lib/billing-feature-registry.js"));
});

beforeEach(() => {
  signedAccessPayload = null;
  consultation = null;
  structuredLlmMock.mockReset().mockImplementation(async (_env, prompt) => ({
    ok: true,
    text: mockStructuredResponse(String(prompt || "")),
    provider: "staging-mock",
    model: "provider-free-fixture",
    isMock: true,
  }));
  proseLlmMock.mockReset().mockRejectedValue(new Error("external prose LLM must not run"));
  consumePassForFeatureMock.mockReset().mockResolvedValue({
    covered: true,
    reason: "",
    replayed: false,
    coverage: { coinCost: 300 },
    user: familyUser,
  });
  fetchPortOnePaymentMock.mockReset().mockRejectedValue(new Error("external PG lookup must not run"));
  getPortOnePublicConfigMock.mockReset().mockRejectedValue(new Error("PG configuration must not be requested"));
  paymentCreateMock.mockReset();
  paymentUpdateMock.mockReset();
  Object.values(consultationModel).forEach((method) => method?.mockClear?.());
});

test("Family 이용권: 실제 prepare → generate는 provider-free 결과를 저장하고 동일 요청을 재개한다", async () => {
  const pricing = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  expect(pricing).toMatchObject({ ok: true, pricing: { featureKey: FEATURE_KEY, cost: 300, amountKRW: 30000 } });

  const env = {
    APP_ENV: "staging",
    STAGING_LLM_MOCK_ENABLED: "true",
    WORKERS_AI_ENABLED: "false",
  };
  const prepareResponse = await handleZiweiAiRoutes(post("/prepare", requestBody()), env);
  const preparePayload = await prepareResponse.json();

  expect(prepareResponse.status).toBe(200);
  expect(preparePayload).toMatchObject({ ok: true, accessToken: ACCESS_TOKEN, accessType: "pass" });
  expect(signedAccessPayload).toMatchObject({
    featureKey: FEATURE_KEY,
    userId: USER_ID,
    accessType: "pass",
    idempotencyKey: REQUEST_ID,
  });

  const generateResponse = await handleZiweiAiRoutes(post("/generate", requestBody(preparePayload.accessToken)), env);
  const generated = await generateResponse.json();

  expect(generateResponse.status).toBe(200);
  expect(generated).toMatchObject({
    ok: true,
    consultation: { accessType: "pass", status: "completed" },
  });
  expect(generated.consultation.messages).toHaveLength(2);
  expect(generated.consultation.messages[1].content).toContain('"sections"');
  expect(consultation).toMatchObject({ status: "completed", idempotencyKey: REQUEST_ID });
  expect(consultation.usageAppliedAt).toBeInstanceOf(Date);
  expect(consultationModel.create).toHaveBeenCalledTimes(1);
  expect(consumePassForFeatureMock).toHaveBeenCalledTimes(1);
  expect(consumePassForFeatureMock).toHaveBeenCalledWith(expect.objectContaining({
    userId: USER_ID,
    featureKey: FEATURE_KEY,
    requestId: REQUEST_ID,
    coinCost: 300,
  }));
  expect(structuredLlmMock).toHaveBeenCalledTimes(7);

  const replayResponse = await handleZiweiAiRoutes(post("/generate", requestBody(preparePayload.accessToken)), env);
  const replayed = await replayResponse.json();

  expect(replayResponse.status).toBe(200);
  expect(replayed.consultation.id).toBe(generated.consultation.id);
  expect(replayed.consultation.messages[1].content).toBe(generated.consultation.messages[1].content);
  expect(consultationModel.create).toHaveBeenCalledTimes(1);
  expect(consumePassForFeatureMock).toHaveBeenCalledTimes(1);
  expect(structuredLlmMock).toHaveBeenCalledTimes(7);
  expect(proseLlmMock).not.toHaveBeenCalled();
  expect(fetchPortOnePaymentMock).not.toHaveBeenCalled();
  expect(getPortOnePublicConfigMock).not.toHaveBeenCalled();
  expect(paymentCreateMock).not.toHaveBeenCalled();
  expect(paymentUpdateMock).not.toHaveBeenCalled();
});
