/** @jest-environment node */
import { jest } from "@jest/globals";
import { __masterLoveCodexTestUtils } from "../../worker/routes/master-love-codex.js";

const { passRefundFor, refundSessionPassIfNeeded } = __masterLoveCodexTestUtils;

describe("passRefundFor", () => {
  test("이번 호출에서 새로 차감됐고(budgetApplies) cost 가 있으면 환불 정보를 만든다", () => {
    const consumed = { covered: true, replayed: false, coverage: { cycleKey: "2026-09-30T00:00:00.000Z", budgetApplies: true } };
    expect(passRefundFor(consumed, 300)).toEqual({ cycleKey: "2026-09-30T00:00:00.000Z", cost: 300 });
  });

  test("재생(replayed)이면 이번 호출로 새로 깎인 것이 없으므로 환불 대상이 아니다", () => {
    const consumed = { covered: true, replayed: true, coverage: { cycleKey: "k", budgetApplies: true } };
    expect(passRefundFor(consumed, 300)).toBeUndefined();
  });

  test("budgetApplies 가 없으면(월 예산을 못 세는 상태) 환불 대상이 아니다", () => {
    const consumed = { covered: true, replayed: false, coverage: { cycleKey: "k", budgetApplies: false } };
    expect(passRefundFor(consumed, 300)).toBeUndefined();
  });

  test("애초에 커버되지 않았으면 환불 대상이 아니다", () => {
    expect(passRefundFor({ covered: false }, 300)).toBeUndefined();
  });

  test("cost 가 0 이하면 환불 대상이 아니다", () => {
    const consumed = { covered: true, replayed: false, coverage: { cycleKey: "k", budgetApplies: true } };
    expect(passRefundFor(consumed, 0)).toBeUndefined();
  });
});

