/**
 * @jest-environment node
 */
// 별빛 운영본부 — 주문 단위 매출 사실(환불·제외·제공 보류)과 매출 XP 동기화.

const { createOpsCols, matches } = require("../fixtures/ops-hq-fake-cols.cjs");

let revenue;
let xp;

beforeAll(async () => {
  revenue = await import("../../worker/ops-hq/revenue-facts.js");
  xp = await import("../../worker/ops-hq/xp.js");
});

const SETTINGS = { revenueSince: "2026-10-12", excludedUserIds: [] };
const NOW = new Date("2026-10-20T00:00:00Z");
const hex = (n) => n.toString(16).padStart(24, "0");

function payment(overrides = {}) {
  return {
    _id: hex(1),
    userId: hex(9001),
    merchantUid: "order-1",
    impUid: "pg-1",
    paymentAmount: 10_000,
    paymentType: "membership_pass",
    status: "success",
    paidAt: new Date("2026-10-14T03:00:00Z"),
    entitlementGrantedAt: new Date("2026-10-14T03:00:05Z"),
    updatedAt: new Date("2026-10-14T03:00:05Z"),
    ...overrides,
  };
}

const ok = (cancellations, channelType = "LIVE") => ({ status: "ok", cancellations, channelType, checkedAt: NOW });
const cancel = (id, totalAmount, status = "SUCCEEDED") => ({ id, totalAmount, status, cancelledAt: "2026-10-15T00:00:00Z" });

describe("buildRevenueFact", () => {
  test("부분 환불 여러 번은 성공분만 합산하고, 실패한 요청은 빼지 않는다", () => {
    const fact = revenue.buildRevenueFact(payment({ status: "cancelled", orderState: "PARTIAL_CANCELLED" }), {
      refundCheck: ok([cancel("c1", 3000), cancel("c2", 2000), cancel("c2", 2000), cancel("c3", 5000, "FAILED")]),
    });
    expect(fact).toMatchObject({ refundedKRW: 5000, refundState: "partial", netKRW: 5000, xpState: "counted" });
    expect(fact.refunds.map((row) => row.id)).toEqual(["c1", "c2"]);
  });

  test("전액 환불은 제공 여부와 무관하게 0원으로 반영된다", () => {
    const fact = revenue.buildRevenueFact(payment({ status: "refunded", entitlementGrantedAt: null, paymentType: "digital_content" }), {
      refundCheck: ok([cancel("c1", 10_000)]),
    });
    expect(fact).toMatchObject({ refundState: "full", netKRW: 0, xpState: "counted" });
  });

  test("환불 신호가 있는데 조회에 실패하면 refund_unknown 으로 보류한다", () => {
    const fact = revenue.buildRevenueFact(payment({ status: "refunded" }), { refundCheck: { status: "error", error: "timeout", checkedAt: NOW } });
    expect(fact).toMatchObject({ xpState: "held", holdReason: "refund_unknown", refundError: "timeout" });
  });

  test("미수납·0원·테스트 계정·테스트 채널은 매출 XP 에서 제외한다", () => {
    expect(revenue.buildRevenueFact(payment({ impUid: null })).excludeReason).toBe("not_paid");
    expect(revenue.buildRevenueFact(payment({ paymentAmount: 0 })).excludeReason).toBe("zero_amount");
    expect(revenue.buildRevenueFact(payment(), { excludedUserIds: [hex(9001).toUpperCase()] }).excludeReason).toBe("test_account");
    expect(revenue.buildRevenueFact(payment({ status: "refunded" }), { refundCheck: ok([], "TEST") }).excludeReason).toBe("test_channel");
  });

  test("결제 후 제공 전 주문과 환산 근거 없는 외화 주문은 보류한다", () => {
    const pending = revenue.buildRevenueFact(payment({ paymentType: "digital_content", status: "paid", entitlementGrantedAt: null }));
    expect(pending).toMatchObject({ xpState: "held", holdReason: "delivery_pending" });
    const delivered = revenue.buildRevenueFact(payment({ paymentType: "digital_content", status: "paid", entitlementGrantedAt: null }), { evidence: { execution: true } });
    expect(delivered).toMatchObject({ xpState: "counted", delivery: expect.objectContaining({ source: "paid_execution" }) });

    const paypal = { currency: "USD", totalAmount: 799, rate: 1380, priceKRW: null };
    const fx = revenue.buildRevenueFact(payment({ metadata: { paypalCharge: paypal } }));
    expect(fx).toMatchObject({ currency: "USD", amountOriginal: 7.99, xpState: "held", holdReason: "fx_pending" });
    const locked = revenue.buildRevenueFact(payment({ metadata: { paypalCharge: { ...paypal, priceKRW: 11_000 } } }));
    expect(locked).toMatchObject({ currency: "USD", amountKRW: 11_000, netKRW: 11_000, fxBasis: expect.objectContaining({ kind: "order_locked_price", rate: 1380 }) });
  });
});

