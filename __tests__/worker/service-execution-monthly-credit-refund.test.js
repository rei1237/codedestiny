/**
 * @jest-environment node
 *
 * V2 월정석 결제 건의 자동환불 회귀 테스트.
 *
 * 2026-08-12 컷오버로 `spendMoonstone` 은 PointHistory 를 쓰지 않고 MonthlyCreditLedger 한
 * 컬렉션만 남긴다. 그런데 `runMonthlyCreditRefund` 는 PointHistory `_id` 로만 차감 이력을
 * 되짚었기 때문에, 월정석으로 결제한 사용자의 생성이 실패하면 환불이 통째로 skip 되고
 * (`DEDUCT_HISTORY_NOT_FOUND`) 실행이 `refundStatus:"refund_failed"` 로 굳었다 — 재시도
 * 리퍼는 `pending` 만 줍기 때문에 그대로 영구 손실이었다.
 *
 * 🔴 이 파일에서 가장 중요한 단언 셋:
 *   1. 환급액이 **월정석 단위** 3 이다. 실행 문서의 `cost: 30`(코인)을 쓰면 10배를 물어준다.
 *   2. `pullRequestId` 가 원장 `sourceId` 로 넘어간다. 빠지면 차감 때 lot CAS 가
 *      `recentConsumeRequestIds` 에 넣은 값이 안 빠져 같은 건 재구매가 402 로 막힌다.
 *   3. 원본 SPEND 행에 `metadata.refundedForUnlockFailure` 가 찍힌다 — 키 해제 계약 표식이다.
 */
import { jest } from "@jest/globals";
import mongoose from "mongoose";

const USER_ID = "64b7f2a1c3d4e5f601234567";
const EXECUTION_ID = "64b7f2a1c3d4e5f6012345aa";
const SPEND_LEDGER_ID = "64b7f2a1c3d4e5f6012345bb";
/** V2 에서 실행 문서에 실리는 sourceTransactionId 는 PointHistory _id 가 아니라 원장 sourceId 다. */
const REQUEST_ID = "req-v2-001";

