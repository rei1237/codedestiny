/**
 * @jest-environment node
 *
 * 연이 운명 상담(fortune-chat-consultation, 5,000원)과 초융합 운세
 * (fusion-fortune-consultation, 30,000원)는 전용 재화를 버리고 표준 회당 결제로 옮겼다.
 * 두 기능은 verifyPerUsePayment 를 **실제 차단**에 쓰는 첫 사례라, 증빙 5경로가 전부
 * 통과하는지와 DB 장애가 402 로 세탁되지 않는지를 여기서 못 박는다.
 *
 * 🔴 이 파일이 지키는 계약: proven === null(판단 보류)은 402 가 아니라 503 이다.
 *    402 로 내리면 이미 결제한 사용자가 돈만 내고 결과를 못 받는다.
 */

import { jest } from "@jest/globals";
import { matches } from "../fixtures/fake-payment-db.mjs";

const CHAT_FEATURE_KEY = "fortune-chat-consultation";
const FUSION_FEATURE_KEY = "fusion-fortune-consultation";
const USER_ID = "507f1f77bcf86cd799439011";
const REQUEST_ID = "req-per-use-0001";

const paymentFindOne = jest.fn();
const pointHistoryFindOne = jest.fn();
const monthlyLedgerFind = jest.fn();
const userFindById = jest.fn();
const consumePassForFeatureMock = jest.fn();

let verifyPerUsePayment;
let transientError;

/** Mongoose 체이닝(.select().lean())을 흉내내는 최소 스텁. */
function query(result) {
  return { select: () => ({ lean: async () => result }) };
}

/**
 * 🔴 월정석 원장만은 **필터를 실제로 평가한다.**
 *
 * 예전에는 이 조회도 `query(row)` 로 쿼리와 무관하게 행을 돌려줬고, 그래서 reader 가 원장
 * 스키마에 존재하지도 않는 필드(top-level requestId/idempotencyKey)로 찾고 있는데도 초록불이었다.
 * V2 컷오버로 PointHistory 증빙이 사라지자 그 결함이 그대로 드러나 월정석 결제자가 402 를 받았다.
 * 행의 모양 정본은 worker/payments/moonstone.js 이고, writer↔reader 왕복 계약은
 * __tests__/worker/per-use-proof-roundtrip.test.js 가 지킨다.
 *
 * 증빙 정본(worker/lib/moonstone-spend-proof.js)은 find().select().sort().limit().lean() 을 쓴다.
 */
function ledgerQuery(row) {
  return (filter) => {
    const chain = {
      select: () => chain,
      sort: () => chain,
      limit: () => chain,
      lean: async () => (row && matches(row, filter) ? [row] : []),
    };
    return chain;
  };
}

function resetModels() {
  paymentFindOne.mockReset().mockReturnValue(query(null));
  pointHistoryFindOne.mockReset().mockReturnValue(query(null));
  monthlyLedgerFind.mockReset().mockImplementation(ledgerQuery(null));
  userFindById.mockReset().mockReturnValue(query({ _id: USER_ID, role: "user" }));
  consumePassForFeatureMock.mockReset().mockResolvedValue({ covered: true, reason: "", replayed: false, coverage: {} });
}

beforeAll(async () => {
  transientError = Object.assign(new Error("connection timed out"), { name: "MongoNetworkTimeoutError" });

  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb: async () => {},
      withMongoRetry: async (_env, run) => run(),
      isTransientMongoError: (error) => error?.name === "MongoNetworkTimeoutError",
    })),
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      isAuthDbInfraError: () => false,
    })),
    /* 이용권 통과는 이제 그 자리에서 월 누적 예산을 차감한다(worker/lib/pass-consumption.js).
       이 파일의 주제는 "증빙 5경로와 판단 보류" 이지 예산 회계가 아니므로 차감은 목으로 세우고,
       한도·차감·멱등 계약은 __tests__/worker/pass-budget-hard-gate.test.js 가 따로 고정한다. */
    jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({
      consumePassForFeature: (...args) => consumePassForFeatureMock(...args),
      // 거절 코드 매핑은 목이 아니라 정본과 같아야 한다 — 여기서 바꾸면 이 파일이
      // "한도 초과인데 통과"를 못 잡는다.
      passDenialCode: (reason) => (reason === "monthly_pass_limit_exceeded"
        ? "MONTHLY_PASS_LIMIT_EXCEEDED"
        : reason === "price_exceeds_pass_limit"
          ? "PRICE_EXCEEDS_PASS_LIMIT"
          : reason === "pass_access_conflict" ? "PAYMENT_REQUIRED" : ""),
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      Payment: { findOne: paymentFindOne },
      PointHistory: { findOne: pointHistoryFindOne },
      MonthlyCreditLedger: { find: monthlyLedgerFind },
      User: { findById: userFindById },
    })),
  ]);

  ({ verifyPerUsePayment } = await import("../../worker/lib/nakshatra-paid-access.js"));
});