describe("syncRevenueFacts", () => {
  function fakeDeps(payments, { evidence = new Map(), refundCheck = async () => ok([]) } = {}) {
    const calls = { refund: 0 };
    return {
      calls,
      deps: {
        loadPayments: async (env, filter, limit) => payments
          .filter((row) => matches(row, filter))
          .sort((a, b) => a.updatedAt - b.updatedAt || (a._id < b._id ? -1 : a._id > b._id ? 1 : 0))
          .slice(0, limit),
        loadEvidence: async () => evidence,
        refundCheck: async (...args) => { calls.refund += 1; return refundCheck(...args); },
      },
    };
  }

  test("제공 대기 주문은 보류했다가 제공 후 한 번만 반영된다(같은 주문 재계산은 같은 결과)", async () => {
    const cols = createOpsCols();
    const order = payment({ paymentType: "digital_content", status: "paid", entitlementGrantedAt: null });
    const evidence = new Map();
    const { deps } = fakeDeps([order], { evidence });

    const first = await revenue.syncRevenueFacts({}, cols, { settings: SETTINGS, now: NOW, deps });
    expect(first).toMatchObject({ changed: 1, ledgerDelta: 0 });
    expect((await cols.revenueFacts.findOne({ _id: order._id })).holdReason).toBe("delivery_pending");

    evidence.set(order._id, { execution: true });
    const second = await revenue.syncRevenueFacts({}, cols, { settings: SETTINGS, now: new Date(NOW.getTime() + 600_000), deps });
    expect(second).toMatchObject({ changed: 1, ledgerDelta: 50 });

    // 웹훅 중복·순서 역전처럼 같은 주문이 다시 바뀌어 들어와도 결과는 같다.
    order.updatedAt = new Date("2026-10-19T00:00:00Z");
    const third = await revenue.syncRevenueFacts({}, cols, { settings: SETTINGS, now: new Date(NOW.getTime() + 1_200_000), full: true, deps });
    expect(third).toMatchObject({ changed: 0, ledgerDelta: 0 });
    expect(await xp.readBucketTotal(cols, revenue.REVENUE_BUCKET)).toBe(50);
  });

  test("환불 조회 결과는 주문이 다시 바뀌기 전까지 재사용한다", async () => {
    const cols = createOpsCols();
    const order = payment({ status: "cancelled", orderState: "PARTIAL_CANCELLED" });
    const { deps, calls } = fakeDeps([order], { refundCheck: async () => ok([cancel("c1", 4000)]) });
    await revenue.syncRevenueFacts({}, cols, { settings: SETTINGS, now: NOW, deps });
    await revenue.syncRevenueFacts({}, cols, { settings: SETTINGS, now: new Date(NOW.getTime() + 600_000), deps });
    expect(calls.refund).toBe(1);
    expect(await xp.readBucketTotal(cols, revenue.REVENUE_BUCKET)).toBe(30);
  });

  test("같은 시각에 400건 넘게 바뀌어도 (updatedAt, _id) 커서로 다음 묶음을 이어 본다", async () => {
    const cols = createOpsCols();
    const updatedAt = new Date("2026-10-15T00:00:00Z");
    const payments = Array.from({ length: 450 }, (_, i) => payment({ _id: hex(i + 1), merchantUid: `order-${i + 1}`, paymentAmount: 1000, updatedAt }));
    const { deps } = fakeDeps(payments);

    const first = await revenue.syncRevenueFacts({}, cols, { settings: SETTINGS, now: NOW, deps });
    expect(first).toMatchObject({ scanned: 400, more: true });
    expect(await cols.syncState.findOne({ _id: "revenue" })).toMatchObject({ pending: true, cursorId: hex(400) });

    const second = await revenue.syncRevenueFacts({}, cols, { settings: SETTINGS, now: new Date(NOW.getTime() + 600_000), deps });
    expect(second).toMatchObject({ scanned: 50, changed: 50, more: false });
    expect(cols.revenueFacts.rows.size).toBe(450);
    expect(await xp.readBucketTotal(cols, revenue.REVENUE_BUCKET)).toBe(2250);
    expect(await cols.syncState.findOne({ _id: "revenue" })).toMatchObject({ pending: false, cursorId: null });
  });
});
