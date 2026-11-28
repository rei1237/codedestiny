// 인생 보정 P3 집계 엔진·엔진 래퍼. 설계: docs/context/life-calibration.md "엔진별 연도 신호"·"충돌 처리 규칙"
// 과금 LLM·DB·네트워크 없음. 전부 결정적 순수 함수다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { analyzeNatalCore } from '../../lib/saju/natal-core/index.mjs';
import { analyzePeriods, buildLuckTimeline, calibrateExperience, CALIBRATION_POLICY } from '../../lib/saju/experience-calibration.mjs';
import { daeun } from '../../lib/korean-calendar/daeun.js';
import {
  computeLifeCalibration, lifeCalibrationInputHash, lifeCalibrationCacheFields, isLifeCalibrationCacheFresh,
  LIFE_CALIBRATION_POLICY, LIFE_CALIBRATION_VERSION, LIFE_CALIBRATION_ENGINES,
} from '../../lib/life-calibration/life-calibration.mjs';
import { sajuYearSignals, cyclesFromDaeun } from '../../lib/life-calibration/saju-signals.mjs';
import { westernYearSignals } from '../../lib/life-calibration/western-signals.mjs';
import { vedicYearSignals, sukuyoYearSignals, dashaLordScore } from '../../worker/lib/life-calibration-signals.js';
import { lifeCalibrationOn } from '../../worker/lib/engine-rollout.js';
import { loadTsModule } from '../../scripts/lib/load-ts-module.mjs';

// 사주 v1 테스트와 같은 원국: 甲寅 丁丑 戊辰 己未. 2004·2005·2013 유리, 2006·2009 불리, 2007 중립(v1 테스트에서 손으로 센 값).
const P = (text) => Object.fromEntries(['y', 'm', 'd', 'h'].map((k, i) => [k, { g: text[i * 2], j: text[i * 2 + 1] }]));
const natal = analyzeNatalCore(P('甲寅丁丑戊辰己未'));
const applied = { useful: natal.yongshin.eokbu.useful, avoid: natal.yongshin.eokbu.avoid };
const cycles = [['乙亥', 1990], ['甲戌', 2000], ['癸酉', 2010], ['壬申', 2020], ['辛未', 2030]].map(([pillar, year]) => ({ pillar, start: { year, month: 6 } }));
const ev = (year, domain, outcome, extra = {}) => ({ year, month: null, domain, outcome, intensity: 2, certainty: 'sure', source: 'volunteered', channel: 'profile_form', note: '', ...extra });
const yearsOf = (events) => events.map((e) => e.year);
const sajuOf = (events) => sajuYearSignals({ natal, applied, cycles, years: yearsOf(events) });
// 합성 신호: 지정한 해는 tone, 나머지는 신호 없음.
const fixed = (engine, tones) => ({ engine, version: `${engine}-test`, status: 'available', years: Object.fromEntries(Object.entries(tones).map(([y, tone]) => [y, { tone }])), months: {} });
const allFav = (years) => fixed('ziwei', Object.fromEntries(years.map((y) => [y, 'favorable'])));

test('사주 래퍼 + 집계는 v1 calibrateExperience 와 같은 수를 센다(정책값 재사용)', () => {
  const events = [ev(2004, 'career', 'good'), ev(2005, 'relationship', 'bad'), ev(2006, 'career', 'bad'), ev(2009, 'study', 'bad'), ev(2013, 'money', 'good'), ev(2007, 'money', 'good')];
  const periods = analyzePeriods({ natal, applied, timeline: buildLuckTimeline({ cycles, fromYear: 1995, toYear: 2025 }) });
  const v1 = calibrateExperience({ natal, periods, answers: events.map(({ channel, ...rest }) => rest) });
  const c = computeLifeCalibration({ events, signals: [sajuOf(events)] });
  const o = c.engines.saju.overall;
  assert.deepEqual([o.n, o.agree, o.disagree, o.years, o.factor], [v1.overall.n, v1.overall.agree, v1.overall.disagree, v1.overall.years, v1.overall.factor]);
  assert.equal(o.status, 'applied');
  assert.deepEqual(c.engines.saju.unused.map((u) => [u.year, u.reason]), [[2007, 'neutral-period']]);
  assert.deepEqual([LIFE_CALIBRATION_POLICY.shrinkK, LIFE_CALIBRATION_POLICY.cap, LIFE_CALIBRATION_POLICY.minSignals, LIFE_CALIBRATION_POLICY.minYears],
    [CALIBRATION_POLICY.shrinkK, CALIBRATION_POLICY.cap, CALIBRATION_POLICY.minSignals, CALIBRATION_POLICY.minYears]);
  assert.deepEqual([CALIBRATION_POLICY.shrinkK, CALIBRATION_POLICY.cap], [4, 0.15]);
});

