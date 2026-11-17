import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeNatalCore, analyzeSajuTombs, surfaceElementCounts } from '../../lib/saju/natal-core/index.mjs';
import { analyzeTombFrame, TOMB_BRANCH, tombOverall, tombPromptFacts } from '../../lib/saju/natal-core/tomb.mjs';
import { normalizeChart } from '../../lib/saju/natal-core/relations.mjs';
const chart = normalizeChart({ y: { g: '辛', j: '亥' }, m: { g: '乙', j: '巳' }, d: { g: '壬', j: '辰' }, h: { g: '戊', j: '戌' } });
const baseline = analyzeNatalCore(chart);
const roleCore = (useful, avoid) => ({ ...baseline, special: { decision: 'general' }, yongshin: { eokbu: { useful, avoid, applies: true }, conflicts: [] } });
const metal = result => result.events.find(row => row.target.stem === '辛' && row.target.origin === 'stem');

test('ten stems use the existing yin/yang twelve-stage tomb table, not four element storages', () => {
  assert.deepEqual(TOMB_BRANCH, { 甲: '未', 乙: '戌', 丙: '戌', 丁: '丑', 戊: '戌', 己: '丑', 庚: '丑', 辛: '辰', 壬: '辰', 癸: '未' });
  assert.equal(metal(analyzeTombFrame(chart, baseline)).tomb.branch, '辰');
  assert.ok(analyzeTombFrame(chart, baseline).events.some(row => row.target.origin === 'hidden' && row.target.stem === '辛' && row.target.position === 'h'));
});
test('same constrained stem is beneficial as a harmful candidate and adverse as a useful candidate', () => {
  const good = metal(analyzeTombFrame(chart, roleCore([], ['metal'])));
  const bad = metal(analyzeTombFrame(chart, roleCore(['metal'], [])));
  assert.equal(good.status, 'activated'); assert.equal(good.verdict, 'beneficial');
  assert.equal(bad.status, 'activated'); assert.equal(bad.verdict, 'adverse');
  assert.deepEqual(good.evidence, bad.evidence);
});
test('a grave branch alone is a candidate, not an activation or a catastrophe', () => {
  const p = normalizeChart({ ...chart, h: { g: '己', j: '亥' } });
  const e = metal(analyzeTombFrame(p, roleCore([], ['metal'])));
  assert.equal(e.status, 'candidate'); assert.equal(e.verdict, 'undetermined');
});
test('effective outside roots and seasonal support mitigate instead of deleting stems', () => {
  const rooted = normalizeChart({ ...chart, y: { g: '辛', j: '申' } });
  assert.equal(metal(analyzeTombFrame(rooted, roleCore([], ['metal']))).status, 'mitigated');
  const season = normalizeChart({ ...chart, m: { g: '乙', j: '酉' } });
  // 辰酉合 conflicts with the clash: priority is deliberately unresolved.
  assert.equal(metal(analyzeTombFrame(season, roleCore([], ['metal']))).status, 'pending');
});
test('competing stem combination, role conflicts, and unassessed special roles cannot become lucky verdicts', () => {
  const combined = normalizeChart({ ...chart, m: { g: '丙', j: '巳' } });
  assert.equal(metal(analyzeTombFrame(combined, roleCore([], ['metal']))).status, 'pending');
  const core = roleCore([], ['metal']); core.yongshin.conflicts = [{ element: 'metal' }];
  assert.equal(metal(analyzeTombFrame(chart, core)).verdict, 'undetermined');
  core.yongshin = { special: { follow: ['water'] } };
  assert.equal(metal(analyzeTombFrame(chart, core)).role, 'undetermined');
});
test('丑未 inspects only present stem/hidden-stem occurrences at their own tomb', () => {
  const p = { y: { g: '庚', j: '午' }, m: { g: '丁', j: '丑' }, d: { g: '甲', j: '寅' }, h: { g: '己', j: '未' } };
  const result = analyzeSajuTombs(p);
  for (const stem of ['庚', '丁', '己']) assert.ok(result.events.some(row => row.target.stem === stem && row.tomb.branch === '丑'));
  assert.ok(result.events.some(row => row.target.stem === '癸' && row.target.origin === 'hidden' && row.tomb.branch === '未'));
  assert.ok(!result.events.some(row => row.target.stem === '壬'));
});
test('unknown time never fabricates hour targets and differing hour judgments remain pending', () => {
  const p = { ...chart, h: { g: '', j: '' } };
  const result = analyzeSajuTombs(p);
  assert.equal(result.hourKnown, false);
  assert.ok(result.events.every(row => row.target.position !== 'h' && row.tomb.position !== 'h'));
  assert.ok(result.events.some(row => row.hourStable === false && row.status === 'pending'));
});
test('surface totals stay 8/6 and legacy weighting stays 9/7; analysis is immutable and deterministic', () => {
  const before = JSON.stringify(chart), core = analyzeNatalCore(chart);
  const a = analyzeSajuTombs(chart), b = analyzeSajuTombs(chart);
  assert.deepEqual(a, b); assert.equal(JSON.stringify(chart), before); assert.ok(Object.isFrozen(a.events));
  assert.equal(surfaceElementCounts(chart).visibleCharacters, 8); assert.equal(core.counts.total, 9);
  const unknown = { ...chart, h: { g: '', j: '' } };
  assert.equal(surfaceElementCounts(unknown).visibleCharacters, 6); assert.equal(analyzeNatalCore(unknown).counts.total, 7);
  assert.deepEqual(analyzeNatalCore(chart), core);
});
test('period identities remain distinct and no two decades are evaluated together', () => {
  const p = { y: { g: '辛', j: '亥' }, m: { g: '乙', j: '巳' }, d: { g: '壬', j: '子' }, h: { g: '戊', j: '申' } };
  const result = analyzeSajuTombs(p, { luckRows: [{ scope: 'daewoon', stem: '壬', branch: '辰', age: 30 }, { scope: 'daewoon', stem: '戊', branch: '戌', age: 60 }] });
  assert.ok(result.events.every(row => row.triggers.length === 0));
  assert.equal(new Set(result.events.map(row => row.id)).size, result.events.length);
});
test('mixed and incomplete roles never turn into majority-vote fortune scores', () => {
  assert.equal(tombOverall([{ status: 'activated', verdict: 'adverse' }, { status: 'activated', verdict: 'beneficial' }]), 'mixed');
  assert.equal(tombOverall([{ status: 'activated', verdict: 'beneficial' }, { status: 'activated', verdict: 'undetermined' }]), 'undetermined');
});

