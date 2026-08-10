/**
 * @jest-environment node
 *
 * worker/payments/ 의 db.js(슬롯 회계)와 pg.js(PG 대조).
 *
 * 🔴 **실제 PortOne 을 부르지 않는다.** 네 가지 대조는 결제 정확성의 핵심이라 오히려 그래서
 * mock 으로 전부 돌려야 한다 — 실호출은 1회 표본이라 근거로도 약하고 과금·쿼터를 태운다
 * (CLAUDE.md 코딩 원칙 8번). fetchPayment 주입은 레포의 mock 정본 패턴을 그대로 따른 것이다.
 *
 * db.js 는 withMongoRetry 를 감싸므로 Mongo 없이 전부는 못 돌린다. 여기서는 Mongo 가 필요 없는
 * 부분 — 중첩 가드·타입 헬퍼·왕복 카운터 — 만 본다. 나머지는 상태기계 테스트에서 db 핸들을
 * 주입해 검증한다.
 */
import { PaymentError, classify } from "../../worker/payments/errors.js";
import { __paymentDbTestUtils, createPaymentContext, toObjectId, toUserIdString } from "../../worker/payments/db.js";
import { __pgTestUtils, verifyPgPayment } from "../../worker/payments/pg.js";

// 정규화 전 env 이름을 그대로 쓴다 — getPortOneConfig 의 별칭 흡수를 함께 검증하는 셈이다.
const ENV = { PORTONE_API_SECRET: "test-secret", PORTONE_STORE_ID: "store-abc" };

function pgReply(overrides = {}) {
  return {
    paymentId: "cdorder1",
    status: "paid",
    amount: 30000,
    currency: "KRW",
    pay_method: "card",
    paid_at: 1786000000,
    receipt_url: "https://receipt.example/1",
    // PG 는 이런 것도 함께 준다 — 저장되면 안 되는 것들.
    customer: { fullName: "홍길동", phoneNumber: "010-1234-5678", email: "a@b.com" },
    rawV2: { customer: { phoneNumber: "010-1234-5678" } },
    ...overrides,
  };
}

const OK = { orderId: "cdorder1", expectedAmountKRW: 30000 };

describe("pg: 네 가지 대조", () => {
  test("전부 맞으면 통과하고 거래 id 를 돌려준다", async () => {
    const result = await verifyPgPayment(ENV, OK, { fetchPayment: async () => pgReply() });
    expect(result.pgTransactionId).toBe("cdorder1");
    expect(result.method).toBe("card");
    expect(result.paidAt instanceof Date).toBe(true);
  });

  test("① 다른 결제를 돌려주면 PAYMENT_ID_MISMATCH", async () => {
    await expectPaymentError(
      () => verifyPgPayment(ENV, OK, { fetchPayment: async () => pgReply({ paymentId: "someone-else" }) }),
      "PAYMENT_ID_MISMATCH",
      422,
    );
  });

  test("② 미결제 상태는 PG_PAYMENT_NOT_PAID — ready/failed/cancelled 전부", async () => {
    for (const status of ["ready", "failed", "cancelled"]) {
      await expectPaymentError(
        () => verifyPgPayment(ENV, OK, { fetchPayment: async () => pgReply({ status }) }),
        "PG_PAYMENT_NOT_PAID",
        422,
      );
    }
  });

  test("🔴 ③ 금액 불일치는 422 이고 재시도 대상이 아니다", async () => {
    // 재시도 가능으로 두면 조작된 금액을 반복 제출하게 된다.
    const contract = await expectPaymentError(
      () => verifyPgPayment(ENV, OK, { fetchPayment: async () => pgReply({ amount: 100 }) }),
      "AMOUNT_MISMATCH",
      422,
    );
    expect(contract.retryable).toBe(false);
    expect(contract.meta).toMatchObject({ expected: 30000, actual: 100 });
  });

  test("③ 주문 금액이 0 이면 통과시키지 않는다", async () => {
    await expectPaymentError(
      () => verifyPgPayment(ENV, { orderId: "cdorder1", expectedAmountKRW: 0 }, { fetchPayment: async () => pgReply({ amount: 0 }) }),
      "AMOUNT_MISMATCH",
      422,
    );
  });

  test("④ 원화가 아니면 CURRENCY_MISMATCH", async () => {
    await expectPaymentError(
      () => verifyPgPayment(ENV, OK, { fetchPayment: async () => pgReply({ currency: "USD" }) }),
      "CURRENCY_MISMATCH",
      422,
    );
  });
});

