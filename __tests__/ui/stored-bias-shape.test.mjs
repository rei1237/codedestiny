import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { isStoredBiasViewModel, isStoredChemiReport } from '../../lib/records/stored-bias-shape.js';

const root = fileURLToPath(new URL('../../', import.meta.url)).replaceAll('\\', '/').replace(/\/$/, '');
const require = createRequire(`${root}/package.json`);
require(`${root}/scripts/lib/mock-network-guard.cjs`);
const { build } = require('esbuild');
// The real bridge calculates only synthetic, local data. No HTTP, DB or LLM.
const bundled = await build({
  entryPoints: [`${root}/app/saju/destiny-bias/engine/chemiReportBridge.ts`],
  bundle: true, format: 'esm', platform: 'node', write: false,
  absWorkingDir: root, alias: { '@': root },
});
const { buildChemiReport } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const { ROSTER_PARTNERS } = await import('../../lib/idol-chemi/index.js');
const reports = ['1994-08-17', '2010-08-17'].map(birthDate => buildChemiReport({
  user: { birthDate, calendarType: 'solar' }, partner: ROSTER_PARTNERS[0],
  referenceDate: '2026-10-05', themeKey: 'moonlight_neon', themeLabel: 'Fixture',
}));
const report = reports[0];
const clone = () => JSON.parse(JSON.stringify(report));
function mutate(path, replacement, remove = false) {
  const value = clone(), keys = path.split('.'), last = keys.pop();
  const parent = keys.reduce((item, key) => item[key], value);
  if (remove) delete parent[last]; else parent[last] = replacement;
  return value;
}

test('accepts complete real bridge reports in adult and minor modes without changing them', () => {
  assert.equal(reports[0].minorMode, false);
  assert.equal(reports[1].minorMode, true);
  for (const value of reports) {
    const before = JSON.stringify(value);
    assert.equal(isStoredChemiReport(value), true);
    assert.equal(isStoredBiasViewModel(value.vm), true);
    assert.equal(JSON.stringify(value), before);
  }
});
test('legacy reader accepts its original component shape without newer fandom or meme panels', () => {
  const vm = clone().vm;
  delete vm.fandomProfile; delete vm.mzLayer; delete vm.moodKeywords;
  assert.equal(isStoredBiasViewModel(vm), true);
  assert.equal(isStoredChemiReport({ ...report, vm }), false);
});
test('rejects missing roots and the shallow shape that previously selected a crashing reader', () => {
  for (const value of [undefined, null, false, 1, 'report', [], {}]) {
    assert.equal(isStoredBiasViewModel(value), false);
    assert.equal(isStoredChemiReport(value), false);
  }
  assert.equal(isStoredChemiReport({ totalScore: 1, subScores: [], copy: { points: [] }, result: { pillars: { user: {} } }, vm: { detailedTabs: [] } }), false);
});

const requiredPaths = [
  'result.partner', 'result.partner.id', 'result.partner.displayName',
  'copy', 'copy.points', 'copy.points.0.text', 'copy.scenario', 'copy.caution', 'copy.finish', 'copy.notices',
  'result.pillars', 'result.pillars.user.year', 'result.pillars.user.month.ganji',
  'result.pillars.user.day.ganjiHanja', 'result.pillars.partner', 'result.pillars.partner.year',
  'result.pillars.partner.elementCounts', 'result.pillars.user.elementCounts.wood',
  'result.signals', 'result.signals.0.evidenceKo', 'result.matchedSignalKeys',
  'subScores', 'subScores.0.value', 'vm', 'vm.detailedTabs', 'vm.detailedTabs.0.sections',
  'vm.elementDistribution.user', 'vm.elementDistribution.favorite', 'vm.sajuSignals.harmonySignals',
  'vm.moodKeywords', 'vm.fandomProfile', 'vm.fandomProfile.finalPhilosophy',
  'vm.mzLayer', 'vm.mzLayer.relationMbti', 'vm.mzLayer.pastLife', 'vm.mzLayer.hashtags',
  'vm.birthDataStatus', 'vm.emotionalScore', 'gradeTitle', 'minorMode',
];
for (const path of requiredPaths) test(`rejects missing or null required report field ${path}`, () => {
  assert.equal(isStoredChemiReport(mutate(path, undefined, true)), false);
  assert.equal(isStoredChemiReport(mutate(path, null)), false);
});
for (const path of [
  'result.partner.displayName', 'copy.oneLiner', 'copy.points.0.text', 'copy.scenario.text',
  'copy.caution.evidenceKo', 'copy.finish.label', 'copy.notices.0',
  'result.pillars.user.day.ganji', 'result.signals.0.evidenceKo',
  'subScores.0.label', 'vm.detailedTabs.0.sections.0.text',
  'vm.fandomProfile.entryText', 'vm.mzLayer.relationMbti.type', 'vm.mzLayer.pastLife.story',
]) test(`rejects objects in displayed string field ${path}`, () => {
  assert.equal(isStoredChemiReport(mutate(path, { text: 'malformed' })), false);
});
test('rejects null/sparse tabs and nested rows before any expandable panel can render', () => {
  for (const path of ['vm.detailedTabs.0', 'vm.detailedTabs.0.sections.0', 'copy.points.0', 'result.signals.0', 'subScores.0']) {
    const value = mutate(path, null);
    assert.equal(isStoredChemiReport(value), false);
    if (path.startsWith('vm.')) assert.equal(isStoredBiasViewModel(value.vm), false);
  }
  const sparse = clone(); delete sparse.vm.detailedTabs[0];
  assert.equal(isStoredChemiReport(sparse), false);
  assert.equal(isStoredBiasViewModel(sparse.vm), false);
});
test('rejects malformed numeric evidence and preserves valid zero scores', () => {
  for (const value of [NaN, Infinity, '70', {}]) {
    assert.equal(isStoredChemiReport(mutate('totalScore', value)), false);
    assert.equal(isStoredChemiReport(mutate('result.pillars.user.elementCounts.wood', value)), false);
  }
  assert.equal(isStoredChemiReport(mutate('totalScore', 0)), true);
});
