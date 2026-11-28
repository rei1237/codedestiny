/** @jest-environment node */
// 2026-11-28 S8: 운영 비상 판매 중지(env PAYMENT_SALE_PAUSED_FEATURE_KEYS)는 새 PG 주문만 막는다.
import { assertProductSaleNotPaused, resolveProduct } from "../../worker/payments/catalog.js";
import { createOrder } from "../../worker/payments/orders.js";
import { contractFor } from "../../worker/payments/errors.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "507f1f77bcf86cd799439011";
const product = resolveProduct({ featureKey: "new-year-ai-consultation" });
const order = (env, idempotencyKey = "pause-1", p = product) => createOrder(makeFakePaymentDb(), { userId: USER, product: p, idempotencyKey, env });

test("중지 목록에 있는 상품의 새 주문은 409 PRODUCT_SALE_PAUSED", async () => {
  await expect(order({ PAYMENT_SALE_PAUSED_FEATURE_KEYS: " other-key , new-year-ai-consultation " }))
    .rejects.toMatchObject({ code: "PRODUCT_SALE_PAUSED" });
  expect(contractFor("PRODUCT_SALE_PAUSED")).toMatchObject({ status: 409 });
  await expect(order({ PAYMENT_SALE_PAUSED_FEATURE_KEYS: "*" })).rejects.toMatchObject({ code: "PRODUCT_SALE_PAUSED" });
});

test("목록이 비었거나 다른 상품만 있으면 주문은 그대로 만들어진다", async () => {
  expect((await order({})).merchantUid).toBeTruthy();
  expect((await order({ PAYMENT_SALE_PAUSED_FEATURE_KEYS: "" })).merchantUid).toBeTruthy();
  expect((await order({ PAYMENT_SALE_PAUSED_FEATURE_KEYS: "life-book-ai-consultation" })).merchantUid).toBeTruthy();
});

test("판정은 env 만 본다 — 확정·환불·복구 경로는 이 함수를 부르지 않는다", () => {
  expect(() => assertProductSaleNotPaused(product, undefined)).not.toThrow();
  expect(() => assertProductSaleNotPaused("new-year-ai-consultation", { PAYMENT_SALE_PAUSED_FEATURE_KEYS: "new-year-ai-consultation" })).toThrow();
});
