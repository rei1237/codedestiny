/**
 * @jest-environment node
 *
 * 전달 실패 자동 환불 재시도(worker/lib/payment-refund.js retryFailedSinglePaymentRefunds).
 * 🔴 중복 환불이 가장 큰 위험이다 — PG 에서 이미 취소된 주문은 PG 를 다시 부르지 않고, 겹친 틱은 한쪽만 잡는다.
 * PG·환불·권한 회수는 주입한 가짜로 대신한다(네트워크·DB 없음). 필터는 fake-payment-db 의 실제 연산자 의미로 평가한다.
 */
import { jest } from "@jest/globals";
import { matches, applyUpdate } from "../fixtures/fake-payment-db.mjs";
import {
  REFUND_RETRY_MAX_ATTEMPTS,
  REFUND_RETRY_NOT_BEFORE,
  retryFailedSinglePaymentRefunds,
} from "../../worker/lib/payment-refund.js";

const NOW = new Date("2026-12-01T03:00:00Z");
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const ago = (ms, base = NOW) => new Date(base.getTime() - ms);

function makeModel(rows) {
  const docs = rows.map((row) => structuredClone(row));
  const chain = (list) => ({ sort: () => chain(list), limit: (n) => chain(list.slice(0, n)), lean: async () => list.map((d) => structuredClone(d)) });
  return {
    docs,
    find: (filter) => chain(docs.filter((d) => matches(d, filter))),
    findOneAndUpdate: (filter, update) => ({
      lean: async () => {
        const doc = docs.find((d) => matches(d, filter));
        if (!doc) return null;
        applyUpdate(doc, update);
        return structuredClone(doc);
      },
    }),
    updateOne: async (filter, update) => {
      const doc = docs.find((d) => matches(d, filter));
      if (!doc) return { modifiedCount: 0 };
      applyUpdate(doc, update);
      return { modifiedCount: 1 };
    },
  };
}

const failedRow = (id, overrides = {}) => ({
  _id: id, merchantUid: `cd_20261201_${id}`, impUid: `cd_20261201_${id}`, status: "paid", orderState: "ERROR",
  featureKey: "master-love-codex", paymentAmount: 30000, failureCode: "llm_generation_failed_refund_failed", failureStage: "delivery",
  metadata: { refundStatus: "refund_failed", deliveryStatus: "refund_failed", refundFailedAt: ago(20 * MIN), refundReason: "결과 생성 실패" },
  ...overrides,
});
const pgWith = (status) => jest.fn(async () => ({ status: status === "PAID" ? "paid" : "cancelled", rawV2: { status } }));
const okRevoke = jest.fn(async () => ({ unlockRevoked: true, status: "refunded" }));

beforeEach(() => okRevoke.mockClear());
afterEach(() => jest.restoreAllMocks());

test("PG 가 아직 PAID 면 원래 사유 코드로 다시 환불하고 백오프를 건다", async () => {
  const model = makeModel([failedRow("a")]);
  const refund = jest.fn(async () => ({ refunded: true }));
  const summary = await retryFailedSinglePaymentRefunds({}, { now: NOW, model, fetchPayment: pgWith("PAID"), refund, revoke: okRevoke });
  expect(summary).toMatchObject({ scanned: 1, claimed: 1, refunded: 1, failed: 0, alreadyCancelled: 0 });
  expect(refund).toHaveBeenCalledTimes(1);
  const [, order, reasonCode, , stage] = refund.mock.calls[0];
  expect(reasonCode).toBe("llm_generation_failed");
  expect(stage).toBe("delivery");
  expect(order.metadata.refundRetry.count).toBe(1);
  expect(model.docs[0].metadata.refundRetry.nextAt).toEqual(new Date(NOW.getTime() + 10 * MIN));
});

test("🔴 PG 에서 이미 전액 취소됐으면 PG 를 다시 부르지 않고 로컬 상태만 맞춘다", async () => {
  const model = makeModel([failedRow("a")]);
  const refund = jest.fn();
  const summary = await retryFailedSinglePaymentRefunds({}, { now: NOW, model, fetchPayment: pgWith("CANCELLED"), refund, revoke: okRevoke });
  expect(summary).toMatchObject({ alreadyCancelled: 1, refunded: 0 });
  expect(refund).not.toHaveBeenCalled();
  expect(okRevoke).toHaveBeenCalledTimes(1);
  expect(model.docs[0]).toMatchObject({ status: "cancelled", orderState: "CANCELLED", failureCode: "llm_generation_failed" });
  expect(model.docs[0].metadata).toMatchObject({ refundStatus: "refunded", deliveryStatus: "refunded" });
});