beforeEach(() => resetModels());

describe("회당 결제 증빙 — 5경로", () => {
  it("단건결제(Payment) 기록을 증빙으로 인정한다", async () => {
    paymentFindOne.mockReturnValue(query({ _id: "pay-1", merchantUid: REQUEST_ID }));
    await expect(verifyPerUsePayment({}, { userId: USER_ID, featureKey: CHAT_FEATURE_KEY, coinPrice: 50, requestId: REQUEST_ID }))
      .resolves.toMatchObject({ proven: true, source: "payment" });
  });

  it("코인 차감(PointHistory deduct)을 증빙으로 인정한다", async () => {
    pointHistoryFindOne.mockReturnValue(query({ _id: "ph-1", metadata: { requestId: REQUEST_ID } }));
    await expect(verifyPerUsePayment({}, { userId: USER_ID, featureKey: CHAT_FEATURE_KEY, coinPrice: 50, requestId: REQUEST_ID }))
      .resolves.toMatchObject({ proven: true, source: "coin" });
  });

  it("월정석 차감은 accessType 으로 구분한다", async () => {
    pointHistoryFindOne.mockReturnValue(query({ _id: "ph-2", metadata: { accessType: "membership_credit" } }));
    await expect(verifyPerUsePayment({}, { userId: USER_ID, featureKey: FUSION_FEATURE_KEY, coinPrice: 300, requestId: REQUEST_ID }))
      .resolves.toMatchObject({ proven: true, source: "monthly" });
  });

  // 월정석은 PointHistory 를 남기지 않는다(V2). 이 원장 조회가 유일한 증빙 경로다.
  it("월정석 원장(sourceId)으로 증빙된다", async () => {
    monthlyLedgerFind.mockImplementation(ledgerQuery({
      _id: "ledger-1",
      userId: USER_ID,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: FUSION_FEATURE_KEY,
      sourceId: REQUEST_ID,
      settledAt: new Date(),
    }));
    await expect(verifyPerUsePayment({}, { userId: USER_ID, featureKey: FUSION_FEATURE_KEY, coinPrice: 300, requestId: REQUEST_ID }))
      .resolves.toMatchObject({ proven: true, source: "monthly" });
  });

  // 🔴 정산되지 않은 예약행 = 차감이 일어나지 않은 상태. 증빙으로 인정하면 유료 결과가 공짜로 열린다.
  it("정산되지 않은 월정석 예약행은 증빙이 아니다", async () => {
    monthlyLedgerFind.mockImplementation(ledgerQuery({
      _id: "ledger-2",
      userId: USER_ID,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: FUSION_FEATURE_KEY,
      sourceId: REQUEST_ID,
    }));
    await expect(verifyPerUsePayment({}, { userId: USER_ID, featureKey: FUSION_FEATURE_KEY, coinPrice: 300, requestId: REQUEST_ID }))
      .resolves.toMatchObject({ proven: false, reason: "NO_RECORD" });
  });

  it("admin 은 차감 기록 없이 통과한다", async () => {
    userFindById.mockReturnValue(query({ _id: USER_ID, role: "admin" }));
    await expect(verifyPerUsePayment({}, { userId: USER_ID, featureKey: FUSION_FEATURE_KEY, coinPrice: 300, requestId: REQUEST_ID }))
      .resolves.toMatchObject({ proven: true, source: "admin" });
  });
});

describe("이용권 커버 — 가격에 따라 등급이 갈린다", () => {
  const activePass = (tier) => ({
    _id: USER_ID,
    role: "user",
    profileSubscription: { tier, status: "active", expiresAt: "2099-01-01T00:00:00.000Z" },
  });

  // 연이 상담 50코인(5,000원): 2026-08-24 부터 standard 적용 범위(50코인)와 정확히 같아 전 등급 커버.
  it.each([
    ["standard", true],
    ["premium", true],
    ["vvip", true],
    ["family", true],
  ])("연이 상담 5,000원 — %s 이용권 커버=%s", async (tier, covered) => {
    userFindById.mockReturnValue(query(activePass(tier)));
    const proof = await verifyPerUsePayment({}, { userId: USER_ID, featureKey: CHAT_FEATURE_KEY, coinPrice: 50, requestId: REQUEST_ID });
    expect(proof.proven).toBe(covered);
    if (covered) expect(proof.source).toBe("pass");
  });

  // 초융합 300코인(30,000원): 적용 가격 범위는 standard 50 / premium 100 / vvip 200 이라
  // **family 만** 통과한다. 2026-08-24 에 '상담 포함횟수'(vvip 3회)가 폐지되면서 vvip 도 미커버가
  // 됐다 — VVIP 문구 "2만원급 콘텐츠까지"를 문자 그대로 지키기 위한 교환이다.
  it.each([
    ["standard", false],
    ["premium", false],
    ["vvip", false],
    ["family", true],
  ])("초융합 30,000원 — %s 이용권 커버=%s", async (tier, covered) => {
    userFindById.mockReturnValue(query(activePass(tier)));
    const proof = await verifyPerUsePayment({}, { userId: USER_ID, featureKey: FUSION_FEATURE_KEY, coinPrice: 300, requestId: REQUEST_ID });
    expect(proof.proven).toBe(covered);
    if (covered) expect(proof.source).toBe("pass");
  });
});

