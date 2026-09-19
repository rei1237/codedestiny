/** @jest-environment node */
import { jest } from "@jest/globals";
import { recoverCodexSession } from "../../worker/lib/master-love-codex-session-access.js";

const userId = "64b000000000000000000001";
const session = { id: "book-1", userId, idempotencyKey: "run-1", inputHash: "input-1", mode: "compat", status: "generation_failed", accessType: "pass" };
function fixtures(row = session, refund = null) {
  return {
    MasterLoveCodexSession: { findOne: jest.fn(filter => ({ lean: async () => row && row.userId === filter.userId ? row : null })) },
    Payment: { findOne: jest.fn(() => ({ lean: async () => refund })) },
  };
}
test("family purchase survives exhausted/expired pass and absent access token", async () => {
  const db = fixtures();
  expect(await recoverCodexSession({ userId, sessionId: session.id }, db)).toEqual({ session });
  expect(db.Payment.findOne).not.toHaveBeenCalled();
});
test("same run cannot be reused with different inputs or product", async () => {
  for (const patch of [{ inputHash: "different" }, { mode: "solo" }]) {
    expect(await recoverCodexSession({ userId, requestId: "run-1", ...patch }, fixtures())).toMatchObject({ denied: true });
  }
});
test("another user cannot recover the purchase", async () => {
  expect(await recoverCodexSession({ userId: "other", sessionId: session.id }, fixtures())).toBeNull();
});
test.each(["refunded", "cancelled", "canceled"])("%s purchase cannot be revived by an existing session", async status => {
  const db = fixtures({ ...session, accessType: "paid", paymentId: "order-1" }, { status });
  expect(await recoverCodexSession({ userId, sessionId: session.id }, db)).toMatchObject({ reason: "PURCHASE_REFUNDED" });
  expect(JSON.stringify(db.Payment.findOne.mock.calls[0][0])).toContain(status);
});
test("partial cancellation keeps the completed purchase readable until its grant is explicitly revoked", async () => {
  const paid = { ...session, status: "completed", accessType: "paid", paymentId: "order-1" };
  const db = fixtures(paid, null);
  expect(await recoverCodexSession({ userId, sessionId: paid.id }, db)).toEqual({ session: paid });
  expect(db.Payment.findOne.mock.calls[0][0]).toEqual(expect.objectContaining({
    $and: expect.arrayContaining([
      expect.objectContaining({
        $or: expect.arrayContaining([
          expect.objectContaining({ status: "refunded", orderState: { $nin: ["PARTIAL_CANCELLED", "partial_cancelled"] } }),
        ]),
      }),
    ]),
  }));
});
test("DB outage propagates instead of presenting a new payment", async () => {
  const db = fixtures();
  db.MasterLoveCodexSession.findOne.mockImplementation(() => ({ lean: async () => { throw new Error("DB unavailable"); } }));
  await expect(recoverCodexSession({ userId, sessionId: session.id }, db)).rejects.toThrow("DB unavailable");
});
// "실패한 장은 완료로 계산되지도 구매본을 소비하지도 않는다"는 계약은 죽은 순수 함수
// (planBatchCommit) 대신 실제 웨이브를 돌리는 master-love-codex-paid-delivery.test.js 가 지킨다
// — 거기서는 실패한 장이 chapters 에 실리지 않고 환불도 일어나지 않는 것을 함께 확인한다.
