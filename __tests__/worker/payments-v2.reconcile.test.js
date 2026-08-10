/**
 * @jest-environment node
 *
 * 크론 정리.
 *
 * 트랜잭션이 없는 설계는 "모든 중단점이 복구 가능하다"까지만 보장한다. **복구를 실제로 실행하는
 * 주체**가 없으면 그 보장은 종이다. 이 테스트가 확인하는 것은 그 주체가 (a) 고쳐야 할 것만 고르고
 * (b) 하나의 실패가 나머지를 막지 않으며 (c) 정상 흐름을 앞질러 끼어들지 않는다는 것이다.
 */
import {
  PENDING_EXPIRY_MS,
  expireStalePendingOrders,
  regrantUnfulfilledOrders,
  releaseStaleRefundLocks,
  runPaymentReconcile,
} from "../../worker/payments/reconcile.js";
import { REFUND_LOCK_TTL_MS } from "../../worker/payments/orders.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const NOW = new Date("2026-08-11T12:00:00Z");
const ago = (ms) => new Date(NOW.getTime() - ms);

async function seed(db, rows) {
  for (const row of rows) await db.insertOne({}, row);
}

describe("PAID 인데 권한이 없는 주문", () => {
  test("🔴 다시 지급한다 — 돈은 받았는데 안 열리는 상태를 사람이 찾지 않아도 된다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd1", status: "paid", entitlementGrantedAt: null, updatedAt: ago(10 * 60_000) },
    ]);
    const granted = [];
    const report = await regrantUnfulfilledOrders(db, { grant: async (o) => granted.push(o.merchantUid), now: NOW });
    expect(report).toMatchObject({ scanned: 1, repaired: 1, failed: 0 });
    expect(granted).toEqual(["cd1"]);
  });

  test("🔴 방금 확정된 주문은 건드리지 않는다 — 정상 흐름이 마무리 중일 수 있다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd1", status: "paid", entitlementGrantedAt: null, updatedAt: ago(5_000) },
    ]);
    const report = await regrantUnfulfilledOrders(db, { grant: async () => {}, now: NOW });
    expect(report.scanned).toBe(0);
  });

  test("이미 지급된 주문은 대상이 아니다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd1", status: "paid", entitlementGrantedAt: ago(60_000), updatedAt: ago(10 * 60_000) },
    ]);
    expect((await regrantUnfulfilledOrders(db, { grant: async () => {}, now: NOW })).scanned).toBe(0);
  });

  test("구 코드가 쓴 success/fulfilled 도 복구 대상이다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd1", status: "success", entitlementGrantedAt: null, updatedAt: ago(10 * 60_000) },
      { merchantUid: "cd2", status: "fulfilled", entitlementGrantedAt: null, updatedAt: ago(10 * 60_000) },
    ]);
    expect((await regrantUnfulfilledOrders(db, { grant: async () => {}, now: NOW })).repaired).toBe(2);
  });

  test("PENDING·환불 주문은 지급 대상이 아니다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd1", status: "pending", entitlementGrantedAt: null, updatedAt: ago(10 * 60_000) },
      { merchantUid: "cd2", status: "refunded", entitlementGrantedAt: null, updatedAt: ago(10 * 60_000) },
    ]);
    expect((await regrantUnfulfilledOrders(db, { grant: async () => {}, now: NOW })).scanned).toBe(0);
  });

  test("🔴 한 건이 실패해도 나머지는 계속 처리한다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd1", status: "paid", entitlementGrantedAt: null, updatedAt: ago(10 * 60_000) },
      { merchantUid: "cd2", status: "paid", entitlementGrantedAt: null, updatedAt: ago(10 * 60_000) },
    ]);
    const report = await regrantUnfulfilledOrders(db, {
      grant: async (o) => { if (o.merchantUid === "cd1") throw new Error("boom"); },
      now: NOW,
    });
    expect(report).toMatchObject({ scanned: 2, repaired: 1, failed: 1 });
  });
});

describe("오래된 PENDING 주문", () => {
  test("유예를 넘긴 것만 취소한다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd-old", status: "pending", createdAt: ago(PENDING_EXPIRY_MS + 60_000) },
      { merchantUid: "cd-new", status: "pending", createdAt: ago(60_000) },
    ]);
    const report = await expireStalePendingOrders(db, { now: NOW });
    expect(report).toMatchObject({ scanned: 1, cancelled: 1 });
    expect(db.rows.find((r) => r.merchantUid === "cd-old").status).toBe("cancelled");
    expect(db.rows.find((r) => r.merchantUid === "cd-old").failureCode).toBe("ORDER_EXPIRED");
    expect(db.rows.find((r) => r.merchantUid === "cd-new").status).toBe("pending");
  });

  test("🔴 PAID 주문은 절대 취소되지 않는다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [{ merchantUid: "cd1", status: "paid", createdAt: ago(PENDING_EXPIRY_MS * 10) }]);
    expect((await expireStalePendingOrders(db, { now: NOW })).scanned).toBe(0);
    expect(db.rows[0].status).toBe("paid");
  });
});

describe("죽은 환불 락", () => {
  test("TTL 을 넘긴 락을 놓아 준다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd1", status: "paid", refundLock: ago(REFUND_LOCK_TTL_MS + 10_000) },
    ]);
    const report = await releaseStaleRefundLocks(db, { now: NOW });
    expect(report).toMatchObject({ scanned: 1, released: 1 });
    expect(db.rows[0].refundLock).toBeUndefined();
    // 상태는 건드리지 않는다 — 환불이 실패한 것이지 결제가 취소된 것이 아니다.
    expect(db.rows[0].status).toBe("paid");
  });

  test("살아 있는 락은 그대로 둔다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [{ merchantUid: "cd1", status: "paid", refundLock: ago(10_000) }]);
    expect((await releaseStaleRefundLocks(db, { now: NOW })).scanned).toBe(0);
    expect(db.rows[0].refundLock).toBeDefined();
  });
});

describe("크론 진입점", () => {
  test("셋을 모두 돌고 각각의 보고를 돌려준다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd1", status: "paid", entitlementGrantedAt: null, updatedAt: ago(10 * 60_000) },
      { merchantUid: "cd2", status: "pending", createdAt: ago(PENDING_EXPIRY_MS + 60_000) },
      { merchantUid: "cd3", status: "paid", entitlementGrantedAt: ago(1), refundLock: ago(REFUND_LOCK_TTL_MS + 10_000) },
    ]);
    const report = await runPaymentReconcile(db, { grant: async () => {}, now: NOW });
    expect(report.regrant.repaired).toBe(1);
    expect(report.expired.cancelled).toBe(1);
    expect(report.locks.released).toBe(1);
  });

  test("할 일이 없으면 조용히 0 을 돌려준다", async () => {
    const db = makeFakePaymentDb();
    const report = await runPaymentReconcile(db, { grant: async () => {}, now: NOW });
    expect(report.regrant.scanned).toBe(0);
    expect(report.expired.scanned).toBe(0);
    expect(report.locks.scanned).toBe(0);
  });
});
