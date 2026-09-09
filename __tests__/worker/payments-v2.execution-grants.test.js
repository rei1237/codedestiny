/** @jest-environment node */
import { grantPurchaseEntitlement, revokePurchaseEntitlement } from "../../worker/payments/executions.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";
import { listProducts } from "../../worker/payments/catalog.js";

const order = { merchantUid: "order-1", userId: "64b000000000000000000001", requestId: "run-1", featureKey: "master-love-codex-compat", paymentAmount: 30000, status: "paid" };
const product = { featureKey: order.featureKey };
function fixture() {
  const db = makeFakePaymentDb({ uniqueKeys: [["_id"]] });
  db.rows.push({ ...order });
  return db;
}
test("duplicate confirmation grants one durable run", async () => {
  const db = fixture();
  const rows = await Promise.all(Array.from({ length: 10 }, () => grantPurchaseEntitlement(db, order, product)));
  expect(new Set(rows.map(r => String(r._id))).size).toBe(1);
  expect(db.rows.filter(r => r.entitlementId)).toHaveLength(1);
  expect(rows[0]).toMatchObject({ status: "granted", type: "service_run", paymentId: "order-1" });
});
test.each(["generation_failed", "completed"])("%s execution survives fulfillment replay", async status => {
  const db = fixture();
  const execution = { executionId: "native-service-id", userId: order.userId, featureId: order.featureKey,
    paymentId: order.merchantUid, requestId: order.requestId, status, result: { namingPrompt: { generatedPrompt: "stored result" } } };
  db.rows.push(execution);
  const before = JSON.stringify(execution);
  const right = await grantPurchaseEntitlement(db, order, product);
  expect(await grantPurchaseEntitlement(db, order, product)).toBe(right);
  expect(JSON.stringify(execution)).toBe(before);
  expect(db.rows.filter(row => row.executionId)).toHaveLength(1);
});

test("a competing upsert winner cannot fulfill a different order", async () => {
  const db = fixture();
  const update = db.findOneAndUpdate.bind(db);
  db.findOneAndUpdate = async (...args) => {
    const record = await update(...args);
    record.orderId = "another-order";
    return record;
  };
  await expect(grantPurchaseEntitlement(db, order, product)).rejects.toThrow();
});
test("refunded order cannot be granted or replayed", async () => {
  const db = fixture();
  await grantPurchaseEntitlement(db, order, product);
  db.rows[0].status = "refunded";
  await revokePurchaseEntitlement(db, "order-1");
  await expect(grantPurchaseEntitlement(db, order, product)).rejects.toThrow();
  expect(db.rows[1].status).toBe("refunded");
});

test("legacy execution revocation succeeds without a new purchase entitlement", async () => {
  const db = fixture();
  db.rows.push({ executionId: "legacy-run", orderId: order.merchantUid, accessMethod: "single", status: "completed" });
  expect((await revokePurchaseEntitlement(db, order.merchantUid)).matchedCount).toBe(1);
  expect(db.rows[1].status).toBe("refunded");
});
test("refund racing insert revokes newly inserted right", async () => {
  const db = fixture();
  const insert = db.findOneAndUpdate.bind(db);
  db.findOneAndUpdate = async (...args) => {
    const row = await insert(...args);
    db.rows[0].status = "refunded";
    return row;
  };
  await expect(grantPurchaseEntitlement(db, order, product)).rejects.toThrow();
  expect(db.rows[1].status).toBe("refunded");
});

test.each(listProducts().filter(item => item.billingType === "per_use").map(item => [item.featureKey, item]))(
  "%s: durable grant, failure retry, and refund converge", async (key, item) => {
    const db = makeFakePaymentDb({ uniqueKeys: [["_id"]] });
    const purchase = { ...order, featureKey: key, paymentAmount: item.priceKRW };
    db.rows.push(purchase);
    const right = await grantPurchaseEntitlement(db, purchase, item);
    const original = JSON.stringify(right);
    expect(JSON.stringify(await grantPurchaseEntitlement(db, purchase, item))).toBe(original);
    expect(db.rows.filter(row => row.entitlementId)).toHaveLength(1);
    purchase.status = "refunded";
    await revokePurchaseEntitlement(db, purchase.merchantUid);
    await expect(grantPurchaseEntitlement(db, purchase, item)).rejects.toThrow();
  },
);

test("a colliding truncated request key cannot reuse another run", async () => {
  const db = fixture();
  const first = { ...order, requestId: "x".repeat(180) };
  await grantPurchaseEntitlement(db, first, product);
  await expect(grantPurchaseEntitlement(db, { ...first, requestId: first.requestId + "other" }, product)).rejects.toThrow();
});
