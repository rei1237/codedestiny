import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { analyzeNatalCore } from '../../lib/saju/natal-core/index.mjs';
import { analyzePeriods, buildLuckTimeline } from '../../lib/saju/experience-calibration.mjs';
import {
  recommendCrystals, normalizeCrystalAnswers, deriveAppliedYongshin, buildCrystalInputs, crystalAnswersKey,
  CrystalAnswerError, CRYSTAL_ENGINE_VERSION,
} from '../../lib/saju/crystal-recommendation.mjs';
import { CATALOG_VERSION, CRYSTAL_CATALOG } from '../../lib/saju/crystal-catalog.mjs';
import { calcPower, analyzeJohu, detectJong } from '../../worker/yeongnyangi/fortune/saju-runtime.mjs';

const P = (text) => Object.fromEntries(['y', 'm', 'd', 'h'].map((k, i) => [k, { g: text[i * 2] || '', j: text[i * 2 + 1] || '' }]));
const pillarsOf = (t) => ({ year: t.slice(0, 2), month: t.slice(2, 4), day: t.slice(4, 6), hour: t.slice(6, 8) || null });
const FIXTURE = '甲寅丁丑戊辰己未';
const GAJONG = '戊戌辛酉乙酉丁丑'; // 예전에 정격→가종으로 뒤집혔던 원국
const JONGGANG = '戊辰己未辛丑戊戌'; // 목·화가 원국에 없고 구조상 쓰는 오행도 아니다
const CYCLES = [['乙亥', 1990], ['甲戌', 2000], ['癸酉', 2010], ['壬申', 2020]].map(([pillar, year]) => ({ pillar, start: { year, month: 6 } }));

function inputsFor(text, { cycles = [], fromYear = 1990, toYear = 2026 } = {}) {
  const natal = analyzeNatalCore(P(text));
  const applied = deriveAppliedYongshin(pillarsOf(text));
  const periods = analyzePeriods({ natal, applied, timeline: buildLuckTimeline({ cycles, fromYear, toYear }) });
  return { natal, periods };
}
const good = (year, areas) => ({ year, month: null, kind: 'good', ...(areas ? { areas } : {}) });
const hard = (year, areas) => ({ year, month: null, kind: 'hard', ...(areas ? { areas } : {}) });
const ANSWER_SETS = [
  undefined,
  { good: 'none', hard: 'unsure' },
  { entries: [good(1996), good(2002), good(2007)] },
  { entries: [good(1997), good(2001), good(2006), hard(2010, { work: 'hard', money: 'good' })] },
  { entries: [good(2026, { life: 'good' })], hard: 'none' },
];

test('답변이 달라도 원국 분석(natal-core)은 깊은 비교로 같다 — 가종 원국 포함', () => {
  for (const text of [FIXTURE, GAJONG, JONGGANG]) {
    const before = JSON.parse(JSON.stringify(analyzeNatalCore(P(text))));
    const { natal, periods } = inputsFor(text, { cycles: text === FIXTURE ? CYCLES : [] });
    const structures = ANSWER_SETS.map((answers) => {
      const r = recommendCrystals({ natal, periods, answers });
      return JSON.stringify([r.natalAnalysisId, r.structure.hypotheses, r.structure.basePriority]);
    });
    assert.equal(new Set(structures).size, 1, text);
    assert.deepEqual(JSON.parse(JSON.stringify(natal)), before, text);
    assert.deepEqual(JSON.parse(JSON.stringify(analyzeNatalCore(P(text)))), before, text);
  }
  const gajong = analyzeNatalCore(P(GAJONG));
  assert.equal(gajong.special.decision, 'special');
});

test('사주에 없는 오행은 구조 후보가 아니면 추천하지 않는다', () => {
  const { natal, periods } = inputsFor(JONGGANG);
  const structural = new Set(periods.hypotheses.filter((h) => h.evaluable).flatMap((h) => h.useful));
  assert.ok(!structural.has('wood') && !structural.has('fire'));
  for (const answers of ANSWER_SETS) {
    const r = recommendCrystals({ natal, periods, answers });
    for (const c of r.crystals) assert.ok(structural.has(c.element), `${c.id}:${c.element}`);
    for (const el of [...r.structure.primaryElements, ...r.structure.supportElements]) assert.ok(structural.has(el), el);
  }
});

test('같은 해의 반대되는 영역 결과를 하나로 합치지 않는다', () => {
  const { natal, periods } = inputsFor(FIXTURE, { cycles: CYCLES, fromYear: 1975 });
  const r = recommendCrystals({ natal, periods, answers: { entries: [hard(2010, { work: 'hard', money: 'good', relationship: 'mixed' })] } });
  const rows = [...r.experience.used, ...r.experience.unused, ...r.experience.ambiguous].filter((x) => x.year === 2010);
  const byDomain = Object.fromEntries(rows.map((x) => [x.domain, x.kind || x.reason]));
  assert.deepEqual(byDomain, { work: 'hard', money: 'good', relationship: 'mixed' });
  assert.ok(r.experience.unused.some((x) => x.domain === 'relationship' && x.reason === 'mixed'));
});

