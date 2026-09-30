/** @jest-environment node */
import { makeFakePaymentDb } from '../fixtures/fake-payment-db.mjs';

test('committing preserves the seeded document reference used by other model fixtures', async () => {
  const db = makeFakePaymentDb();
  const user = { _id: 'owner', profileSubscription: { monthlySpendCoin: 30 }, obsolete: true };
  db.rows.push(user);
  await db.transaction(async tx => {
    await tx.updateOne(null, { _id: 'owner' }, {
      $inc: { 'profileSubscription.monthlySpendCoin': -30 },
      $unset: { obsolete: '' },
    });
  });
  expect(db.rows[0]).toBe(user);
  expect(user.profileSubscription.monthlySpendCoin).toBe(0);
  expect(user.obsolete).toBeUndefined();
});

test('an aborted private transaction neither publishes its draft nor erases a concurrent write', async () => {
  const db = makeFakePaymentDb();
  const user = { _id: 'owner', balance: 100 };
  db.rows.push(user);
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const resume = new Promise(resolve => { release = resolve; });
  const pending = db.transaction(async tx => {
    await tx.updateOne(null, { _id: 'owner' }, { $inc: { balance: -20 } });
    entered();
    await resume;
    throw new Error('receipt write failed');
  });
  const rejected = expect(pending).rejects.toThrow('receipt write failed');
  await started;
  expect(user.balance).toBe(100);
  await db.updateOne(null, { _id: 'owner' }, { $inc: { balance: 5 } });
  release();
  await rejected;
  expect(db.rows[0]).toBe(user);
  expect(user.balance).toBe(105);
});

test('a transaction conflict retries against committed state and keeps the same shared document', async () => {
  const db = makeFakePaymentDb();
  const user = { _id: 'owner', balance: 100 };
  db.rows.push(user);
  let entered, release, attempts = 0;
  const started = new Promise(resolve => { entered = resolve; });
  const resume = new Promise(resolve => { release = resolve; });
  const pending = db.transaction(async tx => {
    attempts += 1;
    await tx.updateOne(null, { _id: 'owner' }, { $inc: { balance: -20 } });
    if (attempts === 1) { entered(); await resume; }
  });
  await started;
  await db.updateOne(null, { _id: 'owner' }, { $inc: { balance: 5 } });
  release();
  await pending;
  expect(attempts).toBe(2);
  expect(db.rows[0]).toBe(user);
  expect(user.balance).toBe(85);
});
