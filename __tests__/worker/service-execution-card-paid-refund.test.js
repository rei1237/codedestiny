/**
 * @jest-environment node
 *
 * V2 카드 단건 결제 건의 자동환불 회귀 테스트.
 *
 * `runPaymentCancel` 은 Payment 상태가 success·fulfilled 일 때만 환불했는데, V2 승인의 종착
 * 상태는 `worker/payments/orders.js` markOrderPaid 가 쓰는 `status:"paid"`(orderState
 * "PAID_VERIFIED") 다. 같은 Payment 컬렉션을 읽으므로, V2 로 결제한 모든 건이 생성 실패 시
 * `PAYMENT_NOT_SUCCESS` 로 조용히 skip 되고 돈이 그대로 남았다 — ServiceExecutionTransaction
 * 을 쓰는 유료 라우트 전체에 걸린 결함이다.
 *
 * 🔴 이 파일이 무는 것:
 *   1. status "paid" 카드 건에서 PortOne 취소가 실제로 불린다.
 *   2. 구 상태 "success" 도 계속 환불된다(회귀 방지).
 *   3. 승인 전 상태("pending")는 여전히 환불하지 않는다 — 넓히기가 fail-open 이 되면 안 된다.
 *
 * PortOne·DB 는 전부 목이다 — 실호출·실결제 0건.
 */
import { jest } from "@jest/globals";
import mongoose from "mongoose";

const USER_ID = "64b7f2a1c3d4e5f601234567";
const EXECUTION_ID = "64b7f2a1c3d4e5f6012345aa";
const PAYMENT_ID = "64b7f2a1c3d4e5f6012345cc";
const MERCHANT_UID = "cd-order-v2-001";

let failServiceExecution;
let cancelPortOnePaymentMock;
let executions;
let payments;
let paymentUpdates;

function thenableWithLean(value) {
  const promise = Promise.resolve(value);
  promise.lean = () => Promise.resolve(value);
  promise.sort = () => thenableWithLean(value);
  return promise;
}

function applySet(target, update) {
  for (const [path, value] of Object.entries(update.$set || {})) {
    const parts = path.split(".");
    let cursor = target;
    while (parts.length > 1) {
      const key = parts.shift();
      if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
      cursor = cursor[key];
    }
    cursor[parts[0]] = value;
  }
  for (const [path, value] of Object.entries(update.$inc || {})) {
    target[path] = Number(target[path] || 0) + Number(value);
  }
}

/** runPaymentCancel 의 $or 조회를 그대로 흉내낸다 — merchantUid 든 impUid 든 같은 문서를 찾는다. */
function matchPayment(filter) {
  const clauses = Array.isArray(filter?.$or) ? filter.$or : [filter];
  return payments.find((doc) => clauses.some((clause) => Object.entries(clause)
    .every(([field, value]) => String(doc[field] || "") === String(value)))) || null;
}

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => {}),
    withMongoRetry: async (_env, op) => op(),
    isTransientMongoError: () => false,
    mongoose,
  }));

  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    CONTENT_ENTITLEMENT_STATUSES: { REFUNDED: "refunded" },
    ServiceExecutionTransaction: {
      findById: (id) => thenableWithLean(executions.find((doc) => String(doc._id) === String(id)) || null),
      findOne: (filter) => thenableWithLean(
        executions.find((doc) => Object.entries(filter).every(
          ([field, value]) => (field === "userId" ? String(doc.userId) === String(value) : String(doc[field]) === String(value)),
        )) || null,
      ),
      findOneAndUpdate: (filter, update) => {
        const target = executions.find((doc) => String(doc._id) === String(filter._id) && doc.status === filter.status);
        if (!target) return thenableWithLean(null);
        applySet(target, update);
        return thenableWithLean(target);
      },
      async updateOne(filter, update) {
        const target = executions.find((doc) => String(doc._id) === String(filter._id));
        if (!target) return { matchedCount: 0, modifiedCount: 0 };
        if (filter.status && target.status !== filter.status) return { matchedCount: 0, modifiedCount: 0 };
        applySet(target, update);
        return { matchedCount: 1, modifiedCount: 1 };
      },
    },
    MonthlyCreditLedger: { findOne: () => thenableWithLean(null), create: async (doc) => doc, updateOne: async () => ({}) },
    PointHistory: { findOne: () => thenableWithLean(null), updateOne: async () => ({ matchedCount: 0, modifiedCount: 0 }) },
    Payment: {
      findOne: (filter) => thenableWithLean(matchPayment(filter)),
      async updateOne(filter, update) {
        paymentUpdates.push({ filter, update });
        const target = payments.find((doc) => String(doc._id) === String(filter._id));
        if (target) applySet(target, update);
        return { matchedCount: target ? 1 : 0, modifiedCount: target ? 1 : 0 };
      },
    },
    User: { findById: () => thenableWithLean(null), findByIdAndUpdate: () => thenableWithLean(null) },
  }));

  jest.unstable_mockModule("../../worker/lib/monthly-credit-store.js", () => ({
    restoreMonthlyCreditLot: jest.fn(async () => ({})),
  }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({
    findMoonstoneSpendEvidence: jest.fn(async () => null),
  }));

  cancelPortOnePaymentMock = jest.fn(async () => ({ cancelled: true, status: "cancelled" }));
  jest.unstable_mockModule("../../worker/lib/portone.js", () => ({
    cancelPortOnePayment: cancelPortOnePaymentMock,
  }));
  jest.unstable_mockModule("../../worker/lib/content-unlocks.js", () => ({
    revokePaymentContentAccess: jest.fn(async () => ({ unlockRevoked: true })),
  }));

  ({ failServiceExecution } = await import("../../worker/lib/service-execution-task.js"));
});

