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
let incrementRateLimitMock;

beforeAll(async () => {
  const realAuth = await import("../../worker/lib/auth.js");

  verifyPerUsePaymentMock = jest.fn(async () => ({ proven: true, source: "coin", reason: "" }));
  canAccessPaidFeatureMock = jest.fn(async () => ({ allowed: false, reason: "PAYMENT_REQUIRED" }));
  requireAuthMock = jest.fn(async () => ({
    userId: "6512f0000000000000000001",
    authUserDoc: { _id: "6512f0000000000000000001" },
  }));
  incrementRateLimitMock = jest.fn(async () => ({ count: 1 }));
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
  // 🔴 validateOracleConsultationInput 은 mock 하지 않고 실물을 쓴다 — 라우트가 그 판정으로
  // 400 을 만드는지가 이 파일이 지키는 계약이라, 여기서 통째로 가짜를 끼우면 가드가 사라진다.
  const realOracle = await import("../../lib/tarot/oracle-consultation.mjs");
  jest.unstable_mockModule("../../lib/tarot/oracle-consultation.mjs", () => ({
    ...realOracle,
    generateOracleConsultation: (...args) => generateOracleConsultationMock(...args),
  }));
  jest.unstable_mockModule("../../worker/lib/rate-limit.js", () => ({
    incrementRateLimit: (...args) => incrementRateLimitMock(...args),
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
  incrementRateLimitMock.mockResolvedValue({ count: 1 });
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

// 실패 사유를 구분해 주지 않으면 클라이언트는 402·502·503 을 전부 같은 문구로 접는다.
// 아래는 "어떤 실패가 다시 눌러 볼 만한가"를 서버가 판정한다는 계약이다.
describe("실패 사유 구분과 재시도 판정", () => {
  test("카드 ID 가 잘못되면 400 이고 Gemini 를 부르지 않는다(재시도해도 같은 실패)", async () => {
    const { response, payload } = await postConsultation(buildBody({
      cards: [{ cardId: "NOT_A_CARD", orientation: "upright", positionLabel: "과거", positionDescription: "" }],
    }));
    expect(response.status).toBe(400);
    expect(payload.code).toBe("ORACLE_CONSULTATION_INVALID_INPUT");
    expect(payload.retryable).toBe(false);
    expect(payload.reason).toMatch(/unknown_card_id/);
    expect(generateOracleConsultationMock).not.toHaveBeenCalled();
    // 결제 증빙 조회보다도 앞이다 — 못 쓸 입력으로 결제 확인 왕복을 돌 이유가 없다.
    expect(verifyPerUsePaymentMock).not.toHaveBeenCalled();
  });

  test("설정 누락은 retryable:false, 일시적 실패는 retryable:true 와 reason 을 함께 준다", async () => {
    generateOracleConsultationMock.mockResolvedValue({ ok: false, reason: "missing_config" });
    const permanent = await postConsultation(buildBody());
    expect(permanent.payload.retryable).toBe(false);

    generateOracleConsultationMock.mockResolvedValue({ ok: false, reason: "gemini_http_429" });
    const transient = await postConsultation(buildBody());
    expect(transient.payload.retryable).toBe(true);
    expect(transient.payload.reason).toBe("gemini_http_429");
  });

  test("안전 차단은 재시도 대상이 아니다", async () => {
    generateOracleConsultationMock.mockResolvedValue({ ok: false, reason: "blocked_SAFETY" });
    const { payload } = await postConsultation(buildBody());
    expect(payload.reason).toBe("blocked_SAFETY");
    expect(payload.retryable).toBe(false);
  });

  test("결제 증빙 미확인(402)은 재시도 대상이고, 인증 실패(401)는 아니다", async () => {
    verifyPerUsePaymentMock.mockResolvedValue({ proven: false, source: "", reason: "NO_RECORD" });
    const unpaid = await postConsultation(buildBody());
    expect(unpaid.response.status).toBe(402);
    expect(unpaid.payload.retryable).toBe(true);

    requireAuthMock.mockRejectedValue(Object.assign(new Error("no token"), { status: 401 }));
    const unauthed = await postConsultation(buildBody());
    expect(unauthed.response.status).toBe(401);
    expect(unauthed.payload.retryable).toBe(false);
  });
});

describe("무과금 재시도와 그 상한", () => {
  test("같은 requestId 로 다시 불러도 통과한다 — 재시도에 추가 과금이 없다는 근거", async () => {
    const body = buildBody();
    const first = await postConsultation(body);
    const second = await postConsultation(body);
    expect(first.response.status).toBe(200);
    expect(second.response.status).toBe(200);
    expect(verifyPerUsePaymentMock).toHaveBeenCalledTimes(2);
    // verifyPerUsePayment 는 이용권 무료 통과 시 예산을 차감한다(#1673) — 여기서는 목이라 차감이 없다.
    // 재시도가 예산을 두 번 깎지 않는 근거는 (featureKey, requestId) 멱등 마커이며
    // 그 고정은 __tests__/worker/pass-budget-hard-gate.test.js 가 맡는다.
    // 이 테스트가 지키는 것은 그 위층 계약이다 — 같은 requestId 재시도가 402 로 막히지 않는다.
    expect(generateOracleConsultationMock).toHaveBeenCalledTimes(2);
  });

  test("재생성 상한을 넘기면 429 로 막고 Gemini 를 부르지 않는다", async () => {
    incrementRateLimitMock.mockResolvedValue({ count: 5 });
    const { response, payload } = await postConsultation(buildBody());
    expect(response.status).toBe(429);
    expect(payload.code).toBe("ORACLE_CONSULTATION_RETRY_LIMIT");
    expect(payload.retryable).toBe(false);
    expect(payload.accessVerified).toBe(true);
    expect(generateOracleConsultationMock).not.toHaveBeenCalled();
  });

  test("상한 카운터가 죽어도 결제한 사용자를 막지 않는다(fail-open)", async () => {
    incrementRateLimitMock.mockRejectedValue(new Error("rate limit store down"));
    const { response, payload } = await postConsultation(buildBody());
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
  });
});

// 🔴 서버는 클라이언트가 보낸 티어·키·가격을 믿지 않는다. 제출된 카드 수에서 직접 역산하므로
//    ₩3,000 티어(1~4장) 증빙으로 14장을 제출하면 증빙이 없는 것과 같다 —
//    증빙 조회가 featureKey 완전일치이기 때문이다(worker/lib/nakshatra-paid-access.js findPaidPayment).
describe("카드 수 티어 결박", () => {
  // 🔴 M00~M13 은 전부 실재하는 카드 ID 다(lib/tarot/tarot-cards.mjs 로 확인).
  //    없는 ID 를 쓰면 라우트가 400 으로 먼저 끊어서, 아래 402 단언이 티어 가드가 아니라
  //    입력 검증 덕에 통과한다 — 그러면 이 테스트가 아무것도 지키지 않는다.
  function cards(count) {
    return Array.from({ length: count }, (_, index) => ({
      cardId: `M${String(index).padStart(2, "0")}`,
      orientation: "upright",
      positionLabel: `${index + 1}번 자리`,
      positionDescription: "",
    }));
  }

  test("3장은 기본 티어 키·가격(₩3,000)으로 증빙을 조회한다", async () => {
    await postConsultation(buildBody());
    expect(verifyPerUsePaymentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ featureKey: "tarot-prompt-maker", coinPrice: 30 }),
    );
  });

  test("14장은 마스터 티어 키·가격(₩10,000)으로 증빙을 조회한다", async () => {
    await postConsultation(buildBody({ cards: cards(14), spreadTitle: "14장 대배열" }));
    expect(verifyPerUsePaymentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ featureKey: "tarot-prompt-maker-master", coinPrice: 100 }),
    );
  });

  test("8장은 심층 티어 키·가격(₩7,000)으로 증빙을 조회한다", async () => {
    await postConsultation(buildBody({ cards: cards(8), spreadTitle: "8장 배열" }));
    expect(verifyPerUsePaymentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ featureKey: "tarot-prompt-maker-deep", coinPrice: 70 }),
    );
  });

  test("₩3,000 티어 증빙으로 14장을 제출하면 402 이고 Gemini 를 부르지 않는다", async () => {
    // ₩3,000 결제가 남긴 행의 featureKey 는 "tarot-prompt-maker" 하나뿐이다.
    verifyPerUsePaymentMock.mockImplementation(async (_env, { featureKey }) => (
      featureKey === "tarot-prompt-maker"
        ? { proven: true, source: "coin", reason: "" }
        : { proven: false, source: "", reason: "NO_RECORD" }
    ));
    const { response, payload } = await postConsultation(buildBody({ cards: cards(14), spreadTitle: "14장 대배열" }));
    expect(response.status).toBe(402);
    expect(payload.code).toBe("ORACLE_CONSULTATION_PAYMENT_NOT_VERIFIED");
    expect(payload.reason).toBe("NO_RECORD");
    expect(generateOracleConsultationMock).not.toHaveBeenCalled();
  });

  test("이용권 선검사도 티어 키로 나간다(하위 티어 키로 상위 상담을 커버하지 않는다)", async () => {
    await postConsultation(buildBody({ cards: cards(14), spreadTitle: "14장 대배열" }));
    expect(canAccessPaidFeatureMock).toHaveBeenCalledWith(
      expect.any(String),
      "tarot-prompt-maker-master",
      expect.any(Object),
    );
  });
});