describe("pg: 닿지 못한 것과 사실이 다른 것을 가른다", () => {
  test("🔴 PG 에 닿지 못하면 503 PG_UNAVAILABLE", async () => {
    const timeout = new Error("PortOne payment lookup failed: request timed out after 8000ms");
    const contract = await expectPaymentError(
      () => verifyPgPayment(ENV, OK, { fetchPayment: async () => { throw timeout; } }),
      "PG_UNAVAILABLE",
      503,
    );
    expect(contract.retryable).toBe(true);
    expect(contract.stage).toBe("pg");
  });

  test("PG 가 아닌 예외는 그대로 올라가 500 이 된다", async () => {
    // 우리 코드 버그를 PG 장애로 위장하면 안 된다.
    const bug = new TypeError("Cannot read properties of undefined");
    await expect(verifyPgPayment(ENV, OK, { fetchPayment: async () => { throw bug; } })).rejects.toBe(bug);
    expect(classify(bug).status).toBe(500);
  });

  test("설정이 없으면 500 이지 503 이 아니다 — 재시도로 고쳐지지 않는다", async () => {
    await expectPaymentError(
      () => verifyPgPayment({}, OK, { fetchPayment: async () => pgReply() }),
      "PG_NOT_CONFIGURED",
      500,
    );
  });

  test("isPgUnreachable 판정", () => {
    expect(__pgTestUtils.isPgUnreachable(Object.assign(new Error("x"), { name: "AbortError" }))).toBe(true);
    expect(__pgTestUtils.isPgUnreachable(new Error("PortOne payment response was empty."))).toBe(true);
    expect(__pgTestUtils.isPgUnreachable(new TypeError("boom"))).toBe(false);
  });
});

describe("pg: PG 응답의 PII 는 저장 형태로 넘어가지 않는다", () => {
  test("🔴 summary 에 customer 계열이 남지 않는다", async () => {
    const result = await verifyPgPayment(ENV, OK, { fetchPayment: async () => pgReply() });
    const serialized = JSON.stringify(result.summary);
    expect(serialized).not.toMatch(/홍길동|010-1234-5678|a@b\.com/);
    expect(result.summary.customer).toBeUndefined();
    expect(result.summary.rawV2).toBeUndefined();
    // 대조·정산에 필요한 것은 남아 있어야 한다.
    expect(Object.keys(result.summary).sort()).toEqual(
      ["amount", "currency", "paidAt", "payMethod", "paymentId", "receiptUrl", "status"],
    );
  });
});

describe("db: 슬롯 회계", () => {
  test("🔴 중첩은 던진다 — 슬롯 2개를 먹고 재시도가 곱해진다", async () => {
    const { withPaymentDb } = await import("../../worker/payments/db.js");
    const ctx = createPaymentContext({ requestId: "r1", route: "POST /x" });
    ctx.inDb = true; // 이미 진행 중인 상태를 흉내낸다(실제 Mongo 없이)
    await expect(withPaymentDb({}, ctx, async () => null)).rejects.toThrow(/do not nest/i);
  });

  test("왕복 카운터는 호출마다 오른다", async () => {
    const ctx = createPaymentContext({ requestId: "r1", route: "POST /x" });
    const db = __paymentDbTestUtils.makeCountingDb(ctx);
    const Model = {
      collection: {
        findOne: async () => null,
        insertOne: async () => ({}),
        updateOne: async () => ({}),
        find: () => ({ toArray: async () => [] }),
      },
    };
    await db.findOne(Model, {});
    await db.insertOne(Model, {});
    await db.updateOne(Model, {}, {});
    await db.find(Model, {});
    expect(ctx.mongoOps).toBe(4);
  });

  test("🔴 컬렉션마다 다른 userId 타입을 헬퍼로만 표현한다", () => {
    // ContentEntitlement.userId 는 String, 나머지는 ObjectId. 네이티브 드라이버는 캐스팅하지 않으므로
    // 섞이면 unique 인덱스가 충돌하지 않고 중복 방지가 조용히 사라진다.
    const hex = "507f1f77bcf86cd799439011";
    expect(String(toObjectId(hex))).toBe(hex);
    expect(toObjectId("not-an-objectid")).toBeNull();
    expect(toObjectId(null)).toBeNull();
    expect(toUserIdString(hex)).toBe(hex);
    expect(typeof toUserIdString(hex)).toBe("string");
  });
});

async function expectPaymentError(fn, code, status) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(PaymentError);
  expect(caught.code).toBe(code);
  const contract = classify(caught);
  expect(contract.status).toBe(status);
  return contract;
}
