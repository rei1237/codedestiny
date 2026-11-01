import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCorpus } from '../phase2/corpus.mjs';
import { prepareServiceRunner, runService, buildAdapter, verifyServiceSources, evaluateBundle } from '../service-runner.mjs';
import { validateInput, utcInstant } from '../contract.mjs';
import { ziweiDifferences } from '../phase2/io.mjs';

const sample = { schemaVersion: 1, calendar: 'solar', date: '1990-06-15', leapMonth: false, time: '12:30', timeUnknown: false, gender: 'male', place: { timezone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.978 }, referenceDate: '2026-11-01' };
test('historical IANA LMT retains seconds rather than rounding the zone offset', () => {
  const result = utcInstant({ ...sample, date: '1900-01-01', time: '00:59' });
  assert.equal(result.date.toISOString(), '1899-12-31T16:31:08.000Z');
  assert.equal(result.offsetMinutes, 507 + 52 / 60);
  assert.equal(Math.round(sample.place.longitude * 4 - result.offsetMinutes), 0);
});
test('corpus is deterministic, preserves anchors and has the required random sample size', () => {
  const a = buildCorpus(), b = buildCorpus();
  assert.deepEqual(a, b);
  assert.equal(a.filter(row => row.group === 'random').length, 20000);
  assert.ok(a.filter(row => row.group === 'edge').length >= 500);
  assert.equal(a.filter(row => row.group === 'kasi').length, 578);
  assert.equal(new Set(a.map(row => row.id)).size, a.length);
  assert.ok(a.some(row => row.tag === 'historical-clock' && row.input.date.startsWith('1954')));
});
test('prepared service adapter matches fresh execution across different inputs', async () => {
  for (const domain of ['saju', 'ziwei']) {
    const prepared = await prepareServiceRunner(domain);
    for (const input of [sample, { ...sample, date: '1984-11-11', time: '23:35', gender: 'female' }, sample]) {
      assert.deepEqual(await prepared(validateInput(input)), await runService(domain, validateInput(input)));
    }
  }
});
test('extra public symbol cannot select arbitrary internal service functions', async () => {
  await assert.rejects(buildAdapter('saju', undefined, 'calculateLocalResult'), /SERVICE_SYMBOL_BLOCKED/);
  await assert.rejects(prepareServiceRunner('vedic'), /SERVICE_DOMAIN_BLOCKED/);
});
test('twelve-stage public adapter accepts existing pillars without I/O', async () => {
  const bundle = await buildAdapter('saju', undefined, 'resolveAnimalTwelveResult');
  verifyServiceSources('saju', bundle.sources);
  const service = await runService('saju', validateInput(sample));
  const result = await evaluateBundle(bundle.code, { pillars: service.raw.pillars, dayStem: service.raw.dayStem }, sample.referenceDate);
  assert.equal(result.ok, true); assert.equal(result.allStages.length, 4);
});
test('ziwei comparison detects missing fields and retains star positions at index zero', () => {
  const a = { status: 'ok', life: 0, body: 0, bureau: 2, stars: { 자미: 0 }, decades: {}, hua: {} };
  const b = { ...a, stars: {} };
  assert.deepEqual(ziweiDifferences(a, b), [{ field: 'stars.자미', service: 0, oracle: null }]);
});