test('사주 래퍼: 월이 있으면 입춘·교운 경계를 v1 규칙으로 따른다', () => {
  const s = sajuYearSignals({ natal, applied, cycles, years: [2010, 2000] });
  assert.equal(s.months['2010-2'].tone, 'ambiguous'); // 세운 己丑/庚寅 갈림
  assert.equal(s.months['2010-1'].periodYear, 2009);
  assert.equal(s.years[2000].tone, 'ambiguous'); // 교운 달 모르면 乙亥·甲戌 판단이 갈린다
  assert.equal(s.months['2000-9'].tone, 'neutral'); // 교운(6월) 뒤 甲戌 + 庚辰
});

test('daeun() 결과를 v1 cycles 로 옮긴다(미입운 0번 칸 제외)', () => {
  const d = daeun({ year: 1975, month: 1, day: 22, hour: 14, minute: 0 }, { gender: 'F' });
  const list = cyclesFromDaeun(d);
  assert.equal(list.length, d.cycles.length - 1);
  assert.ok(list.every((c) => c.pillar.length === 2 && c.start.month === d.startSolar.month));
  assert.equal(list[0].start.year, d.cycles[1].startYear);
  assert.deepEqual(cyclesFromDaeun(null), []);
});

test('결정적이다: 같은 입력은 같은 결과, 이벤트 순서와 무관, 입력이 바뀌면 inputHash 가 바뀐다', () => {
  const events = [ev(2004, 'career', 'good'), ev(2006, 'family', 'bad'), ev(2013, 'relocation', 'good')];
  const a = computeLifeCalibration({ events, signals: [sajuOf(events), westernYearSignals()] });
  const b = computeLifeCalibration({ events: [...events].reverse(), signals: [westernYearSignals(), sajuOf(events)] });
  assert.deepEqual(a, b);
  assert.match(a.inputHash, /^lc1-/);
  assert.equal(a.version, LIFE_CALIBRATION_VERSION);
  const changed = lifeCalibrationInputHash([...events.slice(1), ev(2004, 'career', 'bad')], [sajuOf(events), westernYearSignals()]);
  assert.notEqual(changed, a.inputHash);
  const otherVersion = lifeCalibrationInputHash(events, [{ ...sajuOf(events), version: 'x' }, westernYearSignals()]);
  assert.notEqual(otherVersion, a.inputHash);
  // 메모·입력 경로는 해시에 들어가지 않는다.
  assert.equal(lifeCalibrationInputHash(events.map((e) => ({ ...e, note: 'x', channel: 'diary' })), [sajuOf(events), westernYearSignals()]), a.inputHash);
  assert.ok(Object.isFrozen(a) && Object.isFrozen(a.engines.saju.overall));
});

test('캐시 필드는 LifeCalibration 모델 모양(inputHash·engineVersions·result)이다', () => {
  const c = computeLifeCalibration({ events: [ev(2004, 'career', 'good')], signals: [] });
  const fields = lifeCalibrationCacheFields(c);
  assert.deepEqual(Object.keys(fields).sort(), ['engineVersions', 'inputHash', 'result']);
  assert.equal(fields.engineVersions.aggregate, LIFE_CALIBRATION_VERSION);
  assert.deepEqual(Object.keys(c.engineVersions).sort(), [...LIFE_CALIBRATION_ENGINES].sort());
  assert.equal(isLifeCalibrationCacheFresh({ inputHash: c.inputHash }, c.inputHash), true);
  assert.equal(isLifeCalibrationCacheFresh({ inputHash: 'lc1-old' }, c.inputHash), false);
  assert.equal(isLifeCalibrationCacheFresh(null, c.inputHash), false);
});

test('수축과 상한: 모두 일치해도 factor 는 cap 을 넘지 않고 n/(n+4) 로 줄어든다', () => {
  const three = [ev(2001, 'career', 'good'), ev(2002, 'career', 'good'), ev(2003, 'career', 'good')];
  const o3 = computeLifeCalibration({ events: three, signals: [allFav([2001, 2002, 2003])] }).engines.ziwei.overall;
  assert.deepEqual([o3.status, o3.raw, o3.shrink, o3.factor], ['applied', 1, 0.4286, 0.0643]);
  const many = Array.from({ length: 200 }, (_, i) => ev(1900 + i, 'money', 'good'));
  const om = computeLifeCalibration({ events: many, signals: [allFav(many.map((e) => e.year))] }).engines.ziwei.overall;
  assert.ok(om.factor < LIFE_CALIBRATION_POLICY.cap && om.factor > 0.14, String(om.factor));
  const bad = computeLifeCalibration({ events: many.map((e) => ({ ...e, outcome: 'bad' })), signals: [allFav(many.map((e) => e.year))] }).engines.ziwei.overall;
  assert.ok(bad.factor > -LIFE_CALIBRATION_POLICY.cap && bad.factor < 0);
});

