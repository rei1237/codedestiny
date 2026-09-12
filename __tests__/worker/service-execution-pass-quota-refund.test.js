/**
 * @jest-environment node
 *
 * 이용권 커버(verifyPerUsePayment pass 분기)로 profileSubscription.monthlySpendCoin 을 차감한 뒤
 * 생성이 실패했을 때의 자동환불 회귀 테스트.
 *
 * 2026-09-12 실사고: monthlySpendCoin 은 worker/payments/passes.js consumePassCoverage 한 곳에서만
 * 증가했고, 어떤 라우트도 이를 되돌리지 않았다(failServiceExecution 은 coin/월정석 두 갈래뿐이었다).
 * 이 파일은 human-design-report.js 가 passRefund 를 실행 메타데이터에 실어 보내면
 * runPassQuotaRefund 가 그 금액만큼 되돌리는지, 그리고 사이클이 넘어간 뒤에는 손대지 않는지 검증한다.
 */
import { jest } from "@jest/globals";
import mongoose from "mongoose";

const USER_ID = "64b7f2a1c3d4e5f601234567";
const EXECUTION_ID = "64b7f2a1c3d4e5f6012345aa";
const REQUEST_ID = "req-pass-001";
const CYCLE_KEY = "2026-09";

let failServiceExecution;
let executions;
let users;

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
    const parts = path.split(".");
    let cursor = target;
    while (parts.length > 1) {
      const key = parts.shift();
      if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
      cursor = cursor[key];
    }
    cursor[parts[0]] = Number(cursor[parts[0]] || 0) + Number(value);
  }
}

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => {}),
    withMongoRetry: async (_env, op) => op(),
    isTransientMongoError: () => false,
    mongoose,
  }));

  jest.unstable_mockModule("../../worker/lib/access-state-cache.js", () => ({
    invalidateAccessStateCacheForUser: jest.fn(),
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
        applySet(target, update);
        return { matchedCount: 1, modifiedCount: 1 };
      },
    },
    MonthlyCreditLedger: {
      findOne: () => thenableWithLean(null),
      async create(doc) { return { ...doc, _id: "unused-ledger" }; },
      async updateOne() { return { matchedCount: 0, modifiedCount: 0 }; },
    },
    PointHistory: {
      findOne: () => thenableWithLean(null),
      updateOne: async () => ({ matchedCount: 0, modifiedCount: 0 }),
    },
    Payment: { findOne: () => thenableWithLean(null), updateOne: async () => ({}) },
    User: {
      findById: () => thenableWithLean(null),
      findByIdAndUpdate: () => thenableWithLean(null),
      findOneAndUpdate: (filter, update) => {
        const target = users.find((doc) => String(doc._id) === String(filter._id));
        if (!target) return thenableWithLean(null);
        const cycleOk = !filter["profileSubscription.premiumUseCycleKey"]
          || String(target.profileSubscription.premiumUseCycleKey) === String(filter["profileSubscription.premiumUseCycleKey"]);
        const balanceOk = !filter["profileSubscription.monthlySpendCoin"]
          || Number(target.profileSubscription.monthlySpendCoin) >= Number(filter["profileSubscription.monthlySpendCoin"].$gte);
        if (!cycleOk || !balanceOk) return thenableWithLean(null);
        applySet(target, update);
        return thenableWithLean(target);
      },
    },
  }));

  jest.unstable_mockModule("../../worker/lib/monthly-credit-store.js", () => ({
    restoreMonthlyCreditLot: jest.fn(async () => null),
  }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({
    findMoonstoneSpendEvidence: jest.fn(async () => null),
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
  executions = [{
    _id: EXECUTION_ID,
    userId: USER_ID,
    executionKey: `human-design-premium-report:${REQUEST_ID}`,
    status: "pending",
    featureKey: "human-design-premium-report",
    serviceId: "human-design-premium-report",
    // 이용권 커버 분기는 코인 차감이 없으므로 cost/sourceTransactionId 가 비어 있다.
    cost: 0,
    sourceTransactionId: "",
    idempotencyKey: REQUEST_ID,
    paymentRef: {},
    retryCount: 0,
    maxRetries: 5,
    metadata: { featureKey: "human-design-premium-report", passRefund: { cycleKey: CYCLE_KEY, cost: 30 } },
  }];
  users = [{
    _id: USER_ID,
    profileSubscription: { premiumUseCycleKey: CYCLE_KEY, monthlySpendCoin: 30 },
  }];
});

test("이용권 커버로 차감된 monthlySpendCoin 이 생성 실패 시 되돌아간다", async () => {
  const result = await failServiceExecution({}, USER_ID, {
    executionKey: `human-design-premium-report:${REQUEST_ID}`,
    reasonCode: "human_design_report_generation_failed",
    reasonMessage: "Gemini returned no content.",
    forceRefundOnClose: true,
  });

  expect(result.settlement.status).toBe("refunded");
  expect(users[0].profileSubscription.monthlySpendCoin).toBe(0);
  expect(executions[0].compensation.passQuotaRefunded).toBe(true);
  expect(executions[0].compensation.passQuotaRefundAmount).toBe(30);
  expect(executions[0].metadata.passRefund.refundedAt).toBeTruthy();
});

test("같은 실행을 다시 정산해도 두 번 복구되지 않는다", async () => {
  await failServiceExecution({}, USER_ID, {
    executionKey: `human-design-premium-report:${REQUEST_ID}`,
    reasonCode: "human_design_report_generation_failed",
    forceRefundOnClose: true,
  });
  expect(users[0].profileSubscription.monthlySpendCoin).toBe(0);

  executions[0].status = "pending";
  await failServiceExecution({}, USER_ID, {
    executionKey: `human-design-premium-report:${REQUEST_ID}`,
    reasonCode: "human_design_report_generation_failed",
    forceRefundOnClose: true,
  });

  // 멱등 가드(metadata.passRefund.refundedAt)가 이미 찍혀 있으므로 두 번째 정산은 다시 깎지 않는다.
  expect(users[0].profileSubscription.monthlySpendCoin).toBe(0);
});

test("사이클이 넘어간 뒤에는 다음 달 한도를 잘못 건드리지 않는다", async () => {
  users[0].profileSubscription.premiumUseCycleKey = "2026-10";
  users[0].profileSubscription.monthlySpendCoin = 5;

  const result = await failServiceExecution({}, USER_ID, {
    executionKey: `human-design-premium-report:${REQUEST_ID}`,
    reasonCode: "human_design_report_generation_failed",
    forceRefundOnClose: true,
  });

  expect(users[0].profileSubscription.monthlySpendCoin).toBe(5);
  expect(executions[0].compensation.passQuotaRefunded).toBe(false);
  expect(result.settlement.status).toBe("failed");
});
