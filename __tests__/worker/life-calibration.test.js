import { jest } from '@jest/globals';
import { createHttpError } from '../../worker/lib/http.js';

const uid = '507f1f77bcf86cd799439011';
let db, signedIn, keyAvailable;
const clone = (v) => (v == null ? v : structuredClone(v));
const matches = (row, filter) => Object.entries(filter).every(([k, v]) => {
  if (v && typeof v === 'object' && '$ne' in v) return row[k] !== v.$ne;
  return String(row[k]) === String(v);
});
const chain = (read) => { const q = { select: () => q, sort: () => q, lean: async () => clone(read()) }; return q; };
function model(name) {
  const rows = () => (db[name] ||= []);
  return {
    findById: (id) => chain(() => rows().find((r) => r._id === id) || null),
    findOne: (f) => chain(() => rows().find((r) => matches(r, f)) || null),
    find: (f) => chain(() => rows().filter((r) => matches(r, f))),
    insertMany: async (docs) => { rows().push(...clone(docs)); },
    deleteMany: async (f) => { db[name] = rows().filter((r) => !matches(r, f)); },
    deleteOne: async (f) => { const i = rows().findIndex((r) => matches(r, f)); if (i >= 0) rows().splice(i, 1); },
    updateMany: async (f, change) => { rows().filter((r) => matches(r, f)).forEach((r) => { for (const k of Object.keys(change.$unset || {})) delete r[k]; }); },
    updateOne: async (f, change, opts = {}) => {
      let row = rows().find((r) => matches(r, f));
      if (!row && opts.upsert) { row = clone(f); rows().push(row); }
      if (!row) return;
      Object.assign(row, clone(change.$set || {}));
      for (const [k, v] of Object.entries(change.$push || {})) (row[k] ||= []).push(clone(v));
    },
  };
}
const LifeEvent = model('events');
const LifeCalibration = model('calibrations');
const LifeCalibrationConsent = model('consents');

jest.unstable_mockModule('../../worker/lib/db.js', () => ({ withMongoRetry: async (_env, fn) => fn() }));
jest.unstable_mockModule('../../worker/lib/models.js', () => ({ ProfileCard: model('profiles'), User: model('users') }));
jest.unstable_mockModule('../../worker/lib/auth.js', () => ({
  requireAuth: async () => { if (!signedIn) throw createHttpError(401, '로그인이 필요해요.'); return { userId: uid }; },
}));
jest.unstable_mockModule('../../worker/lib/pii-crypto.js', () => ({
  encryptBoundSecret: async (value, purpose, binding) => { if (!keyAvailable) throw new Error('no key'); return `enc:${purpose}:${binding}:${Buffer.from(value).toString('base64')}`; },
  decryptBoundSecret: async (value, purpose, binding) => {
    const prefix = `enc:${purpose}:${binding}:`;
    if (!value.startsWith(prefix)) throw new Error('binding mismatch');
    return Buffer.from(value.slice(prefix.length), 'base64').toString();
  },
}));
jest.unstable_mockModule('../../worker/lib/life-calibration-models.js', () => ({
  LifeEvent, LifeCalibration, LifeCalibrationConsent,
  deleteLifeCalibrationForProfile: async (u, profileId) => {
    await LifeEvent.deleteMany({ userId: String(u), profileId });
    await LifeCalibration.deleteOne({ _id: `${u}:${profileId}` });
  },
  deleteLifeCalibrationForUser: async (u) => {
    await LifeEvent.deleteMany({ userId: String(u) });
    await LifeCalibration.deleteMany({ userId: String(u) });
  },
}));

let route, events;
beforeAll(async () => {
  ({ handleLifeCalibrationRoutes: route } = await import('../../worker/routes/life-calibration.js'));
  events = await import('../../lib/life-calibration/life-events.mjs');
});
beforeEach(() => {
  signedIn = true; keyAvailable = true;
  db = {
    users: [{ _id: uid, legalConsents: { age14AttestedAt: new Date('2026-01-01') } }],
    profiles: [
      { userId: uid, profileId: 'me', birth: { year: 1990 } },
      { userId: uid, profileId: 'friend', birth: { year: 1992 } },
    ],
  };
});