let failServiceExecution;
let findMoonstoneSpendEvidenceMock;
let restoreMonthlyCreditLotMock;
let executions;
let monthlyCreditLedgers;
let ledgerUpdates;

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
    MonthlyCreditLedger: {
      findOne: (filter) => thenableWithLean(
        monthlyCreditLedgers.find((row) => row.type === filter.type && row.sourceId === filter.sourceId) || null,
      ),
      async create(doc) {
        const created = { ...doc, _id: `ledger-${monthlyCreditLedgers.length + 1}` };
        monthlyCreditLedgers.push(created);
        return created;
      },
      async updateOne(filter, update) {
        ledgerUpdates.push({ filter, update });
        return { matchedCount: 1, modifiedCount: 1 };
      },
    },
    // V2 실행에는 PointHistory 행이 아예 없다 — 그것이 이 회귀의 전제다.
    PointHistory: {
      findOne: () => thenableWithLean(null),
      updateOne: async () => ({ matchedCount: 0, modifiedCount: 0 }),
    },
    Payment: { findOne: () => thenableWithLean(null), updateOne: async () => ({}) },
    User: { findById: () => thenableWithLean(null), findByIdAndUpdate: () => thenableWithLean(null) },
  }));

  restoreMonthlyCreditLotMock = jest.fn(async () => ({
    profileSubscription: { membershipCreditBalance: 13 },
  }));
  jest.unstable_mockModule("../../worker/lib/monthly-credit-store.js", () => ({
    restoreMonthlyCreditLot: restoreMonthlyCreditLotMock,
  }));

  findMoonstoneSpendEvidenceMock = jest.fn(async () => ({
    ledgerId: SPEND_LEDGER_ID,
    sourceId: REQUEST_ID,
    amount: 3,
    serviceKey: "neo-operation-room",
    afterBalance: 10,
  }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({
    findMoonstoneSpendEvidence: findMoonstoneSpendEvidenceMock,
  }));

  jest.unstable_mockModule("../../worker/lib/portone.js", () => ({
    cancelPortOnePayment: jest.fn(async () => ({ cancelled: false })),
  }));
  jest.unstable_mockModule("../../worker/lib/content-unlocks.js", () => ({
    revokePaymentContentAccess: jest.fn(async () => ({ unlockRevoked: false })),
  }));

  ({ failServiceExecution } = await import("../../worker/lib/service-execution-task.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  monthlyCreditLedgers = [];
  ledgerUpdates = [];
  executions = [{
    _id: EXECUTION_ID,
    userId: USER_ID,
    executionKey: `neo-operation-room:${REQUEST_ID}`,
    status: "pending",
    featureKey: "neo-operation-room",
    serviceId: "neo-operation-room",
    // 코인 단위 가격. 월정석 환급액과 단위가 다르다.
    cost: 30,
    sourceTransactionId: REQUEST_ID,
    idempotencyKey: REQUEST_ID,
    paymentRef: {},
    retryCount: 0,
    maxRetries: 5,
    metadata: { serviceKey: "neo-operation-room", billing: { requestId: REQUEST_ID } },
  }];
});

test("PointHistory 가 없는 V2 월정석 실행도 원장 증빙으로 자동환불된다", async () => {
  const result = await failServiceExecution({}, USER_ID, {
    executionKey: `neo-operation-room:${REQUEST_ID}`,
    reasonCode: "generation_failed",
    reasonMessage: "Gemini returned no content.",
    forceRefundOnClose: true,
  });

  expect(result.settlement.status).toBe("refunded");
  expect(executions[0].refundStatus).toBe("refunded");
  expect(executions[0].compensation.monthlyCreditRefunded).toBe(true);

  // 정본 조회기에 실행 문서의 결제 식별자가 실제로 전달돼야 한다.
  const [, evidenceInput] = findMoonstoneSpendEvidenceMock.mock.calls[0];
  expect(evidenceInput.tokens).toContain(REQUEST_ID);
  expect(evidenceInput.featureKeys).toContain("neo-operation-room");

  // 🔴 월정석 단위 3 — 코인 cost 30 이 아니다.
  expect(restoreMonthlyCreditLotMock).toHaveBeenCalledWith(expect.objectContaining({
    amount: 3,
    pullRequestId: REQUEST_ID,
  }));

  // 🔴 원본 SPEND 행 키 해제 표식.
  const spendStamp = ledgerUpdates.find((entry) => String(entry.filter._id) === SPEND_LEDGER_ID);
  expect(spendStamp.update.$set["metadata.refundedForUnlockFailure"]).toBe(true);
  expect(spendStamp.update.$set["metadata.refundedForServiceExecution"]).toBe(true);
});

test("같은 실행을 다시 정산해도 환급 원장은 하나다", async () => {
  await failServiceExecution({}, USER_ID, {
    executionKey: `neo-operation-room:${REQUEST_ID}`,
    reasonCode: "generation_failed",
    forceRefundOnClose: true,
  });
  expect(monthlyCreditLedgers).toHaveLength(1);

  // 환불이 원본 SPEND 행에 표식을 찍고 나면 정본 조회기가 그 행을 배제한다 — 그래서 멱등키는
  // 원장이 아니라 실행 id 로 잡혀 있어야 재진입에서 되짚을 수 있다.
  findMoonstoneSpendEvidenceMock.mockResolvedValueOnce(null);
  executions[0].status = "pending";
  await failServiceExecution({}, USER_ID, {
    executionKey: `neo-operation-room:${REQUEST_ID}`,
    reasonCode: "generation_failed",
    forceRefundOnClose: true,
  });

  expect(monthlyCreditLedgers).toHaveLength(1);
  expect(restoreMonthlyCreditLotMock).toHaveBeenCalledTimes(1);
  expect(executions[0].refundStatus).toBe("refunded");
});
