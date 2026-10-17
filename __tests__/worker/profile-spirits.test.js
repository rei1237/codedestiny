import { jest } from '@jest/globals';
import { createHttpError } from '../../worker/lib/http.js';

const clone = value => value == null ? value : structuredClone(value);
let database, failLedger, failQuestLog, signedIn = true, transactionTail = Promise.resolve(), owner = '507f1f77bcf86cd799439011';
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === 'object') return row[key] >= value.$gte;
    if (Array.isArray(row[key])) return row[key].includes(value);
    return String(row[key]) === String(value);
  });
}
function collection(name) {
  const rows = () => database[name] ||= [];
  const update = (filter, changes, options = {}) => {
    let row = rows().find(item => matches(item, filter));
    if (!row && options.upsert) { row = { ...clone(filter), ...clone(changes.$setOnInsert || {}) }; rows().push(row); }
    if (!row) return null;
    Object.assign(row, clone(changes.$set || {}));
    for (const [key, amount] of Object.entries(changes.$inc || {})) row[key] = (row[key] || 0) + amount;
    for (const [key, value] of Object.entries(changes.$addToSet || {})) row[key] = [...new Set([...(row[key] || []), value])];
    return clone(row);
  };
  return {
    findOne: async filter => clone(rows().find(row => matches(row, filter)) || null),
    findOneAndUpdate: async (...args) => update(...args),
    updateOne: async (...args) => ({ matchedCount: update(...args) ? 1 : 0 }),
    insertOne: async doc => {
      if (failLedger && name.endsWith('_ledgers')) throw new Error('ledger failure');
      if (rows().some(row => row._id === doc._id)) throw Object.assign(new Error('duplicate'), { code: 11000 });
      rows().push(clone(doc));
    },
  };
}
const mongoose = {
  connection: { db: { collection } },
  startSession: async () => ({
    endSession: async () => {},
    withTransaction: async callback => {
      const previous = transactionTail; let release;
      transactionTail = new Promise(resolve => { release = resolve; });
      await previous;
      const backup = clone(database);
      try { return await callback(); } catch (error) { database = backup; throw error; } finally { release(); }
    },
  }),
};
jest.unstable_mockModule('../../worker/lib/db.js', () => ({ mongoose, mongoTransactionOptions: () => ({}), withMongoRetry: async (_env, run) => run(), connectDb: async () => {} }));
jest.unstable_mockModule('../../worker/lib/db-scope-connection.js', () => ({ scopeConnection: () => null }));
function model(name) {
  const rows = () => database[name] ||= [];
  const query = getter => { const q = { session: () => q, lean: async () => clone(getter()), select: () => q, sort: () => q }; return q; };
  return {
    init: async () => {},
    findOne: filter => query(() => rows().find(row => matches(row, filter)) || null),
    find: filter => query(() => rows().filter(row => matches(row, filter))),
    updateOne: (...args) => collection(name).updateOne(...args),
    create: async docs => {
      if (name === 'UserDailyQuestLog' && failQuestLog) throw new Error('quest log failure');
      rows().push(...clone(docs)); return clone(docs);
    },
  };
}
jest.unstable_mockModule('../../worker/lib/models.js', () => Object.fromEntries(['MonthlyCreditLedger','Payment','ProfileCard','User','UserDailyQuestLog','UserRpgProgress','UserRpgRewardLog'].map(name => [name, model(name)])));
jest.unstable_mockModule('../../worker/lib/monthly-credit-store.js', () => ({ grantMonthlyCreditLot: async () => { throw new Error('unexpected reward grant'); } }));
jest.unstable_mockModule('../../worker/lib/auth.js', () => ({
  requireAuth: async () => { if (!signedIn) throw createHttpError(401, '로그인이 필요합니다.'); return { userId: owner }; },
  peekAccessTokenUserId: () => owner,
}));
let spirits, spiritExp, characterForPillar, GANJI_CHARACTERS, SPIRITS, handleRpgRoutes;
beforeAll(async () => {
  spirits = await import('../../worker/lib/profile-spirits.js');
  ({ spiritExp, characterForPillar, GANJI_CHARACTERS, SPIRITS } = await import('../../js/core/profile-characters.mjs'));
  ({ handleRpgRoutes } = await import('../../worker/routes/rpg.js'));
});
beforeEach(() => {
  failLedger = false;
  failQuestLog = false; signedIn = true;
  database = { fortune_tea_house_honey_wallets: [{ userId: owner, serviceScope: 'FORTUNE_TEA_HOUSE', balance: 20, totalSpent: 0 }] };
  database.UserRpgProgress = [{ userId: owner, profileId: '__account__', totalExp: 0, streakDays: 0, longestStreakDays: 0 }];
});
afterEach(() => jest.useRealTimers());
const unlock = (characterId = 'spirit-00', requestId = 'request-0001') => spirits.unlockProfileSpirit({}, owner, { characterId, requestId });
test('60일주 해석은 동물 12종에 연결하고 성별별 외형을 만들지 않는다', () => {
  const ids = GANJI_CHARACTERS.flatMap(row => ['male','female'].map(gender => characterForPillar(row.hanja, gender).id));
  expect(new Set(ids).size).toBe(12);
  expect(characterForPillar('甲子', 'male').id).toBe('animal-mouse');
  expect(characterForPillar('갑자', 'female').id).toBe('animal-mouse');
  expect(characterForPillar('甲子', '')).toBeNull();
  expect(characterForPillar('甲丑', 'male')).toBeNull();
  expect(SPIRITS).toHaveLength(12);
});
const seedOwned = (...ids) => { database.profile_spirits = [{ _id: owner, ownedIds: ids, equippedId: null }]; };
test('신규 정령 해금은 잔액과 관계없이 막고 차감하지 않는다', async () => {
  await expect(unlock()).rejects.toMatchObject({ status: 403, payload: { code: 'HONEY_GGULGGUL_ONLY' } });
  expect((await spirits.getProfileSpirits({}, owner)).balance).toBe(20);
  expect(database.fortune_tea_house_honey_ledgers || []).toHaveLength(0);
  await expect(unlock('spirit-99')).rejects.toMatchObject({ status: 400 });
  await expect(spirits.equipProfileSpirit({}, owner, 'spirit-00')).rejects.toMatchObject({ status: 403 });
});
test('기존 소유 정령은 차감 없이 유지하고 다른 계정에는 공개하지 않는다', async () => {
  seedOwned('spirit-00');
  expect((await unlock()).ownedIds).toEqual(['spirit-00']);
  expect((await spirits.getProfileSpirits({}, owner)).balance).toBe(20);
  expect((await spirits.getProfileSpirits({}, 'other-user')).ownedIds).toEqual([]);
});
test('장착한 보유 정령만 출석·생활 미션에 20%를 주며 중첩·소급하지 않는다', async () => {
  seedOwned('spirit-00', 'spirit-01');
  expect(await spirits.profileSpiritExp({}, owner, 'checkin', 20)).toBe(20);
  await spirits.equipProfileSpirit({}, owner, 'spirit-00');
  expect(await spirits.profileSpiritExp({}, owner, 'checkin', 20)).toBe(24);
  expect(await spirits.profileSpiritExp({}, owner, 'quest', 15)).toBe(18);
  expect(await spirits.profileSpiritExp({}, owner, 'paid', 30)).toBe(30);
  expect(await spirits.profileSpiritExp({}, owner, 'share', 25)).toBe(25);
  expect(await spirits.profileSpiritExp({}, owner, 'streak', 70)).toBe(70);
  await spirits.equipProfileSpirit({}, owner, null);
  expect(await spirits.profileSpiritExp({}, owner, 'quest', 15)).toBe(15);
  expect(spiritExp('quest', 15, ['spirit-00'], 'spirit-01')).toBe(15);
});
async function route(path, body) {
  const response = await handleRpgRoutes(new Request(`https://example.test/api/rpg/${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type':'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }), {});
  return { status: response.status, data: await response.json() };
}
test('정령 상태·해금·장착은 미로그인을 거절한다', async () => {
  signedIn = false;
  expect((await route('characters')).status).toBe(401);
  expect((await route('characters/unlock', { characterId:'spirit-00', requestId:'request-0001' })).status).toBe(401);
  expect((await route('characters/equip', { characterId:null })).status).toBe(401);
});
test('서버가 배율·하루 한도·중복을 판정하고 프로필 전환으로 추가 지급하지 않는다', async () => {
  seedOwned('spirit-00'); await spirits.equipProfileSpirit({}, owner, 'spirit-00');
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => route('award', { kind:'quest', key:`q-${i}`, profileId:`profile-${i}`, exp:9999, multiplier:99 })));
  expect(results.filter(result => result.data.granted)).toHaveLength(3);
  expect(database.UserRpgProgress[0].totalExp).toBe(54);
  expect(database.UserDailyQuestLog).toHaveLength(3);
  const repeat = await route('award', { kind:'quest', key:'q-0' });
  expect(repeat.data.granted).toBe(false);
  expect(database.UserRpgProgress[0].totalExp).toBe(54);
});
test('미션 원장 저장 실패는 경험치도 롤백하고 재시도는 한 번만 지급한다', async () => {
  failQuestLog = true;
  expect((await route('award', { kind:'quest', key:'water' })).status).toBeGreaterThanOrEqual(500);
  expect(database.UserRpgProgress[0].totalExp).toBe(0);
  failQuestLog = false;
  expect((await route('award', { kind:'quest', key:'water' })).data.gainedExp).toBe(15);
  expect((await route('award', { kind:'quest', key:'water' })).data.granted).toBe(false);
  expect(database.UserRpgProgress[0].totalExp).toBe(15);
});
test('처음 가입한 계정의 동시 미션도 성장 레코드를 하나만 만든다', async () => {
  database.UserRpgProgress = [];
  const results = await Promise.all(Array.from({ length: 6 }, () => route('award', { kind:'quest', key:'first' })));
  expect(results.filter(result => result.data.granted)).toHaveLength(1);
  expect(database.UserRpgProgress).toHaveLength(1);
  expect(database.UserRpgProgress[0].totalExp).toBe(15);
});
test('한국 날짜 전환 후에만 출석을 다시 지급하고 기존 경험치를 보존한다', async () => {
  jest.useFakeTimers({ doNotFake:['nextTick','setImmediate','setTimeout','clearTimeout','setInterval','clearInterval'] });
  jest.setSystemTime(new Date('2026-10-17T14:59:00Z'));
  database.UserRpgProgress[0].totalExp = 50;
  seedOwned('spirit-00'); await spirits.equipProfileSpirit({}, owner, 'spirit-00');
  expect((await route('award', {kind:'checkin',key:'day'})).data.gainedExp).toBe(24);
  expect((await route('award', {kind:'checkin',key:'other-profile'})).data.granted).toBe(false);
  jest.setSystemTime(new Date('2026-10-17T15:01:00Z'));
  expect((await route('award', {kind:'checkin',key:'day'})).data.gainedExp).toBe(24);
  expect(database.UserRpgProgress[0].totalExp).toBe(98);
});