describe("refundSessionPassIfNeeded", () => {
  const sessionId = "mlc-1";
  const userId = "64b000000000000000000001";
  const refund = { cycleKey: "2026-09-30T00:00:00.000Z", cost: 300 };

  function deps({ refunded = true } = {}) {
    return {
      refundPassCoverage: jest.fn(async () => (refunded ? { refunded: true, amount: 300 } : { refunded: false, skipped: true })),
      refundPassUseEvidence: jest.fn(async () => ({ refunded: true, amount: 300 })),
      MasterLoveCodexSession: { updateOne: jest.fn(() => Promise.resolve({ matchedCount: 1 })) },
    };
  }

  test("챕터가 0개인 세션이 실패하면 환불을 시도하고 refundedAt 을 기록한다", async () => {
    const d = deps();
    await refundSessionPassIfNeeded(sessionId, userId, { passRefund: refund }, d);
    expect(d.refundPassCoverage).toHaveBeenCalledWith({ userId, cycleKey: refund.cycleKey, cost: refund.cost, refundId: `master-love-codex:${sessionId}` });
    expect(d.MasterLoveCodexSession.updateOne).toHaveBeenCalledWith(
      { id: sessionId, userId, "passRefund.refundedAt": { $exists: false } },
      { $set: { "passRefund.refundedAt": expect.any(Date) } },
    );
  });

  // S16 (2026-11-19): 부분 전달이 없어졌다 — 저장된 장이 있어도 최종 실패면 되돌린다.
  test("저장된 장이 있어도 최종 실패 세션의 이용권을 되돌린다", async () => {
    const d = deps();
    const result = await refundSessionPassIfNeeded(sessionId, userId, { passRefund: refund, chapters: [{ id: "c1", body: "x" }] }, d);
    expect(d.refundPassCoverage).toHaveBeenCalled();
    expect(result).toEqual({ refunded: true });
  });

  test("passRefund 가 없는 세션(결제/관리자 접근)은 손대지 않는다", async () => {
    const d = deps();
    await refundSessionPassIfNeeded(sessionId, userId, { passRefund: null }, d);
    expect(d.refundPassCoverage).not.toHaveBeenCalled();
    expect(d.refundPassUseEvidence).not.toHaveBeenCalled();
  });

  test("결제 화면이 미리 차감한 이용권(passRefund 없음)은 (기능, requestId) 증빙으로 되돌린다", async () => {
    const d = deps();
    await refundSessionPassIfNeeded(sessionId, userId, { passRefund: null, mode: "solo", idempotencyKey: "req-1" }, d);
    expect(d.refundPassUseEvidence).toHaveBeenCalledWith(expect.objectContaining({ userId, requestId: "req-1", refundId: `master-love-codex:${sessionId}` }));
    expect(d.refundPassCoverage).not.toHaveBeenCalled();
    expect(d.MasterLoveCodexSession.updateOne).not.toHaveBeenCalled();
  });

  test("passRefund 환불도 차감 증빙 (기능, requestId)를 실어 다른 환불 경로와 겹치지 않게 한다", async () => {
    const d = deps();
    await refundSessionPassIfNeeded(sessionId, userId, { passRefund: refund, mode: "solo", billingRequestId: "req-2" }, d);
    expect(d.refundPassCoverage).toHaveBeenCalledWith(expect.objectContaining({ sourceRequestId: "req-2", sourceFeatureKey: expect.any(String) }));
  });

  test("이미 refundedAt 이 찍힌 세션은 재시도해도 다시 환불하지 않는다(멱등)", async () => {
    const d = deps();
    await refundSessionPassIfNeeded(sessionId, userId, { passRefund: { ...refund, refundedAt: new Date() } }, d);
    expect(d.refundPassCoverage).not.toHaveBeenCalled();
  });

  test("사이클 롤오버 등으로 refundPassCoverage 가 skip 하면 DB 마커를 쓰지 않는다", async () => {
    const d = deps({ refunded: false });
    await refundSessionPassIfNeeded(sessionId, userId, { passRefund: refund }, d);
    expect(d.refundPassCoverage).toHaveBeenCalled();
    expect(d.MasterLoveCodexSession.updateOne).not.toHaveBeenCalled();
  });

  test("refundPassCoverage 가 예외를 던져도 삼켜서 원래 실패 흐름을 가리지 않는다", async () => {
    const d = deps();
    d.refundPassCoverage = jest.fn(() => Promise.reject(new Error("mongo down")));
    await expect(refundSessionPassIfNeeded(sessionId, userId, { passRefund: refund }, d)).resolves.toEqual({ refunded: false, error: true });
  });
});

