/**
 * @jest-environment node
 */
// 수비학 타로 결제 후 결과 조회(/api/tarot/numerology-reading) 회귀 가드.
// DB·인증·결제 증빙은 전부 mock 이고(실호출 없음), 검증 대상은 라우트가 실제로 만드는 응답이다.
//
// 이 파일이 지키는 계약 3가지 — 셋 다 "이미 돈을 낸 사용자를 막다른 길에 세우지 않는다"로 모인다.
//   1) 엔티틀먼트 선검사(canAccessPaidFeature)가 터져도 증빙 조회로 넘어간다 (500 금지)
//   2) 인증이 DB 장애로 실패하면 401 이 아니라 503 이다 (로그아웃으로 세탁 금지)
//   3) 예상 못 한 예외의 500 응답에는 requestId 가 실린다 (진단 가능)

import { jest } from "@jest/globals";

let handleTarotRoutes;
let verifyPerUsePaymentMock;
let canAccessPaidFeatureMock;
let requireAuthMock;

beforeAll(async () => {
  // isAuthDbInfraError 는 진짜를 쓴다 — 판별 규칙 자체가 이 테스트의 검증 대상이기 때문이다.
  const realAuth = await import("../../worker/lib/auth.js");

  verifyPerUsePaymentMock = jest.fn(async () => ({ proven: true, source: "coin", reason: "" }));
  canAccessPaidFeatureMock = jest.fn(async () => ({ allowed: false, reason: "PAYMENT_REQUIRED" }));
  requireAuthMock = jest.fn(async () => ({
    userId: "6512f0000000000000000001",
    authUserDoc: { _id: "6512f0000000000000000001" },
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

  ({ handleTarotRoutes } = await import("../../worker/routes/tarot.js"));
});

beforeEach(() => {
  // 호출 이력까지 지운다 — "증빙 조회를 아예 안 했다"를 단언하는 테스트가 앞 테스트의 호출을 물려받으면 안 된다.
  jest.clearAllMocks();
  requireAuthMock.mockResolvedValue({
    userId: "6512f0000000000000000001",
    authUserDoc: { _id: "6512f0000000000000000001" },
  });
  canAccessPaidFeatureMock.mockResolvedValue({ allowed: false, reason: "PAYMENT_REQUIRED" });
  verifyPerUsePaymentMock.mockResolvedValue({ proven: true, source: "coin", reason: "" });
});

function buildClientBody(overrides = {}) {
  const requestId = "numerology-tarot:reading-abc123:req";
  const paymentContext = {
    featureKey: "tarot-numerology-reading",
    requestId,
    payloadHash: "hash123",
    chargedCoins: 30,
    requiredCoins: 30,
  };
  return {
    readingId: "reading-abc123",
    featureKey: "tarot-numerology-reading",
    requestId,
    idempotencyKey: requestId,
    payloadHash: "hash123",
    chargedCoins: 30,
    requiredCoins: 30,
    paymentContext,
    _paymentContext: paymentContext,
    entitlement: { paid: true, readingId: "reading-abc123", requestId, paymentContext },
    name: "홍길동",
    birthDate: "1990-03-15",
    topic: "love",
    question: "지금 이 관계를 계속 이어가도 될까요?",
    ...overrides,
  };
}

async function postReading(body, headers = {}) {
  const request = new Request("https://code-destiny.com/api/tarot/numerology-reading", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test", ...headers },
    body: JSON.stringify(body),
  });
  const response = await handleTarotRoutes(request, {});
  return { response, payload: await response.json() };
}

describe("정상 경로", () => {
  test("결제 증빙이 확인되면 5장 해석을 200으로 돌려준다", async () => {
    const { response, payload } = await postReading(buildClientBody());
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.cards).toHaveLength(5);
    expect(payload.interpretation?.cards).toHaveLength(5);
  });

  test("클라이언트가 뽑은 카드를 그대로 보내도 500이 나지 않는다", async () => {
    const { buildAttunedDeck, buildNumerologyContext, drawFromAttunedDeck, extractQuestionKeywords } =
      await import("../../lib/tarot/numerology-tarot.mjs");
    const topic = "love";
    const numerology = buildNumerologyContext({ birthDate: "1990-03-15", topic });
    const deck = buildAttunedDeck({ numerology, topic, birthDate: "1990-03-15", name: "홍길동", sessionSeed: "s1" });
    const cards = drawFromAttunedDeck(deck, 5, topic);
    const question = "지금 이 관계를 계속 이어가도 될까요?";

    const { response, payload } = await postReading(buildClientBody({
      numerology,
      cards,
      topicLabel: numerology.topicLabel,
      questionKeywords: extractQuestionKeywords(question, topic),
      question,
    }));

    expect(response.status).toBe(200);
    expect(payload.interpretation?.cards).toHaveLength(5);
  });

  test("이용권으로 커버되면 증빙 조회 없이 통과한다", async () => {
    canAccessPaidFeatureMock.mockResolvedValueOnce({ allowed: true, accessSource: "PASS" });
    const { response, payload } = await postReading(buildClientBody());
    expect(response.status).toBe(200);
    expect(payload.accessSource).toBe("PASS");
    expect(verifyPerUsePaymentMock).not.toHaveBeenCalled();
  });
});

describe("결제 실패/보류 응답", () => {
  test("증빙이 없으면 500이 아니라 402로 돌려준다", async () => {
    verifyPerUsePaymentMock.mockResolvedValueOnce({ proven: false, source: "", reason: "NO_RECORD" });
    const { response, payload } = await postReading(buildClientBody());
    expect(response.status).toBe(402);
    expect(payload.code).toBe("NUMEROLOGY_TAROT_PAYMENT_NOT_VERIFIED");
  });

  test("증빙 조회가 DB 블립이면 500이 아니라 503으로 돌려준다", async () => {
    verifyPerUsePaymentMock.mockResolvedValueOnce({ proven: null, source: "", reason: "DB_DEGRADED" });
    const { response, payload } = await postReading(buildClientBody());
    expect(response.status).toBe(503);
    expect(payload.code).toBe("NUMEROLOGY_TAROT_VERIFY_UNAVAILABLE");
  });
});

// 결함 1 — 선검사가 관문이 아님을 고정한다.
describe("엔티틀먼트 선검사 실패는 결제한 사용자를 막지 않는다", () => {
  test("canAccessPaidFeature가 던져도 증빙 조회로 넘어가 200을 돌려준다", async () => {
    canAccessPaidFeatureMock.mockRejectedValueOnce(new TypeError("Cannot read properties of undefined (reading 'tier')"));
    const { response, payload } = await postReading(buildClientBody());
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.interpretation?.cards).toHaveLength(5);
    expect(verifyPerUsePaymentMock).toHaveBeenCalled();
  });

  test("선검사가 던지고 증빙도 없으면 500이 아니라 402다", async () => {
    canAccessPaidFeatureMock.mockRejectedValueOnce(new TypeError("boom"));
    verifyPerUsePaymentMock.mockResolvedValueOnce({ proven: false, source: "", reason: "NO_RECORD" });
    const { response, payload } = await postReading(buildClientBody());
    expect(response.status).toBe(402);
    expect(payload.code).toBe("NUMEROLOGY_TAROT_PAYMENT_NOT_VERIFIED");
  });
});

