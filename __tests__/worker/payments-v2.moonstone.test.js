/**
 * @jest-environment node
 *
 * 월정석 차감 — 트랜잭션을 대체하는 **쓰기 순서**의 검증.
 *
 * lot 산수 자체는 monthly-credit-lots.js 가 이미 검증돼 있고 동결 대상이다. 여기서 확인하는 것은
 * 그 위의 순서와 되돌림이다: 예약이 효과보다 먼저 오는가, 실패했을 때 사용자가 과금되지 않은 채로
 * 남는가, 그리고 재시도가 데드락에 빠지지 않는가. 틀리면 돈이 사라지는 부분이 정확히 여기다.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

/**
 * 여기부터는 **주입 없이** 실제 lot CAS 를 돈다.
 *
 * 위 블록들이 consumeLots 를 주입해 쓰기 순서만 보는 것과 목적이 다르다. 여기서 고정하는 것은
 * 차감이 **결제 컨텍스트가 준 db 핸들 위에서** 일어난다는 사실이다 — mongoose 모델 API 는 기본
 * (공유) 커넥션에만 붙는데, 결제 컨텍스트는 그 핸드셰이크를 건너뛸 수 있어(worker/payments/db.js
 * skipSharedConnect) 그 상태에서 부르면 bufferCommands:false 때문에 즉시 죽고 503 DB_UNAVAILABLE
 * 이 된다. 2026-08-12 에 "잔량은 보이는데 월정석 결제만 전면 실패"로 나타난 회귀가 정확히 이것이다.
 */
