import { jest } from '@jest/globals';
import { createHttpError } from '../../worker/lib/http.js';

const findUnlock = jest.fn(), findProfile = jest.fn(), findResult = jest.fn(), saveArchive = jest.fn();
jest.unstable_mockModule('../../worker/lib/db.js', () => ({ connectDb: async () => {}, withMongoRetry: async (_env, run) => run() }));
jest.unstable_mockModule('../../worker/lib/models.js', () => ({ ProfileCard: { findOne: query => ({ lean: () => findProfile(query) }) }, ServiceExecutionTransaction: { findOne: query => ({ lean: () => findResult(query) }) } }));
jest.unstable_mockModule('../../worker/lib/content-unlocks.js', () => ({ findActivePaidContentUnlock: findUnlock }));
jest.unstable_mockModule('../../worker/lib/paid-result-archive.js', () => ({ upsertPaidResultArchive: saveArchive }));
jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ requireUserFromRequest: async request => {
  if (request.headers.get('Authorization') !== 'Bearer owner') throw createHttpError(401, '로그인이 필요해요.', { code: 'UNAUTHORIZED' });
  return { userId: 'owner' };
} }));
jest.unstable_mockModule('../../worker/lib/security/index.js', () => ({ enforceSensitiveEndpointSecurity: async () => ({ ok: true }) }));
let readCareerStyle, careerCardInput, handleCareerStyle;
beforeAll(async () => {
  ({ readCareerStyle, careerCardInput } = await import('../../worker/lib/career-style-access.js'));
  ({ handleCareerStyle } = await import('../../worker/routes/career-style.js'));
});
const card = { profileId: 'one', name: 'private', gender: 'F', birth: { year: 2000, month: 3, day: 15, hour: 12, minute: 30, calType: 'solar' } };
function fixture() {
  const results = new Map(); let owned = true;
  const store = {
    findProfile: async ({ userId, profileId }) => userId === 'owner' && ['one', 'same-birth'].includes(profileId) ? structuredClone(card) : null,
    findUnlock: jest.fn(async () => owned ? { _id: 'entitlement', source: 'PAID', birthKey: 'birth' } : null),
    findResult: async ({ userId, executionKey }) => results.get(`${userId}:${executionKey}`),
    saveResult: jest.fn(async input => {
      const key = `${input.userId}:${input.executionKey}`;
      if (!results.has(key)) results.set(key, { metadata: { careerReport: input.report } });
      return results.get(key);
    }),
  };
  return { store, results, own: value => { owned = value; }, run: (input = {}) => readCareerStyle({ userId: 'owner', profileId: 'one', ...input }, store) };
}

test('이전 무료 열람·클라이언트 해금·가격·출생정보 조작은 권한이 아니다', async () => {
  const f = fixture(); f.own(false);
  await expect(f.run({ unlocked: true, priceKRW: 0, birth: card.birth, freeViewed: true })).rejects.toMatchObject({ status: 402, payload: { code: 'PAYMENT_REQUIRED', priceKRW: 5000, honeyCost: 30 } });
  expect(f.store.saveResult).not.toHaveBeenCalled();
  expect(await f.run({ statusOnly: true })).toMatchObject({ unlocked: false, priceKRW: 5000, honeyCost: 30 });
  expect((await f.run({ statusOnly: true })).report).toBeUndefined();
});
test.each([{ userId: 'other' }, { profileId: 'foreign' }, { profileId: 'birth:forged' }, { profileId: '' }])('소유하지 않은 프로필과 합성 신원을 거부한다: %j', async change => {
  const f = fixture(); await expect(f.run(change)).rejects.toMatchObject({ status: expect.any(Number) });
  expect(f.store.findUnlock).not.toHaveBeenCalled(); expect(f.results.size).toBe(0);
});
test('구매 후 재로그인·동일 출생 카드·가격/원고 변경에도 저장 원문을 무차감 반환한다', async () => {
  const f = fixture(), first = await f.run();
  expect(first.report.sections).toHaveLength(8);
  f.store.buildReport = () => { throw Error('must not regenerate'); };
  const relogged = await readCareerStyle({ userId: 'owner', profileId: 'same-birth' }, f.store);
  expect(relogged.report).toEqual(first.report);
  expect(f.store.saveResult).toHaveBeenCalledTimes(1);
  f.own(false); // Refund/revocation cannot be bypassed by the saved report.
  await expect(f.run()).rejects.toMatchObject({ status: 402 });
});
test('동시 읽기에는 최초 저장본 하나를 반환하고 저장 실패 재시도도 해금을 다시 요구하지 않는다', async () => {
  const f = fixture(); f.store.saveResult.mockRejectedValueOnce(Error('storage unavailable'));
  await expect(f.run()).rejects.toThrow('storage unavailable');
  const rows = await Promise.all([f.run(), f.run()]);
  expect(f.results.size).toBe(1); expect(rows[0].report).toEqual(rows[1].report);
});
test('서버 카드의 음력 윤달·자정·출생지·시간 미상은 계산 입력에 보존된다', () => {
  const input = careerCardInput({ ...card, birth: { ...card.birth, calType: 'lunar_leap', hour: 0, minute: 0 }, location: { tz: 'America/New_York', lng: -74.006, lat: 40.7128 } });
  expect(input).toMatchObject({ calendarType: 'lunar_leap', birthTime: '00:00', birthPlace: { timezone: 'America/New_York', longitude: -74.006 } });
  expect(careerCardInput({ ...card, birth: { ...card.birth, timeUnknown: true } }).birthTimeUnknown).toBe(true);
});

test('HTTP 직접 호출은 인증·저장 프로필·서버 권리가 필요하며 서버 입력만 계산하고 원문을 보관한다', async () => {
  const f = fixture(); findProfile.mockImplementation(f.store.findProfile); findUnlock.mockImplementation(f.store.findUnlock); findResult.mockImplementation(f.store.findResult);
  saveArchive.mockImplementation(async (_env, input) => f.store.saveResult({ ...input, report: input.metadata.careerReport }));
  const req = (body, auth = true) => new Request('https://example.test/api/saju/career-style', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer owner' } : {}) }, body: JSON.stringify(body) });
  const anonymous = await handleCareerStyle(req({ profileId: 'one' }, false), {});
  expect(anonymous.status).toBe(401);
  f.own(false);
  const locked = await handleCareerStyle(req({ profileId: 'one', userId: 'victim', unlocked: true, freeViewed: true }), {});
  expect(locked.status).toBe(402); expect((await locked.json()).report).toBeUndefined();
  f.own(true);
  findUnlock.mockRejectedValueOnce(Object.assign(new Error('network error'),{name:'MongoNetworkError'}));
  const unavailable=await handleCareerStyle(req({profileId:'one'}),{});
  expect(unavailable.status).toBe(503);expect((await unavailable.json()).report).toBeUndefined();
  const response = await handleCareerStyle(req({ profileId: 'one', birth: { year: 1900 }, priceKRW: 0 }), {});
  expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toContain('no-store');
  const data = await response.json(); expect(data.report.analysis.natal).toEqual((await f.run()).report.analysis.natal);
  expect(saveArchive.mock.calls.at(-1)[1]).toMatchObject({ userId: 'owner', preserveOriginal: true, metadata: { accessEntitlementId: 'entitlement' } });
});