test('minSignals·minYears 미만이면 insufficient, factor 0', () => {
  const run = (events) => computeLifeCalibration({ events, signals: [allFav(yearsOf(events))] }).engines.ziwei.overall;
  assert.deepEqual([run([ev(2001, 'career', 'good'), ev(2002, 'career', 'good')]).status, run([ev(2001, 'career', 'good'), ev(2002, 'career', 'good')]).factor], ['insufficient', 0]);
  const sameYear = run([ev(2001, 'career', 'good'), ev(2001, 'money', 'good'), ev(2001, 'family', 'good')]);
  assert.deepEqual([sameYear.n, sameYear.years, sameYear.status], [3, 1, 'insufficient']);
  assert.equal(run([ev(2001, 'career', 'good'), ev(2001, 'money', 'good'), ev(2002, 'family', 'good')]).status, 'applied');
  // 평범·불확실·둘 다는 신호가 아니다.
  const c = computeLifeCalibration({ events: [ev(2001, null, 'ordinary'), ev(2002, 'career', 'mixed'), ev(2003, 'career', 'good', { certainty: 'unsure' })], signals: [allFav([2001, 2002, 2003])] });
  assert.deepEqual(c.engines.ziwei.unused.map((u) => u.reason), ['not-a-signal:ordinary', 'mixed-signal', 'uncertain-memory']);
});

test('충돌 플래그: 같은 방향 3회 이상 + confidence 0.7 이상 + 서로 다른 해 2개 이상', () => {
  const years = [2001, 2002, 2003, 2004, 2005];
  const run = (outcomes) => computeLifeCalibration({ events: outcomes.map((o, i) => ev(years[i], 'career', o)), signals: [allFav(years)] }).engines.ziwei.overall;
  const all = run(['bad', 'bad', 'bad']);
  assert.deepEqual([all.direction, all.confidence, all.conflictFlag], ['disagree', 1, true]);
  assert.deepEqual([run(['bad', 'bad', 'bad', 'good', 'good']).confidence, run(['bad', 'bad', 'bad', 'good', 'good']).conflictFlag], [0.6, false]);
  assert.deepEqual([run(['bad', 'bad', 'bad', 'bad', 'good']).confidence, run(['bad', 'bad', 'bad', 'bad', 'good']).conflictFlag], [0.8, true]);
  assert.equal(run(['good', 'good', 'good']).conflictFlag, false); // 일치 방향은 충돌이 아니다
  assert.equal(run(['bad', 'bad']).conflictFlag, false);
});

test('확장 분야(family·relocation·social·other)도 분야별로 센다, 건강 분야는 없다', () => {
  const events = [ev(2001, 'family', 'good'), ev(2002, 'family', 'good'), ev(2003, 'family', 'bad'), ev(2004, 'relocation', 'good'), ev(2005, 'other', 'bad')];
  const c = computeLifeCalibration({ events, signals: [allFav(yearsOf(events))] });
  assert.deepEqual(Object.keys(c.engines.ziwei.byDomain), ['family', 'relocation', 'other']);
  assert.deepEqual([c.engines.ziwei.byDomain.family.agree, c.engines.ziwei.byDomain.family.disagree, c.engines.ziwei.byDomain.family.status], [2, 1, 'applied']);
  assert.deepEqual(Object.keys(c.domains), ['relocation', 'family', 'other'].sort((a, b) => ['career', 'business', 'money', 'relationship', 'study', 'family', 'relocation', 'social', 'other'].indexOf(a) - ['career', 'business', 'money', 'relationship', 'study', 'family', 'relocation', 'social', 'other'].indexOf(b)));
  assert.equal(JSON.stringify(c).includes('health'), false);
});