// 결제 수단(코인·월정석·카드) 환급. S16: 최종 실패(generation_failed) 확정 뒤에만 불린다 — 저장된 장·경과 시간과 무관.
describe("refundSessionBillingIfNeeded", () => {
  const { refundSessionBillingIfNeeded } = __masterLoveCodexTestUtils;
  const sessionId = "mlc-2";
  const userId = "64b000000000000000000002";

  function deps(overrides = {}) {
    return {
      runCoinRefund: jest.fn(async () => ({ refunded: false, skipped: true })),
      runMonthlyCreditRefund: jest.fn(async () => ({ refunded: false, skipped: true })),
      runPaymentCancel: jest.fn(async () => ({ cancelled: false, skipped: true })),
      MasterLoveCodexSession: { updateOne: jest.fn(async () => ({ matchedCount: 1 })) },
      ...overrides,
    };
  }
  const doc = (extra = {}) => ({ accessType: "paid", paymentId: "ord_1", mode: "solo", createdAt: new Date(), ...extra });

  test("저장된 장이 있는 방금 만든 세션도 최종 실패면 환급한다 — 부분 전달·재시도 창 건너뛰기 없음", async () => {
    const d = deps({ runPaymentCancel: jest.fn(async () => ({ cancelled: true })) });
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc({ chapters: [{ id: "c1", body: "x" }] }), d);
    expect(result).toMatchObject({ refunded: true, method: "payment" });
  });

  test("이용권·관리자 세션은 결제 수단 환급 대상이 아니다", async () => {
    const d = deps();
    expect((await refundSessionBillingIfNeeded({}, sessionId, userId, doc({ accessType: "pass" }), d)).reason).toBe("NOT_BILLED");
    expect((await refundSessionBillingIfNeeded({}, sessionId, userId, doc({ accessType: "admin" }), d)).reason).toBe("NOT_BILLED");
    expect(d.runCoinRefund).not.toHaveBeenCalled();
  });

  test("이미 환급된 세션은 재시도해도 다시 환불하지 않는다(멱등)", async () => {
    const d = deps();
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc({ billingRefund: { refundedAt: new Date() } }), d);
    expect(result.idempotent).toBe(true);
    expect(d.runCoinRefund).not.toHaveBeenCalled();
  });

  test("코인이 돌아가면 거기서 멈춘다 — 카드까지 취소하면 이중 환불이다", async () => {
    const d = deps({ runCoinRefund: jest.fn(async () => ({ refunded: true, amount: 500 })) });
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc(), d);
    expect(result).toMatchObject({ refunded: true, method: "coin" });
    expect(d.runMonthlyCreditRefund).not.toHaveBeenCalled();
    expect(d.runPaymentCancel).not.toHaveBeenCalled();
    expect(d.MasterLoveCodexSession.updateOne.mock.calls[0][0]).toMatchObject({ "billingRefund.refundedAt": { $exists: false } });
  });

  test("코인·월정석이 해당 없으면 카드 취소로 넘어간다", async () => {
    const d = deps({ runPaymentCancel: jest.fn(async () => ({ cancelled: true })) });
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc(), d);
    expect(result).toMatchObject({ refunded: true, method: "payment" });
    expect(d.runPaymentCancel.mock.calls[0][1]).toEqual({ paymentId: "ord_1", merchantUid: "ord_1" });
  });

  test("월정석 결과가 불명확하면 다른 결제 수단을 중복 취소하지 않는다", async () => {
    const d = deps({ runMonthlyCreditRefund: jest.fn(async () => ({ refunded: false, adminReviewRequired: true })) });
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc(), d);
    expect(result).toMatchObject({ refunded: false, adminReviewRequired: true });
    expect(d.runPaymentCancel).not.toHaveBeenCalled();
    expect(d.MasterLoveCodexSession.updateOne).not.toHaveBeenCalled();
  });

  test("환급 이후 세션 기록 저장 실패를 성공으로 보고하지 않는다", async () => {
    const d = deps({
      runMonthlyCreditRefund: jest.fn(async () => ({ refunded: true, idempotent: true })),
      MasterLoveCodexSession: { updateOne: jest.fn(async () => { throw new Error("marker unavailable"); }) },
    });
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc(), d);
    expect(result).toMatchObject({ refunded: false, adminReviewRequired: true, reason: "REFUND_SESSION_MARKER_UNCONFIRMED" });
    expect(d.runPaymentCancel).not.toHaveBeenCalled();
  });

  test("월정석 세션은 코인 갈래를 태우지 않는다 — 코인 잔액을 잘못 불려 준다", async () => {
    const d = deps({ runMonthlyCreditRefund: jest.fn(async () => ({ refunded: true, amount: 500 })) });
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc({ accessType: "monthly_credit" }), d);
    expect(d.runCoinRefund).not.toHaveBeenCalled();
    expect(result).toMatchObject({ refunded: true, method: "monthly_credit" });
  });

  test("아무 갈래도 성공하지 못하면 마커를 쓰지 않는다 — 다음 기회에 다시 시도한다", async () => {
    const d = deps();
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc(), d);
    expect(result.refunded).toBe(false);
    expect(d.MasterLoveCodexSession.updateOne).not.toHaveBeenCalled();
  });

  test("환불기가 던져도 삼켜서 원래 실패 흐름을 가리지 않는다", async () => {
    const d = deps({ runCoinRefund: jest.fn(() => Promise.reject(new Error("mongo down"))) });
    await expect(refundSessionBillingIfNeeded({}, sessionId, userId, doc(), d)).resolves.toMatchObject({ refunded: false, error: true });
  });
});

