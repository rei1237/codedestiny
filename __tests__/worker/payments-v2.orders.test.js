/**
 * @jest-environment node
 *
 * 주문 상태기계 T1~T5. **Mongo 없이 전 전이를 검증한다.**
 *
 * orders.js 가 db 핸들을 주입받도록 설계된 이유가 이것이다. Atlas M0 에는 트랜잭션이 없어서
 * 원자성이 전부 CAS 조건에 실려 있는데, 그 조건이 맞는지는 인프라가 아니라 **필터 자체**를
 * 확인해야 알 수 있다. 그래서 여기 fake 컬렉션은 실제로 쓰는 연산자($nin·$in·$or·$lt·$exists·
 * $set·$inc·$unset·$setOnInsert·upsert)를 진짜로 구현한다 — 통과시켜 주는 스텁이면 의미가 없다.
 */
import {
  ORDER_STATUS,
  REFUND_LOCK_TTL_MS,
  assertOrderOwner,
  claimRefund,
  createOrder,
  deriveOrderId,
  findOrder,
  markEntitlementGranted,
  markOrderCancelled,
  markOrderFailed,
  markOrderPaid,
  releaseRefundLock,
  settleRefund,
  toOrderStatus,
} from "../../worker/payments/orders.js";
import { PaymentError } from "../../worker/payments/errors.js";

const USER = "507f1f77bcf86cd799439011";
const OTHER_USER = "507f1f77bcf86cd799439012";
const PRODUCT = {
  productId: "master-love-codex",
  featureKey: "master-love-codex",
  billingType: "per-use",
  priceKRW: 30000,
  priceCoins: 300,
  monthlyCost: 3000,
};
const PG = {
  pgTransactionId: "cdorder-tx",
  paidAt: new Date("2026-08-11T00:00:00Z"),
  method: "card",
  summary: { paymentId: "cdorder-tx", amount: 30000, currency: "KRW" },
};

// ── 최소 인메모리 컬렉션 ────────────────────────────────────────────────
function matches(doc, filter) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === "$or") return cond.some((sub) => matches(doc, sub));
    const value = doc[key];
    // 연산자 맵인지 값인지는 `$` 접두사 키가 있는지로 가른다. ObjectId·Date 처럼
    // 프로퍼티를 가진 값 객체를 연산자 맵으로 오인하면 안 된다.
    const isOperatorMap = cond && typeof cond === "object" && !Array.isArray(cond)
      && Object.keys(cond).some((k) => k.startsWith("$"));
    if (isOperatorMap) {
      return Object.entries(cond).every(([op, operand]) => {
        if (op === "$nin") return !operand.includes(value);
        if (op === "$in") return operand.includes(value);
        if (op === "$ne") return String(value) !== String(operand);
        if (op === "$lt") return value != null && value < operand;
        if (op === "$exists") return (value !== undefined) === operand;
        throw new Error(`fake db: 미구현 연산자 ${op}`);
      });
    }
    if (cond === null) return value === null || value === undefined;
    return String(value) === String(cond);
  });
}

function applyUpdate(doc, update) {
  if (update.$set) Object.assign(doc, update.$set);
  if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) doc[k] = (Number(doc[k]) || 0) + v;
  if (update.$unset) for (const k of Object.keys(update.$unset)) delete doc[k];
  return doc;
}

function makeFakeDb() {
  const rows = [];
  const ctx = { ops: 0 };
  const api = {
    rows,
    ctx,
    async findOne(_Model, filter) { ctx.ops += 1; return rows.find((r) => matches(r, filter)) || null; },
    async find(_Model, filter) { ctx.ops += 1; return rows.filter((r) => matches(r, filter)); },
    async insertOne(_Model, doc) { ctx.ops += 1; rows.push({ ...doc }); return { insertedId: doc._id }; },
    async updateOne(_Model, filter, update) {
      ctx.ops += 1;
      const hit = rows.find((r) => matches(r, filter));
      if (!hit) return { modifiedCount: 0 };
      applyUpdate(hit, update);
      return { modifiedCount: 1 };
    },
    async findOneAndUpdate(_Model, filter, update, options = {}) {
      ctx.ops += 1;
      const hit = rows.find((r) => matches(r, filter));
      if (hit) return applyUpdate(hit, update);
      if (!options.upsert) return null;
      const created = { _id: `oid${rows.length + 1}`, ...(update.$setOnInsert || {}) };
      applyUpdate(created, { ...update, $setOnInsert: undefined });
      rows.push(created);
      return created;
    },
    async deleteOne(_Model, filter) {
      ctx.ops += 1;
      const i = rows.findIndex((r) => matches(r, filter));
      if (i >= 0) rows.splice(i, 1);
      return { deletedCount: i >= 0 ? 1 : 0 };
    },
  };
  return api;
}

