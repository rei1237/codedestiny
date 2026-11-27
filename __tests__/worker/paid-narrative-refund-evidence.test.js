/**
 * @jest-environment node
 *
 * 2026-11-27 서술형 환불 구멍 닫기: 결제 확인기가 결제 근거(transactionId·passRefund)를 버리면
 * 최종 실패가 환불 대신 PAID_NARRATIVE_REFUND_EVIDENCE_MISSING 보류로 끝났다.
 * 근거가 실행 기록까지 이어지는 갈래(꿈 해몽 이용권·서명 토큰). 수호신 결제 확인기는 guardian-fortune-route.test.js를 고정한다.
 */
import { jest } from "@jest/globals";
import { withSettle } from "../fixtures/per-use-settle-mock.mjs";

const mockVerifyPerUsePayment = jest.fn();
const mockCanAccessPaidFeature = jest.fn();
const mockVerifyPremiumAccessToken = jest.fn();
let verifyPsychoDreamAccess, paidNarrativeRefundEvidence;

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => withSettle({ verifyPerUsePayment: mockVerifyPerUsePayment }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({ PAID_FEATURE_ACCESS_USER_PROJECTION: {}, canAccessPaidFeature: mockCanAccessPaidFeature }));
  jest.unstable_mockModule("../../worker/lib/premium-access-token.js", () => ({ verifyPremiumAccessToken: mockVerifyPremiumAccessToken }));
  ({ verifyPsychoDreamAccess } = await import("../../worker/routes/dream.js"));
  ({ paidNarrativeRefundEvidence } = await import("../../worker/lib/paid-narrative-delivery.js"));
});

beforeEach(() => { mockVerifyPerUsePayment.mockReset(); mockCanAccessPaidFeature.mockReset(); mockVerifyPremiumAccessToken.mockReset(); });

const auth = { userId: "user-1" };
const request = () => new Request("https://example.test/api/dream/psycho-analysis", { method: "POST" });

test("dream: a pass deducted for this request keeps its refund evidence", async () => {
  mockCanAccessPaidFeature.mockResolvedValue({ allowed: true, accessSource: "honeyPass" });
  mockVerifyPerUsePayment.mockResolvedValue({ proven: true, source: "pass", transactionId: "pass-row-1", passRefund: { cycleKey: "2026-11", cost: 30 } });
  const access = await verifyPsychoDreamAccess(request(), {}, { requestId: "dream-req-1" }, auth);
  expect(access.ok).toBe(true);
  expect(paidNarrativeRefundEvidence(access)).toEqual({ transactionId: "pass-row-1", passRefund: { cycleKey: "2026-11", cost: 30 } });
});

test("dream: a signed payment token's own transactionId is the evidence, never the body's", async () => {
  mockCanAccessPaidFeature.mockResolvedValue({ allowed: false, reason: "PAYMENT_REQUIRED" });
  mockVerifyPremiumAccessToken.mockResolvedValue({ ok: true, payload: { featureKey: "dream-psycho-analysis", transactionId: "payment-row-7" } });
  const access = await verifyPsychoDreamAccess(request(), {}, { premiumAccessToken: "signed", transactionId: "forged-row" }, auth);
  expect(access.ok).toBe(true);
  expect(paidNarrativeRefundEvidence(access)).toEqual({ transactionId: "payment-row-7" });
});