test('기본·여러 후보 상태에서는 추가 질문이 2개 이하이고, 답한 해를 다시 묻지 않는다', () => {
  const { natal, periods } = inputsFor(GAJONG);
  for (const answers of ANSWER_SETS) {
    const r = recommendCrystals({ natal, periods, answers });
    assert.ok(['base', 'multiple', 'refined'].includes(r.status));
    if (r.status === 'refined') { assert.equal(r.followups.length, 0); continue; }
    assert.ok(r.followups.length <= 2);
    const answered = new Set((answers?.entries || []).map((e) => e.year));
    for (const f of r.followups) {
      assert.ok(f.year < 2026 && f.year >= 1990 && !answered.has(f.year));
      assert.ok(!/좋|나쁘|길|흉/.test(String(f.year)) && typeof f.prompt === 'string');
    }
  }
  const asked = recommendCrystals({ natal, periods, answers: { asked: [2025] } });
  assert.ok(asked.followups.length <= 1 && !asked.followups.some((f) => f.year === 2025));
  // 구조 후보가 하나뿐이면 묻지 않는다
  const single = inputsFor('庚子戊子丙寅戊子');
  assert.equal(recommendCrystals(single).followups.length, 0);
  assert.equal(recommendCrystals(single).status, 'base');
});

test('충분한 경험 근거가 있을 때만 구조 후보의 순서를 바꾸고, 구조는 그대로 둔다', () => {
  const { natal, periods } = inputsFor(GAJONG);
  const base = recommendCrystals({ natal, periods });
  assert.deepEqual(base.structure.priority, ['special', 'johu.joSeup', 'reading']);
  const refined = recommendCrystals({ natal, periods, answers: { entries: [good(1996), good(2002), good(2007)] } });
  assert.equal(refined.status, 'refined');
  assert.deepEqual(refined.structure.priority, ['johu.joSeup', 'special', 'reading']);
  assert.deepEqual(refined.structure.basePriority, base.structure.basePriority);
  assert.deepEqual(refined.structure.primaryElements, ['water', 'wood']);
  // 두 해만으로는 기준(신호 3건)에 못 미친다
  const weak = recommendCrystals({ natal, periods, answers: { entries: [good(1996), good(2002)] } });
  assert.notEqual(weak.status, 'refined');
  assert.deepEqual(weak.structure.priority, base.structure.priority);
});

test('출력 형태: 원석 2~3개, 백분율 없음, 한국어 이유', () => {
  for (const text of [FIXTURE, GAJONG, JONGGANG]) {
    const r = recommendCrystals(inputsFor(text));
    assert.equal(r.version, CRYSTAL_ENGINE_VERSION);
    assert.equal(r.catalogVersion, CATALOG_VERSION);
    assert.ok(r.crystals.length >= 2 && r.crystals.length <= 3, text);
    assert.equal(new Set(r.crystals.map((c) => c.id)).size, r.crystals.length);
    assert.ok(r.crystals.every((c) => CRYSTAL_CATALOG.find((x) => x.id === c.id)?.recommendable));
    assert.ok(!/%|퍼센트|점수/.test(JSON.stringify(r)));
    assert.ok(r.structure.reasons.length >= 1 && r.experience.reasons.length >= 1);
    assert.ok(r.limitations.some((l) => l.includes('보장하지 않습니다')));
    assert.ok(Object.isFrozen(r) && Object.isFrozen(r.crystals));
  }
});

test('resultKey는 결정적이고, 답변 순서와 무관하며, 답변이 바뀌면 달라진다', () => {
  const inputs = inputsFor(GAJONG);
  const a = { entries: [good(1997), hard(2010, { work: 'hard', money: 'good' })] };
  const b = { entries: [hard(2010, { money: 'good', work: 'hard' }), good(1997)] };
  const ra = recommendCrystals({ ...inputs, answers: a });
  assert.equal(ra.resultKey, recommendCrystals({ ...inputsFor(GAJONG), answers: a }).resultKey);
  assert.equal(ra.resultKey, recommendCrystals({ ...inputs, answers: b }).resultKey);
  assert.match(ra.resultKey, /^cr1-/);
  assert.notEqual(ra.resultKey, recommendCrystals({ ...inputs, answers: { entries: [good(1997)] } }).resultKey);
  assert.notEqual(ra.resultKey, recommendCrystals(inputs).resultKey);
  const n = normalizeCrystalAnswers(a, { birthYear: 1990, currentYear: 2026 });
  assert.equal(crystalAnswersKey(n), crystalAnswersKey(normalizeCrystalAnswers(b, { birthYear: 1990, currentYear: 2026 })));
});