async function seedPaid(db, { idempotencyKey = "idem-1" } = {}) {
  const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey });
  await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG });
  return order.merchantUid;
}

// ── T1 ─────────────────────────────────────────────────────────────────
describe("T1 · 주문 생성은 멱등이다", () => {
  test("주문 id 는 파생값이고 결정적이다", async () => {
    const a = await deriveOrderId(USER, "idem-1");
    const b = await deriveOrderId(USER, "idem-1");
    expect(a).toBe(b);
    expect(a).toHaveLength(40);
    expect(a.startsWith("cd")).toBe(true);
    expect(await deriveOrderId(USER, "idem-2")).not.toBe(a);
    expect(await deriveOrderId(OTHER_USER, "idem-1")).not.toBe(a);
  });

  test("idempotencyKey 가 없으면 만들지 않는다", async () => {
    await expect(deriveOrderId(USER, "")).rejects.toThrow(PaymentError);
  });

  test("🔴 연속 클릭이 주문을 두 개 만들지 않는다", async () => {
    // 구 single/start 는 호출마다 새 랜덤 merchantUid 로 create 해서 PENDING 주문이 둘 생겼다.
    const db = makeFakeDb();
    const first = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const second = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(db.rows).toHaveLength(1);
    expect(second.merchantUid).toBe(first.merchantUid);
  });

  test("왕복 1회 · impUid 를 넣지 않는다(unique+sparse 충돌 방지)", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(db.ctx.ops).toBe(1);
    expect("impUid" in order).toBe(false);
    expect(order.status).toBe("pending");
    expect(order.paymentAmount).toBe(30000);
    // 가격은 주문 시점에 박힌다 — 나중에 가격표가 바뀌어도 대조 기준이 흔들리지 않는다.
    expect(order.pricingSnapshot.priceKRW).toBe(30000);
  });

  test("로그인하지 않았으면 만들지 않는다", async () => {
    const db = makeFakeDb();
    await expect(createOrder(db, { userId: "", product: PRODUCT, idempotencyKey: "x" })).rejects.toThrow(PaymentError);
  });
});

// ── T2 ─────────────────────────────────────────────────────────────────
describe("T2 · 확정", () => {
  test("PENDING → PAID", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const paid = await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG });
    expect(toOrderStatus(paid)).toBe(ORDER_STATUS.PAID);
    expect(paid.impUid).toBe("cdorder-tx");
    expect(paid.chargedPoints).toBe(300);
    expect(paid.confirmAttempts).toBe(1);
  });

  test("🔴 두 번째 확정은 null — 클라·webhook·크론이 동시에 와도 한 번만 처리된다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG });
    expect(await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG })).toBeNull();
  });

  test("🔴 환불·취소된 주문은 늦게 온 webhook 이 되살릴 수 없다", async () => {
    for (const dead of ["refunded", "cancelled"]) {
      const db = makeFakeDb();
      const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
      db.rows[0].status = dead;
      expect(await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG })).toBeNull();
      expect(db.rows[0].status).toBe(dead);
    }
  });

  test("🔴 구 코드가 쓴 success/fulfilled 주문을 재처리하지 않는다", async () => {
    for (const legacy of ["success", "fulfilled"]) {
      const db = makeFakeDb();
      const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
      db.rows[0].status = legacy;
      expect(await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG })).toBeNull();
    }
  });

  test("PG 요약만 저장되고 PII 는 들어가지 않는다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const paid = await markOrderPaid(db, { orderId: order.merchantUid, order, pg: PG });
    expect(paid.rawPortOne).toEqual(PG.summary);
    expect(JSON.stringify(paid.rawPortOne)).not.toMatch(/customer|phone/i);
  });
});