test('쓸 수 없는 엔진은 unavailable + reason 으로 남고 다른 엔진 집계를 막지 않는다', () => {
  const events = [ev(2004, 'career', 'good'), ev(2006, 'career', 'bad'), ev(2013, 'money', 'good')];
  const c = computeLifeCalibration({
    events,
    signals: [sajuOf(events), westernYearSignals(), vedicYearSignals({ moonLongitude: 10, birthUtc: '1975-01-22T05:00:00Z', years: [2004] }), sukuyoYearSignals({ birthMoonLongitude: 10, years: [2004] })],
  });
  assert.equal(c.engines.saju.status, 'available');
  assert.deepEqual(['western', 'vedic', 'sukuyo', 'ziwei'].map((e) => [c.engines[e].status, c.engines[e].reason]), [
    ['unavailable', 'no-server-safe-pure-transit-path'], ['unavailable', 'ascendant-required'],
    ['unavailable', 'year-mansion-anchor-undecided'], ['unavailable', 'no-adapter-input'],
  ]);
  assert.equal(c.counts.enginesAvailable, 1);
  assert.equal(sajuYearSignals({ natal: structuredClone(natal), applied, cycles, years: [2004] }).reason, 'natal-analysis-required');
  assert.equal(sajuYearSignals({ natal, applied, cycles: [], years: [2004] }).reason, 'daeun-cycles-required');
  // 연도 신호가 없는 해는 세지 않는다(외삽 없음).
  const partial = computeLifeCalibration({ events, signals: [fixed('ziwei', { 2004: 'favorable' })] });
  assert.deepEqual(partial.engines.ziwei.unused.map((u) => [u.year, u.reason]), [[2006, 'year-unavailable'], [2013, 'year-unavailable']]);
});

test('베다: 다샤 주인 점수와 연도 신호는 결정적이고, 출생 전 달은 unavailable', () => {
  // 양자리 상승(0): 태양=사자 5궁 +1, 수성=쌍둥이 3궁·처녀 6궁 −1, 목성=사수 9궁·물고기 12궁 0, 라후 0.
  assert.deepEqual(['Sun', 'Mercury', 'Jupiter', 'Rahu', 'Mars'].map((l) => dashaLordScore(l, 0)), [1, -1, 0, 0, 0]);
  const input = { moonLongitude: 123.4, ascendantLongitude: 15, birthUtc: '1990-03-01T00:00:00Z', years: [1990, 2010, 2020] };
  const a = vedicYearSignals(input);
  assert.deepEqual(a, vedicYearSignals({ ...input, years: [2020, 1990, 2010] }));
  assert.equal(a.status, 'available');
  assert.equal(a.months['1990-1'].tone, 'unavailable');
  assert.equal(a.years[1990].tone, 'ambiguous');
  for (const y of [2010, 2020]) assert.ok(['favorable', 'unfavorable', 'neutral', 'ambiguous'].includes(a.years[y].tone));
});

test('숙요: 27수 순행 거리(삼구 자리)만 쓰고, anchor 가 없으면 unavailable', () => {
  const span = 360 / 27;
  const s = sukuyoYearSignals({ birthMoonLongitude: 1, yearMoonLongitudes: { 2001: 1, 2002: 1 + span, 2003: 1 + 2 * span, 2004: 1 + 9 * span }, anchor: 'test-anchor', years: [2001, 2002, 2003, 2004, 2005] });
  assert.deepEqual([2001, 2002, 2003, 2004, 2005].map((y) => s.years[y].tone), ['neutral', 'favorable', 'unfavorable', 'unfavorable', 'unavailable']);
  assert.deepEqual([s.years[2002].role, s.years[2002].forwardDistance], ['영', 1]);
  assert.equal(s.version, 'life-calibration-sukuyo-v1+test-anchor');
  assert.equal(sukuyoYearSignals({ birthMoonLongitude: 'x', years: [2001] }).reason, 'birth-moon-longitude-required');
});

test('자미두수: yearFlowTheory 의 tone 만 옮기고 명반을 바꾸지 않는다', () => {
  const eng = loadTsModule('app/_lib/ziwei-engine.ts');
  const { normalizeZiweiInput } = loadTsModule('app/_lib/normalize-ziwei-input.ts');
  const yf = loadTsModule('app/_lib/ziwei-year-flow.ts');
  const { ziweiYearSignals, ziweiToneOf } = loadTsModule('lib/life-calibration/ziwei-signals.ts');
  const n = normalizeZiweiInput({ name: 'x', birthYear: 1988, birthMonth: 7, birthDay: 3, birthHour: 9, birthMinute: 30, gender: 'F', calendarType: 'solar', isLeapMonth: false, unknownHour: false, timezone: 'Asia/Seoul' });
  const chart = eng.normalizeZiweiForAdvancedReport(eng.calculateZiweiChart(n.input));
  const before = JSON.stringify(chart);
  const years = [2008, 2012, 2016, 2020, 2024];
  const s = ziweiYearSignals({ chart, years });
  assert.equal(JSON.stringify(chart), before);
  assert.equal(s.status, 'available');
  for (const y of years) assert.equal(s.years[y].tone, ziweiToneOf(yf.yearFlowTheory(chart, y).tone));
  for (const y of years) assert.equal(s.months[`${y}-2`].tone === 'ambiguous', ziweiToneOf(yf.yearFlowTheory(chart, y - 1).tone) !== ziweiToneOf(yf.yearFlowTheory(chart, y).tone));
  assert.deepEqual(JSON.parse(JSON.stringify(s)), JSON.parse(JSON.stringify(ziweiYearSignals({ chart, years: [...years].reverse() }))));
  assert.deepEqual(['expand', 'guard', 'mixed', 'calm'].map(ziweiToneOf), ['favorable', 'unfavorable', 'neutral', 'neutral']);
  assert.equal(ziweiYearSignals({ chart: null, years }).reason, 'ziwei-chart-required');
});

