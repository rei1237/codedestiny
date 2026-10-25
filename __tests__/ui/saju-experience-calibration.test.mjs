import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeNatalCore } from '../../lib/saju/natal-core/index.mjs';
import {
  analyzePeriods, buildLuckTimeline, calibrateExperience, normalizeExperienceAnswers, adjustScore,
  ExperienceInputError, CALIBRATION_POLICY, sexagenaryPillar,
} from '../../lib/saju/experience-calibration.mjs';

// 甲寅 丁丑 戊辰 己未(1975-01-22 14:00 여). 억부: 금·수·목을 쓰고 토·화를 꺼린다.
// 대운(교운 6월): 乙亥 1990, 甲戌 2000, 癸酉 2010, 壬申 2020, 辛未 2030.
// 운 판단은 대운·세운 네 글자의 쓰는 오행 +1, 꺼리는 오행 −1 합이다. 아래 기대값은 이 규칙으로 손으로 셌다.
//   2004 甲申·2005 乙酉 (甲戌 0) +2 유리 | 2006 丙戌·2009 己丑 −2 불리 | 2007 丁亥·2008 戊子 0 중립
//   2013 癸巳·2015 乙未 (癸酉 +2) +2 유리 | 2000 庚辰: 乙亥(+2)면 유리, 甲戌(0)이면 중립 → 교운 달을 모르면 확정하지 않음
//   2010년 2월: 세운 己丑(−2)/庚寅(+2)가 갈려 입춘 경계 | 2010 교운: 甲戌·癸酉 모두 庚寅과 유리라 셈
const P = (text) => Object.fromEntries(['y', 'm', 'd', 'h'].map((k, i) => [k, { g: text[i * 2], j: text[i * 2 + 1] }]));
const natal = analyzeNatalCore(P('甲寅丁丑戊辰己未'));
const applied = { useful: natal.yongshin.eokbu.useful, avoid: natal.yongshin.eokbu.avoid };
const cycles = [['乙亥', 1990], ['甲戌', 2000], ['癸酉', 2010], ['壬申', 2020], ['辛未', 2030]].map(([pillar, year]) => ({ pillar, start: { year, month: 6 } }));
const periods = analyzePeriods({ natal, applied, timeline: buildLuckTimeline({ cycles, fromYear: 1995, toYear: 2025, targetYears: [2028, 2036] }) });
const run = (answers) => calibrateExperience({ natal, periods, answers });
const ev = (year, domain, outcome, extra = {}) => ({ year, domain, outcome, ...extra });

test('세운 간지와 운 판단은 규칙에서 센 값과 같다', () => {
  assert.deepEqual([2004, 2006, 2010, 2028, 2036].map(sexagenaryPillar), ['甲申', '丙戌', '庚寅', '戊申', '丙辰']);
  const row = (y) => periods.rows.find((r) => r.year === y);
  assert.deepEqual([2004, 2006, 2007, 2013].map((y) => row(y).tone), ['favorable', 'unfavorable', 'neutral', 'favorable']);
  assert.deepEqual([row(2028).daewun, row(2028).strength, row(2036).daewun, row(2036).strength], ['壬申', 0.5, '辛未', -0.5]);
  assert.equal(periods.natalAnalysisId, natal.analysisId);
  assert.deepEqual(periods.allowedHypotheses, ['reading', 'eokbu']);
});

test('경험 보정은 원국을 바꾸지 않고, 원국을 덮어쓰는 필드가 없다', () => {
  const before = JSON.stringify(natal);
  const c = run([ev(2004, 'career', 'good'), ev(2006, 'career', 'bad'), ev(2013, 'money', 'bad')]);
  assert.equal(JSON.stringify(natal), before);
  assert.deepEqual(analyzeNatalCore(P('甲寅丁丑戊辰己未')), natal);
  for (const key of ['gyeokguk', 'jong', 'special', 'strength', 'climate', 'yongshin', 'usefulGod', 'isJong', 'adoptedHypothesis']) assert.equal(key in c, false, key);
  assert.throws(() => calibrateExperience({ natal: structuredClone(natal), periods, answers: [] }), /frozen/);
  const other = analyzeNatalCore(P('甲寅丁丑戊辰己巳'));
  assert.throws(() => calibrateExperience({ natal: other, periods, answers: [] }), /another natal/);
  assert.ok(c.notes.some((n) => /정확도를 평가하지 않습니다/.test(n)));
  assert.ok(!JSON.stringify(c).includes('검증되었'));
});

