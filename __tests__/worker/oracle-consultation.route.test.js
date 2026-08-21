/**
 * @jest-environment node
 */
// 타로 오라클 상담(/api/tarot/oracle-consultation) 회귀 가드.
// DB·인증·결제 증빙·Gemini 호출은 전부 mock 이고(실호출 없음), 검증 대상은 라우트 응답이다.
//
// 이 파일이 지키는 계약 3가지:
//   1) 결제 증빙이 없으면 402 를 돌려주고 generateOracleConsultation 은 절대 호출하지 않는다
//      (결제 없이 유료 Gemini 호출이 나가면 안 된다)
//   2) 결제 증빙이 확인된 뒤에만 LLM 을 호출하고, 성공하면 200 + consultation 을 돌려준다
//   3) 결제는 확인됐는데 LLM 이 실패하면 502 로 저하하되 accessVerified:true 를 함께 실어
//      클라이언트가 "프롬프트만 보여주기" 폴백으로 내려갈 신호를 준다

import { jest } from "@jest/globals";

let handleTarotRoutes;
let verifyPerUsePaymentMock;
let canAccessPaidFeatureMock;
let requireAuthMock;
let generateOracleConsultationMock;

beforeAll(async () => {
  const realAuth = await import("../../worker/lib/auth.js");

  verifyPerUsePaymentMock = jest.fn(async () => ({ proven: true, source: "coin", reason: "" }));
  canAccessPaidFeatureMock = jest.fn(async () => ({ allowed: false, reason: "PAYMENT_REQUIRED" }));
  requireAuthMock = jest.fn(async () => ({
    userId: "6512f0000000000000000001",
    authUserDoc: { _id: "6512f0000000000000000001" },
  }));
  generateOracleConsultationMock = jest.fn(async () => ({
    ok: true,
    source: "llm",
    consultation: { coreQuestion: "q", bigPicture: "b", positionReadings: [], tension: "t", caution: "c", actions: ["a"], closingLine: "end" },
  }));

  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    ...realAuth,
    requireAuth: (...args) => requireAuthMock(...args),
  }));
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => ({})),
    withMongoRetry: jest.fn(async (_env, fn) => fn()),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    PaidExecutionRecord: { findOne: jest.fn(() => ({ lean: async () => null })) },
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
    canAccessPaidFeature: (...args) => canAccessPaidFeatureMock(...args),
    PAID_FEATURE_ACCESS_USER_PROJECTION: { role: 1 },
  }));
  jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({
    verifyPerUsePayment: (...args) => verifyPerUsePaymentMock(...args),
    logPerUsePaymentProof: jest.fn(),
  }));
  jest.unstable_mockModule("../../lib/tarot/oracle-consultation.mjs", () => ({
    generateOracleConsultation: (...args) => generateOracleConsultationMock(...args),
  }));

  ({ handleTarotRoutes } = await import("../../worker/routes/tarot.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  requireAuthMock.mockResolvedValue({
    userId: "6512f0000000000000000001",
    authUserDoc: { _id: "6512f0000000000000000001" },
  });
  canAccessPaidFeatureMock.mockResolvedValue({ allowed: false, reason: "PAYMENT_REQUIRED" });
  verifyPerUsePaymentMock.mockResolvedValue({ proven: true, source: "coin", reason: "" });
  generateOracleConsultationMock.mockResolvedValue({
    ok: true,
    source: "llm",
    consultation: { coreQuestion: "q", bigPicture: "b", positionReadings: [], tension: "t", caution: "c", actions: ["a"], closingLine: "end" },
  });
});

function buildBody(overrides = {}) {
  return {
    requestId: "oracle-consultation:req-abc123",
    spreadTitle: "3장 흐름 배열",
    category: "love",
    question: "그 사람이 지금 나를 어떻게 생각할까요?",
    tone: "consult",
    cards: [
      { cardId: "M06", orientation: "upright", positionLabel: "과거", positionDescription: "" },
      { cardId: "M00", orientation: "reversed", positionLabel: "현재", positionDescription: "" },
      { cardId: "M21", orientation: "upright", positionLabel: "미래", positionDescription: "" },
    ],
    ...overrides,
  };
}

async function postConsultation(body, headers = {}) {
  const request = new Request("https://code-destiny.com/api/tarot/oracle-consultation", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test", ...headers },
    body: JSON.stringify(body),
  });
  const response = await handleTarotRoutes(request, {});
  return { response, payload: await response.json() };
}

describe("결제 미확인", () => {
  test("증빙이 없으면 402 를 돌려주고 Gemini 를 호출하지 않는다", async () => {
    verifyPerUsePaymentMock.mockResolvedValue({ proven: false, source: "", reason: "NO_RECORD" });
    const { response, payload } = await postConsultation(buildBody());
    expect(response.status).toBe(402);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("ORACLE_CONSULTATION_PAYMENT_NOT_VERIFIED");
    expect(generateOracleConsultationMock).not.toHaveBeenCalled();
  });

  test("결제 확인 인프라가 일시 장애면 402 가 아니라 503 이다(미결제로 세탁 금지)", async () => {
    verifyPerUsePaymentMock.mockResolvedValue({ proven: null, source: "", reason: "DB_ERROR" });
    const { response, payload } = await postConsultation(buildBody());
    expect(response.status).toBe(503);
    expect(payload.code).toBe("ORACLE_CONSULTATION_VERIFY_UNAVAILABLE");
    expect(generateOracleConsultationMock).not.toHaveBeenCalled();
  });
});

describe("결제 확인됨", () => {
  test("LLM 이 성공하면 200 + consultation 을 돌려준다", async () => {
    const { response, payload } = await postConsultation(buildBody());
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.source).toBe("llm");
    expect(payload.consultation?.coreQuestion).toBe("q");
    expect(generateOracleConsultationMock).toHaveBeenCalledTimes(1);
  });

  test("이용권 커버(canAccessPaidFeature)로도 통과하며, 그 경우 결제 증빙 조회는 건너뛴다", async () => {
    canAccessPaidFeatureMock.mockResolvedValue({ allowed: true, accessSource: "pass" });
    const { response, payload } = await postConsultation(buildBody());
    expect(response.status).toBe(200);
    expect(payload.accessSource).toBe("pass");
    expect(verifyPerUsePaymentMock).not.toHaveBeenCalled();
  });

  test("LLM 이 실패하면 502 로 저하하되 accessVerified:true 를 실어 클라이언트가 프롬프트 폴백으로 내려갈 수 있게 한다", async () => {
    generateOracleConsultationMock.mockResolvedValue({ ok: false, reason: "missing_config" });
    const { response, payload } = await postConsultation(buildBody());
    expect(response.status).toBe(502);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("ORACLE_CONSULTATION_GENERATION_FAILED");
    expect(payload.accessVerified).toBe(true);
  });
});
