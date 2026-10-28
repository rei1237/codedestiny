/** @jest-environment node */
import { withSettle } from "../fixtures/per-use-settle-mock.mjs";
import { jest } from '@jest/globals';

const payment = jest.fn();
let docs;
const query = value => ({ lean: async () => structuredClone(value) });
const match = (row, filter) => Object.entries(filter).every(([key, value]) => row[key] === value);
let deliver;

beforeAll(async () => {
  const db = await import('../../worker/lib/db.js'), models = await import('../../worker/lib/models.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, fn) => fn() }));
  jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js', () => withSettle({ verifyPerUsePayment: payment }));
  jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js', () => ({ isPaidResultRevoked: async () => false }));
  jest.unstable_mockModule('../../worker/lib/models.js', () => ({ ...models, ServiceExecutionTransaction: {
    findOne: filter => query(docs.find(row => match(row, filter)) || null),
    findOneAndUpdate: (filter, update) => {
      let row = docs.find(row => match(row, filter));
      if (!row) { row = structuredClone(update.$setOnInsert); docs.push(row); }
      return query(row);
    },
  } }));
  ({ deliverNakshatraCompat: deliver } = await import('../../worker/lib/nakshatra-compat-delivery.js'));
});

beforeEach(() => {
  docs = [];
  payment.mockReset();
  // The background pass usage record has not landed yet: only a direct pass confirmation proves access.
  payment.mockImplementation(async (_env, input) => ({ proven: input.requireExisting ? false : true, source: 'pass' }));
});

const auth = { userId: '64b7f2a1c3d4e5f601234567' };
const calculate = async () => new Response(JSON.stringify({ ok: true, personA: {}, india: {} }));
const body = extra => ({ a: { y: 1990 }, b: { y: 1992 }, requestId: 'nakshatra-compat:1-abcdefg', ...extra });

test('a pass request that arrives before its usage record confirms the pass under the same requestId', async () => {
  const response = await deliver({}, auth, body({ accessMethod: 'pass' }), calculate);
  expect(response.status).toBe(200);
  expect(payment).toHaveBeenCalledTimes(2);
  expect(payment.mock.calls[1][1]).toMatchObject({ featureKey: 'nakshatra-compat', requestId: 'nakshatra-compat:1-abcdefg' });
  expect(payment.mock.calls[1][1].requireExisting).toBeUndefined();
  expect(docs).toHaveLength(1);
});

test('without a pass choice a missing record stays 402 and spends nothing', async () => {
  const response = await deliver({}, auth, body(), calculate);
  expect(response.status).toBe(402);
  expect(payment).toHaveBeenCalledTimes(1);
  expect(docs).toHaveLength(0);
});

test('an outage is never turned into a pass spend', async () => {
  payment.mockImplementation(async () => ({ proven: null }));
  const response = await deliver({}, auth, body({ accessMethod: 'pass' }), calculate);
  expect(response.status).toBe(503);
  expect(payment).toHaveBeenCalledTimes(1);
});