// S16: 최종 실패 정산 — 이용권 → 결제 수단, 끝나면 refundSettledAt 으로 크론 재정산을 멈춘다.
describe("retryCodexFinalRefund", () => {
  const { retryCodexFinalRefund } = __masterLoveCodexTestUtils;
  const failed = (extra = {}) => ({ id: "mlc-3", userId: "64b000000000000000000003", status: "generation_failed", accessType: "paid",
    paymentId: "ord_3", mode: "solo", passRefund: { cycleKey: "k", cost: 300 }, deliveryMeta: { reviewReason: "DELIVERY_FAILED" }, ...extra });
  function deps(overrides = {}) {
    return {
      refundPassCoverage: jest.fn(async () => ({ refunded: true })),
      refundPassUseEvidence: jest.fn(async () => ({ refunded: false, skipped: true })),
      runCoinRefund: jest.fn(async () => ({ refunded: false, skipped: true })),
      runMonthlyCreditRefund: jest.fn(async () => ({ refunded: false, skipped: true })),
      runPaymentCancel: jest.fn(async () => ({ cancelled: true })),
      MasterLoveCodexSession: { updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })) },
      syncCodexExecution: jest.fn(async () => true),
      ...overrides,
    };
  }
  const setCalls = d => d.MasterLoveCodexSession.updateOne.mock.calls.map(([, update]) => Object.keys(update.$set)[0]);

  test("이용권과 결제 수단을 모두 되돌리고 refundSettledAt 을 남긴다", async () => {
    const d = deps();
    const result = await retryCodexFinalRefund({}, failed(), d);
    expect(result.refundStatus).toBe("settled");
    expect(d.refundPassCoverage).toHaveBeenCalledTimes(1);
    expect(d.runPaymentCancel).toHaveBeenCalledTimes(1);
    expect(setCalls(d)).toEqual(["passRefund.refundedAt", "billingRefund", "deliveryMeta.refundSettledAt"]);
    expect(d.syncCodexExecution).toHaveBeenCalled();
  });

  test("이미 정산된 세션은 환불기를 다시 부르지 않는다(최대 1회)", async () => {
    const d = deps();
    const result = await retryCodexFinalRefund({}, failed({ deliveryMeta: { reviewReason: "DELIVERY_FAILED", refundSettledAt: new Date() } }), d);
    expect(result).toMatchObject({ refundStatus: "settled", idempotent: true });
    expect(d.refundPassCoverage).not.toHaveBeenCalled();
    expect(d.runPaymentCancel).not.toHaveBeenCalled();
  });

  test("환불기 오류는 pending 으로 남겨 다음 크론이 다시 정산한다", async () => {
    const d = deps({ runPaymentCancel: jest.fn(() => Promise.reject(new Error("pg down"))) });
    const result = await retryCodexFinalRefund({}, failed(), d);
    expect(result.refundStatus).toBe("pending");
    expect(setCalls(d)).not.toContain("deliveryMeta.refundSettledAt");
  });

  test("토스 앱 결제는 사람 확인으로 넘기고 정산 완료로 표시하지 않는다", async () => {
    const d = deps();
    const result = await retryCodexFinalRefund({}, failed({ passRefund: null, deliveryMeta: { reviewReason: "DELIVERY_FAILED", tossIntentId: "t1" } }), d);
    expect(result.refundStatus).toBe("admin_review");
    expect(setCalls(d)).toEqual(["deliveryMeta.refundAdminReviewAt"]);
  });
});
