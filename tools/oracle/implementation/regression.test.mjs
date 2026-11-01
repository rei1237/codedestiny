import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { invoke, pillarFacts, project } from './runner.mjs';
import { REPO } from '../service-runner.mjs';

const read = p => JSON.parse(fs.readFileSync(path.join(REPO, p)));
const decisions = read('docs/engine-audit/results/adjudication-20261101/decisions-official.json').results;
const calendarFlag = { koreanCalendarAuthorityV2: true }, termFlag = { sajuTermAuthorityV2: true };
const get = (v, field) => field.split('.').reduce((a, k) => a?.[k], v);
const sample = { schemaVersion: 1, date: '1909-09-25', time: '12:00', calendar: 'solar', leapMonth: false, gender: 'female', timeUnknown: false, place: { timezone: 'Asia/Seoul', longitude: 126.978, latitude: 37.5665 }, referenceDate: '2026-11-01' };
test('101 officially confirmed cases resolve all 1109 original A fields through public adapters', async () => {
  let fields = 0;
  const results = [];
  for (const c of decisions) {
    const domain = c.group.startsWith('A-saju') ? 'saju' : 'ziwei';
    const flags = c.defect === 'TERM_INGRESS_PRECISION' ? termFlag : calendarFlag;
    const result = await project(domain, c.input, { authorityFlags: flags });
    assert.equal(result.status, 'ok', c.id + ': ' + JSON.stringify(result));
    for (const f of c.verifiedFields) { assert.deepEqual(get(domain === 'saju' ? result.pillars : result, f.field), f.expected, `${c.id}:${f.field}`); fields++; }
    if (domain === 'saju') assert.match(result.evidence.canonicalNatal.policyVersion, /kasi-jpl-authority-20261101/);
    results.push({ id: c.id, flags, verifiedFields: c.verifiedFields.length });
  }
  assert.equal(fields, 1109);
  fs.writeFileSync(path.join(REPO, 'docs/engine-audit/results/implementation-20261101/regression-101.json'), JSON.stringify({ cases: results.length, verifiedFields: fields, results }, null, 2) + '\n');
});
test('67 official lunar dates convert once, including valid 1903-09-30 and supplied KASI context', async () => {
  const probes = read('docs/engine-audit/results/adjudication-20261101/calendar-probes.json').results;
  for (const p of probes) {
    const raw = await invoke('saju', p.input, { authorityFlags: calendarFlag });
    const [year, month, day] = p.officialSolar.split('-').map(Number);
    assert.deepEqual(raw.calculationEvidence.solarDate, { year, month, day });
    assert.deepEqual(Object.fromEntries(['year', 'month', 'day'].map(k => [k, raw.calculationEvidence.canonicalNatal.civil[k]])), { year, month, day });
  }
  for (const c of decisions.filter(c => c.group === 'A-saju-residual')) {
    const [year, month, day] = c.evidence[0].officialSolar.split('-').map(Number);
    const raw = await invoke('saju', c.input, { authorityFlags: calendarFlag, kasiSolarDate: { year, month, day } });
    assert.equal(pillarFacts(raw).day, c.evidence[0].officialDayPillar);
    assert.equal(raw.calculationEvidence.canonicalNatal.original.originalCalendar.calendarType, 'lunar');
    await assert.rejects(invoke('saju', c.input, { authorityFlags: calendarFlag, kasiSolarDate: { year, month, day: day + 1 } }), /CALENDAR_AUTHORITY_CONFLICT/);
  }
});
test('every day in 24 official months agrees between solar/lunar public saju inputs', async () => {
  const data = read('docs/engine-audit/results/implementation-20261101/verified-authorities.json');
  let days = 0;
  for (const m of data.months) for (let day = 1; day <= m.length; day++) {
    const date = new Date((m.startDay + day - 1) * 86400000).toISOString().slice(0, 10);
    const lunar = `${m.lunarYear}-${String(m.monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const a = await invoke('saju', { ...sample, date }, { authorityFlags: calendarFlag });
    const b = await invoke('saju', { ...sample, date: lunar, calendar: 'lunar', leapMonth: m.isLeap }, { authorityFlags: calendarFlag });
    assert.deepEqual(pillarFacts(a), pillarFacts(b), date); days++;
  }
  assert.ok(days >= 696);
});
test('term boundaries, unknown time and local-clock date rollover retain coherent evidence', async () => {
  for (const c of decisions.filter(c => c.defect === 'TERM_INGRESS_PRECISION')) {
    const raw = await invoke('saju', c.input, { authorityFlags: termFlag });
    assert.equal(raw.solarTermBoundary.active.source, 'jpl-de441');
    assert.ok(raw.solarTermBoundary.active.utcMs <= raw.calculationEvidence.canonicalNatal.instant.timestamp);
    assert.ok(raw.solarTermBoundary.next.utcMs > raw.calculationEvidence.canonicalNatal.instant.timestamp);
    const unknown = await invoke('saju', { ...c.input, time: null, timeUnknown: true }, { authorityFlags: termFlag });
    assert.equal(unknown.pillars.hour, null);
  }
  for (const time of ['00:15', '00:45', '23:00', '23:59']) {
    const a = await project('ziwei', { ...sample, time }, { authorityFlags: calendarFlag });
    const b = await project('ziwei', { ...sample, date: '1909-08-12', calendar: 'lunar', time }, { authorityFlags: calendarFlag });
    assert.deepEqual(a, b, time); assert.equal(a.status, 'ok');
  }
});
test('flags default OFF, reject unverified ranges and wrong-domain switches without Swiss', async () => {
  assert.deepEqual(await invoke('saju', sample), await invoke('saju', sample, { authorityFlags: { sajuTermAuthorityV2: false, koreanCalendarAuthorityV2: false } }));
  for (const flags of [{ sajuTermAuthorityV2: 'true' }, { unknownFlag: true }]) await assert.rejects(invoke('saju', sample, { authorityFlags: flags }), /INVALID_AUTHORITY_FLAGS/);
  await assert.rejects(invoke('saju', sample, { authorityFlags: termFlag }), /TERM_AUTHORITY_OUT_OF_RANGE/);
  await assert.rejects(invoke('saju', { ...sample, date: '2023-02-04' }, { authorityFlags: calendarFlag }), /CALENDAR_AUTHORITY_OUT_OF_RANGE/);
  await assert.rejects(invoke('ziwei', sample, { authorityFlags: termFlag }), /SAJU_TERM_FLAG_NOT_APPLICABLE/);
  for (const domain of ['vedic', 'sukuyo', 'western', 'astrology']) await assert.rejects(invoke(domain, sample), /SWISS_CONNECTED_SERVICE_PATH/);
});
test('immutable functions, prefetch, normalizer and storage/payment files stay unchanged', () => {
  const baseline = 'c21a64c26f9aa9b0a9650f1ef2670a31f711087a';
  const file = 'app/saju/animal-destiny/lib/sajuAdapter.ts';
  const before = execFileSync('git', ['show', `${baseline}:${file}`], { cwd: REPO, encoding: 'utf8' }).replaceAll('\r\n', '\n');
  const after = fs.readFileSync(path.join(REPO, file), 'utf8').replaceAll('\r\n', '\n');
  for (const [start, end] of [['function calculateLocalResult(', '/**'], ['export async function prefetchKasiContext(', '/**']]) {
    const slice = text => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start)));
    assert.equal(slice(after), slice(before));
  }
  const changes = execFileSync('git', ['-c', 'core.fsmonitor=false', 'diff', '--name-only', baseline], { cwd: REPO, encoding: 'utf8' }).trim().split('\n');
  assert.ok(!changes.some(f => /normalizeSaju|portone|inicis|wrangler|package(?:-lock)?\.json|(?:^|\/)(?:auth|payment|migrations|records|storage)\//i.test(f)));
});
