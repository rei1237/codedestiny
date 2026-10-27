/** @jest-environment node */
import { restoreSukuyoPointRefund } from '../../worker/lib/sukuyo-point-refund.js';

const userId = '64b7f2a1c3d4e5f601234567';
const evidenceId = '64b7f2a1c3d4e5f600000008';

function fixture({ delta = -123, marked = false, fault = '' } = {}) {
  let state = { original: { delta, metadata: { refundedForServiceExecution: marked } }, receipt: null, balance: 0 };
  const withDb = async (_env, _ctx, fn) => fn({ transaction: async callback => {
    const copy = structuredClone(state);
    const tx = {
      findOne: async (_model, filter) => filter.kind === 'deduct' ? copy.original : copy.receipt,
      findOneAndUpdate: async (_model, _filter, update) => {
        if (fault === 'balance') throw new Error('balance failure');
        copy.balance += update.$inc.points;
        return { _id: userId, points: copy.balance };
      },
      insertOne: async (_model, row) => {
        if (fault === 'receipt') throw new Error('receipt failure');
        copy.receipt = row;
      },
      updateOne: async () => {
        if (fault === 'marker') return { modifiedCount: 0 };
        copy.original.metadata.refundedForServiceExecution = true;
        return { modifiedCount: 1 };
      },
    };
    const result = await callback(tx);
    state = copy;
    return result;
  } });
  return { run: () => restoreSukuyoPointRefund({}, { userId, evidenceId, failureMessage: 'failed' }, { withDb }), state: () => state };
}

test('실제 차감만 한 번 복원하고 영수증과 표식을 함께 남긴다', async () => {
  const f = fixture();
  expect(await f.run()).toBe(true);
  expect(f.state()).toMatchObject({ balance: 123, receipt: { delta: 123 }, original: { metadata: { refundedForServiceExecution: true } } });
  expect(await f.run()).toBe(true);
  expect(f.state().balance).toBe(123);
});

test.each([0, 1, -1.5, NaN])('차감 증빙이 유효하지 않으면 복원하지 않는다: %s', async delta => {
  const f = fixture({ delta });
  expect(await f.run()).toBe(false);
  expect(f.state()).toMatchObject({ balance: 0, receipt: null });
});

test('과거 완료 표식에 영수증이 없으면 성공으로 판단하지 않는다', async () => {
  const f = fixture({ marked: true });
  expect(await f.run()).toBe(false);
  expect(f.state().balance).toBe(0);
});

test.each(['balance', 'receipt', 'marker'])('%s 저장 실패는 모든 변경을 취소한다', async fault => {
  const f = fixture({ fault });
  await expect(f.run()).rejects.toThrow();
  expect(f.state()).toMatchObject({ balance: 0, receipt: null, original: { metadata: { refundedForServiceExecution: false } } });
});
