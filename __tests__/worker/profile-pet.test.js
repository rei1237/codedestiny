import { jest } from '@jest/globals';
import { createHttpError } from '../../worker/lib/http.js';
const clone = value => value == null ? value : structuredClone(value);
const uid = '507f1f77bcf86cd799439011';
let db, failOn = '', tail = Promise.resolve(), signedIn = true, transactionActive = false, concurrentReads = 0, maxTransactionReads = 0;
async function readMock(get) {
  if (!transactionActive) return clone(get());
  concurrentReads++; maxTransactionReads = Math.max(maxTransactionReads, concurrentReads);
  await Promise.resolve(); concurrentReads--;
  return clone(get());
}
const matches = (row, filter) => Object.entries(filter).every(([key, value]) => String(row[key]) === String(value));
function collection(name) {
  const rows = () => db[name] ||= [];
  return {
    findOne: filter => readMock(() => rows().find(row => matches(row, filter)) || null),
    insertOne: async row => {
      if (failOn === name) throw new Error('injected failure');
      if (rows().some(item => item._id === row._id)) throw Object.assign(new Error('duplicate'), { code: 11000 });
      rows().push(clone(row));
    },
    updateOne: async (filter, change, options = {}) => {
      if (failOn === name) throw new Error('injected failure');
      let row = rows().find(item => matches(item, filter));
      if (!row && options.upsert) { row = { ...clone(filter), ...clone(change.$setOnInsert || {}) }; rows().push(row); }
      if (!row) return { matchedCount: 0 };
      Object.assign(row, clone(change.$set || {}));
      for (const [key, value] of Object.entries(change.$inc || {})) row[key] = (row[key] || 0) + value;
      return { matchedCount: 1 };
    },
  };
}
const mongoose = { connection: { db: { collection } }, startSession: async () => ({
  endSession: async () => {},
  withTransaction: async callback => {
    const previous = tail; let release; tail = new Promise(resolve => { release = resolve; }); await previous;
    const backup = clone(db); transactionActive = true;
    try { return await callback(); } catch (error) { db = backup; throw error; } finally { transactionActive = false; release(); }
  },
}) };
const query = read => { const q = { select: () => q, session: () => q, lean: () => readMock(read) }; return q; };
jest.unstable_mockModule('../../worker/lib/db.js', () => ({ mongoose, withMongoRetry: async (_env, callback) => callback(), mongoTransactionOptions: () => ({}), connectDb: async () => {} }));
jest.unstable_mockModule('../../worker/lib/db-scope-connection.js', () => ({ scopeConnection: () => null }));
jest.unstable_mockModule('../../worker/lib/models.js', () => ({
  ProfileCard: { findOne: filter => query(() => db.profiles.find(row => matches(row, filter))) },
  User: { findById: id => query(() => db.users.find(row => row._id === id)) },
  MonthlyCreditLedger: {}, Payment: {}, UserDailyQuestLog: {}, UserRpgProgress: {}, UserRpgRewardLog: {},
}));
jest.unstable_mockModule('../../worker/lib/auth.js', () => ({
  requireAuth: async () => { if (!signedIn) throw createHttpError(401, '로그인이 필요해요.'); return { userId: uid }; },
  peekAccessTokenUserId: async () => uid,
}));
jest.unstable_mockModule('../../worker/lib/monthly-credit-store.js', () => ({ grantMonthlyCreditLot: async () => { throw new Error('unexpected monthly credit grant'); } }));
let pets, catalog, route;
beforeAll(async () => {
  pets = await import('../../worker/lib/profile-pet.js');
  catalog = await import('../../js/core/profile-pet.mjs');
  ({ handleRpgRoutes: route } = await import('../../worker/routes/rpg.js'));
});
beforeEach(() => {
  failOn = ''; signedIn = true; maxTransactionReads = 0; concurrentReads = 0;
  db = { users: [{ _id: uid, email: 'ordinary@example.test' }], profiles: ['one', 'two'].map(profileId => ({
    userId: uid, profileId, gender: 'male', birth: { year: 1990, month: 1, day: 15, timeUnknown: true, calType: 'solar' },
  })), fortune_tea_house_honey_wallets: [{ userId: uid, serviceScope: 'FORTUNE_TEA_HOUSE', balance: 20, totalEarned: 20 }] };
});
const today = new Date('2026-11-08T23:00:00Z');
const hatch = (profileId = 'one', eggType = 'moon') => pets.hatchProfilePet({}, uid, { profileId, eggType }, today);
const care = (action, profileId = 'one', requestId = profileId + '-' + action + '-request-0001', now = today) => pets.careForProfilePet({}, uid, { profileId, action, requestId, amount: 9999, affection: 9999, day: '2099-01-01' }, now);
test('60일주 기본종과 오행을 유지하며 희귀확률 경계를 정확히 적용한다', async () => {
  const { GANJI_CHARACTERS, characterForPillar } = await import('../../js/core/profile-characters.mjs');
  const common = catalog.rollPetTraits(() => .01);
  expect(common.rareSpecies).toBeNull();
  for (const row of GANJI_CHARACTERS) {
    const character = characterForPillar(row.hanja, 'male');
    expect(catalog.petIdentity(common, character).speciesId).toBe(character.id.replace('animal-', ''));
    expect(catalog.petIdentity(common, character).coat).toBe(catalog.PET_ELEMENT_COATS[character.element]);
  }
  for (const [value, species] of [[0, 'lion'], [.34, 'giraffe'], [.99, 'rhino']]) {
    let call = 0; const traits = catalog.rollPetTraits(() => call++ === 0 ? .009999 : value);
    expect(traits.rareSpecies).toBe(species);
    expect(catalog.petIdentity(traits, characterForPillar('甲子', 'male')).coat).toBe('natural');
  }
  expect(catalog.PET_COMBINATIONS_PER_SPECIES).toBe(192);
});
test('부화 동시 요청·알 변경·재접속에서도 프로필마다 배정을 하나만 저장한다', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, (_, index) => hatch('one', ['moon','flower','star'][index % 3])));
  expect(db.profile_pets).toHaveLength(1);
  for (const result of results) expect(result.pet).toEqual(results[0].pet);
  expect((await pets.getProfilePet({}, uid, 'one', today)).pet).toEqual(results[0].pet);
  await hatch('two'); expect(db.profile_pets).toHaveLength(2);
});
test('서버 프로필 소유권·알·행동·요청 키를 검증한다', async () => {
  await expect(hatch('not-mine')).rejects.toMatchObject({ status: 404 });
  await expect(hatch('one', 'lion')).rejects.toMatchObject({ status: 400 });
  await expect(care('feed')).rejects.toMatchObject({ status: 409 });
  await hatch();
  await expect(care('sleep')).rejects.toMatchObject({ status: 400 });
  await expect(care('feed', 'one', 'bad')).rejects.toMatchObject({ status: 400 });
});
test('같은 캐릭터의 먹이·놀이 완료에만 계정 하루 +1개, 최초 돌봄만 친밀도 +5', async () => {
  await hatch(); await hatch('two');
  expect((await care('feed')).pet.affection).toBe(5);
  expect((await care('feed', 'one', 'repeat-feed')).pet.affection).toBe(5);
  expect((await care('play', 'two')).rewarded).toBe(0);
  expect((await care('play')).rewarded).toBe(1);
  expect((await care('feed', 'two')).rewarded).toBe(0);
  expect(db.fortune_tea_house_honey_wallets[0].balance).toBe(21);
  expect(db.fortune_tea_house_honey_ledgers).toHaveLength(1);
  expect(db.profile_pets.every(row => row.affection === 10)).toBe(true);
});
test('트랜잭션의 Mongo 읽기를 병렬로 실행하지 않는다', async () => {
  await hatch(); await care('feed'); await care('play');
  expect(maxTransactionReads).toBe(1);
});
test('여러 프로필·동시 요청에서도 보상은 계정당 한 번이다', async () => {
  await hatch(); await hatch('two');
  const results = await Promise.all(Array.from({ length: 12 }, (_, index) => care(index < 6 ? 'feed' : 'play', index % 2 ? 'one' : 'two', 'race-request-' + index)));
  expect(results.reduce((total, result) => total + result.rewarded, 0)).toBe(1);
  expect(db.fortune_tea_house_honey_wallets[0].balance).toBe(21);
  expect(db.profile_pets.every(row => row.affection === 10)).toBe(true);
});
test.each(['profile_pet_actions', 'fortune_tea_house_honey_ledgers', 'fortune_tea_house_honey_wallets'])('실패 시 돌봄·친밀도·지갑·원장을 함께 롤백한다: %s', async name => {
  await hatch(); await care('feed'); failOn = name;
  await expect(care('play')).rejects.toThrow('injected failure');
  expect(db.profile_pets[0].affection).toBe(5); expect(db.profile_pets[0].played).toBe(false);
  expect(db.fortune_tea_house_honey_wallets[0].balance).toBe(20);
  expect(db.fortune_tea_house_honey_ledgers || []).toHaveLength(0);
  failOn = ''; expect((await care('play')).rewarded).toBe(1);
  expect((await care('play')).rewarded).toBe(0);
});
test('KST 자정에 돌봄은 초기화하되 이전 요청 재시도는 다음날 지급하지 않는다', async () => {
  await hatch(); const before = new Date('2026-11-09T14:59:59Z'), after = new Date('2026-11-09T15:00:01Z');
  await care('feed', 'one', 'midnight-feed', before); await care('play', 'one', 'midnight-play', before);
  const replay = await care('play', 'one', 'midnight-play', after);
  expect(replay.day).toBe('2026-11-10'); expect(replay.pet.played).toBe(false); expect(replay.rewarded).toBe(0);
  await care('feed', 'one', 'nextday-feed', after);
  expect((await care('play', 'one', 'nextday-play', after)).rewarded).toBe(1);
  expect(db.fortune_tea_house_honey_wallets[0].balance).toBe(22);
});
test('다른 프로필·행동으로 요청 키 재사용은 거절한다', async () => {
  await hatch(); await hatch('two'); await care('feed');
  await expect(care('play', 'one', 'one-feed-request-0001')).rejects.toMatchObject({ status: 409 });
  await expect(care('feed', 'two', 'one-feed-request-0001')).rejects.toMatchObject({ status: 409 });
});
test('보상 없는 반복 돌봄도 자정을 넘긴 같은 요청을 새 돌봄으로 처리하지 않는다', async () => {
  await hatch(); const before = new Date('2026-11-09T14:59:59Z'), after = new Date('2026-11-09T15:00:01Z');
  await care('feed', 'one', 'first-feed-before', before);
  expect((await care('feed', 'one', 'repeat-feed-before', before)).firstCare).toBe(false);
  const retry = await care('feed', 'one', 'repeat-feed-before', after);
  expect(retry.firstCare).toBe(false); expect(retry.pet.fed).toBe(false); expect(retry.pet.affection).toBe(5);
});
test('생년 정정에도 특성과 친밀도는 보존하고 일반종만 실제 일주로 갱신한다', async () => {
  await hatch(); db.profile_pets[0].traits.rareSpecies = null; await care('feed');
  const before = await pets.getProfilePet({}, uid, 'one', today);
  db.profiles[0].birth.day = 16;
  const after = await pets.getProfilePet({}, uid, 'one', today);
  expect(after.pet.traits).toEqual(before.pet.traits); expect(after.pet.affection).toBe(5);
  expect(after.pet.speciesId).toBe(after.character.id.replace('animal-', ''));
  expect(after.pet.speciesId).not.toBe(before.pet.speciesId);
  const distant = await pets.getProfilePet({}, uid, 'one', new Date('2027-12-01T00:00:00Z'));
  expect(distant.pet.affection).toBe(5); expect(distant.pet.fed).toBe(false);
});
test('서버 계정 이메일로만 개발자 영냥이를 적용하며 몸색과 원래 명식은 보존한다', async () => {
  db.users[0].email = 'SEONgBAE555@gmail.com'; await hatch();
  const result = await pets.getProfilePet({}, uid, 'one', today);
  expect(result.pet).toMatchObject({ speciesId: 'yeongnyangi', unique: true, rare: false, coat: 'natural' });
  db.users[0].email = 'ordinary@example.test';
  const spoof = await pets.hatchProfilePet({}, uid, { profileId: 'one', eggType: 'moon', email: 'seongbae555@gmail.com', exclusiveSpecies: 'yeongnyangi' }, today);
  expect(spoof.pet.unique).toBe(false);
});
test('무료 정적 풀이를 재사용하며 돌봄과 희귀도에 따라 운세를 바꾸지 않는다', async () => {
  const before = await hatch(); await care('feed'); await care('play');
  db.profile_pets[0].traits.rareSpecies = 'lion';
  const after = await pets.getProfilePet({}, uid, 'one', today);
  expect(after.fortune).toEqual(before.fortune); expect(after.character).toEqual(before.character);
  expect(after.fortune.headline).toBeTruthy(); expect(after.fortune.advice).toBeTruthy();
});
test('반려 캐릭터 API는 미로그인 요청을 거절한다', async () => {
  signedIn = false;
  for (const [path, body] of [['pet?profileId=one', null], ['pet/hatch', { profileId: 'one', eggType: 'moon' }], ['pet/care', { profileId: 'one', action: 'feed', requestId: 'request-0001' }]]) {
    const response = await route(new Request('https://example.test/api/rpg/' + path, { method: body ? 'POST' : 'GET', ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) }), {});
    expect(response.status).toBe(401);
  }
});
