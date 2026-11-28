// 인생 보정 P4: 서버 계산·캐시, 프롬프트 블록, 모순 가드. 과금 호출 없음(엔진은 deps 로 주입).
import { jest } from '@jest/globals';

const uid = '507f1f77bcf86cd799439011';
const SECRET_NOTE = '비밀메모-첫직장';
let db;
const clone = (v) => (v == null ? v : structuredClone(v));
const matches = (row, filter) => Object.entries(filter).every(([k, v]) => String(row[k]) === String(v));
const chain = (read) => { const q = { select: () => q, sort: () => q, lean: async () => clone(read()) }; return q; };
const writes = [];
function model(name) {
  const rows = () => (db[name] ||= []);
  return {
    findById: (id) => chain(() => rows().find((r) => r._id === id) || null),
    findOne: (f) => chain(() => rows().find((r) => matches(r, f)) || null),
    find: (f) => chain(() => rows().filter((r) => matches(r, f))),
    updateOne: async (f, change, opts = {}) => {
      writes.push(name);
      let row = rows().find((r) => matches(r, f));
      if (!row && opts.upsert) { row = clone(f); rows().push(row); }
      Object.assign(row, clone(change.$set || {}));
    },
  };
}
jest.unstable_mockModule('../../worker/lib/db.js', () => ({ withMongoRetry: async (_env, fn) => fn() }));
jest.unstable_mockModule('../../worker/lib/models.js', () => ({ ProfileCard: model('profiles') }));
jest.unstable_mockModule('../../worker/lib/life-calibration-models.js', () => ({
  LifeEvent: model('events'), LifeCalibration: model('calibrations'), LifeCalibrationConsent: model('consents'),
}));

let compute, block, consentVersion, calibrationLib;
beforeAll(async () => {
  compute = await import('../../worker/lib/life-calibration-compute.js');
  block = await import('../../lib/life-calibration/personal-history-block.mjs');
  calibrationLib = await import('../../lib/life-calibration/life-calibration.mjs');
  ({ LIFE_CALIBRATION_CONSENT_VERSION: consentVersion } = await import('../../lib/life-calibration/life-events.mjs'));
});

const sajuYears = { 2015: { tone: 'favorable' }, 2016: { tone: 'favorable' }, 2019: { tone: 'unfavorable' }, 2021: { tone: 'favorable' } };
const deps = {
  saju: async () => ({ engine: 'saju', version: 'test-saju', status: 'available', years: sajuYears, months: {} }),
  ziwei: async () => calibrationLib.unavailableEngine('ziwei', 'test-ziwei', 'birth-time-required'),
  vedic: async () => { throw Object.assign(new Error(SECRET_NOTE), { code: 'BOOM' }); },
};
const eventRows = () => [
  { userId: uid, profileId: 'me', year: 2015, month: null, domain: 'career', outcome: 'good', certainty: 'sure', noteCipher: `enc:${SECRET_NOTE}` },
  { userId: uid, profileId: 'me', year: 2016, month: null, domain: 'money', outcome: 'good', certainty: 'sure' },
  { userId: uid, profileId: 'me', year: 2019, month: null, domain: 'career', outcome: 'bad', certainty: 'sure' },
  { userId: uid, profileId: 'me', year: 2021, month: null, domain: 'relationship', outcome: 'bad', certainty: 'sure' },
];
beforeEach(() => {
  writes.length = 0;
  db = {
    consents: [{ _id: uid, consent: { granted: true, version: consentVersion } }],
    profiles: [{ userId: uid, profileId: 'me', isSelf: true, gender: 'F', birth: { year: 1990, month: 3, day: 14, hour: 9, minute: 30, calType: 'solar' } }],
    events: eventRows(),
  };
});
const load = (extra = {}) => compute.loadSelfLifeCalibration({}, { uid, profileId: 'me', now: new Date('2026-11-28T00:00:00Z'), deps, ...extra });

