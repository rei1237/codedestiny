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
      MasterLoveCodexSession: { updateOne: jest.fn(() => Promise.resolve({ matchedCount: 1 })) },
    };
  }

  test("챕터가 0개인 세션이 실패하면 환불을 시도하고 refundedAt 을 기록한다", async () => {
    const d = deps();
    await refundSessionPassIfNeeded(sessionId, userId, { passRefund: refund }, [], d);
    expect(d.refundPassCoverage).toHaveBeenCalledWith({ userId, cycleKey: refund.cycleKey, cost: refund.cost });
    expect(d.MasterLoveCodexSession.updateOne).toHaveBeenCalledWith(
      { id: sessionId, userId, "passRefund.refundedAt": { $exists: false } },
      { $set: { "passRefund.refundedAt": expect.any(Date) } },
    );
  });

  test("이미 챕터가 1개 이상 커밋된 세션은 환불하지 않는다(부분 전달 시 무료 재개 동작 보존)", async () => {
    const d = deps();
    await refundSessionPassIfNeeded(sessionId, userId, { passRefund: refund }, [{ id: "c1" }], d);
    expect(d.refundPassCoverage).not.toHaveBeenCalled();
  });

  test("passRefund 가 없는 세션(결제/관리자 접근)은 손대지 않는다", async () => {
    const d = deps();
    await refundSessionPassIfNeeded(sessionId, userId, { passRefund: null }, [], d);
    expect(d.refundPassCoverage).not.toHaveBeenCalled();
  });

  test("이미 refundedAt 이 찍힌 세션은 재시도해도 다시 환불하지 않는다(멱등)", async () => {
    const d = deps();
    await refundSessionPassIfNeeded(sessionId, userId, { passRefund: { ...refund, refundedAt: new Date() } }, [], d);
    expect(d.refundPassCoverage).not.toHaveBeenCalled();
  });

  test("사이클 롤오버 등으로 refundPassCoverage 가 skip 하면 DB 마커를 쓰지 않는다", async () => {
    const d = deps({ refunded: false });
    await refundSessionPassIfNeeded(sessionId, userId, { passRefund: refund }, [], d);
    expect(d.refundPassCoverage).toHaveBeenCalled();
    expect(d.MasterLoveCodexSession.updateOne).not.toHaveBeenCalled();
  });

  test("refundPassCoverage 가 예외를 던져도 삼켜서 원래 실패 흐름을 가리지 않는다", async () => {
    const d = deps();
    d.refundPassCoverage = jest.fn(() => Promise.reject(new Error("mongo down")));
    await expect(refundSessionPassIfNeeded(sessionId, userId, { passRefund: refund }, [], d)).resolves.toBeUndefined();
  });
});

