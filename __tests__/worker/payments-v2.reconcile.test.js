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

  test("🔴 구 코드가 쓴 success/fulfilled 는 재지급 대상이 **아니다** (2026-08-12 크론 배선 시 확정)", async () => {
    // 레거시 성공 주문은 entitlementGrantedAt 을 쓴 적이 없어 전부 null 이다 — 레거시 상태를
    // 포함하면 역사적 주문 전체가 매 크론 재지급 스캔에 걸리고, 구 해금 신원과 V2 신원이 다른
    // 상품은 중복 entitlement 문서를 만든다. 레거시 복구는 구 크론(payment-reconcile-task) 몫이고,
    // 두 크론의 이중 처리 경계가 status:"paid"(V2 전용 기록값)다.
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd1", status: "success", entitlementGrantedAt: null, updatedAt: ago(10 * 60_000) },
      { merchantUid: "cd2", status: "fulfilled", entitlementGrantedAt: null, updatedAt: ago(10 * 60_000) },
      { merchantUid: "cd3", status: "paid", entitlementGrantedAt: null, updatedAt: ago(10 * 60_000) },
    ]);
    const result = await regrantUnfulfilledOrders(db, { grant: async () => {}, now: NOW });
    expect(result.scanned).toBe(1);
    expect(result.repaired).toBe(1);
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
      { merchantUid: "cd-old", status: "pending", createdAt: ago(PENDING_EXPIRY_MS + 60_000), metadata: { reconcile: { lastPgStatus: "ready" } } },
      { merchantUid: "cd-new", status: "pending", createdAt: ago(60_000), metadata: { reconcile: { lastPgStatus: "ready" } } },
    ]);
    const report = await expireStalePendingOrders(db, { now: NOW });
    expect(report).toMatchObject({ scanned: 1, cancelled: 1 });
    expect(db.rows.find((r) => r.merchantUid === "cd-old").status).toBe("cancelled");
    expect(db.rows.find((r) => r.merchantUid === "cd-old").failureCode).toBe("ORDER_EXPIRED");
    expect(db.rows.find((r) => r.merchantUid === "cd-new").status).toBe("pending");
  });

  test("🔴 PG 와 대조한 적 없는 PENDING 은 취소하지 않는다 — 취소하면 돈만 나가고 되살릴 주체가 없다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd-unprobed", status: "pending", createdAt: ago(PENDING_EXPIRY_MS * 10) },
      { merchantUid: "cd-claimed-only", status: "pending", createdAt: ago(PENDING_EXPIRY_MS * 10), metadata: { reconcile: { attempts: 1 } } },
    ]);
    expect(await expireStalePendingOrders(db, { now: NOW })).toEqual({ scanned: 0, cancelled: 0 });
    expect(db.rows.every((r) => r.status === "pending")).toBe(true);
  });

  test("🔴 PortOne 이 PAID 라고 본 PENDING 은 취소하지 않는다 — 구 태스크의 정산(settleOrderFromReconcile) 몫이다", async () => {
    const db = makeFakePaymentDb();
    await seed(db, [
      { merchantUid: "cd-pg-paid", status: "pending", createdAt: ago(PENDING_EXPIRY_MS * 10), metadata: { reconcile: { lastPgStatus: "paid" } } },
      { merchantUid: "cd-pg-failed", status: "pending", createdAt: ago(PENDING_EXPIRY_MS * 10), metadata: { reconcile: { lastPgStatus: "failed" } } },
    ]);
    expect(await expireStalePendingOrders(db, { now: NOW })).toEqual({ scanned: 1, cancelled: 1 });
    expect(db.rows.find((r) => r.merchantUid === "cd-pg-paid").status).toBe("pending");
    expect(db.rows.find((r) => r.merchantUid === "cd-pg-failed").status).toBe("cancelled");
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
      { merchantUid: "cd2", status: "pending", createdAt: ago(PENDING_EXPIRY_MS + 60_000), metadata: { reconcile: { lastPgStatus: "ready" } } },
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