describe("실제 lot CAS — 결제 컨텍스트의 db 핸들 위에서 돈다", () => {
  const DAY = 24 * 60 * 60 * 1000;

  // FIFO 검증을 겸한다: 오래된 lot(3000)이 정확히 소진되고 새 lot(5000)만 남아야 한다.
  function makeUserDoc() {
    const now = Date.now();
    return {
      _id: USER,
      recentConsumeRequestIds: [],
      profileSubscription: {
        membershipCreditBalance: 8000,
        membershipCreditUsed: 0,
        membershipCreditLotsVersion: 0,
        membershipCreditLots: [
          { lotId: "lot-old", amount: 3000, remaining: 3000, grantedAt: new Date(now - 5 * DAY), expiresAt: new Date(now + 25 * DAY) },
          { lotId: "lot-new", amount: 5000, remaining: 5000, grantedAt: new Date(now - 1 * DAY), expiresAt: new Date(now + 29 * DAY) },
        ],
      },
    };
  }

  async function makeDbWithUser() {
    const db = makeLedgerDb();
    await db.insertOne({}, makeUserDoc());
    return db;
  }

  const userRow = (db) => db.rows.find((row) => String(row._id) === USER);
  const ledgerRow = (db) => db.rows.find((row) => row.type === __moonstoneTestUtils.SPEND);

  test("🔴 차감이 db 핸들을 지난다 — mongoose 를 쓰면 이 왕복이 세어지지 않는다", async () => {
    const db = await makeDbWithUser();
    const opsBefore = db.ctx.ops;

    await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE });

    // 예약 insert · 사용자 read · CAS write · 원장 정산 = 4. mongoose 판이면 가운데 둘이 빠져 2 다.
    expect(db.ctx.ops - opsBefore).toBe(4);
  });

  test("FIFO 로 차감하고 잔량·사용량·버전·멱등 마커를 한 번에 갱신한다", async () => {
    const db = await makeDbWithUser();

    const result = await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE });

    expect(result.balance).toBe(5000);
    const sub = userRow(db).profileSubscription;
    expect(sub.membershipCreditBalance).toBe(5000);
    expect(sub.membershipCreditUsed).toBe(3000);
    expect(sub.membershipCreditLotsVersion).toBe(1);
    expect(sub.membershipCreditLots.map((lot) => lot.lotId)).toEqual(["lot-new"]);
    expect(userRow(db).recentConsumeRequestIds).toEqual([PURCHASE]);

    expect(ledgerRow(db).settledAt).toBeInstanceOf(Date);
    expect(ledgerRow(db).beforeBalance).toBe(8000);
    expect(ledgerRow(db).afterBalance).toBe(5000);
  });

  test("🔴 버전 필드가 아예 없는 계정도 차감된다 — 없으면 잔량이 충분해도 영구 409 였다", async () => {
    /* lot 마이그레이션 이전 계정: 스칼라 잔액만 있고 membershipCreditLots·LotsVersion 이 없다
       (ensureLotsForBalance 가 lot 을 합성해 주는 바로 그 집단). version 계산은 필드 부재를 0 으로
       읽는데 Mongo 의 `{f: 0}` 은 f 가 없는 문서를 매칭하지 않으므로, 버전 가드에 $exists:false
       갈래가 없으면 CAS 가 5회 전부 지고 MOONSTONE_CONTENDED(409) 로 끝난다 — 잔량 조회는 정상이라
       "충분한데 결제만 계속 실패"로 보였던 2026-08-12 장애가 이것이다. */
    const db = makeLedgerDb();
    await db.insertOne({}, {
      _id: USER,
      recentConsumeRequestIds: [],
      profileSubscription: { membershipCreditBalance: 8000, membershipCreditUsed: 0 },
    });

    const result = await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE });

    expect(result.balance).toBe(5000);
    const sub = userRow(db).profileSubscription;
    expect(sub.membershipCreditBalance).toBe(5000);
    expect(sub.membershipCreditUsed).toBe(3000);
    // $inc 가 없던 필드를 만들어 준다 — 이후 CAS 는 정상 버전 체인을 탄다.
    expect(sub.membershipCreditLotsVersion).toBe(1);
    expect(ledgerRow(db).settledAt).toBeInstanceOf(Date);
  });

  test("🔴 원장을 잃은 뒤 같은 requestId 로 재시도해도 두 번 차감되지 않는다", async () => {
    const db = await makeDbWithUser();
    await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE });
    // 원장만 사라지고 차감 증거(멱등 마커)는 남은 상태 — 예약과 효과 사이에서 죽은 실행의 잔상이다.
    db.rows.splice(db.rows.indexOf(ledgerRow(db)), 1);

    const retry = await spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE });

    expect(retry.replayed).toBe(true);
    expect(userRow(db).profileSubscription.membershipCreditBalance).toBe(5000);
    expect(userRow(db).profileSubscription.membershipCreditUsed).toBe(3000);
    expect(ledgerRow(db).settledAt).toBeInstanceOf(Date);
  });

  test("버전 충돌은 재조회 후 재시도해서 성공한다", async () => {
    const db = await makeDbWithUser();
    let lost = 0;
    const contended = {
      ...db,
      async findOneAndUpdate(Model, filter, update, options) {
        // 첫 write 만 다른 요청에 진 것으로 만든다(낙관적 CAS 의 정상 경로).
        if (lost === 0) {
          lost += 1;
          userRow(db).profileSubscription.membershipCreditLotsVersion += 1;
          return null;
        }
        return db.findOneAndUpdate(Model, filter, update, options);
      },
    };

    const result = await spendMoonstone(contended, { userId: USER, product: PRODUCT, purchaseId: PURCHASE });
    expect(result.balance).toBe(5000);
    expect(lost).toBe(1);
  });

  test("🔴 write 가 끝까지 지면 409 이고 예약도 걷힌다", async () => {
    const db = await makeDbWithUser();
    const alwaysLoses = { ...db, async findOneAndUpdate() { return null; } };

    await expectError(
      () => spendMoonstone(alwaysLoses, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }),
      "MOONSTONE_CONTENDED",
      409,
    );
    expect(ledgerRow(db)).toBeUndefined();
    expect(userRow(db).profileSubscription.membershipCreditBalance).toBe(8000);
  });

  test("🔴 잔량이 모자라면 사용자 문서를 건드리지 않고 402 를 낸다", async () => {
    const db = await makeDbWithUser();

    const error = await expectError(
      () => spendMoonstone(db, { userId: USER, product: { ...PRODUCT, monthlyCost: 9000 }, purchaseId: PURCHASE }),
      "INSUFFICIENT_MOONSTONE",
      402,
    );
    expect(error.meta).toMatchObject({ required: 9000, balance: 8000 });
    expect(ledgerRow(db)).toBeUndefined();
    expect(userRow(db).profileSubscription).toMatchObject({
      membershipCreditBalance: 8000,
      membershipCreditUsed: 0,
      membershipCreditLotsVersion: 0,
    });
  });

  test("만료된 lot 은 잔량으로 세지 않는다", async () => {
    const db = makeLedgerDb();
    const doc = makeUserDoc();
    const now = Date.now();
    doc.profileSubscription.membershipCreditLots = [
      { lotId: "lot-dead", amount: 8000, remaining: 8000, grantedAt: new Date(now - 40 * DAY), expiresAt: new Date(now - 10 * DAY) },
    ];
    await db.insertOne({}, doc);

    await expectError(
      () => spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }),
      "INSUFFICIENT_MOONSTONE",
      402,
    );
  });

  test("사용자가 없으면 401 이고 예약이 남지 않는다", async () => {
    const db = makeLedgerDb();
    await expectError(
      () => spendMoonstone(db, { userId: USER, product: PRODUCT, purchaseId: PURCHASE }),
      "UNAUTHORIZED",
      401,
    );
    expect(db.rows).toHaveLength(0);
  });
});