test('사주 래퍼는 원국을 바꾸지 않는다', () => {
  const before = JSON.stringify(natal);
  sajuOf([ev(2004, 'career', 'good')]);
  assert.equal(JSON.stringify(natal), before);
});

// ── 가드 ──────────────────────────────────────────────────────────────
const CALIBRATION_FILES = ['lib/life-calibration/life-calibration.mjs', 'lib/life-calibration/saju-signals.mjs', 'lib/life-calibration/western-signals.mjs', 'lib/life-calibration/ziwei-signals.ts', 'worker/lib/life-calibration-signals.js'];

test('가드: 보정 모듈은 DB·워커 런타임·천문력 WASM·LLM 을 import 하지 않고, 시계·난수를 읽지 않는다', () => {
  const forbidden = /(?:\/db\.js|models|\/env\.js|\/http\.js|swiss-ephemeris|sukuyo-astronomy|llm|gemini|sajuAdapter|new-year-ai|sukuyo-yearly)/;
  for (const file of CALIBRATION_FILES) {
    const src = readFileSync(file, 'utf8');
    const imports = [...src.matchAll(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
    assert.ok(imports.length > 0, `${file}: import 를 읽지 못함`);
    for (const spec of imports) assert.doesNotMatch(spec, forbidden, `${file} imports ${spec}`);
    const code = src.replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(code, /Date\.now\(|new Date\(\)|Math\.random\(|calculateLocalResult|process\.env/, file);
  }
});

test('가드(플래그 OFF 동일성): 기본 플래그는 꺼져 있고, 런타임은 계산 모듈 하나로만 보정 엔진에 닿는다', () => {
  assert.equal(lifeCalibrationOn({}, 'api'), false);
  assert.equal(lifeCalibrationOn({ LIFE_CALIBRATION_V1: '' }, 'engine'), false);
  // P4: 런타임 진입점은 worker/lib/life-calibration-compute.js 하나다(라우트는 lifeCalibrationOn('api') 뒤, 사주 AI 는 핀 뒤 동적 import).
  // 새 소비자를 붙일 때 이 허용 목록을 함께 갱신한다.
  const allowed = new Set([...CALIBRATION_FILES, 'worker/lib/life-calibration-compute.js', '__tests__/ui/life-calibration-engine.test.mjs', '__tests__/worker/life-calibration-compute.test.js', '__tests__/worker/saju-paid-delivery-recovery.test.js', 'docs/context/life-calibration.md']);
  // 상대 경로 import('./saju-signals.mjs')까지 잡도록 파일 이름으로 찾는다. 미추적 새 파일도 본다. 일치 없음(종료 코드 1)만 빈 결과로 본다.
  let out = '';
  try {
    out = execFileSync('git', ['grep', '--untracked', '-l', '-E', '(life-calibration/|\\./)(life-calibration\\.mjs|saju-signals|western-signals|ziwei-signals)|life-calibration-signals', '--', 'app', 'lib', 'worker', 'js', 'functions', 'scripts', '__tests__'], { encoding: 'utf8' });
  } catch (error) {
    if (error.status !== 1) throw error;
  }
  const unexpected = out.trim().split(/\r?\n/).filter(Boolean).filter((f) => !allowed.has(f));
  assert.deepEqual(unexpected, []);
  // 사주 AI 는 계산 모듈을 정적으로 import 하지 않는다(플래그 OFF 경로가 보정 모듈을 읽지 않게).
  const fortune = readFileSync('worker/routes/fortune.js', 'utf8');
  assert.doesNotMatch(fortune, /^import[^;]*life-calibration-compute/m);
  assert.ok(fortune.includes('await import("../lib/life-calibration-compute.js")'));
});