test('19. 같은 해 여러 분야 사건은 분야별로 따로 센다', () => {
  const c = run([ev(2006, 'career', 'bad'), ev(2006, 'relationship', 'good'), ev(2006, 'money', 'bad', { month: 9 })]);
  assert.equal(c.counts.used, 3);
  assert.deepEqual(Object.keys(c.byDomain), ['career', 'money', 'relationship']);
  assert.equal(c.byDomain.career.agree, 1);
  assert.equal(c.byDomain.relationship.disagree, 1);
  assert.deepEqual(c.mismatches.map((m) => [m.periodYear, m.domain]), [[2006, 'relationship']]);
});

test('20. 평범·불확실·건너뜀은 나쁨이 되지 않고, 같은 사건은 한 번만 센다', () => {
  const c = run([
    ev(2006, 'career', 'ordinary'), ev(2007, null, 'unsure'), ev(2008, null, 'skip'), ev(2009, 'money', 'mixed'),
    ev(2013, 'career', 'good', { certainty: 'unsure' }),
    ev(2004, 'career', 'good'), ev(2004, 'career', 'good'),
    ev(2004, 'study', 'good', { note: '대학원 준비' }), ev(2005, 'study', 'good', { note: '대학원  준비' }),
  ]);
  const reasons = Object.fromEntries(c.unused.map((u) => [`${u.year}|${u.domain}|${u.outcome}`, u.reason]));
  assert.equal(reasons['2006|career|ordinary'], 'not-a-signal:ordinary');
  assert.equal(reasons['2007|null|unsure'], 'not-a-signal:unsure');
  assert.equal(reasons['2008|null|skip'], 'not-a-signal:skip');
  assert.equal(reasons['2009|money|mixed'], 'mixed-signal');
  assert.equal(reasons['2013|career|good'], 'uncertain-memory');
  assert.deepEqual(c.unused.filter((u) => ['duplicate', 'same-event'].includes(u.reason)).map((u) => [u.year, u.reason]), [[2004, 'duplicate'], [2005, 'same-event']]);
  assert.equal(c.counts.used, 2);
  assert.ok(c.agreements.every((a) => a.outcome === 'good') && c.mismatches.length === 0);
  assert.ok(!c.agreements.concat(c.unused).some((u) => u.outcome === 'bad'));
});

test('입춘·교운 경계에서 날짜가 불확실하면 하나의 운으로 확정하지 않는다', () => {
  const c = run([ev(2010, 'career', 'good', { month: 2 }), ev(2000, 'career', 'good'), ev(2000, 'money', 'good', { month: 6 }),
    ev(2000, 'study', 'good', { month: 3 }), ev(2000, 'relationship', 'good', { month: 9 }), ev(2010, 'money', 'good'), ev(2007, 'business', 'bad', { month: 1 })]);
  const reason = (y, d) => c.unused.find((u) => u.year === y && u.domain === d)?.reason;
  assert.equal(reason(2010, 'career'), 'ipchun-boundary');
  assert.equal(reason(2000, 'career'), 'daewun-boundary');
  assert.equal(reason(2000, 'money'), 'daewun-boundary');
  assert.equal(reason(2000, 'relationship'), 'neutral-period');
  const used = Object.fromEntries(c.agreements.map((a) => [`${a.year}|${a.domain}`, a]));
  assert.equal(used['2000|study'].daewun, '乙亥');
  assert.equal(used['2010|money'].candidates.length, 2);
  assert.equal(used['2007|business'].periodYear, 2006);
});