describe('loadSelfLifeCalibration', () => {
  test('동의·본인 프로필·사건이 없으면 계산하지 않는다', async () => {
    db.consents = [];
    expect(await load()).toEqual({ status: 'consent-required' });
    db.consents = [{ _id: uid, consent: { granted: true, version: 'old' } }];
    expect(await load()).toEqual({ status: 'consent-required' });
    db.consents = [{ _id: uid, consent: { granted: true, version: consentVersion } }];
    db.profiles[0].isSelf = false;
    expect(await load()).toEqual({ status: 'profile-not-self' });
    db.profiles[0].isSelf = true;
    db.events = [];
    expect(await load()).toEqual({ status: 'no-events' });
    expect(writes).toEqual([]);
  });

  test('처음은 계산해 캐시(miss), 같은 입력은 캐시(hit), 입력이 바뀌면 다시 계산', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const first = await load();
    expect(first.cache).toBe('miss');
    expect(db.calibrations).toHaveLength(1);
    expect(db.calibrations[0]._id).toBe(`${uid}:me`);
    const second = await load();
    expect(second.cache).toBe('hit');
    expect(second.calibration).toEqual(first.calibration);
    // 엔진 신호가 바뀌면(사주 실패 → unavailable) inputHash 가 바뀌어 다시 계산한다.
    expect((await load({ deps: { ...deps, saju: async () => { throw new Error('x'); } } })).cache).toBe('miss');
    db.events.push({ userId: uid, profileId: 'me', year: 2016, domain: 'career', outcome: 'good', certainty: 'sure' });
    expect((await load()).cache).toBe('miss');
    warn.mockRestore();
  });

  test('엔진 하나가 실패해도 나머지로 계산하고, 로그·결과에 메모가 없다', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await load();
    expect(out.status).toBe('ok');
    expect(out.calibration.engines.saju.status).toBe('available');
    expect(out.calibration.engines.vedic).toMatchObject({ status: 'unavailable', reason: 'engine-error' });
    expect(out.calibration.engines.sukuyo.status).toBe('unavailable');
    expect(out.calibration.engines.western.status).toBe('unavailable');
    expect(JSON.stringify([out, db.calibrations, warn.mock.calls])).not.toContain(SECRET_NOTE);
    warn.mockRestore();
  });

  test('실제 사주 엔진 경로(호출만): 출생 정보로 연도 신호를 만든다', async () => {
    const out = await load({ deps: { ziwei: deps.ziwei, vedic: async () => calibrationLib.unavailableEngine('vedic', 'v', 'birth-place-required') } });
    expect(out.calibration.engines.saju.status).toBe('available');
    db.profiles[0].gender = undefined;
    const noGender = await load({ deps: { ziwei: deps.ziwei, vedic: deps.ziwei } });
    expect(noGender.calibration.engines.saju).toMatchObject({ status: 'unavailable', reason: 'gender-required' });
  });
});

describe('buildPersonalHistoryBlock', () => {
  const calibrate = async () => (await load()).calibration;

  test('결정적이고 600 토큰 이하이며 메모·건강·정확도 표현이 없다', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const calibration = await calibrate();
    const a = block.buildPersonalHistoryBlock(calibration);
    const b = block.buildPersonalHistoryBlock(structuredClone(calibration));
    expect(a).toBe(b);
    expect(a).toContain('[사용자가 직접 적은 지난 경험 — 약한 참고 가중치]');
    expect(a).toContain('- 2015년 직업: 좋았다고 적음');
    expect(a).toContain('- 2019년 직업: 힘들었다고 적음');
    expect(block.estimateLifeHistoryTokens(a)).toBeLessThanOrEqual(block.LIFE_HISTORY_BLOCK_MAX_TOKENS);
    expect(a).not.toContain(SECRET_NOTE);
    expect(a).not.toMatch(/정확|적중|운명|건강|학습/u);
    warn.mockRestore();
  });

  test('사건이 많아도 상한 안으로 줄이고, 건강 분야·섞인 칸은 버린다', () => {
    const used = [];
    for (let y = 1990; y < 2026; y += 1) used.push({ year: y, domain: 'career', outcome: y % 2 ? 'good' : 'bad' }, { year: y, domain: 'health', outcome: 'bad' });
    used.push({ year: 2024, domain: 'money', outcome: 'good' }, { year: 2024, domain: 'money', outcome: 'bad' });
    const calibration = { engines: { saju: { status: 'available', used, overall: { n: 74, status: 'applied', direction: 'agree', agree: 40, disagree: 34, years: 36 } } } };
    const text = block.buildPersonalHistoryBlock(calibration);
    expect(text).not.toContain('건강');
    expect(text).not.toContain('2024년 재정');
    expect(text.split('\n').filter((l) => /^- \d{4}년/u.test(l)).length).toBeLessThanOrEqual(12);
    expect(block.estimateLifeHistoryTokens(text)).toBeLessThanOrEqual(600);
    expect(block.buildPersonalHistoryBlock(calibration, { maxTokens: 30 })).toBe('');
    expect(block.buildPersonalHistoryBlock({ engines: {} })).toBe('');
    expect(block.buildPersonalHistoryBlock(null)).toBe('');
  });
});

