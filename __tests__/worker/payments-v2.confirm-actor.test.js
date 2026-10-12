/**
 * @jest-environment node
 *
 * 확정 행위자 — 소유자 검사는 기본이 닫힘이다(C1, 2026-10-13).
 *
 * 예전에는 `if (actorUserId) assertOrderOwner(...)` 였다. 행위자 인자를 빠뜨린 호출부는 소유자 검사를
 * 건너뛴 채 남의 주문을 확정할 수 있었고, 웹훅·크론은 그 열린 길을 쓰도록 짜여 있었다. 지금은 행위자
 * (actorUserId)도 명시적 시스템 행위자(systemActor: true)도 없으면 PG 조회·상태 변경 전에 막는다.
 * PG 사실 대조(verifyPgPayment)는 시스템 경로도 건너뛰지 않는다 — systemActor 가 면제하는 것은 소유자
 * 검사 하나뿐이다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __paymentsContextTestUtils } from "../../worker/payments/index.js";
import { classify } from "../../worker/payments/errors.js";
import { createPaymentContext } from "../../worker/payments/db.js";
import { createOrder, toOrderStatus } from "../../worker/payments/orders.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const { confirmOrder } = __paymentsContextTestUtils;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ENV = { PORTONE_API_SECRET: "s", PORTONE_STORE_ID: "st" };
const USER = "507f1f77bcf86cd799439011";
const OTHER = "507f1f77bcf86cd799439012";
const PRODUCT = {
  productId: "master-love-codex",
  featureKey: "master-love-codex",
  billingType: "per-use",
  priceKRW: 30000,
  priceCoins: 300,
  monthlyCost: 3000,
};

async function seed() {
  const db = makeFakePaymentDb();
  const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "actor-1" });
  await db.insertOne({}, { _id: USER });
  db.rows[1]._id = USER;
  return { db, order };
}

/** PG 조회 횟수를 센다 — 거부는 PG 를 부르기 전에 일어나야 한다. */
function pgSpy(orderId) {
  const spy = { calls: 0 };
  spy.fetchPayment = async () => {
    spy.calls += 1;
    return {
      paymentId: orderId, status: "paid", amount: 30000, currency: "KRW",
      pay_method: "card", paid_at: 1786000000, receipt_url: null,
    };
  };
  return spy;
}

const run = (db, input, fetchPayment) =>
  confirmOrder(ENV, createPaymentContext({ requestId: "r1", route: "POST /confirm" }), input, {
    withDb: (_env, _ctx, fn) => fn(db),
    deps: { fetchPayment },
  });

async function rejection(promise) {
  try { await promise; } catch (error) { return error; }
  return null;
}

describe("확정 행위자 — 소유자 검사는 기본이 닫힘", () => {
  test("🔴 행위자도 systemActor 도 없으면 거부한다 — PG 조회도 상태 변경도 없다", async () => {
    const { db, order } = await seed();
    const pg = pgSpy(order.merchantUid);

    const caught = await rejection(run(db, { orderId: order.merchantUid }, pg.fetchPayment));

    expect(caught).not.toBeNull();
    expect(classify(caught).code).toBe("INTERNAL_ERROR");
    expect(classify(caught).status).toBe(500);
    expect(pg.calls).toBe(0);
    expect(toOrderStatus(db.rows[0])).toBe("PENDING");
    expect(db.rows[0].entitlementGrantedAt).toBeFalsy();
  });

  test("🔴 systemActor 는 엄격히 true 만 인정한다 — 문자열·숫자 같은 truthy 값은 거부", async () => {
    for (const systemActor of ["true", "yes", 1, {}]) {
      const { db, order } = await seed();
      const pg = pgSpy(order.merchantUid);

      const caught = await rejection(run(db, { orderId: order.merchantUid, systemActor }, pg.fetchPayment));

      expect(classify(caught).code).toBe("INTERNAL_ERROR");
      expect(pg.calls).toBe(0);
      expect(toOrderStatus(db.rows[0])).toBe("PENDING");
    }
  });

  test("systemActor: true 는 소유자 검사 없이 PG 재조회 결과로 확정한다(웹훅·크론 경로)", async () => {
    const { db, order } = await seed();
    const pg = pgSpy(order.merchantUid);

    const result = await run(db, { orderId: order.merchantUid, systemActor: true }, pg.fetchPayment);

    expect(pg.calls).toBe(1); // 시스템 경로도 PG 사실 대조를 건너뛰지 않는다
    expect(result.granted).toBe(true);
    expect(toOrderStatus(db.rows[0])).toBe("PAID");
  });

  test("🔴 systemActor: true 도 PG 사실 대조는 면제받지 못한다 — 금액이 어긋나면 FAILED", async () => {
    const { db, order } = await seed();
    const fetchPayment = async () => ({
      paymentId: order.merchantUid, status: "paid", amount: 100, currency: "KRW",
      pay_method: "card", paid_at: 1786000000, receipt_url: null,
    });

    const caught = await rejection(run(db, { orderId: order.merchantUid, systemActor: true }, fetchPayment));

    expect(classify(caught).code).toBe("AMOUNT_MISMATCH");
    expect(toOrderStatus(db.rows[0])).toBe("FAILED");
  });

  test("🔴 남의 행위자는 systemActor: true 가 함께 와도 소유자 검사를 받는다", async () => {
    const { db, order } = await seed();
    const pg = pgSpy(order.merchantUid);

    const caught = await rejection(
      run(db, { orderId: order.merchantUid, actorUserId: OTHER, systemActor: true }, pg.fetchPayment),
    );

    expect(classify(caught).code).toBe("ORDER_FORBIDDEN");
    expect(classify(caught).status).toBe(403);
    expect(pg.calls).toBe(0);
    expect(toOrderStatus(db.rows[0])).toBe("PENDING");
  });

  test("주문 소유자 본인은 통과한다", async () => {
    const { db, order } = await seed();
    const pg = pgSpy(order.merchantUid);

    const result = await run(db, { orderId: order.merchantUid, actorUserId: USER }, pg.fetchPayment);

    expect(result.granted).toBe(true);
    expect(toOrderStatus(db.rows[0])).toBe("PAID");
  });
});

describe("확정 행위자 — 호출부 고정", () => {
  const source = readFileSync(path.join(ROOT, "worker/payments/index.js"), "utf8");

  test("사용자 세션 호출부는 systemActor 를 함께 싣지 않는다", () => {
    // 행위자를 넘기는 경로(주문 확정·결제 확정·이용권 확정·운세 복구)가 systemActor 를 섞으면 검사가 흐려진다.
    expect(source).not.toMatch(/actorUserId\s*:\s*userId[^}\n]*systemActor/);
    expect(source).not.toMatch(/systemActor[^}\n]*actorUserId\s*:\s*userId/);
  });

  test("systemActor: true 는 사용자 세션이 없는 5곳(웹훅 판정·웹훅 확정·재조정 정산·웹훅 재생·할인 복구)만 쓴다", () => {
    const hits = source.match(/systemActor\s*:\s*true/g) || [];
    expect(hits).toHaveLength(5);
  });
});
