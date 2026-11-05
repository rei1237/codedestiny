/**
 * @jest-environment node
 *
 * 라이트 운세는 한도를 차감하지 않아 한도 사용액으로는 "미사용"처럼 보인다.
 * 이용권 주문의 셀프 취소는 사용 증빙을 보고 막고, 금액 판단은 관리자에게 넘긴다(스펙 6.3).
 * PG 콘솔 취소 경로의 검토 마커는 payments-v2.webhook-events.test.js 에 있다.
 */
import { jest } from "@jest/globals";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER_ID = "64b000000000000000000021";
const PAID_AT = new Date("2026-11-04T00:00:00.000Z");
const AFTER = new Date("2026-11-04T01:00:00.000Z");
const BEFORE = new Date("2026-11-03T01:00:00.000Z");
const ENV = {
  NODE_ENV: "production",
  JWT_SECRET: "test-jwt-secret-value-0123456789",
  JWT_ACCESS_SECRET: "test-access-secret-value-0123456789",
  JWT_REFRESH_SECRET: "test-refresh-secret-value-0123456789",
  MONGO_URI: "mongodb://127.0.0.1:1/never-connected",
  SECURITY_GUARD_MODE: "off",
};

const cancelPortOnePayment = jest.fn();
let handlePaymentRoutes;
let refundPaymentAsOperator;
let findPassUseSinceOrder;
let models;

const passOrder = (extra = {}) => ({
  _id: "64b000000000000000000031",
  userId: USER_ID,
  impUid: "imp_pass",
  merchantUid: "cdorder-pass",
  paymentType: "membership_pass",
  status: "success",
  paymentAmount: 14900,
  paidAt: PAID_AT,
  metadata: { durationMonths: 1 },
  ...extra,
});

const evidence = (metadata = {}) => ({
  userId: USER_ID,
  kind: "deduct",
  delta: 0,
  createdAt: AFTER,
  featureKey: "love-code",
  metadata: { accessMethod: "PASS", ...metadata },
});

const passUnlock = (unlockedAt = AFTER) => ({ userId: USER_ID, source: "PASS", status: "ACTIVE", unlockedAt });

/** 라우트는 mongoose 모델을 쓰므로 픽스처 행을 countDocuments 스파이로 연결한다. */
function seedUse(rows) {
  const db = makeFakePaymentDb();
  db.rows.push(...rows);
  models.PointHistory.countDocuments = jest.fn((filter) => db.countDocuments(models.PointHistory, filter));
  models.ContentEntitlement.countDocuments = jest.fn((filter) => db.countDocuments(models.ContentEntitlement, filter));
}

async function postCancel() {
  const response = await handlePaymentRoutes(new Request("https://code-destiny.com/api/payments/cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ merchantUid: "cdorder-pass" }),
  }), ENV, { preverifiedAuth: { userId: USER_ID, role: "user" } });
  return { status: response.status, payload: await response.json() };
}

beforeAll(async () => {
  const actualPortone = await import("../../worker/lib/portone.js");
  jest.unstable_mockModule("../../worker/lib/portone.js", () => ({ ...actualPortone, cancelPortOnePayment }));
  models = await import("../../worker/lib/models.js");
  ({ handlePaymentRoutes } = await import("../../worker/routes/payments.js"));
  ({ refundPaymentAsOperator } = await import("../../worker/lib/payment-refund.js"));
  ({ findPassUseSinceOrder } = await import("../../worker/payments/passes.js"));
  // 모델 생성이 끝난 뒤 연결된 척한다. 먼저 바꾸면 mongoose 가 컬렉션을 열려다 죽는다.
  const dbModule = await import("../../worker/lib/db.js");
  Object.defineProperty(dbModule.mongoose.connection, "readyState", { value: 1, configurable: true });
  Object.defineProperty(dbModule.mongoose.connection, "db", {
    value: { command: async () => ({ ok: 1 }) },
    configurable: true,
  });
  models.PaymentFailureLog.create = jest.fn(async () => ({}));
});

beforeEach(() => {
  cancelPortOnePayment.mockReset();
  // 차단 검사를 통과하면 여기까지 온다. 뒤쪽 취소 흐름은 이 테스트의 범위가 아니다.
  cancelPortOnePayment.mockRejectedValue(new Error("PG_REACHED"));
  models.Payment.findOne = jest.fn(() => ({ lean: async () => passOrder() }));
  models.User.findById = jest.fn(() => ({ select: () => ({ lean: async () => ({ points: 0 }) }) }));
});