// 결함 2 — DB 블립을 로그아웃으로 세탁하지 않는다.
describe("인증 실패 사유를 구분한다", () => {
  test("자격증명이 없으면 401 로그인 안내", async () => {
    const authError = new Error("Unauthorized");
    authError.status = 401;
    requireAuthMock.mockRejectedValueOnce(authError);
    const { response, payload } = await postReading(buildClientBody());
    expect(response.status).toBe(401);
    expect(payload.code).toBe("NUMEROLOGY_TAROT_AUTH_REQUIRED");
  });

  test("status 없는 DB 인프라 오류는 401이 아니라 503이다", async () => {
    // status 를 달지 않는 실제 형태 — 예전 `Number(authError?.status) || 401` 기본값이 이걸 401로 세탁했다.
    requireAuthMock.mockRejectedValueOnce(new Error("AUTH_ME_CONNECT_DB: connection is not ready"));
    const { response, payload } = await postReading(buildClientBody());
    expect(response.status).toBe(503);
    expect(payload.code).toBe("NUMEROLOGY_TAROT_VERIFY_UNAVAILABLE");
  });

  test("MongoPoolClearedError 처럼 이름으로만 식별되는 오류도 503이다", async () => {
    const poolError = new Error("pool was cleared");
    poolError.name = "MongoPoolClearedError";
    requireAuthMock.mockRejectedValueOnce(poolError);
    const { response } = await postReading(buildClientBody());
    expect(response.status).toBe(503);
  });

  // 아래 3건은 "고치기 전과 동일해야 하는" 동작을 고정한다.
  // 이번 수정이 건드린 것은 오직 "status 없는 DB 인프라 오류" 하나임을 증명한다.
  test("401/403 이외의 status 가 붙은 실패는 종전대로 503 보류다", async () => {
    const throttled = new Error("Too many requests");
    throttled.status = 429;
    requireAuthMock.mockRejectedValueOnce(throttled);
    const { response, payload } = await postReading(buildClientBody());
    expect(response.status).toBe(503);
    expect(payload.code).toBe("NUMEROLOGY_TAROT_VERIFY_UNAVAILABLE");
  });

  test("status 도 없고 DB 오류도 아닌 예외는 종전대로 401 이다", async () => {
    requireAuthMock.mockRejectedValueOnce(new TypeError("token shape unexpected"));
    const { response, payload } = await postReading(buildClientBody());
    expect(response.status).toBe(401);
    expect(payload.code).toBe("NUMEROLOGY_TAROT_AUTH_REQUIRED");
  });

  test("예외 없이 userId 가 안 나오면 종전대로 401 이다", async () => {
    requireAuthMock.mockResolvedValueOnce({ userId: "" });
    const { response, payload } = await postReading(buildClientBody());
    expect(response.status).toBe(401);
    expect(payload.code).toBe("NUMEROLOGY_TAROT_AUTH_REQUIRED");
  });

  test("403 은 403 그대로 유지된다", async () => {
    const forbidden = new Error("Forbidden");
    forbidden.status = 403;
    requireAuthMock.mockRejectedValueOnce(forbidden);
    const { response } = await postReading(buildClientBody());
    expect(response.status).toBe(403);
  });
});

// 결함 3 — 500이 나더라도 어느 요청이었는지 특정할 수 있어야 한다.
describe("예상 못 한 예외도 진단 가능해야 한다", () => {
  test("500 응답에 requestId가 실린다", async () => {
    verifyPerUsePaymentMock.mockRejectedValueOnce(new TypeError("unexpected engine failure"));
    const { response, payload } = await postReading(buildClientBody(), { "x-request-id": "req-diag-123" });
    expect(response.status).toBe(500);
    expect(payload.requestId).toBe("req-diag-123");
  });
});