/** 카드 단건 결제로 열린 실행 1건 + 그 Payment 1건을 세운다. */
function seed(paymentStatus) {
  jest.clearAllMocks();
  paymentUpdates = [];
  payments = [{
    _id: PAYMENT_ID,
    userId: USER_ID,
    merchantUid: MERCHANT_UID,
    impUid: "pg-tx-v2-001",
    status: paymentStatus,
    orderState: paymentStatus === "paid" ? "PAID_VERIFIED" : "",
    paymentType: "digital_content",
    accessType: "single_purchase",
    paymentMethod: "card",
    paymentAmount: 9900,
    chargedPoints: 0,
  }];
  executions = [{
    _id: EXECUTION_ID,
    userId: USER_ID,
    executionKey: `master-love-codex:${MERCHANT_UID}`,
    status: "pending",
    featureKey: "master-love-codex",
    serviceId: "master-love-codex",
    cost: 0,
    paymentRef: { merchantUid: MERCHANT_UID },
    merchantUid: MERCHANT_UID,
    retryCount: 0,
    maxRetries: 5,
    metadata: { serviceKey: "master-love-codex" },
  }];
}

async function failOnce() {
  return failServiceExecution({}, USER_ID, {
    executionKey: `master-love-codex:${MERCHANT_UID}`,
    reasonCode: "generation_failed",
    reasonMessage: "Chapter generation failed.",
    forceRefundOnClose: true,
  });
}

test('V2 종착 상태 "paid" 카드 결제가 자동 환불된다', async () => {
  seed("paid");
  await failOnce();

  // 🔴 이 단언이 회귀의 정본이다 — "paid" 를 빼면 호출 0회로 돌아간다.
  expect(cancelPortOnePaymentMock).toHaveBeenCalledTimes(1);
  expect(cancelPortOnePaymentMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    merchantUid: MERCHANT_UID,
    checksum: 9900,
  }));
  expect(payments[0].status).toBe("cancelled");
  expect(payments[0].orderState).toBe("CANCELLED");
});

test('구 종착 상태 "success" 도 계속 환불된다', async () => {
  seed("success");
  await failOnce();

  expect(cancelPortOnePaymentMock).toHaveBeenCalledTimes(1);
  expect(payments[0].status).toBe("cancelled");
});

test("승인 전 주문은 여전히 환불하지 않는다", async () => {
  seed("pending");
  await failOnce();

  expect(cancelPortOnePaymentMock).not.toHaveBeenCalled();
  expect(payments[0].status).toBe("pending");
});