const ON = { LIFE_CALIBRATION_V1: 'api' };
const call = async (method, path, body, env = ON) => {
  const init = { method, headers: { 'content-type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await route(new Request(`https://x.test/api/life-calibration${path}`, init), env);
  return { status: res.status, body: await res.json().catch(() => null), cache: res.headers.get('cache-control') };
};
const grant = () => call('POST', '/consent', { granted: true, source: 'test' });
const sample = [{ year: 2015, domain: 'career', outcome: 'good', note: '첫 직장 합격' }, { year: 2019, domain: 'money', outcome: 'bad' }];

test('플래그가 꺼져 있으면 모든 경로가 404 이고 DB 를 건드리지 않는다', async () => {
  for (const env of [{}, { LIFE_CALIBRATION_V1: 'other' }]) {
    expect((await call('GET', '/consent', undefined, env)).status).toBe(404);
    expect((await call('PUT', '/events', { profileId: 'me', events: sample }, env)).status).toBe(404);
  }
  expect(db.consents).toBeUndefined();
});

test('로그인 없이는 401, 동의 전에는 403', async () => {
  signedIn = false;
  expect((await call('GET', '/consent')).status).toBe(401);
  signedIn = true;
  const res = await call('PUT', '/events', { profileId: 'me', events: sample });
  expect(res.status).toBe(403);
  expect(res.body.code).toBe('LIFE_CALIBRATION_CONSENT_REQUIRED');
});

test('만 14세 확인이 없으면 동의를 받지 않는다', async () => {
  db.users[0].legalConsents = {};
  const res = await grant();
  expect(res.status).toBe(403);
  expect(res.body.code).toBe('AGE14_ATTESTATION_REQUIRED');
});

test('본인 카드로 지정한 프로필에만 입력하고, 메모는 암호화해 저장한다', async () => {
  expect((await grant()).status).toBe(200);
  expect((await call('PUT', '/events', { profileId: 'me', events: sample })).body.code).toBe('PROFILE_NOT_SELF');
  expect((await call('POST', '/self', { profileId: 'me' })).status).toBe(200);
  const put = await call('PUT', '/events', { profileId: 'me', events: sample });
  expect(put.status).toBe(200);
  expect(put.cache).toMatch(/no-store/);
  expect(put.body.events.map((e) => e.note)).toEqual(['첫 직장 합격', '']);
  expect(JSON.stringify(db.events)).not.toContain('첫 직장 합격');
  expect(db.events[0].noteCipher).toMatch(/^enc:life-event-note:/);
  // 본인 지정은 계정당 하나다.
  await call('POST', '/self', { profileId: 'friend' });
  expect(db.profiles.filter((p) => p.isSelf === true).map((p) => p.profileId)).toEqual(['friend']);
});

test('형식이 틀린 입력은 400 이고 오류에 메모 원문이 없다', async () => {
  await grant(); await call('POST', '/self', { profileId: 'me' });
  const secret = '비밀메모';
  for (const bad of [
    [{ year: 1985, domain: 'career', outcome: 'good', note: secret }], // 출생 전
    [{ year: 2015, outcome: 'good', note: secret }], // 분야 누락
    [{ year: 2015, domain: 'health', outcome: 'bad', note: secret }], // 건강 분야 없음
  ]) {
    const res = await call('PUT', '/events', { profileId: 'me', events: bad });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain(secret);
  }
  expect(db.events || []).toEqual([]);
});

test('암호화 키가 없으면 메모를 평문으로 저장하지 않고 503', async () => {
  await grant(); await call('POST', '/self', { profileId: 'me' });
  keyAvailable = false;
  const res = await call('PUT', '/events', { profileId: 'me', events: sample });
  expect(res.status).toBe(503);
  expect(res.body.code).toBe('NOTE_ENCRYPTION_UNAVAILABLE');
  expect(db.events || []).toEqual([]);
});

test('동의 철회는 입력과 파생 캐시를 즉시 지우고 이력은 남긴다', async () => {
  await grant(); await call('POST', '/self', { profileId: 'me' });
  await call('PUT', '/events', { profileId: 'me', events: sample });
  db.calibrations = [{ _id: `${uid}:me`, userId: uid, profileId: 'me' }];
  const res = await call('POST', '/consent', { granted: false, source: 'test' });
  expect(res.body.granted).toBe(false);
  expect(db.events).toEqual([]);
  expect(db.calibrations).toEqual([]);
  expect(db.consents[0].history.map((h) => h.granted)).toEqual([true, false]);
  expect((await call('GET', '/events?profileId=me')).status).toBe(403);
});

test('GET /calibration: 동의·본인 프로필 필수, 사건 없으면 null, 계산 뒤 캐시 hit, 응답에 메모 없음', async () => {
  expect((await call('GET', '/calibration?profileId=me')).body.code).toBe('LIFE_CALIBRATION_CONSENT_REQUIRED');
  await grant();
  expect((await call('GET', '/calibration?profileId=me')).body.code).toBe('PROFILE_NOT_SELF');
  await call('POST', '/self', { profileId: 'me' });
  expect((await call('GET', '/calibration?profileId=me')).body).toEqual({ ok: true, profileId: 'me', calibration: null });
  await call('PUT', '/events', { profileId: 'me', events: sample });
  const miss = await call('GET', '/calibration?profileId=me');
  expect(miss.status).toBe(200);
  expect(miss.cache).toMatch(/no-store/);
  expect(miss.body.cache).toBe('miss');
  expect(Object.keys(miss.body.calibration.engines)).toEqual(['saju', 'ziwei', 'western', 'vedic', 'sukuyo']);
  const hit = await call('GET', '/calibration?profileId=me');
  expect(hit.body.cache).toBe('hit');
  expect(hit.body.calibration).toEqual(miss.body.calibration);
  expect(JSON.stringify([miss.body, db.calibrations])).not.toContain('첫 직장 합격');
  expect((await call('POST', '/calibration?profileId=me')).status).toBe(405);
  expect((await call('GET', '/calibration?profileId=me', undefined, {})).status).toBe(404);
});

describe('normalizeLifeEvents', () => {
  const opts = { minYear: 1990, maxYear: 2026 };
  test('정렬·기본값·메모 정리', () => {
    const out = events.normalizeLifeEvents([
      { year: 2020, domain: 'family', outcome: 'mixed', note: ' a\n<b> ' },
      { year: 2010, month: 3, outcome: 'ordinary' },
    ], opts);
    expect(out.map((e) => e.year)).toEqual([2010, 2020]);
    expect(out[0]).toMatchObject({ domain: null, intensity: 2, certainty: 'sure', channel: 'profile_form' });
    expect(out[1].note).toBe('a b');
  });
  test('skip·중복·상한 초과를 거부한다', () => {
    expect(() => events.normalizeLifeEvents([{ year: 2010, outcome: 'skip' }], opts)).toThrow(events.LifeEventInputError);
    const dup = { year: 2010, domain: 'career', outcome: 'good' };
    expect(() => events.normalizeLifeEvents([dup, { ...dup, outcome: 'bad' }], opts)).toThrow(/duplicate/);
    const many = Array.from({ length: 13 }, (_, i) => ({ year: 1990 + i, outcome: 'ordinary' }));
    expect(() => events.normalizeLifeEvents(many, opts)).toThrow(/at most 12/);
  });
});