describe('guardLifeHistoryContradiction', () => {
  const facts = [{ year: 2015, domain: 'career', outcome: 'good' }, { year: 2019, domain: 'career', outcome: 'bad' }, { year: 2019, domain: 'money', outcome: 'good' }];

  test('적은 결과의 반대를 단정한 문장만 중립 문장으로 바꾸고 같은 해 반복은 지운다', () => {
    const text = [
      '## 2015년 이야기',
      '2015년에는 직장에서 큰 시련을 겪었어요. 그래도 배운 것이 많았죠. 2015년 업무가 막혔던 때였어요.',
      '2019년 직업은 순조로웠어요. 2019년 재물운은 좋았어요.',
      '2020년은 힘들었어요.',
    ].join('\n');
    const out = block.guardLifeHistoryContradiction(text, facts);
    expect(out.replaced).toBe(2);
    expect(out.dropped).toBe(1);
    expect(out.text).toBe([
      '## 2015년 이야기',
      '2015년 직업 흐름은 겪은 대로 보세요. 그래도 배운 것이 많았죠.',
      '2019년 직업 흐름은 겪은 대로 보세요. 2019년 재물운은 좋았어요.',
      '2020년은 힘들었어요.',
    ].join('\n'));
  });

  test('중립 문장은 모든 분야에서 반복 검사 문턱(공백 뺀 24자) 아래다', async () => {
    const { reportSentenceKey } = await import('../../worker/lib/paid-report-quality.js');
    for (const domain of ['career', 'business', 'money', 'relationship', 'study', 'family', 'relocation', 'social', 'other']) {
      const out = block.guardLifeHistoryContradiction('2024년은 힘들었어요.', [{ year: 2024, domain, outcome: 'good' }]);
      expect(out.replaced).toBe(1);
      expect(reportSentenceKey(out.text.replace(/.$/u, '')).length).toBeLessThan(24);
    }
  });

  test('좋고 나쁨을 함께 말한 문장·사실 없음·이상 입력은 그대로 둔다', () => {
    const mixed = '2015년은 시련도 있었지만 결국 성공한 해였어요.';
    expect(block.guardLifeHistoryContradiction(mixed, facts)).toEqual({ text: mixed, replaced: 0, dropped: 0 });
    expect(block.guardLifeHistoryContradiction('2015년은 힘들었어요.', [])).toEqual({ text: '2015년은 힘들었어요.', replaced: 0, dropped: 0 });
    expect(block.guardLifeHistoryContradiction(null, facts).text).toBe('');
    expect(block.guardLifeHistoryContradiction('x', [{ year: 'bad' }, null]).text).toBe('x');
    expect(block.guardLifeHistoryContradiction('12015년은 힘들었어요.', facts).replaced).toBe(0);
  });

  test('lifeHistoryGuardFacts 는 used 행만, 메모 없이 돌려준다', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const calibration = (await load()).calibration;
    const got = block.lifeHistoryGuardFacts(calibration);
    expect(got.map((f) => `${f.year}:${f.domain}:${f.outcome}`)).toEqual(['2015:career:good', '2016:money:good', '2019:career:bad', '2021:relationship:bad']);
    expect(JSON.stringify(got)).not.toContain(SECRET_NOTE);
    expect(block.lifeHistoryGuardFacts(undefined)).toEqual([]);
    warn.mockRestore();
  });
});
