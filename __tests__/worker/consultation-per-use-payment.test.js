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

const CHAT_FEATURE_KEY = "fortune-chat-consultation";
const FUSION_FEATURE_KEY = "fusion-fortune-consultation";
const USER_ID = "507f1f77bcf86cd799439011";
const REQUEST_ID = "req-per-use-0001";

const paymentFindOne = jest.fn();
const pointHistoryFindOne = jest.fn();
const monthlyLedgerFindOne = jest.fn();
const userFindById = jest.fn();

let verifyPerUsePayment;
let transientError;

/** Mongoose 체이닝(.select().lean())을 흉내내는 최소 스텁. */
function query(result) {
  return { select: () => ({ lean: async () => result }) };
}

function resetModels() {
  paymentFindOne.mockReset().mockReturnValue(query(null));
  pointHistoryFindOne.mockReset().mockReturnValue(query(null));
  monthlyLedgerFindOne.mockReset().mockReturnValue(query(null));
  userFindById.mockReset().mockReturnValue(query({ _id: USER_ID, role: "user" }));
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
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      Payment: { findOne: paymentFindOne },
      PointHistory: { findOne: pointHistoryFindOne },
      MonthlyCreditLedger: { findOne: monthlyLedgerFindOne },
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

  it("PointHistory 가 아직 안 써졌어도 월정석 원장으로 증빙된다", async () => {
    monthlyLedgerFindOne.mockReturnValue(query({ _id: "ledger-1" }));
    await expect(verifyPerUsePayment({}, { userId: USER_ID, featureKey: FUSION_FEATURE_KEY, coinPrice: 300, requestId: REQUEST_ID }))
      .resolves.toMatchObject({ proven: true, source: "monthly" });
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

  // 연이 상담 50코인(5,000원): standard 한도 30 을 넘고 premium 한도 50 에 딱 걸린다.
  it.each([
    ["standard", false],
    ["premium", true],
    ["vvip", true],
    ["family", true],
  ])("연이 상담 5,000원 — %s 이용권 커버=%s", async (tier, covered) => {
    userFindById.mockReturnValue(query(activePass(tier)));
    const proof = await verifyPerUsePayment({}, { userId: USER_ID, featureKey: CHAT_FEATURE_KEY, coinPrice: 50, requestId: REQUEST_ID });
    expect(proof.proven).toBe(covered);
    if (covered) expect(proof.source).toBe("pass");
  });

  // 초융합 300코인(30,000원): 한도가 standard 30 / premium 50 / vvip 100 이라 family 만 통과한다.
  // 이 표가 깨지면 "family만 커버" 정책이 조용히 무너진 것이다.
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
