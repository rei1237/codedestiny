/**
 * @jest-environment node
 *
 * 구 재조정 크론(payment-reconcile-task)이 PortOne PAID 를 본 **V2 주문**(orderState 보유 — 이용권이
 * 여기 해당)을 V2 확정 경로(settleOrderFromReconcile)로 넘기는지, 그리고 프로브마다 마지막 PG 상태를
 * `metadata.reconcile.lastPgStatus` 로 남기는지 확인한다.
 *
 * 2026-09-03 사고: 이용권 주문은 "자동 정산 경로 없음" 마커만 받고 PENDING 으로 남았다가 V2 만료 크론이
 * PG 를 보지 않고 30분 만료 취소했다 → 돈만 나가고 되살릴 주체가 없었다.
 */
import { jest } from "@jest/globals";

const paymentFind = jest.fn();
const paymentFindOneAndUpdate = jest.fn();
const paymentFindByIdAndUpdate = jest.fn();
const fetchPortOnePayment = jest.fn();
const settleOrderFromReconcile = jest.fn();

let reconcilePendingPayments;

function fakeQuery(rows) {
  const chain = { select: () => chain, sort: () => chain, limit: () => chain, lean: async () => rows };
  return chain;
}

function candidate(overrides = {}) {
  return {
    _id: "id-pass",
    merchantUid: "cd-pass-1",
    impUid: "cd-pass-1",
    status: "pending",
    orderState: "PENDING",
    paymentType: "membership_pass",
    accessType: "subscription",
    createdAt: new Date("2026-09-03T00:00:00Z"),
    ...overrides,
  };
}

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb: jest.fn(),
      withMongoRetry: jest.fn(async (_env, operation) => operation()),
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      CONTENT_ENTITLEMENT_STATUSES: { CANCELLED: "CANCELLED" },
      Payment: { find: paymentFind, findOneAndUpdate: paymentFindOneAndUpdate, findByIdAndUpdate: paymentFindByIdAndUpdate },
    })),
    jest.unstable_mockModule("../../worker/lib/portone.js", () => ({ fetchPortOnePayment })),
    jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({
      revokeSinglePaymentContentAccess: jest.fn(async () => ({ unlockRevoked: false })),
    })),
    jest.unstable_mockModule("../../worker/payments/index.js", () => ({ settleOrderFromReconcile })),
  ]);
  ({ reconcilePendingPayments } = await import("../../worker/lib/payment-reconcile-task.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  paymentFindOneAndUpdate.mockImplementation(() => ({ lean: async () => ({ status: "pending" }) }));
  paymentFindByIdAndUpdate.mockImplementation(() => ({ catch: async () => undefined }));
  settleOrderFromReconcile.mockResolvedValue({ ok: true, replayed: false, granted: true });
});

function setCalls() {
  return paymentFindByIdAndUpdate.mock.calls.map(([, update]) => update?.$set || {});
}

test("🔴 PG PAID 인 V2 이용권 PENDING 주문은 V2 확정 경로로 정산된다 — 검토 마커로 끝내지 않는다", async () => {
  paymentFind.mockReturnValue(fakeQuery([candidate()]));
  const pg = { status: "PAID", amount: { total: 9900 }, method: { type: "PaymentMethodEasyPay" } };
  fetchPortOnePayment.mockResolvedValue(pg);

  const summary = await reconcilePendingPayments({}, { timeBudgetMs: 25000 });

  expect(settleOrderFromReconcile).toHaveBeenCalledTimes(1);
  expect(settleOrderFromReconcile).toHaveBeenCalledWith({}, { orderId: "cd-pass-1", pgPayment: pg });
  expect(summary.settled).toBe(1);
  expect(summary.untouched).toBe(0);
  expect(setCalls().some((s) => s.failureStage === "reconcile_paid_unsupported_type")).toBe(false);
});

test("🔴 프로브마다 마지막 PG 상태를 남긴다 — V2 만료 크론의 fail-closed 입력이다", async () => {
  paymentFind.mockReturnValue(fakeQuery([candidate()]));
  fetchPortOnePayment.mockResolvedValue({ status: "READY" });

  await reconcilePendingPayments({}, { timeBudgetMs: 25000 });

  expect(setCalls()).toContainEqual({ "metadata.reconcile.lastPgStatus": "ready" });
});

test("V2 정산이 던지면 실패로 세고 다음 틱에 다시 만난다(마커 없음)", async () => {
  paymentFind.mockReturnValue(fakeQuery([candidate()]));
  fetchPortOnePayment.mockResolvedValue({ status: "PAID" });
  settleOrderFromReconcile.mockRejectedValue(new Error("DB_BUSY"));
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  const summary = await reconcilePendingPayments({}, { timeBudgetMs: 25000 });
  errorSpy.mockRestore();

  expect(summary.failed).toBe(1);
  expect(setCalls().some((s) => s.failureStage === "reconcile_paid_unsupported_type")).toBe(false);
});

test("orderState 가 없는 구 주문(비-단건)은 종전대로 검토 마커만 남긴다", async () => {
  paymentFind.mockReturnValue(fakeQuery([candidate({ orderState: undefined, paymentType: "subscription" })]));
  fetchPortOnePayment.mockResolvedValue({ status: "PAID" });

  const summary = await reconcilePendingPayments({}, { timeBudgetMs: 25000 });

  expect(settleOrderFromReconcile).not.toHaveBeenCalled();
  expect(summary.untouched).toBe(1);
  expect(setCalls().some((s) => s.failureStage === "reconcile_paid_unsupported_type")).toBe(true);
});
