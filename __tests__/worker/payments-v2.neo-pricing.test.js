/** @jest-environment node */
import { resolveProduct } from "../../worker/payments/catalog.js";
import { createOrder, createPayableOrder, markOrderPaid } from "../../worker/payments/orders.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "507f1f77bcf86cd799439011";
const PRODUCT = resolveProduct({ featureKey: "neo-operation-room-consultation" });
const OLD_PRODUCT = { ...PRODUCT, priceKRW: 20000, priceCoins: 200, monthlyCost: 2000 };

test("네오 신규 주문은 30,000원이며 기존 결제 수단을 유지한다", async () => {
  expect(PRODUCT).toMatchObject({ priceKRW: 30000, priceCoins: 300, monthlyCost: 3000,
    allowedPaymentMethods: ["PASS", "DIRECT_KRW", "MOONLIGHT_STONE"] });
  const db = makeFakePaymentDb();
  const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "neo-new" });
  expect(order.paymentAmount).toBe(30000);
});

test("네오 미결제 20,000원 주문은 기존 주문 ID로 30,000원에 재가격한다", async () => {
  const db = makeFakePaymentDb();
  const input = { userId: USER, idempotencyKey: "neo-pending" };
  const old = await createOrder(db, { ...input, product: OLD_PRODUCT });
  const next = await createPayableOrder(db, { ...input, product: PRODUCT });
  expect(next.merchantUid).toBe(old.merchantUid);
  expect(next.paymentAmount).toBe(30000);
  expect(next.pricingSnapshot).toMatchObject({ priceKRW: 30000, priceCoins: 300, monthlyCost: 3000 });
  expect(db.rows).toHaveLength(1);
});

test("이미 결제된 네오 주문의 20,000원 증빙은 신규 상담 주문에 덮이지 않는다", async () => {
  const db = makeFakePaymentDb();
  const input = { userId: USER, idempotencyKey: "neo-paid" };
  const old = await createOrder(db, { ...input, product: OLD_PRODUCT });
  await markOrderPaid(db, { orderId: old.merchantUid, order: old, pg: {
    pgTransactionId: "neo-old-tx", paidAt: new Date("2026-10-03T00:00:00Z"), method: "card",
    summary: { paymentId: "neo-old-tx", amount: 20000, currency: "KRW" },
  } });
  const next = await createPayableOrder(db, { ...input, product: PRODUCT });
  expect(next.merchantUid).not.toBe(old.merchantUid);
  expect(next.paymentAmount).toBe(30000);
  expect(db.rows.find(row => row.merchantUid === old.merchantUid)).toMatchObject({
    status: "paid", paymentAmount: 20000, pricingSnapshot: { priceKRW: 20000, priceCoins: 200 },
  });
});
