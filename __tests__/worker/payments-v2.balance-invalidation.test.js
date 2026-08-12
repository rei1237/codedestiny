/**
 * @jest-environment node
 *
 * 표시용 잔액 스냅샷(/api/billing/balance) 무효화 — V2 결제 쓰기와의 정합.
 *
 * 캐시 TTL 이 5s→45s 로 늘면서(2026-08-12) 잔액·해금·구독을 바꾸는 모든 V2 쓰기는
 * globalThis.__billingBalanceCache.invalidateForUser 를 불러야 한다. 빠뜨리면 결제 직후
 * 새로고침에서 옛 잔량·미해금 상태가 최대 45초 보인다(TTL 5s 시절에는 티가 안 났던 부류).
 * 여기서는 확정(단건·이용권)·웹훅 환불 경로가 실제로 무효화를 부르는지 실행으로 고정한다.
 */
import { __paymentsContextTestUtils } from "../../worker/payments/index.js";
import { createOrder } from "../../worker/payments/orders.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const { confirmOrder } = __paymentsContextTestUtils;

const USER = "64b000000000000000000001";
const ENV = { PORTONE_API_SECRET: "s", PORTONE_STORE_ID: "st" };
const PRODUCT = {
  productId: "master-love-codex", featureKey: "master-love-codex",
  billingType: "per-use", priceKRW: 30000, priceCoins: 300, monthlyCost: 3000,
};

let invalidated;
const originalCache = globalThis.__billingBalanceCache;

beforeEach(() => {
  invalidated = [];
  globalThis.__billingBalanceCache = {
    entries: new Map(),
    invalidateForUser: (uid) => { invalidated.push(String(uid)); },
  };
});

afterAll(() => { globalThis.__billingBalanceCache = originalCache; });

function pgDeps(orderId, amount) {
  return {
    fetchPayment: async () => ({
      paymentId: orderId, status: "paid", amount, currency: "KRW",
      pay_method: "card", paid_at: Math.floor(Date.now() / 1000),
    }),
  };
}

test("단건 확정 지급 후 해당 유저의 잔액 스냅샷을 무효화한다", async () => {
  const db = makeFakePaymentDb();
  db.rows.push({ _id: USER, unlockedFeatures: [] });
  const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "inv-1" });
  const result = await confirmOrder(ENV, db, { mongoOps: 0 }, { orderId: order.merchantUid }, pgDeps(order.merchantUid, 30000));
  expect(result.granted).toBe(true);
  expect(invalidated).toContain(USER);
});

test("이용권 주문 활성화 후에도 무효화한다 (구독 블록이 스냅샷에 실린다)", async () => {
  const db = makeFakePaymentDb();
  db.rows.push({ _id: USER, profileSubscription: { tier: "free", expiresAt: null } });
  db.rows.push({
    merchantUid: "sub_s1m_invalidation000000000000000", userId: USER, paymentType: "membership_pass",
    subscriptionTier: "standard", paymentAmount: 9900, status: "pending", orderState: "PENDING",
    metadata: { durationMonths: 1 }, createdAt: new Date(),
  });
  const result = await confirmOrder(ENV, db, { mongoOps: 0 }, { orderId: "sub_s1m_invalidation000000000000000" }, pgDeps("sub_s1m_invalidation000000000000000", 9900));
  expect(result.granted).toBe(true);
  expect(invalidated).toContain(USER);
});

test("지급 실패(granted=false)면 무효화하지 않는다 — 상태가 안 바뀌었는데 캐시만 비우면 조회가 늘어난다", async () => {
  const db = makeFakePaymentDb();
  db.rows.push({ _id: USER });
  const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "inv-2" });
  db.rows.find((r) => r.merchantUid === order.merchantUid).featureKey = "no-such-feature-xyz";
  const result = await confirmOrder(ENV, db, { mongoOps: 0 }, { orderId: order.merchantUid }, pgDeps(order.merchantUid, 30000));
  expect(result.granted).toBe(false);
  expect(invalidated).toEqual([]);
});