test('month/day luck does not enter the approved natal/decade/annual tomb scope', () => {
  assert.deepEqual(analyzeSajuTombs(chart, { luckRows: [{ scope: 'month운', stem: '甲', branch: '申' }, { scope: 'day운', stem: '庚', branch: '戌' }] }), analyzeSajuTombs(chart));
});

test('prompt uses actual visible counts even when legacy weights contradict them', async () => {
  const { buildSajuMyeongsikFactSnapshot, buildSajuAdvancedFactors } = await import('../../worker/lib/saju-ai-prompt.js');
  for (const p of [chart, { ...chart, h: { g: '', j: '' } }]) {
    const result = { pillars: p, power: { yongshin: ['metal'], kijishin: ['metal'] } };
    const advancedFactors = buildSajuAdvancedFactors(result);
    const { factSnapshot: snapshot } = buildSajuMyeongsikFactSnapshot({ sajuResult: result, advancedFactors, weights: { wood: 90, fire: 30 } });
    const counts = surfaceElementCounts(p);
    assert.equal(snapshot.elementDistribution.visibleCharacters, counts.visibleCharacters);
    for (const [el, count] of Object.entries(counts.counts)) assert.equal(snapshot.elementDistribution[el], count);
    assert.deepEqual(advancedFactors.tombAnalysis, analyzeSajuTombs(p));
    assert.ok(advancedFactors.earthStorageOpenings.every(row => row.status === 'candidate' && row.isFavorableOverall === null));
    assert.ok(advancedFactors.earthStorageOpenings.flatMap(row => row.openedHiddenStems).every(row => row.activation === 'candidate'));
  }
});

test('saved authority without tomb fields remains readable and is never upgraded on read', async () => {
  const { selectSajuAuthority, readSajuAuthority } = await import('../../worker/lib/saju-authority-consumer.js');
  const { sha256Text } = await import('../../lib/sha256-text.mjs');
  const p = Object.fromEntries(['year', 'month', 'day', 'hour'].map((key, i) => [key, { stem: chart[['y','m','d','h'][i]].g, branch: chart[['y','m','d','h'][i]].j, ganji: chart[['y','m','d','h'][i]].g + chart[['y','m','d','h'][i]].j }]));
  const current = selectSajuAuthority(p, { enabled: true });
  assert.ok(current.analysis.earthStorageAnalysis.tombAnalysis.version);
  const old = JSON.parse(JSON.stringify(current)); delete old.digest; delete old.analysis.earthStorageAnalysis.tombAnalysis; old.analysis.earthStorageAnalysis.status = 'not-evaluated';
  old.digest = sha256Text(JSON.stringify(old));
  const before = JSON.stringify(old);
  assert.deepEqual(readSajuAuthority(old), old);
  assert.deepEqual(selectSajuAuthority(p, { enabled: true, stored: old, hasExistingRecord: true }), old);
  assert.equal(JSON.stringify(old), before);
});

test('an unexposed hidden stem does not invent a heavenly-stem combination', () => {
  const p = normalizeChart({ y:{g:'辛',j:'亥'},m:{g:'壬',j:'寅'},d:{g:'戊',j:'丑'},h:{g:'庚',j:'未'} });
  const hiddenDing = analyzeTombFrame(p, roleCore([], ['fire'])).events.find(row => row.target.origin === 'hidden' && row.target.stem === '丁');
  assert.ok(hiddenDing);
  assert.deepEqual(hiddenDing.evidence.exposed, []);
  assert.equal(hiddenDing.evidence.combinationConflict, false);
});

test('provider table preserves every target and conditional direction without repeating identical judgments', () => {
  for (const core of [roleCore([], ['metal']), roleCore(['metal'], [])]) {
    const raw = analyzeTombFrame(chart, core), compact = tombPromptFacts(raw);
    assert.equal(compact.eventColumns[5], '작용 방향');
    assert.equal(compact.events.reduce((n, row) => n + row.values[0].length, 0), raw.events.length);
    for (const event of raw.events) {
      const target = event.target.label + ' ' + (event.target.origin === 'hidden' ? '지장간 ' : '') + event.target.stem;
      assert.ok(compact.events.some(({period, values}) => period === event.period.label && values[0].includes(target)
        && values[1] === event.tomb.label + ' ' + event.tomb.branch && values[2] === event.status
        && values[3] === event.role && values[4] === event.roleBasis && values[5] === event.verdict));
    }
  }
});
