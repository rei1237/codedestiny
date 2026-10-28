/** @jest-environment node */
import { jest } from '@jest/globals';
import { restoreSukuyoMonthlyRefund } from '../../worker/lib/sukuyo-monthly-refund.js';

const userId = '64b7f2a1c3d4e5f601234567';
const evidenceId = '64b7f2a1c3d4e5f600000008';

function fixture({ proof = true, restoreFails = false, markerFails = false } = {}) {
  let state = { receipt: null, marked: false, balance: 0 };
  const proofLookup = jest.fn(async () => proof ? { ledgerId: evidenceId, sourceId: 'purchase-1', amount: 123 } : null);
  const restore = jest.fn(async ({ amount, pullRequestId }) => {
    expect(pullRequestId).toBe('purchase-1');
    if (restoreFails) throw new Error('restore failed');
    current.balance += amount;
    return { added: true, beforeBalance: 0, afterBalance: current.balance };
  });
  let current;
  const withDb = async (_env, _ctx, fn) => fn({ transaction: async callback => {
    current = structuredClone(state);
    const tx = {
      findOne: async () => current.receipt,
      insertOne: async (_model, row) => { current.receipt = row; },
      updateOne: async () => {
        if (markerFails) return { modifiedCount: 0 };
        current.marked = true;
        return { modifiedCount: 1 };
      },
    };
    const result = await callback(tx);
    state = current;
    return result;
  } });
  return { run: () => restoreSukuyoMonthlyRefund({}, { userId, evidenceId, failureMessage: 'failed' }, { withDb, proofLookup, restore }),
    state: () => state, proofLookup, restore };
}

test('실제 차감량만 복원하고 원장과 표식을 함께 기록하며 재호출은 중복 지급하지 않는다', async () => {
  const f = fixture();
  expect(await f.run()).toBe(true);
  expect(f.state()).toMatchObject({ balance: 123, marked: true, receipt: { amount: 123 } });
  expect(await f.run()).toBe(true);
  expect(f.restore).toHaveBeenCalledTimes(1);
});

test('차감 증빙이 없으면 복원하지 않는다', async () => {
  const f = fixture({ proof: false });
  expect(await f.run()).toBe(false);
  expect(f.restore).not.toHaveBeenCalled();
  expect(f.state()).toMatchObject({ balance: 0, marked: false, receipt: null });
});

test.each([{ restoreFails: true }, { markerFails: true }])('복원 또는 표식 실패 시 전체 거래를 취소한다: %o', async options => {
  const f = fixture(options);
  await expect(f.run()).rejects.toThrow();
  expect(f.state()).toMatchObject({ balance: 0, marked: false, receipt: null });
});
