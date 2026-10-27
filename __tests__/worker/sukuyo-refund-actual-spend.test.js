/** @jest-environment node */
import { jest } from '@jest/globals';
const userId = '64b7f2a1c3d4e5f601234567';
const evidenceId = '64b7f2a1c3d4e5f600000009';
let restore, history, find, mark, credit, create, external;
const query = value => ({ lean: async () => value });
beforeAll(async () => {
 const models = await import('../../worker/lib/models.js');
 jest.unstable_mockModule('../../worker/lib/models.js', () => ({ ...models,
  PointHistory: { findOne: (...args) => find(...args), updateOne: (...args) => mark(...args), create: (...args) => create(...args) },
  User: { findByIdAndUpdate: (...args) => query(credit(...args)) },
 }));
 ({ restorePrepaidAccessOnFailure: restore } = (await import('../../worker/routes/sukuyo-compatibility-ai.js')).__sukuyoCompatibilityAiTestUtils);
});
beforeEach(() => {
 history = { _id: evidenceId, delta: 0, metadata: {} };
 find = jest.fn(() => query(history));
 mark = jest.fn(async () => ({ modifiedCount: 1 }));
 credit = jest.fn(() => ({ points: 12 })); create = jest.fn(async () => ({}));
 external = jest.spyOn(globalThis, 'fetch').mockImplementation(() => { throw Error('external fetch forbidden'); });
});
afterEach(() => { expect(external).not.toHaveBeenCalled(); external.mockRestore(); });
const run = () => restore({}, { userId }, { accessType: 'paid', paymentId: evidenceId }, new Error('generation failed'));

test.each([0, null, undefined, 12, Infinity, -Infinity])('a deduct record with delta %s never invents a refund', async delta => {
 history.delta = delta;
 expect(await run()).toBe(false);
 expect(mark).not.toHaveBeenCalled(); expect(credit).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
});
test('only the actual negative deduction amount is restored', async () => {
 history.delta = -12;
 expect(await run()).toBe(true);
 expect(find).toHaveBeenCalledWith(expect.objectContaining({ _id: evidenceId, userId, kind: 'deduct', featureKey: 'sukuyo-compatibility-ai' }));
 expect(credit).toHaveBeenCalledWith(userId, { $inc: { points: 12 } }, expect.any(Object));
 expect(create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'refund', delta: 12 }));
});


test.each([{ accessType:'pass',paymentId:evidenceId },{ accessType:'paid',paymentId:'cd-cash-order' }])('pass and direct payment do not enter legacy coin restoration: %j',async access=>{
 expect(await restore({}, { userId }, access, new Error('generation failed'))).toBe(false);
 expect(find).not.toHaveBeenCalled();expect(mark).not.toHaveBeenCalled();expect(credit).not.toHaveBeenCalled();
});

test('missing original deduction is never treated as a refund', async () => {
 history = null;
 expect(await run()).toBe(false);
 expect(mark).not.toHaveBeenCalled(); expect(credit).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
});
