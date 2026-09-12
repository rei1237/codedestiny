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