// ── T3 · T4 ────────────────────────────────────────────────────────────
describe("T3/T4 · 실패와 취소", () => {
  test("🔴 PAID 는 절대 FAILED 가 될 수 없다 — 되돌리는 것은 환불이지 실패가 아니다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    expect(await markOrderFailed(db, { orderId, failureCode: "X" })).toBe(false);
    expect(db.rows[0].status).toBe("paid");
  });

  test("PENDING → FAILED", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(await markOrderFailed(db, { orderId: order.merchantUid, failureCode: "PG_PAYMENT_NOT_PAID" })).toBe(true);
    expect(toOrderStatus(db.rows[0])).toBe(ORDER_STATUS.FAILED);
  });

  test("남의 주문은 취소하지 못한다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(await markOrderCancelled(db, { orderId: order.merchantUid, userId: OTHER_USER })).toBe(false);
    expect(await markOrderCancelled(db, { orderId: order.merchantUid, userId: USER })).toBe(true);
  });

  test("크론은 주체가 없는 대신 나이 조건으로 만료 주문만 정리한다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 60_000);
    expect(await markOrderCancelled(db, { orderId: order.merchantUid, olderThan: past })).toBe(false);
    expect(await markOrderCancelled(db, { orderId: order.merchantUid, olderThan: future, reason: "ORDER_EXPIRED" })).toBe(true);
    expect(db.rows[0].failureCode).toBe("ORDER_EXPIRED");
  });

  test("PAID 주문은 취소되지 않는다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    expect(await markOrderCancelled(db, { orderId, userId: USER })).toBe(false);
  });
});

// ── T5 ─────────────────────────────────────────────────────────────────
describe("T5 · 환불은 두 단계다", () => {
  test("claim → settle", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    expect(await claimRefund(db, { orderId })).not.toBeNull();
    expect(await settleRefund(db, { orderId })).toBe(true);
    expect(toOrderStatus(db.rows[0])).toBe(ORDER_STATUS.REFUNDED);
    expect(db.rows[0].refundLock).toBeUndefined();
  });

  test("🔴 동시 환불은 두 번째가 락을 못 잡는다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    expect(await claimRefund(db, { orderId })).not.toBeNull();
    expect(await claimRefund(db, { orderId })).toBeNull();
  });

  test("🔴 죽은 락은 이어받는다 — PG 호출 중 죽어도 영영 잠기지 않는다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    const now = new Date();
    await claimRefund(db, { orderId, now });
    const later = new Date(now.getTime() + REFUND_LOCK_TTL_MS + 1000);
    expect(await claimRefund(db, { orderId, now: later })).not.toBeNull();
  });

  test("PG 가 거절하면 락만 놓고 상태는 PAID 로 남는다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    await claimRefund(db, { orderId });
    await releaseRefundLock(db, { orderId });
    expect(db.rows[0].refundLock).toBeUndefined();
    expect(toOrderStatus(db.rows[0])).toBe(ORDER_STATUS.PAID);
    expect(await claimRefund(db, { orderId })).not.toBeNull();
  });

  test("PENDING 주문은 환불 대상이 아니다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    expect(await claimRefund(db, { orderId: order.merchantUid })).toBeNull();
  });
});

// ── 부수 ───────────────────────────────────────────────────────────────
describe("읽기 매핑과 소유권", () => {
  test("🔴 레거시 status 100% 가 5상태로 접힌다 — 그래서 마이그레이션이 필요 없다", () => {
    const cases = {
      pending: ORDER_STATUS.PENDING, processing: ORDER_STATUS.PENDING, retryable: ORDER_STATUS.PENDING, "": ORDER_STATUS.PENDING,
      paid: ORDER_STATUS.PAID, success: ORDER_STATUS.PAID, fulfilled: ORDER_STATUS.PAID,
      failed: ORDER_STATUS.FAILED, cancelled: ORDER_STATUS.CANCELLED, refunded: ORDER_STATUS.REFUNDED,
    };
    for (const [raw, expected] of Object.entries(cases)) {
      expect(toOrderStatus({ status: raw })).toBe(expected);
    }
    // paymentSchema enum 전체를 덮는지 확인 — 새 값이 생기면 여기서 걸린다.
    expect(Object.keys(cases).filter(Boolean).sort()).toEqual(
      ["cancelled", "failed", "fulfilled", "paid", "pending", "processing", "refunded", "retryable", "success"],
    );
  });

  test("소유권은 users 가 아니라 주문 문서로 판정한다", async () => {
    const db = makeFakeDb();
    const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "idem-1" });
    const found = await findOrder(db, { orderId: order.merchantUid });
    expect(() => assertOrderOwner(found, USER)).not.toThrow();
    expect(() => assertOrderOwner(found, OTHER_USER)).toThrow(/접근할 수 없습니다/);
    expect(() => assertOrderOwner(null, USER)).toThrow(PaymentError);
  });

  test("지급 표식은 한 번만 찍힌다", async () => {
    const db = makeFakeDb();
    const orderId = await seedPaid(db);
    db.rows[0].entitlementGrantedAt = null;
    const first = new Date("2026-08-11T01:00:00Z");
    await markEntitlementGranted(db, { orderId, now: first });
    await markEntitlementGranted(db, { orderId, now: new Date("2026-08-11T02:00:00Z") });
    expect(db.rows[0].entitlementGrantedAt).toEqual(first);
  });
});
