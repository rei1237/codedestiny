/** @jest-environment node */
import { restoreSukuyoLegacyRefund } from '../../worker/lib/sukuyo-legacy-refund.js';

const userId = '64b7f2a1c3d4e5f601234567';
const evidenceId = '64b7f2a1c3d4e5f600000009';

function fixture({ delta = -12, failure = '' } = {}) {
  let state = { marked: false, balance: 7, receipt: null };
  let calls = 0;
  const withDb = async (_env, _ctx, fn) => fn({ transaction: async callback => {
    const working = structuredClone(state);
    const tx = {
      findOne: async (_model, filter) => filter.kind === 'refund' ? working.receipt : (working.marked ? null : { delta }),
      updateOne: async () => { working.marked = true; return { modifiedCount: 1 }; },
      findOneAndUpdate: async (_model, _filter, update) => {
        if (failure === 'balance') throw new Error('balance failed');
        working.balance += update.$inc.points;
        return { points: working.balance };
      },
      insertOne: async (_model, receipt) => {
        if (failure === 'receipt') throw new Error('receipt failed');
        working.receipt = receipt;
      },
    };
    const value = await callback(tx);
    state = working;
    if (failure === 'response' && calls++ === 0) throw new Error('response lost');
    return value;
  } });
  return { run: () => restoreSukuyoLegacyRefund({}, { userId, evidenceId, failureMessage: 'failed' }, { withDb }), state: () => state };
}

test('actual deduction is restored once', async () => {
  const f = fixture();
  expect(await f.run()).toBe(true);
  expect(f.state()).toMatchObject({ marked: true, balance: 19, receipt: { delta: 12, balanceAfter: 19 } });
  expect(await f.run()).toBe(true);
  expect(f.state().balance).toBe(19);
});

test.each([0, null, 3, -1.5])('invalid deduction %s does not restore', async delta => {
  const f = fixture({ delta });
  expect(await f.run()).toBe(false);
  expect(f.state()).toMatchObject({ marked: false, balance: 7, receipt: null });
});

test.each(['balance', 'receipt'])('%s failure rolls back marker and balance', async failure => {
  const f = fixture({ failure });
  await expect(f.run()).rejects.toThrow();
  expect(f.state()).toMatchObject({ marked: false, balance: 7, receipt: null });
});

test('lost response after commit does not restore twice', async () => {
  const f = fixture({ failure: 'response' });
  await expect(f.run()).rejects.toThrow();
  expect(await f.run()).toBe(true);
  expect(f.state()).toMatchObject({ marked: true, balance: 19 });
});