test("부분 취소는 자동으로 손대지 않고 사람 처리로 넘긴다", async () => {
  const model = makeModel([failedRow("a")]);
  const refund = jest.fn();
  const summary = await retryFailedSinglePaymentRefunds({}, { now: NOW, model, fetchPayment: pgWith("PARTIAL_CANCELLED"), refund, revoke: okRevoke });
  expect(summary.manualReview).toBe(1);
  expect(refund).not.toHaveBeenCalled();
  expect(model.docs[0].metadata.refundRetry.manualReview).toBe(true);
  expect(model.docs[0].status).toBe("paid");
});

test("계속 실패하면 한도까지만 시도하고 사람 처리 표식을 남긴다", async () => {
  const model = makeModel([failedRow("a")]);
  let clock = NOW;
  // 실제 autoRefund 는 실패할 때마다 refundFailedAt 을 지금으로 다시 찍는다.
  const refund = jest.fn(async (_env, order) => {
    await model.updateOne({ _id: order._id }, { $set: { "metadata.refundFailedAt": clock } });
    return { refunded: false, refundFailed: true };
  });
  jest.spyOn(console, "info").mockImplementation(() => {});
  for (let tick = 0; tick < 40; tick += 1) {
    await retryFailedSinglePaymentRefunds({}, { now: clock, model, fetchPayment: pgWith("PAID"), refund, revoke: okRevoke });
    clock = new Date(clock.getTime() + 30 * MIN);
  }
  expect(refund).toHaveBeenCalledTimes(REFUND_RETRY_MAX_ATTEMPTS);
  expect(model.docs[0].metadata.refundRetry).toMatchObject({ count: REFUND_RETRY_MAX_ATTEMPTS, manualReview: true, manualReviewReason: "max_attempts" });
});

test("🔴 겹친 두 틱은 같은 주문을 한 번만 환불한다", async () => {
  const model = makeModel([failedRow("a")]);
  const refund = jest.fn(async () => ({ refunded: true }));
  const options = { now: NOW, model, fetchPayment: pgWith("PAID"), refund, revoke: okRevoke };
  const [first, second] = await Promise.all([retryFailedSinglePaymentRefunds({}, options), retryFailedSinglePaymentRefunds({}, options)]);
  expect(first.claimed + second.claimed).toBe(1);
  expect(refund).toHaveBeenCalledTimes(1);
});

test("방금 실패·장치 이전 실패·3일 넘은 실패·취소·환불 완료·사람 처리 건은 건드리지 않는다", async () => {
  const now = new Date("2026-11-30T03:00:00Z");
  const model = makeModel([
    failedRow("fresh", { metadata: { refundStatus: "refund_failed", refundFailedAt: ago(5 * MIN, now) } }),
    failedRow("before", { metadata: { refundStatus: "refund_failed", refundFailedAt: new Date(REFUND_RETRY_NOT_BEFORE.getTime() - MIN) } }),
    failedRow("old", { metadata: { refundStatus: "refund_failed", refundFailedAt: ago(4 * DAY, now) } }),
    failedRow("cancelled", { status: "cancelled", metadata: { refundStatus: "refund_failed", refundFailedAt: ago(20 * MIN, now) } }),
    failedRow("refunded", { metadata: { refundStatus: "refunded", refundFailedAt: ago(20 * MIN, now) } }),
    failedRow("manual", { metadata: { refundStatus: "refund_failed", refundFailedAt: ago(20 * MIN, now), refundRetry: { manualReview: true } } }),
  ]);
  const refund = jest.fn();
  const fetchPayment = pgWith("PAID");
  const summary = await retryFailedSinglePaymentRefunds({}, { now, model, fetchPayment, refund, revoke: okRevoke });
  expect(summary.scanned).toBe(0);
  expect(refund).not.toHaveBeenCalled();
  expect(fetchPayment).not.toHaveBeenCalled();
});

test("PG 조회가 실패해도 같은 멱등 키 경로로 환불을 시도하고 던지지 않는다", async () => {
  const model = makeModel([failedRow("a")]);
  const refund = jest.fn(async () => ({ refunded: true }));
  const fetchPayment = jest.fn(async () => { throw new Error("PortOne payment lookup failed"); });
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "info").mockImplementation(() => {});
  const summary = await retryFailedSinglePaymentRefunds({}, { now: NOW, model, fetchPayment, refund, revoke: okRevoke });
  expect(summary).toMatchObject({ claimed: 1, refunded: 1, errors: 0 });
});
