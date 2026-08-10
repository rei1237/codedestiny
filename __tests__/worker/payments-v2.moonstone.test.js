/**
 * @jest-environment node
 *
 * 월정석 차감 — 트랜잭션을 대체하는 **쓰기 순서**의 검증.
 *
 * lot 산수 자체는 monthly-credit-lots.js 가 이미 검증돼 있고 동결 대상이다. 여기서 확인하는 것은
 * 그 위의 순서와 되돌림이다: 예약이 효과보다 먼저 오는가, 실패했을 때 사용자가 과금되지 않은 채로
 * 남는가, 그리고 재시도가 데드락에 빠지지 않는가. 틀리면 돈이 사라지는 부분이 정확히 여기다.
 */
import { spendMoonstone, settleOrphanSpends, __moonstoneTestUtils } from "../../worker/payments/moonstone.js";
import { PaymentError, classify } from "../../worker/payments/errors.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "507f1f77bcf86cd799439011";
const PRODUCT = {
  productId: "master-love-codex",
  featureKey: "master-love-codex",
  label: "마스터 인연의 서",
  priceKRW: 30000,
  priceCoins: 300,
  monthlyCost: 3000,
};
const PURCHASE = "cdorder1";

// 프로덕션에 실제로 존재하는 unique 인덱스를 모사한다(2026-08-11 실측 확인).
// 예약 멱등이 이 제약에 기대므로, fixture 가 갖고 있지 않으면 중복 테스트가 아무것도 검증하지 않는다.
const makeLedgerDb = () => makeFakePaymentDb({ uniqueKeys: [["userId", "type", "sourceId"]] });

function consumeReturning(result) {
  const calls = [];
  const fn = async (args) => { calls.push(args); return result; };
  fn.calls = calls;
  return fn;
}

const OK = { ok: true, reason: "OK", balance: 5000, user: null };

async function expectError(fn, code, status) {
  let caught = null;
  try { await fn(); } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(PaymentError);
  expect(caught.code).toBe(code);
  expect(classify(caught).status).toBe(status);
  return caught;
}

describe("정상 경로", () => {
  test("🔴 원장 예약이 차감보다 먼저 쓰인다", async () => {
    const db = makeLedgerDb();
    const order = [];
    const consumeLots = async () => { order.push("deduct"); return OK; };
    const spy = {
      ...db,
      async insertOne(Model, doc) { order.push("reserve"); return db.insertOne(Model, doc); },
      async updateOne(Model, f, u) { order.push("settle"); return db.updateOne(Model, f, u); },
    };

    await spendMoonstone(spy, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, { consumeLots });
    expect(order).toEqual(["reserve", "deduct", "settle"]);
  });

  test("정산 후 원장은 관측된 잔액을 갖는다", async () => {
    const db = makeLedgerDb();
    const result = await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, {
      consumeLots: consumeReturning(OK),
    });
    expect(result.balance).toBe(5000);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].settledAt).toBeInstanceOf(Date);
    expect(db.rows[0].afterBalance).toBe(5000);
    expect(db.rows[0].beforeBalance).toBe(8000); // 5000 + 3000
    expect(db.rows[0].amount).toBe(3000);
  });

  test("예약 시점에는 settledAt 이 없다 — 그것이 '미정산' 표식이다", async () => {
    const db = makeLedgerDb();
    const consumeLots = async () => {
      // 차감 시점에 원장을 들여다본다.
      expect(db.rows[0].settledAt).toBeUndefined();
      return OK;
    };
    await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, { consumeLots });
  });

  test("차감 호출에 멱등 키가 전달된다", async () => {
    const db = makeLedgerDb();
    const consumeLots = consumeReturning(OK);
    await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, { consumeLots });
    expect(consumeLots.calls[0]).toMatchObject({ amount: 3000, pushRequestId: PURCHASE, incrementUsed: true });
  });
});

describe("실패하면 사용자는 과금되지 않은 채로 남는다", () => {
  test("🔴 잔액 부족이면 예약을 걷어내고 402 를 낸다", async () => {
    const db = makeLedgerDb();
    await expectError(
      () => spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, {
        consumeLots: consumeReturning({ ok: false, reason: "INSUFFICIENT", balance: 100 }),
      }),
      "INSUFFICIENT_MOONSTONE",
      402,
    );
    expect(db.rows).toHaveLength(0);
  });

  test("🔴 경합 실패도 예약을 걷어낸다 — 안 그러면 재시도가 영영 409 만 받는 데드락이 된다", async () => {
    const db = makeLedgerDb();
    await expectError(
      () => spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, {
        consumeLots: consumeReturning({ ok: false, reason: "CONTENDED", balance: null }),
      }),
      "MOONSTONE_CONTENDED",
      409,
    );
    expect(db.rows).toHaveLength(0);

    // 예약이 걷혔으므로 같은 purchaseId 재시도가 정상 진행된다.
    const retry = await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, {
      consumeLots: consumeReturning(OK),
    });
    expect(retry.balance).toBe(5000);
  });

  test("🔴 경합은 503 이 아니라 409 다", async () => {
    // 5회 write 가 모두 경합으로 실패한 것은 의존 서비스 장애가 아니라 우리 쪽 동시성이다.
    // 503 으로 내면 클라 재시도 폭풍이 admission 포화를 더 키운다.
    const db = makeLedgerDb();
    const error = await expectError(
      () => spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, {
        consumeLots: consumeReturning({ ok: false, reason: "CONTENDED" }),
      }),
      "MOONSTONE_CONTENDED",
      409,
    );
    expect(classify(error).retryable).toBe(true);
  });

  test("월정석으로 살 수 없는 상품은 차감을 시도조차 하지 않는다", async () => {
    const db = makeLedgerDb();
    const consumeLots = consumeReturning(OK);
    await expectError(
      () => spendMoonstone(db, { userId: USER, product: { ...PRODUCT, monthlyCost: 0 }, purchaseId: PURCHASE }, { consumeLots }),
      "PRODUCT_NOT_FOUND",
      404,
    );
    expect(consumeLots.calls).toHaveLength(0);
    expect(db.rows).toHaveLength(0);
  });
});

