/**
 * @jest-environment node
 *
 * 관리자 환불(refundPaymentAsOperator)의 이용권 회수 — V2 이용권 주문은 기간을 metadata.durationMonths 에만
 * 쓴다(passes.js createPayablePassOrder). 그 위치를 읽지 않으면 V2 주문 전부가 UNKNOWN_DURATION 으로 빠져
 * 환불해도 이용권이 만료일까지 활성으로 남는다(2026-09-03 발견).
 */
import { jest } from "@jest/globals";

const userFindById = jest.fn();
const userUpdateOne = jest.fn();
let revokeMembershipPassGrant;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({ mongoose: { Types: { ObjectId: { isValid: () => true } } } })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      CONTENT_ENTITLEMENT_STATUSES: { REFUNDED: "REFUNDED", CANCELLED: "CANCELLED" },
      Payment: {}, User: { findById: userFindById, updateOne: userUpdateOne }, PointHistory: {}, MonthlyCreditLedger: {},
    })),
    jest.unstable_mockModule("../../worker/lib/portone.js", () => ({ cancelPortOnePayment: jest.fn() })),
    jest.unstable_mockModule("../../worker/lib/content-unlocks.js", () => ({ revokePaymentContentAccess: jest.fn() })),
    jest.unstable_mockModule("../../worker/lib/monthly-credit-lots.js", () => ({ ensureLotsForBalance: jest.fn() })),
    jest.unstable_mockModule("../../worker/lib/monthly-credit-store.js", () => ({ consumeMonthlyCreditLots: jest.fn() })),
  ]);
  ({ __paymentRefundTestUtils: { revokeMembershipPassGrant } } = await import("../../worker/lib/payment-refund.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  userUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
});

function userWithExpiry(daysFromNow) {
  const expiresAt = new Date(Date.now() + daysFromNow * 86_400_000);
  userFindById.mockReturnValue({ select: () => ({ lean: async () => ({ profileSubscription: { tier: "standard", expiresAt } }) }) });
  return expiresAt;
}

test("🔴 V2 이용권 주문(metadata.durationMonths)도 기간을 읽어 되감는다 — UNKNOWN_DURATION 으로 빠지지 않는다", async () => {
  userWithExpiry(20);
  const result = await revokeMembershipPassGrant({ userId: "64b000000000000000000001", metadata: { durationMonths: 1 } });
  expect(result).toMatchObject({ reverted: true });
  expect(result.reason).not.toBe("UNKNOWN_DURATION");
  const set = userUpdateOne.mock.calls[0][1].$set;
  expect(set["profileSubscription.tier"]).toBe("free");
  expect(set["profileSubscription.expiresAt"].getTime()).toBeLessThan(Date.now());
});

test("기간 근거가 어디에도 없으면 종전대로 UNKNOWN_DURATION 검토로 넘긴다", async () => {
  userWithExpiry(20);
  const result = await revokeMembershipPassGrant({ userId: "64b000000000000000000001", metadata: {} });
  expect(result).toMatchObject({ reverted: false, adminReviewRequired: true, reason: "UNKNOWN_DURATION" });
  expect(userUpdateOne).not.toHaveBeenCalled();
});