// 결제 수단(코인·월정석·카드) 환급. 챕터 0장 + 재시도 창이 닫힌 뒤에만 돈다.
describe("refundSessionBillingIfNeeded", () => {
  const { refundSessionBillingIfNeeded, BILLING_REFUND_AFTER_MS } = __masterLoveCodexTestUtils;
  const sessionId = "mlc-2";
  const userId = "64b000000000000000000002";
  const OLD = Date.now() - BILLING_REFUND_AFTER_MS - 1000;

  function deps(overrides = {}) {
    return {
      runCoinRefund: jest.fn(async () => ({ refunded: false, skipped: true })),
      runMonthlyCreditRefund: jest.fn(async () => ({ refunded: false, skipped: true })),
      runPaymentCancel: jest.fn(async () => ({ cancelled: false, skipped: true })),
      MasterLoveCodexSession: { updateOne: jest.fn(async () => ({ matchedCount: 1 })) },
      ...overrides,
    };
  }
  const doc = (extra = {}) => ({ accessType: "paid", paymentId: "ord_1", mode: "solo", createdAt: new Date(OLD), ...extra });

  test("한 장이라도 커밋됐으면 환불하지 않는다 — 재개가 무료라는 기존 계약", async () => {
    const d = deps();
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc(), [{ id: "c1" }], d);
    expect(result.reason).toBe("PARTIAL_DELIVERY");
    expect(d.runCoinRefund).not.toHaveBeenCalled();
  });

  // 🔴 첫 실패에 카드를 취소하면 크론 회수 태스크가 완성시킬 수 있었던 세션을 우리가 닫아버린다.
  test("재시도 창(30분) 안이면 아직 환불하지 않는다 — 크론이 밀어 올릴 기회를 남긴다", async () => {
    const d = deps();
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc({ createdAt: new Date() }), [], d);
    expect(result.reason).toBe("RETRY_WINDOW_OPEN");
    expect(d.runPaymentCancel).not.toHaveBeenCalled();
  });

  test("이용권·관리자 세션은 결제 수단 환급 대상이 아니다", async () => {
    const d = deps();
    expect((await refundSessionBillingIfNeeded({}, sessionId, userId, doc({ accessType: "pass" }), [], d)).reason).toBe("NOT_BILLED");
    expect((await refundSessionBillingIfNeeded({}, sessionId, userId, doc({ accessType: "admin" }), [], d)).reason).toBe("NOT_BILLED");
    expect(d.runCoinRefund).not.toHaveBeenCalled();
  });

  test("이미 환급된 세션은 재시도해도 다시 환불하지 않는다(멱등)", async () => {
    const d = deps();
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc({ billingRefund: { refundedAt: new Date() } }), [], d);
    expect(result.idempotent).toBe(true);
    expect(d.runCoinRefund).not.toHaveBeenCalled();
  });

  test("코인이 돌아가면 거기서 멈춘다 — 카드까지 취소하면 이중 환불이다", async () => {
    const d = deps({ runCoinRefund: jest.fn(async () => ({ refunded: true, amount: 500 })) });
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc(), [], d);
    expect(result).toMatchObject({ refunded: true, method: "coin" });
    expect(d.runMonthlyCreditRefund).not.toHaveBeenCalled();
    expect(d.runPaymentCancel).not.toHaveBeenCalled();
    expect(d.MasterLoveCodexSession.updateOne.mock.calls[0][0]).toMatchObject({ "billingRefund.refundedAt": { $exists: false } });
  });

  test("코인·월정석이 해당 없으면 카드 취소로 넘어간다", async () => {
    const d = deps({ runPaymentCancel: jest.fn(async () => ({ cancelled: true })) });
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc(), [], d);
    expect(result).toMatchObject({ refunded: true, method: "payment" });
    expect(d.runPaymentCancel.mock.calls[0][1]).toEqual({ paymentId: "ord_1", merchantUid: "ord_1" });
  });

  test("월정석 세션은 코인 갈래를 태우지 않는다 — 코인 잔액을 잘못 불려 준다", async () => {
    const d = deps({ runMonthlyCreditRefund: jest.fn(async () => ({ refunded: true, amount: 500 })) });
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc({ accessType: "monthly_credit" }), [], d);
    expect(d.runCoinRefund).not.toHaveBeenCalled();
    expect(result).toMatchObject({ refunded: true, method: "monthly_credit" });
  });

  test("아무 갈래도 성공하지 못하면 마커를 쓰지 않는다 — 다음 기회에 다시 시도한다", async () => {
    const d = deps();
    const result = await refundSessionBillingIfNeeded({}, sessionId, userId, doc(), [], d);
    expect(result.refunded).toBe(false);
    expect(d.MasterLoveCodexSession.updateOne).not.toHaveBeenCalled();
  });

  test("환불기가 던져도 삼켜서 원래 실패 흐름을 가리지 않는다", async () => {
    const d = deps({ runCoinRefund: jest.fn(() => Promise.reject(new Error("mongo down"))) });
    await expect(refundSessionBillingIfNeeded({}, sessionId, userId, doc(), [], d)).resolves.toMatchObject({ refunded: false, error: true });
  });
});