// 🔴 '프리미엄 상담 포함 횟수'(family 10회 · vvip 3회)는 2026-08-24 폐지됐다.
// 구 정책에서는 그 횟수가 건당 상한을 우회하는 열쇠였고, 게이트를 거치지 않고 생성 라우트를
// 직접 부르면 상한을 넘겨도 본문이 나가는 구멍이 있어 여기서 막았다. 이제 규칙은 하나다 —
// 정상 판매가가 등급의 적용 가격 범위 안인가. 그래서 이 describe 는 "횟수를 세는가"가 아니라
// "**횟수라는 개념이 되살아나지 않았는가**"를 지킨다. 되살아나면 VVIP 가 20,000원 초과를
// 커버하게 되어 가격 페이지 문구와 서버 판정이 어긋난다.
describe.each([
  ["family", true],
  ["vvip", false],
])("%s 의 고가 상담 판정은 적용 가격 범위 하나로만 갈린다(커버=%s)", (tier, covered) => {
  const CYCLE = "2099-01-01T00:00:00.000Z";
  const tierUser = (premiumUseCount, extra = {}) => ({
    _id: USER_ID,
    role: "user",
    profileSubscription: {
      tier,
      status: "active",
      expiresAt: CYCLE,
      premiumUseCycleKey: CYCLE,
      premiumUseCount,
      ...extra,
    },
  });

  it("옛 카운터가 0이든 999든 판정이 달라지지 않는다(횟수 개념 부활 감지)", async () => {
    for (const count of [0, 3, 10, 999]) {
      userFindById.mockReturnValue(query(tierUser(count)));
      const proof = await verifyPerUsePayment({}, { userId: USER_ID, featureKey: FUSION_FEATURE_KEY, coinPrice: 300, requestId: REQUEST_ID });
      expect(proof.proven).toBe(covered);
      if (covered) expect(proof.source).toBe("pass");
      else expect(proof.reason).not.toBe("PREMIUM_QUOTA_EXHAUSTED");
    }
  });

  // 🔴 가장 중요한 계약. 게이트를 정상적으로 거친 사용은 coin-gate 소비가 PointHistory 증빙을
  // 남기므로, 커버 판정과 무관하게 증빙만으로 통과해야 한다. 이게 깨지면 이미 값을 치른
  // 사용자가 결과를 못 받는다.
  it("정상적으로 게이트를 거친 사용은 증빙으로 통과한다", async () => {
    userFindById.mockReturnValue(query(tierUser(999)));
    pointHistoryFindOne.mockReturnValue(query({ _id: "ph-1", metadata: { accessType: tier === "family" ? "family" : "membership_pass", requestId: REQUEST_ID } }));
    await expect(verifyPerUsePayment({}, { userId: USER_ID, featureKey: FUSION_FEATURE_KEY, coinPrice: 300, requestId: REQUEST_ID }))
      .resolves.toMatchObject({ proven: true });
  });

  it("적용 가격 범위 안인 연이 상담(50코인)은 두 등급 모두 통과한다", async () => {
    userFindById.mockReturnValue(query(tierUser(999)));
    await expect(verifyPerUsePayment({}, { userId: USER_ID, featureKey: CHAT_FEATURE_KEY, coinPrice: 50, requestId: REQUEST_ID }))
      .resolves.toMatchObject({ proven: true, source: "pass" });
  });
});

describe("증빙 실패와 판단 보류를 구분한다", () => {
  it("기록이 없으면 미결제로 판정한다", async () => {
    await expect(verifyPerUsePayment({}, { userId: USER_ID, featureKey: CHAT_FEATURE_KEY, coinPrice: 50, requestId: REQUEST_ID }))
      .resolves.toMatchObject({ proven: false, reason: "NO_RECORD" });
  });

  it("🔴 DB 일시 장애는 미결제(false)가 아니라 판단 보류(null)다", async () => {
    paymentFindOne.mockImplementation(() => { throw transientError; });
    const proof = await verifyPerUsePayment({}, { userId: USER_ID, featureKey: FUSION_FEATURE_KEY, coinPrice: 300, requestId: REQUEST_ID });
    expect(proof.proven).toBeNull();
    expect(proof.reason).toBe("DB_DEGRADED");
  });

  it("requestId 가 없으면 DB 조회 없이 미결제로 떨어진다", async () => {
    const proof = await verifyPerUsePayment({}, { userId: USER_ID, featureKey: CHAT_FEATURE_KEY, coinPrice: 50, requestId: "" });
    expect(proof).toMatchObject({ proven: false, reason: "NO_REQUEST_ID" });
  });
});
