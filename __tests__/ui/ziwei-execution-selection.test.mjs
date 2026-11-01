import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Before importing the read-only adapter, verify its existing approved engine graph.
const pins = JSON.parse(fs.readFileSync('tools/oracle/expansion/service-source-pins.json'));
for (const [file, hash] of Object.entries(pins.domains.ziwei)) {
  assert.equal(createHash('sha256').update(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex'), hash, file);
}
const { prepareZiweiExecutionChart: prepare, readZiweiExecutionSnapshot: read, DEFAULT_ZIWEI_EXECUTION_OPTIONS: defaults } = await import('../../worker/lib/ziwei-execution-adapter.js');
const { buildZiweiAdapter } = await import('../../worker/lib/guardian-fortune/adapters/ziwei.js');
const birth = { birthDate: '2023-02-04', birthTime: '11:42', calendarType: 'solar', gender: 'male' };
const input = { birthInfo: birth }, year = 2026, version = 'kasi-jpl-expanded-20261101';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

test('default OFF agrees with the previously approved public projection; body flags cannot opt in', async () => {
  assert.deepEqual(defaults, { calendarAuthorityV2: false });
  const chart = prepare(input, { year });
  const projected = await buildZiweiAdapter({ ...birth, hasBirthTime: true, targetDate: '2026-11-01', topic: 'daily' }, { fusionExpert: true });
  for (const key of ['palaces', 'lifePalace', 'bodyPalace', 'bureau', 'majorLuck', 'minorLuck', 'yearlyLuck', 'fourTransformations', 'sanFangSiZheng']) assert.deepEqual(chart[key], projected.expertEvidence[key]);
  assert.deepEqual(prepare({ ...input, authorityFlags: { koreanCalendarAuthorityV2: true }, calendarAuthorityV2: true }, { year }), chart);
});

test('new explicit ON has the approved authority and round-trips unchanged after OFF/year/input changes', async () => {
  const chart = prepare(input, { year, calendarAuthorityV2: true });
  assert.equal(chart.lunar.source, version);
  const projected = await buildZiweiAdapter({ ...birth, hasBirthTime: true, targetDate: '2026-11-01', topic: 'daily' }, { fusionExpert: true, authorityFlags: { koreanCalendarAuthorityV2: true, authorityVersion: version } });
  assert.deepEqual(chart.palaces, projected.expertEvidence.palaces);
  const record = freeze({ status: 'partial', llmMeta: { chartSnapshot: chart, groups: { first: 'unchanged' } }, messages: [{ role: 'assistant', content: 'stored chapter' }] });
  const before = digest(record);
  const resumed = prepare({ birthInfo: { birthDate: 'invalid' } }, { existing: record, year: 2099, calendarAuthorityV2: false });
  assert.deepEqual(resumed, chart); assert.notEqual(resumed, chart);
  resumed.palaces[0].mainStars.push('test mutation');
  assert.equal(digest(record), before);
});

test('old executions without a snapshot remain legacy; missing snapshots with written content are held', () => {
  const old = { status: 'generating', llmMeta: { groups: {} }, messages: [] };
  assert.deepEqual(prepare(input, { existing: old, year, calendarAuthorityV2: true }), prepare(input, { year }));
  for (const record of [
    { status: 'partial' }, { status: 'delivery_pending' }, { status: 'completed' },
    { llmMeta: { groups: { first: {} } } }, { messages: [{ role: 'assistant', content: 'kept' }] },
    { ziweiChart: { palaces: [{}] } }, { llmMeta: { chartSnapshot: {} } },
  ]) assert.throws(() => prepare(input, { existing: freeze(record), year, calendarAuthorityV2: true }), /CALCULATION_SNAPSHOT_REQUIRED/);
  assert.equal(read(null), null);
});

test('ON outside pilot or invalid authority input fails without legacy fallback', () => {
  for (const patch of [
    { birthDate: '1993-07-21' }, { birthDate: '2029-01-01' }, { birthDate: 'bad' },
    { gender: 'unknown' }, { birthTimeUnknown: true }, { birthTime: '' },
    { birthPlace: { latitude: 35, longitude: 140, timezone: 'Asia/Tokyo' } },
    { timezoneOffsetMinutes: 540 }, { timezone: 'America/New_York' }, { longitude: 140 }, { birthPlace: 'Tokyo' },
  ]) assert.throws(() => prepare({ birthInfo: { ...birth, ...patch } }, { year, calendarAuthorityV2: true }), /OUTSIDE_PILOT/);
  assert.throws(() => prepare(input, { year, calendarAuthorityV2: 'true' }), /INVALID_CALCULATION_SELECTION/);
  assert.throws(() => prepare({ ...input, birthPlace: { longitude: 140 } }, { year, calendarAuthorityV2: true }), /OUTSIDE_PILOT/);
  assert.throws(() => prepare({ birthInfo: { ...birth, birthDate: '2023-01-30', calendarType: 'lunar', isLeapMonth: true } }, { year, calendarAuthorityV2: true }));
});