test('21. 충분한 자료는 축소·상한 안에서 강조만 조정하고 부호를 지킨다. 부족하면 0', () => {
  const agreeAll = [ev(2004, 'career', 'good'), ev(2005, 'career', 'good'), ev(2013, 'career', 'good'), ev(2015, 'career', 'good'), ev(2006, 'career', 'bad'), ev(2009, 'career', 'bad')];
  const c = run(agreeAll);
  assert.equal(c.status, 'applied');
  assert.deepEqual([c.overall.n, c.overall.raw, c.overall.shrink, c.overall.factor], [6, 1, 0.6, 0.09]);
  const [y2028, y2036] = c.adjustments;
  assert.deepEqual(y2028.overall, { before: 0.5, delta: 0.045, after: 0.545 });
  assert.deepEqual(y2036.overall, { before: -0.5, delta: -0.045, after: -0.545 });
  assert.deepEqual(y2028.byDomain.career, y2028.overall);

  const mostlyDisagree = [ev(2004, 'career', 'good'), ev(2005, 'career', 'good'), ev(2013, 'career', 'bad'), ev(2015, 'career', 'bad'), ev(2006, 'career', 'good'), ev(2009, 'career', 'good')];
  const d = run(mostlyDisagree);
  assert.equal(d.overall.factor, -0.03);
  assert.equal(d.mismatches.length, 4);
  assert.ok(d.adjustments.every((a) => Math.sign(a.overall.after) === Math.sign(a.overall.before)));
  assert.ok(Math.abs(d.overall.factor) <= CALIBRATION_POLICY.cap && Math.abs(c.overall.factor) <= CALIBRATION_POLICY.cap);
  assert.deepEqual(adjustScore(30, -0.15), { before: 30, delta: 3, after: 33 });

  const thin = run([ev(2004, 'career', 'good'), ev(2006, 'money', 'good')]);
  assert.equal(thin.status, 'insufficient');
  assert.equal(thin.overall.factor, 0);
  assert.deepEqual(thin.adjustments[0].overall, { before: 0.5, delta: 0, after: 0.5 });
  assert.equal(thin.agreements.length + thin.mismatches.length, 2);
  assert.ok(thin.notes.some((n) => /일치·불일치만 보여 줍니다/.test(n)));
  assert.equal(run([]).status, 'none');
});

test('입력 파서는 엄격하고, 경험이 바뀌어도 원국·기간 키는 그대로다', () => {
  for (const bad of ['x', [{ year: 2004, domain: 'career', outcome: 'no' }], [{ year: 2004, outcome: 'good' }], [{ year: 1800, domain: 'career', outcome: 'good' }],
    [{ year: 2004, domain: 'career', outcome: 'good', month: 13 }], Array.from({ length: 41 }, () => ({ year: 2004, outcome: 'skip' }))]) {
    assert.throws(() => normalizeExperienceAnswers(bad), (e) => e instanceof ExperienceInputError && e.code === 'INVALID_EXPERIENCE');
  }
  assert.deepEqual(normalizeExperienceAnswers([{ year: 2004, domain: 'career', outcome: 'good', note: ' <b>합격</b>\n', extra: 1 }]),
    [{ year: 2004, month: null, domain: 'career', outcome: 'good', intensity: 2, certainty: 'sure', source: 'volunteered', note: 'b 합격 /b' }]);
  const a = run([ev(2004, 'career', 'good'), ev(2006, 'money', 'bad')]);
  const b = run([ev(2006, 'money', 'bad'), ev(2004, 'career', 'good')]);
  const c = run([ev(2004, 'career', 'bad')]);
  assert.equal(a.calibrationKey, b.calibrationKey);
  assert.notEqual(a.calibrationKey, c.calibrationKey);
  assert.equal(a.periodsKey, c.periodsKey);
  assert.equal(a.natalAnalysisId, c.natalAnalysisId);
});
