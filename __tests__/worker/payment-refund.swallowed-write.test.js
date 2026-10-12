/**
 * @jest-environment node
 *
 * 운영자 환불의 부수 쓰기(B2c) — PG 취소 요청이 거절돼 실패 사유를 Payment 에 남기는 쓰기까지 거절되면,
 * 예전에는 `.catch(() => {})` 가 그 사실을 지웠다. 응답 계약(502 PORTONE_CANCEL_REQUEST_FAILED)은 그대로
 * 두고 삼켜진 오류를 `[payment-swallowed]` 한 줄로 남긴다.
 */
import { jest } from "@jest/globals";

const paymentFindByIdAndUpdate = jest.fn();
const cancelPortOnePayment = jest.fn();
let refundPaymentAsOperator;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({ mongoose: { Types: { ObjectId: { isValid: () => true } } }, withMongoRetry: async (_env, fn) => fn() })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      CONTENT_ENTITLEMENT_STATUSES: { REFUNDED: "REFUNDED", CANCELLED: "CANCELLED" },
      Payment: { findByIdAndUpdate: paymentFindByIdAndUpdate, updateOne: jest.fn() },
      User: {}, PointHistory: {}, MonthlyCreditLedger: {},
    })),
    jest.unstable_mockModule("../../worker/lib/portone.js", () => ({ cancelPortOnePayment })),
    jest.unstable_mockModule("../../worker/lib/content-unlocks.js", () => ({ revokePaymentContentAccess: jest.fn() })),
    jest.unstable_mockModule("../../worker/lib/monthly-credit-lots.js", () => ({ ensureLotsForBalance: jest.fn() })),
    jest.unstable_mockModule("../../worker/lib/monthly-credit-store.js", () => ({ consumeMonthlyCreditLots: jest.fn() })),
  ]);
  ({ refundPaymentAsOperator } = await import("../../worker/lib/payment-refund.js"));
});

test("PG 취소 거절 기록 쓰기가 실패해도 502 계약은 유지되고 실패는 로그에 남는다", async () => {
  cancelPortOnePayment.mockRejectedValue(new Error("PG says: already cancelled"));
  paymentFindByIdAndUpdate.mockRejectedValue(new Error("mongo write timeout"));
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

  const result = await refundPaymentAsOperator({
    env: {},
    payment: { _id: "payment-doc-777", merchantUid: "pay_refund_777", paymentAmount: 12000, status: "paid", featureKey: "section_summary" },
  });

  expect(result).toMatchObject({ ok: false, status: 502, code: "PORTONE_CANCEL_REQUEST_FAILED" });
  const line = warn.mock.calls.map((call) => call.join(" ")).find((text) => text.startsWith("[payment-swallowed]"));
  expect(line).toContain("operator_refund_cancel_request_failed");
  expect(line).toContain("payment-doc-777");
  expect(line).toContain("mongo write timeout");
  warn.mockRestore();
});