describe("재생과 동시성", () => {
  test("이미 정산된 구매를 다시 부르면 그대로 성공을 돌려준다", async () => {
    const db = makeLedgerDb();
    await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, { consumeLots: consumeReturning(OK) });

    const consumeLots = consumeReturning(OK);
    const replay = await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, { consumeLots });
    expect(replay.replayed).toBe(true);
    expect(replay.balance).toBe(5000);
    // 재생은 차감을 다시 하지 않는다.
    expect(consumeLots.calls).toHaveLength(0);
    expect(db.rows).toHaveLength(1);
  });

  test("🔴 형제 요청이 차감 중이면 409 다 — 402 로 내면 카드로 이중과금된다", async () => {
    const db = makeLedgerDb();
    // 미정산 예약만 있는 상태(형제가 차감 중)를 만든다.
    await db.insertOne({}, { userId: USER, type: __moonstoneTestUtils.SPEND, sourceId: PURCHASE, amount: 3000 });
    await expectError(
      () => spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, { consumeLots: consumeReturning(OK) }),
      "MOONSTONE_IN_PROGRESS",
      409,
    );
  });

  test("🔴 차감은 됐는데 원장을 못 남기고 죽은 경우, 이어서 마무리한다", async () => {
    // recentConsumeRequestIds 에 우리 sourceId 가 있으면 CAS 는 ALREADY_PROCESSED 를 준다.
    // 그건 "이미 차감됐다"는 증거이므로 다시 차감하지 않고 정산·지급만 이어간다.
    const db = makeLedgerDb();
    const result = await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }, {
      consumeLots: consumeReturning({ ok: false, reason: "ALREADY_PROCESSED", balance: null, user: { profileSubscription: { membershipCreditBalance: 4200 } } }),
    });
    expect(result.replayed).toBe(true);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].settledAt).toBeInstanceOf(Date);
    expect(db.rows[0].afterBalance).toBe(4200);
  });
});

describe("크론: 고아 예약 정리", () => {
  const OLD = new Date(Date.now() - 10 * 60_000);

  test("차감 증거가 있으면 정산한다", async () => {
    const db = makeLedgerDb();
    await db.insertOne({}, { userId: USER, type: __moonstoneTestUtils.SPEND, sourceId: PURCHASE, amount: 3000, createdAt: OLD });
    await db.insertOne({}, { _id: USER, recentConsumeRequestIds: [PURCHASE], profileSubscription: { membershipCreditBalance: 4200 } });
    db.rows[1]._id = USER;

    const report = await settleOrphanSpends(db);
    expect(report).toMatchObject({ settled: 1, reverted: 0 });
    expect(db.rows[0].settledAt).toBeInstanceOf(Date);
    expect(db.rows[0].afterBalance).toBe(4200);
  });

  test("🔴 차감 증거가 없으면 예약만 걷어낸다 — 사용자는 과금되지 않았다", async () => {
    const db = makeLedgerDb();
    await db.insertOne({}, { userId: USER, type: __moonstoneTestUtils.SPEND, sourceId: PURCHASE, amount: 3000, createdAt: OLD });
    await db.insertOne({}, { _id: USER, recentConsumeRequestIds: [] });
    db.rows[1]._id = USER;

    const report = await settleOrphanSpends(db);
    expect(report).toMatchObject({ settled: 0, reverted: 1 });
    expect(db.rows.find((r) => r.type === __moonstoneTestUtils.SPEND)).toBeUndefined();
  });

  test("아직 어린 예약은 건드리지 않는다 — 진행 중일 수 있다", async () => {
    const db = makeLedgerDb();
    await db.insertOne({}, { userId: USER, type: __moonstoneTestUtils.SPEND, sourceId: PURCHASE, amount: 3000, createdAt: new Date() });
    const report = await settleOrphanSpends(db);
    expect(report.scanned).toBe(0);
    expect(db.rows).toHaveLength(1);
  });

  test("이미 정산된 행은 대상이 아니다", async () => {
    const db = makeLedgerDb();
    await db.insertOne({}, {
      userId: USER, type: __moonstoneTestUtils.SPEND, sourceId: PURCHASE, amount: 3000,
      createdAt: OLD, settledAt: new Date(),
    });
    expect((await settleOrphanSpends(db)).scanned).toBe(0);
  });
});
