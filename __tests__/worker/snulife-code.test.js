/** @jest-environment node */
import { jest } from '@jest/globals';
let document, api;
const model = {
  updateOne: jest.fn(async (filter, update) => { document ||= { _id: filter._id, ...update.$setOnInsert }; }),
  findOneAndUpdate: jest.fn((filter, update) => ({ lean: async () => {
    if (document.codeHash !== filter.codeHash || +document.startsAt !== +filter.startsAt || +document.endsAt !== +filter.endsAt) return null;
    const key = update.$addToSet.claimedAccounts;
    if (!document.claimedAccounts.includes(key) && document.claimedAccounts.length >= 1000) return null;
    if (!document.claimedAccounts.includes(key)) document.claimedAccounts.push(key);
    return document;
  } })),
};
beforeAll(async () => {
  class Schema {}
  await jest.unstable_mockModule('../../worker/lib/db.js', () => ({ mongoose: { Schema, models: { SnulifeCodeCampaign: model } } }));
  await jest.unstable_mockModule('../../worker/lib/db-scope-connection.js', () => ({ scopedModel: value => value }));
  api = await import('../../worker/lib/snulife-code.js');
});
const env = { SNULIFE_BENEFIT_CODE: 'TEST-SNULIFE-ONLY', SNULIFE_STARTS_AT: '2026-11-01T00:00:00+09:00', SNULIFE_ENDS_AT: '2027-02-01T00:00:00+09:00' };
const now = new Date('2026-11-02T00:00:00+09:00');
beforeEach(() => { document = null; jest.clearAllMocks(); });
test('missing configuration, invalid code, early and expired claims never reserve a seat', async () => {
  for (const [code, config, date, expected] of [
    [env.SNULIFE_BENEFIT_CODE, {}, now, 'SNULIFE_NOT_READY'],
    ['wrong', env, now, 'SNULIFE_CODE_INVALID'],
    [env.SNULIFE_BENEFIT_CODE, env, new Date('2026-10-31'), 'SNULIFE_CLOSED'],
    [env.SNULIFE_BENEFIT_CODE, env, new Date(env.SNULIFE_ENDS_AT), 'SNULIFE_CLOSED'],
    [env.SNULIFE_BENEFIT_CODE, { ...env, SNULIFE_ENDS_AT: '2027-03-01' }, now, 'SNULIFE_NOT_READY'],
  ]) await expect(api.reserveSnulifeCode('user', code, config, date)).rejects.toMatchObject({ payload: { code: expected } });
  expect(model.updateOne).not.toHaveBeenCalled();
});
test('concurrent claims use atomic bounded addToSet; replay consumes no second seat', async () => {
  await api.reserveSnulifeCode('first', env.SNULIFE_BENEFIT_CODE, env, now);
  expect(document.codeHash).not.toContain(env.SNULIFE_BENEFIT_CODE);
  document.claimedAccounts = [...document.claimedAccounts, ...Array.from({ length: 998 }, (_, i) => `other-${i}`)];
  const results = await Promise.allSettled(['last-a', 'last-b'].map(id => api.reserveSnulifeCode(id, env.SNULIFE_BENEFIT_CODE, env, now)));
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(document.claimedAccounts).toHaveLength(1000);
  await api.reserveSnulifeCode('first', env.SNULIFE_BENEFIT_CODE, env, now);
  expect(document.claimedAccounts).toHaveLength(1000);
  const [filter, update] = model.findOneAndUpdate.mock.calls.at(-1);
  expect(filter.$or[1]).toEqual({ 'claimedAccounts.999': { $exists: false } });
  expect(update.$addToSet.claimedAccounts).toMatch(/^[a-f0-9]{64}$/);
});
test('changing campaign configuration cannot reset consumed capacity', async () => {
  await api.reserveSnulifeCode('first', env.SNULIFE_BENEFIT_CODE, env, now);
  await expect(api.reserveSnulifeCode('second', 'OTHER-TEST-CODE', { ...env, SNULIFE_BENEFIT_CODE: 'OTHER-TEST-CODE' }, now)).rejects.toMatchObject({ payload: { code: 'SNULIFE_UNAVAILABLE' } });
  expect(document.claimedAccounts).toHaveLength(1);
});
