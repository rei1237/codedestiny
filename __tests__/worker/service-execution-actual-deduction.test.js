/** @jest-environment node */
import { runCoinRefund } from '../../worker/lib/service-execution-task.js';

const userId = '64b7f2a1c3d4e5f601234567';
const sourceId = '64b7f2a1c3d4e5f600000009';

function fixture({ delta = -12, failure = '', featureKey = 'test-feature', cost = 90 } = {}) {
  let state = { marked: false, balance: 7, receipt: null };
  let calls = 0;
  let queue = Promise.resolve();
  const withDb = async (_env, _ctx, fn) => fn({ transaction: async callback => {
    let release;
    const previous = queue;
    queue = new Promise(resolve => { release = resolve; });
    await previous;
    try {
    const work = structuredClone(state);
    const tx = {
      findOne: async (_model, filter) => filter.kind === 'refund' ? work.receipt : (work.marked ? null : { delta, featureKey, metadata: {} }),
      updateOne: async () => { work.marked = true; return { modifiedCount: 1 }; },
      findOneAndUpdate: async (_model, _filter, update) => {
        if (failure === 'balance') throw new Error('balance failed');
        work.balance += update.$inc.points;
        return { points: work.balance };
      },
      insertOne: async (_model, row) => {
        if (failure === 'receipt') throw new Error('receipt failed');
        work.receipt = { ...row, _id: 'receipt' };
        return { insertedId: 'receipt' };
      },
    };
    const result = await callback(tx);
    state = work;
    if (failure === 'response' && calls++ === 0) throw new Error('response lost');
    return result;
    } finally { release(); }
  } });
  return { run: () => runCoinRefund({ userId, featureKey: 'test-feature', cost, sourceTransactionId: sourceId }, { withDb }), state: () => state };
}

test('restores the actual debit once even when the requested price differs', async () => {
  const f = fixture();
  expect(await f.run()).toMatchObject({ refunded: true, amount: 12 });
  expect(f.state()).toMatchObject({ marked: true, balance: 19, receipt: { delta: 12 } });
  expect(await f.run()).toMatchObject({ refunded: true, idempotent: true });
  expect(f.state().balance).toBe(19);
});

test.each([0, null, 12, -1.5, Infinity])('does not invent a refund for deduction %s', async delta => {
  const f = fixture({ delta });
  expect(await f.run()).toMatchObject({ refunded: false, reason: 'DEDUCT_AMOUNT_UNVERIFIED' });
  expect(f.state()).toMatchObject({ marked: false, balance: 7, receipt: null });
});

test.each(['balance', 'receipt'])('%s failure rolls back the entire refund', async failure => {
  const f = fixture({ failure });
  await expect(f.run()).rejects.toThrow();
  expect(f.state()).toMatchObject({ marked: false, balance: 7, receipt: null });
});

test('a deduction for another product cannot fund this refund', async () => {
  const f = fixture({ featureKey: 'other-feature' });
  expect(await f.run()).toMatchObject({ refunded: false, reason: 'DEDUCT_FEATURE_MISMATCH' });
  expect(f.state()).toMatchObject({ marked: false, balance: 7, receipt: null });
});

test('a missing execution price does not hide a verified source debit', async () => {
  const f = fixture({ cost: 0 });
  expect(await f.run()).toMatchObject({ refunded: true, amount: 12 });
  expect(f.state().balance).toBe(19);
});

test('a committed refund with a lost response is not applied twice', async () => {
  const f = fixture({ failure: 'response' });
  await expect(f.run()).rejects.toThrow();
  expect(await f.run()).toMatchObject({ refunded: true, idempotent: true });
  expect(f.state().balance).toBe(19);
});

test('concurrent requests settle on one receipt and one balance change', async () => {
  const f = fixture();
  const results = await Promise.all([f.run(), f.run()]);
  expect(results.filter(row => row.idempotent === false)).toHaveLength(1);
  expect(results.filter(row => row.idempotent === true)).toHaveLength(1);
  expect(f.state()).toMatchObject({ marked: true, balance: 19, receipt: { delta: 12 } });
});
