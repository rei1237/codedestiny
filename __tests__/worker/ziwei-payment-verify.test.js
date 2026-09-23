/**
 * @jest-environment node
 *
 * 자미두수 AI 2종의 단건 결제 확인(verifyPaymentForStart)이 V2 확정 경로와 같은 verifyPgPayment 로
 * 채널까지 대조하는지, 구 확정 경로가 닫은 주문(채널 대조 흔적 없음)을 조회 없이 통과시키지 않는지 확인한다.
 * 2026-09-24 이니시스 보안 권고 재실사 W2 — 예전 자체 검증기는 채널을 안 봤고, paid·fulfilled 면 조회를 건너뛰었다.
 * 실패 사유는 대기 주문에만 남긴다 — 취소·환불 주문의 관리자 검토 표시를 덮던 첫 구현(ca7f4eab0)은 되돌렸다.
 * PG 는 전부 mock 이다(실결제·실PG 호출 0).
 */
import { jest } from "@jest/globals";

const USER_ID = "64b7f2a1c3d4e5f601234567";
const PAYMENT_ID = "cd-zwai-fixture-0001";
const AMOUNT = 9900;
const ENV = {
  PORTONE_API_SECRET: "portone-test-secret",
  PORTONE_STORE_ID: "store-test",
  PORTONE_CHANNEL_KEY: "channel-inicis",
  PORTONE_KAKAOPAY_CHANNEL_KEY: "channel-kakao",
};
const PRICING = { amountKRW: AMOUNT, coinPrice: 99, membershipCreditCost: 1 };

const paymentFindOne = jest.fn();
const paymentFindByIdAndUpdate = jest.fn();
const paymentFindOneAndUpdate = jest.fn();
const fetchPortOnePayment = jest.fn();
const routes = {};
let fetchBlock;

function order(overrides = {}) {
  return {
    _id: "order-1",
    userId: USER_ID,
    merchantUid: PAYMENT_ID,
    status: "pending",
    paymentAmount: AMOUNT,
    idempotencyKey: "idem-1",
    pricingSnapshot: { inputHash: "hash-1" },
    ...overrides,
  };
}

/* fetchPortOnePayment 가 돌려주는 정규화 모양(worker/lib/portone.js normalizePortOnePayment). */
function paidPg(channelKey = "channel-inicis") {
  return {
    paymentId: PAYMENT_ID,
    id: PAYMENT_ID,
    status: "paid",
    amount: AMOUNT,
    currency: "KRW",
    paid_at: 1790000000,
    pay_method: "card",
    customer: { phoneNumber: "010-0000-0000" },
    rawV2: { id: PAYMENT_ID, storeId: "store-test", channel: { key: channelKey }, amount: { total: AMOUNT, paid: AMOUNT } },
  };
}

beforeAll(async () => {
  const db = await import("../../worker/lib/db.js");
  const models = await import("../../worker/lib/models.js");
  const portone = await import("../../worker/lib/portone.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, work) => work() }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    ...models,
    Payment: { findOne: paymentFindOne, findByIdAndUpdate: paymentFindByIdAndUpdate, findOneAndUpdate: paymentFindOneAndUpdate },
  }));
  jest.unstable_mockModule("../../worker/lib/portone.js", () => ({ ...portone, fetchPortOnePayment }));
  routes["ziwei-ai"] = (await import("../../worker/routes/ziwei-ai.js")).__ziweiAiTestUtils;
  routes["ziwei-island-ai"] = (await import("../../worker/routes/ziwei-island-ai.js")).__ziweiIslandTestUtils;
});

beforeEach(() => {
  jest.clearAllMocks();
  fetchPortOnePayment.mockReset(); // once 큐가 다음 테스트로 새지 않게
  paymentFindByIdAndUpdate.mockImplementation(() => Promise.resolve({}));
  fetchBlock = jest.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("External fetch blocked"); });
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  expect(fetchBlock).not.toHaveBeenCalled();
  jest.restoreAllMocks();
});