test("findPassUseSinceOrder counts use, light use and owned PASS unlocks", async () => {
  const db = makeFakePaymentDb();
  db.rows.push(
    evidence({ passBudgetExempt: true }),
    evidence({ accessMethod: "FAMILY" }),
    evidence({ accessMethod: "pass", passBudgetExempt: true }),
    evidence({ refundedForServiceExecution: true, passBudgetExempt: true }),
    evidence({ accessMethod: "MONTHLY" }),
    passUnlock(),
    { ...passUnlock(), status: "CANCELLED" },
    { ...passUnlock(), source: "SINGLE_PURCHASE" },
  );
  await expect(findPassUseSinceOrder(db, { userId: USER_ID, paidAt: PAID_AT })).resolves.toEqual({
    useCount: 3,
    lightUseCount: 2,
    ownedUnlockCount: 1,
    hasUse: true,
  });
});

test("self cancel of a pass order with light use is blocked and says contact support", async () => {
  seedUse([evidence({ passBudgetExempt: true })]);
  const { status, payload } = await postCancel();
  expect(status).toBe(409);
  expect(payload.code).toBe("PASS_REFUND_REVIEW_REQUIRED");
  expect(payload.message).toContain("고객센터");
  expect(cancelPortOnePayment).not.toHaveBeenCalled();
});

test("self cancel with an owned PASS unlock is blocked", async () => {
  seedUse([passUnlock()]);
  const { payload } = await postCancel();
  expect(payload.code).toBe("PASS_REFUND_REVIEW_REQUIRED");
  expect(cancelPortOnePayment).not.toHaveBeenCalled();
});

test("self cancel with no use behaves as before", async () => {
  seedUse([]);
  const { payload } = await postCancel();
  expect(payload.code).not.toBe("PASS_REFUND_REVIEW_REQUIRED");
  expect(cancelPortOnePayment).toHaveBeenCalledTimes(1);
});

test("use from before this order does not count", async () => {
  seedUse([{ ...evidence({ passBudgetExempt: true }), createdAt: BEFORE }, passUnlock(BEFORE)]);
  const { payload } = await postCancel();
  expect(payload.code).not.toBe("PASS_REFUND_REVIEW_REQUIRED");
  expect(cancelPortOnePayment).toHaveBeenCalledTimes(1);
});

test("a non-pass order never looks up pass use", async () => {
  seedUse([evidence({ passBudgetExempt: true })]);
  models.Payment.findOne = jest.fn(() => ({ lean: async () => passOrder({ paymentType: "point_charge" }) }));
  await postCancel();
  expect(models.PointHistory.countDocuments).not.toHaveBeenCalled();
  expect(cancelPortOnePayment).toHaveBeenCalledTimes(1);
});

test("lookup failure blocks self cancel", async () => {
  seedUse([]);
  models.PointHistory.countDocuments = jest.fn(async () => { throw new Error("query refused"); });
  const { status, payload } = await postCancel();
  expect(status).toBe(409);
  expect(payload.code).toBe("PASS_REFUND_REVIEW_REQUIRED");
  expect(cancelPortOnePayment).not.toHaveBeenCalled();
});

test("operator refund is not blocked and returns the counts", async () => {
  seedUse([evidence({ passBudgetExempt: true }), passUnlock()]);
  cancelPortOnePayment.mockReset();
  cancelPortOnePayment.mockResolvedValue({ status: "SUCCEEDED", cancellation: { status: "SUCCEEDED" } });
  models.User.findById = jest.fn(() => ({
    select: () => ({ lean: async () => ({ profileSubscription: { tier: "standard", expiresAt: new Date(Date.now() + 86_400_000) } }) }),
  }));
  models.MonthlyCreditLedger.find = jest.fn(() => ({ select: () => ({ lean: async () => [] }), lean: async () => [] }));
  models.User.updateOne = jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 }));
  models.Payment.findByIdAndUpdate = jest.fn(() => ({ lean: async () => passOrder({ status: "cancelled" }) }));
  const result = await refundPaymentAsOperator({ env: ENV, payment: passOrder(), reason: "운영자 검토" });
  expect(result.ok).toBe(true);
  expect(cancelPortOnePayment).toHaveBeenCalledTimes(1);
  expect(result.passUse).toEqual({ useCount: 1, lightUseCount: 1, ownedUnlockCount: 1, hasUse: true });
});