test('연도 범위: 미래·출생 전은 거부하고 올해는 부분 연도로 표시한다', () => {
  const opts = { birthYear: 1990, currentYear: 2026 };
  assert.throws(() => normalizeCrystalAnswers({ entries: [good(2027)] }, opts), CrystalAnswerError);
  assert.throws(() => normalizeCrystalAnswers({ entries: [good(1989)] }, opts), CrystalAnswerError);
  assert.throws(() => normalizeCrystalAnswers({ entries: [{ ...good(2000), month: 13 }] }, opts), CrystalAnswerError);
  assert.throws(() => normalizeCrystalAnswers({ entries: [good(2000, { health: 'good' })] }, opts), CrystalAnswerError);
  assert.throws(() => normalizeCrystalAnswers({ entries: [good(2000), good(2000)] }, opts), CrystalAnswerError);
  assert.throws(() => normalizeCrystalAnswers({ entries: [good(2000), good(2001), good(2002), good(2003)] }, opts), CrystalAnswerError);
  assert.throws(() => normalizeCrystalAnswers({ good: 'none', entries: [good(2000)] }, opts), CrystalAnswerError);
  assert.throws(() => normalizeCrystalAnswers({ good: 'listed' }, opts), CrystalAnswerError);
  const n = normalizeCrystalAnswers({ entries: [good(2026), hard(1990)], hard: 'listed' }, opts);
  assert.deepEqual(n.entries.map((e) => [e.year, e.partial]), [[1990, false], [2026, true]]);
  assert.deepEqual([n.good, n.hard], ['listed', 'listed']);
  assert.deepEqual([normalizeCrystalAnswers({ good: 'unsure' }, opts).good, normalizeCrystalAnswers({}, opts).hard], ['unsure', 'skip']);
  const r = recommendCrystals({ ...inputsFor(GAJONG), answers: { entries: [good(2026)] } });
  assert.ok(r.limitations.some((l) => l.includes('올해')));
  assert.throws(() => recommendCrystals({ ...inputsFor(GAJONG), answers: { entries: [good(2030)] } }), CrystalAnswerError);
});

test('출생시간 모름: 대운을 쓰지 않고 한계 문구를 단다', () => {
  const known = buildCrystalInputs({ birth: { birthDate: '1975-01-22', birthTime: '14:00' }, gender: 'F', currentYear: 2026 });
  assert.deepEqual(known.pillars, { year: '甲寅', month: '丁丑', day: '戊辰', hour: '己未' });
  assert.equal(known.hourKnown, true);
  assert.ok(known.daewunIncluded && known.periods.cycles.length > 0);
  assert.deepEqual(known.periods.cycles.slice(1, 5).map((c) => [c.pillar, c.start.year]), [['乙亥', 1990], ['甲戌', 2000], ['癸酉', 2010], ['壬申', 2020]]);
  const unknown = buildCrystalInputs({ birth: { birthDate: '1975-01-22', birthTimeUnknown: true }, gender: 'F', currentYear: 2026 });
  assert.equal(unknown.hourKnown, false);
  assert.equal(unknown.daewunIncluded, false);
  assert.equal(unknown.periods.cycles.length, 0);
  assert.equal(unknown.natal.input.hourKnown, false);
  const r = recommendCrystals(unknown);
  assert.ok(r.limitations.some((l) => l.includes('출생시간을 몰라')));
  assert.ok(!recommendCrystals(known).limitations.some((l) => l.includes('출생시간을 몰라')));
});

test('적용 용신은 셸(js/saju-engine.js) applyRuntimeYongshinPolicy와 같다', () => {
  const src = fs.readFileSync(new URL('../../js/saju-engine.js', import.meta.url), 'utf8');
  const start = src.indexOf('function _dfArrayCopy(');
  const end = src.indexOf('return power;\n}', src.indexOf('function applyRuntimeYongshinPolicy(')) + 'return power;\n}'.length;
  const ke = src.match(/^var KE=\{[^}]+\};$/m)[0];
  const who = src.match(/^function whoControls\(e\)\{.*\}$/m)[0];
  const ctx = vm.createContext({});
  vm.runInContext(`${ke}\n${who}\n${src.slice(start, end)}\nthis.policy = applyRuntimeYongshinPolicy;`, ctx);
  for (const text of [FIXTURE, GAJONG, JONGGANG, '庚子戊子丙寅戊子', '戊戌辛酉乙酉']) {
    const p = P(text);
    const shell = ctx.policy(calcPower(p), detectJong(p), analyzeJohu(p));
    const applied = deriveAppliedYongshin(pillarsOf(text));
    assert.deepEqual(applied, { useful: [...shell.yongshin], avoid: [...shell.kijishin] }, text);
  }
});
