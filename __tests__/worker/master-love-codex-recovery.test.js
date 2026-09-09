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
  expect(db.Payment.findOne.mock.calls[0][0].status.$in).toContain(status);
});
test("DB outage propagates instead of presenting a new payment", async () => {
  const db = fixtures();
  db.MasterLoveCodexSession.findOne.mockImplementation(() => ({ lean: async () => { throw new Error("DB unavailable"); } }));
  await expect(recoverCodexSession({ userId, sessionId: session.id }, db)).rejects.toThrow("DB unavailable");
});
import { __masterLoveCodexTestUtils } from "../../worker/routes/master-love-codex.js";

test("a failed LLM chapter cannot complete or consume the purchased report", () => {
  const ok = { status: "ok", chapter: { id: "1", ok: true } };
  const fallback = { status: "fallback", chapter: { id: "2", ok: false } };
  expect(__masterLoveCodexTestUtils.planBatchCommit([ok, fallback, ok])).toEqual([ok]);
  expect(__masterLoveCodexTestUtils.planBatchCommit([fallback])).toEqual([]);
});