function verify(route, current) {
  paymentFindOne.mockReturnValue({ lean: async () => current });
  // 실패 사유는 조건부 갱신으로 쓴다 — 필터가 맞을 때만 주문 문서에 반영해 DB 의 CAS 를 흉내 낸다.
  paymentFindOneAndUpdate.mockImplementation((filter, update) => {
    const hit = Object.entries(filter).every(([key, value]) => current[key] === value);
    if (hit) Object.assign(current, update?.$set);
    return Promise.resolve(hit ? current : null);
  });
  return routes[route].verifyPaymentForStart({
    env: ENV,
    auth: { userId: USER_ID },
    paymentId: PAYMENT_ID,
    idempotencyKey: "idem-1",
    inputHash: "hash-1",
    pricing: PRICING,
  });
}

function writes() {
  return paymentFindByIdAndUpdate.mock.calls.map(([, update]) => update?.$set || {});
}

describe.each([["ziwei-ai"], ["ziwei-island-ai"]])("%s verifyPaymentForStart", (route) => {
  test("우리 채널 결제는 확정하고, 원본이 아닌 요약본(channelCheck)만 남긴다", async () => {
    fetchPortOnePayment.mockResolvedValue(paidPg());

    await expect(verify(route, order())).resolves.toMatchObject({ ok: true, paymentId: PAYMENT_ID });

    const [set] = writes();
    expect(set).toMatchObject({ status: "success", orderState: "PAID_VERIFIED", rawPortOne: { channelCheck: "matched", storeIdCheck: "matched" } });
    expect(JSON.stringify(set.rawPortOne)).not.toMatch(/customer|phone/i);
  });

  test("🔴 같은 상점의 다른 채널(channel.key) 결제로는 확정하지 않는다", async () => {
    fetchPortOnePayment.mockResolvedValue(paidPg("channel-test-other"));
    const current = order();

    await expect(verify(route, current)).resolves.toEqual({ ok: false });

    expect(paymentFindByIdAndUpdate).not.toHaveBeenCalled();
    expect(current).toMatchObject({ status: "pending", failureCode: "channel_mismatch" });
  });

  test.each([["cancelled"], ["refunded"], ["failed"]])("🔴 %s 주문에 start 가 다시 와도 관리자 검토 표시를 덮지 않는다", async (status) => {
    fetchPortOnePayment.mockResolvedValue({ ...paidPg(), status: "cancelled" });
    const current = order({ status, failureCode: "cancel_admin_review", failureStage: "webhook_cancel_admin_review" });

    await expect(verify(route, current)).resolves.toEqual({ ok: false });

    expect(paymentFindByIdAndUpdate).not.toHaveBeenCalled();
    expect(current).toMatchObject({ status, failureCode: "cancel_admin_review", failureStage: "webhook_cancel_admin_review" });
  });

  test("🔴 구 경로가 닫은 fulfilled 주문(채널 대조 흔적 없음)은 1회 재조회하고, 상태·영수증은 덮지 않는다", async () => {
    const legacy = order({ status: "fulfilled", rawPortOne: { receipt_url: "https://receipt.example/1" } });

    fetchPortOnePayment.mockResolvedValueOnce(paidPg("channel-test-other"));
    await expect(verify(route, legacy)).resolves.toEqual({ ok: false });
    fetchPortOnePayment.mockResolvedValueOnce(paidPg());
    await expect(verify(route, legacy)).resolves.toMatchObject({ ok: true });

    expect(fetchPortOnePayment).toHaveBeenCalledTimes(2);
    expect(paymentFindByIdAndUpdate).not.toHaveBeenCalled();
    expect(legacy).toMatchObject({ status: "fulfilled" });
    expect(legacy.failureCode).toBeUndefined();
  });

  test("이 검증기가 채널까지 대조해 확정한 주문은 재조회 없이 통과한다", async () => {
    await expect(verify(route, order({ status: "success", rawPortOne: { channelCheck: "matched" } }))).resolves.toMatchObject({ ok: true });

    expect(fetchPortOnePayment).not.toHaveBeenCalled();
    expect(paymentFindByIdAndUpdate).not.toHaveBeenCalled();
  });
});
