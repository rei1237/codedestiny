/** @jest-environment node */
import { jest } from '@jest/globals';
let document, api, documents;
const model = {
  updateOne: jest.fn(async (filter, update) => { document = documents[filter._id] ||= { _id: filter._id, ...update.$setOnInsert }; }),
  findOneAndUpdate: jest.fn((filter, update) => ({ lean: async () => {
    document = documents[filter._id];
    if (document.codeHash !== filter.codeHash || +document.startsAt !== +filter.startsAt || +document.endsAt !== +filter.endsAt) return null;
    const key = update.$addToSet.claimedAccounts;
    if (!document.claimedAccounts.includes(key) && document.claimedAccounts.length >= Number(Object.keys(filter.$or[1])[0].split('.')[1]) + 1) return null;
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
beforeEach(() => { document = null; documents = {}; jest.clearAllMocks(); });
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

const reviewEnv = { SNULIFE_REVIEW_CODE: 'TEST-REVIEW-ONLY', SNULIFE_REVIEW_STARTS_AT: '2026-11-01T00:00:00+09:00', SNULIFE_REVIEW_ENDS_AT: '2026-11-15T00:00:00+09:00' };
test('review code works before public activation and uses a separate three-account quota',async()=>{
 const first=await api.reserveSnulifeCode('reviewer-1',reviewEnv.SNULIFE_REVIEW_CODE,reviewEnv,now);expect(first.mode).toBe('review');expect(first.limit).toBe(3);expect(documents[api.SNULIFE_CAMPAIGN]).toBeUndefined();
 await api.reserveSnulifeCode('reviewer-2',reviewEnv.SNULIFE_REVIEW_CODE,reviewEnv,now);await api.reserveSnulifeCode('reviewer-3',reviewEnv.SNULIFE_REVIEW_CODE,reviewEnv,now);
 await expect(api.reserveSnulifeCode('reviewer-4',reviewEnv.SNULIFE_REVIEW_CODE,reviewEnv,now)).rejects.toMatchObject({payload:{code:'SNULIFE_UNAVAILABLE'}});
 await api.reserveSnulifeCode('reviewer-1',reviewEnv.SNULIFE_REVIEW_CODE,reviewEnv,now);expect(documents[api.SNULIFE_REVIEW_CAMPAIGN].claimedAccounts).toHaveLength(3);
 await api.reserveSnulifeCode('public-1',env.SNULIFE_BENEFIT_CODE,{...env,...reviewEnv},now);expect(documents[api.SNULIFE_CAMPAIGN].claimedAccounts).toHaveLength(1);expect(documents[api.SNULIFE_REVIEW_CAMPAIGN].claimedAccounts).toHaveLength(3);
});
test('review periods beyond 14 days, expired reviews and shared public/review codes fail closed',async()=>{
 await expect(api.reserveSnulifeCode('x',reviewEnv.SNULIFE_REVIEW_CODE,{...reviewEnv,SNULIFE_REVIEW_ENDS_AT:'2026-11-16'},now)).rejects.toMatchObject({payload:{code:'SNULIFE_NOT_READY'}});
 await expect(api.reserveSnulifeCode('x',reviewEnv.SNULIFE_REVIEW_CODE,reviewEnv,new Date(reviewEnv.SNULIFE_REVIEW_ENDS_AT))).rejects.toMatchObject({payload:{code:'SNULIFE_CLOSED'}});
 await expect(api.reserveSnulifeCode('x',reviewEnv.SNULIFE_REVIEW_CODE,{...reviewEnv,SNULIFE_BENEFIT_CODE:reviewEnv.SNULIFE_REVIEW_CODE},now)).rejects.toMatchObject({payload:{code:'SNULIFE_NOT_READY'}});expect(model.updateOne).not.toHaveBeenCalled();
});