describe("회귀 가드", () => {
  const paymentsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../worker/payments");

  /* 주석은 걷어내고 본다 — 이 파일들의 주석은 **구 코드가 무엇을 잘못했는지**를 설명하느라
     바로 그 호출 형태를 인용한다(orders.js 의 "구 코드는 Payment.create 를 했다",
     moonstone.js 의 "mongoose 판이 아니라 db 핸들 판이다"). 인용까지 위반으로 세면
     가드가 계속 헛돌고, 헛도는 가드는 곧 지워진다. */
  function codeOnlySources() {
    return readdirSync(paymentsDir)
      .filter((name) => name.endsWith(".js"))
      .map((name) => [name, readFileSync(path.join(paymentsDir, name), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\*)/.test(line))
        .join("\n")]);
  }

  test("🔴 결제 컨텍스트는 mongoose 모델 쿼리 API 를 쓰지 않는다", () => {
    // mongoose 모델은 **기본(공유) 커넥션에만** 붙는다. 결제 컨텍스트는 자기 커넥션을 쓰고 공유
    // 핸드셰이크를 건너뛸 수 있으므로, 여기서 모델 쿼리를 부르면 그 순간 그 요청은 죽는다.
    // 모든 Mongo 접근은 withPaymentDb 가 준 db 핸들(db.findOne(Model, …))을 지나야 한다.
    const modelQuery = /\b(User|Payment|MonthlyCreditLedger|ContentEntitlement|PointHistory|PaymentWebhookEvent)\.(findById|findOne|findOneAndUpdate|findByIdAndUpdate|find|updateOne|updateMany|deleteOne|deleteMany|create|countDocuments|aggregate)\b/;
    const offenders = codeOnlySources().filter(([, source]) => modelQuery.test(source)).map(([name]) => name);

    expect(offenders).toEqual([]);
  });

  test("🔴 결제 컨텍스트는 mongoose 판 consumeMonthlyCreditLots 를 부르지 않는다", () => {
    /* 위 검사만으로는 이번 회귀를 못 잡는다 — 실제 사고는 결제 코드가 모델을 **직접** 부른 게
       아니라 mongoose 로 모델을 부르는 lib 헬퍼를 import 한 것이었다. "mongoose 를 쓰는 lib 을
       import 하지 말 것"으로 일반화하면 상수만 가져오는 정상 import(content-unlocks 의
       USER_SCOPE_PROFILE_ID 등)까지 걸려 가드가 무력화된다. 그래서 실제로 데인 지점 하나만
       못박는다. `\b…Lots\b` 라서 WithDb 판은 걸리지 않는다. */
    const offenders = codeOnlySources()
      .filter(([, source]) => /\bconsumeMonthlyCreditLots\b/.test(source))
      .map(([name]) => name);

    expect(offenders).toEqual([]);
  });
});
