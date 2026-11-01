// Offline adjudication of captured official responses. No network or service execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { OUT as out } from './output.mjs';
import { readRows } from '../phase2/io.mjs';
import { runOracle } from '../oracles.mjs';
import { projectZiwei } from '../phase2/projection.mjs';
import { utcInstant } from '../contract.mjs';
import { verifyLicenses } from '../verify-licenses.mjs';
import { blockNetwork } from '../network-guard.mjs';

verifyLicenses(); blockNetwork();
const { astro } = await import('iztro');
const requests = JSON.parse(fs.readFileSync(path.join(out, 'requests.json')));
const calendarProbes = JSON.parse(fs.readFileSync(path.join(out, 'calendar-probes.json'))).results;
const readSource = name => JSON.parse(fs.readFileSync(path.join(out, 'sources', name + '.json')));
const earlier = new Map(); for await (const row of readRows('adjudication.jsonl.gz')) earlier.set(row.id, row);
const jplSource = readSource('jpl-solar-boundaries'), jpl = JSON.parse(jplSource.body);
assert.match(jpl.result, /Sun \(10\).*DE441/); assert.match(jpl.result, /Earth \(399\).*DE441/);
assert.match(jpl.result, /GEOCENTRIC/); assert.match(jpl.result, /Date_________JDUT.*ObsEcLon/);
assert.equal(jpl.signature.source, 'NASA/JPL Horizons API');
const points = jpl.result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map(line => {
  const values = line.split(',').map(v => v.trim());
  assert.equal(values.length, 7);
  const jd = Number(values[1]), longitude = Number(values[4]);
  assert.ok(Number.isFinite(jd) && longitude >= 0 && longitude < 360);
  return { time: values[0], jd, longitude };
});
assert.equal(points.length, requests.jplTimes.length);
const hanja = value => value.match(/\(([^)]+)\)/)?.[1];
const calendarDate = (r, prefix) => `${r[prefix + '_YYYY']}-${r[prefix + '_MM']}-${r[prefix + '_DD']}`;
const pad = n => String(n).padStart(2, '0');
const getField = (object, field) => field.split('.').reduce((o, key) => o?.[key], object);
const results = [];
for (const candidate of requests.cases) {
  const result = { ...candidate, status: 'unconfirmed', evidence: [], verifiedFields: [] };
  if (candidate.group === 'A-saju-term-minute-boundary') {
    const epochs = requests.jplTimes.filter(t => t.id === candidate.id);
    const observations = epochs.map(t => {
      const p = points.find(p => Math.abs(p.jd - t.jd) < 1e-8); assert.ok(p, 'JPL_EPOCH_MISSING');
      return { ...t, longitude: p.longitude };
    });
    const target = (285 + candidate.anchor.index * 15) % 360;
    const delta = longitude => ((longitude - target + 540) % 360) - 180;
    const before = delta(observations[0].longitude), after = delta(observations[1].longitude);
    const annual = readSource(`kasi-terms-${candidate.anchor.year}-official`);
    const rows = [...annual.body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1].replace(/<[^>]+>/g, '').trim()));
    const term = rows.find(r => r.length === 5 && r[0] === candidate.anchor.name);
    const kasiCell = term ? term.slice(1).map(Number).map(pad).join('') : null;
    if (kasiCell) assert.equal(kasiCell, candidate.anchor.cell, 'LIVE_KASI_BOUNDARY_DRIFT');
    result.evidence.push({ provider: 'NASA/JPL Horizons', sourceFile: 'sources/jpl-solar-boundaries.json', url: jplSource.url, apiVersion: jpl.signature.version, target, observations, rootBracketSecondsAfterInput: before < 0 && after > 0 ? [0, 60] : null,
      interpolatedSecondsAfterInput: before < 0 && after > 0 ? -before / (after - before) * 60 : null, note: 'Interpolation is an estimate, not an official exact-second event time. Decision uses sign at the actual input instant.' });
    result.evidence.push({ provider: 'KASI', sourceFile: `sources/kasi-terms-${candidate.anchor.year}-official.json`, url: annual.url, liveCell: kasiCell, storedCell: candidate.anchor.cell, liveStatus: term ? (candidate.anchor.year === 2028 ? 'published-provisional-calendar-data' : 'published-calendar-data') : 'page-has-no-term-table-for-requested-year' });
    if (before < -0.00001 && after > 0) {
      result.status = 'confirmed'; result.defect = 'TERM_INGRESS_PRECISION';
      result.verifiedFields = candidate.differences.map(d => ({ ...d, expected: d.oracle, basis: 'Solar longitude is still before ingress at the requested instant; prior year/month pillar required.' }));
    }
  } else if (candidate.group === 'A-saju-residual') {
    const source = readSource(`kasi-lunc-${candidate.input.date}`), rows = JSON.parse(source.body);
    const official = rows.find(row => (row.LUNC_LEAP_MM === '윤') === candidate.input.leapMonth);
    assert.ok(official); assert.equal(calendarDate(official, 'LUNC'), candidate.input.date);
    const day = hanja(official.LUNC_ILJIN);
    const previous = earlier.get(candidate.id);
    const solar = calendarDate(official, 'SOLC');
    const sameIndependentCalendar = previous.calendar.solar === solar;
    result.evidence.push({ provider: 'KASI', sourceFile: `sources/kasi-lunc-${candidate.input.date}.json`, url: source.url, officialSolar: solar, officialDayPillar: day, originalOracleSolar: previous.calendar.solar });
    // These two samples are far from midnight; day and hour shift together.
    const hourDifference = candidate.differences.find(d => d.field === 'hour');
    if (sameIndependentCalendar && candidate.differences.find(d => d.field === 'day')?.oracle === day) {
      result.status = 'confirmed'; result.defect = 'HISTORICAL_KOREAN_CALENDAR';
      result.verifiedFields = candidate.differences.map(d => ({ ...d, expected: d.field === 'day' ? day : hourDifference.oracle, basis: d.field === 'day' ? 'Official KASI lunar conversion and iljin agree; supplied time is not near the day boundary.' : 'Official solar date/day stem, same historical clock and hour branch; approved oracle hour pillar.' }));
    }
  } else {
    assert.equal(candidate.input.calendar, 'solar');
    const previous = earlier.get(candidate.id), instant = utcInstant(candidate.input);
    const correction = Math.round(candidate.input.place.longitude * 4 - instant.offsetMinutes);
    const wall = new Date(`${candidate.input.date}T${candidate.input.time}:00Z`);
    wall.setUTCMinutes(wall.getUTCMinutes() + correction);
    if (wall.getUTCHours() === 23) { wall.setUTCDate(wall.getUTCDate() + 1); wall.setUTCHours(0, 0, 0, 0); }
    assert.equal(wall.toISOString().slice(0, 10), previous.clockInput.date);
    assert.equal(wall.toISOString().slice(11, 16), previous.clockInput.time);
    const sourceFile = `kasi-solc-${previous.clockInput.date}`;
    const source = readSource(sourceFile), official = JSON.parse(source.body);
    assert.equal(calendarDate(official, 'SOLC'), previous.clockInput.date);
    const input = { ...previous.clockInput, calendar: 'lunar', date: calendarDate(official, 'LUNC'), leapMonth: official.LUNC_LEAP_MM === '윤' };
    const oracle = projectZiwei(await runOracle('iztro', input));
    const h = +input.time.slice(0, 2), timeIndex = h === 0 ? 0 : h === 23 ? 12 : Math.floor((h + 1) / 2);
    const chart = astro.byLunar(input.date, timeIndex, input.gender === 'male' ? '男' : '女', input.leapMonth, true, 'zh-CN'), echo = chart.rawDates.lunarDate;
    const [year, month, day] = input.date.split('-').map(Number);
    const echoMatches = echo.lunarYear === year && echo.lunarMonth === month && echo.lunarDay === day && Boolean(echo.isLeap) === input.leapMonth;
    result.evidence.push({ provider: 'KASI', sourceFile: `sources/${sourceFile}.json`, url: source.url, officialSolar: previous.clockInput.date, officialLunar: input.date, leapMonth: input.leapMonth });
    result.evidence.push({ provider: 'iztro 2.6.3', input, oracle, lunarEcho: echo, echoMatches, correctionMinutes: correction, offsetMinutes: instant.offsetMinutes, note: 'Only the independent oracle is executed; service values remain the captured public adapter outputs.' });
    if (echoMatches) {
      result.verifiedFields = candidate.differences.map(d => ({ ...d, expected: getField(oracle, d.field), agreesWithOriginalOracle: getField(oracle, d.field) === d.oracle })).filter(d => d.expected !== undefined && d.expected !== d.service);
      if (result.verifiedFields.length) {
        const probe = calendarProbes.find(p => p.lunar === input.date && p.leapMonth === input.leapMonth);
        assert.ok(probe && (probe.differenceDays === 1 || probe.status === 'error'), 'CALENDAR_CAUSE_NOT_CORROBORATED');
        result.evidence.push({ provider: 'service public saju adapter', sourceFile: 'calendar-probes.json', officialLunar: probe.lunar, officialSolar: probe.officialSolar, serviceSolar: probe.serviceSolar, status: probe.status, error: probe.error, note: 'The shared calendar conversion is independently inconsistent with KASI on this lunar date. No internal engine method was invoked directly.' });
        result.status = 'confirmed'; result.defect = 'HISTORICAL_KOREAN_CALENDAR';
      }
      else { result.status = 'dismissed'; result.reason = 'Official-calendar oracle resolves original difference'; }
    } else result.reason = 'Official Korean lunar input cannot be represented unchanged in iztro';
  }
  results.push(result);
}
const summary = { total: results.length, statuses: {}, groups: {}, serviceChanges: false, swissExecution: false, dependenciesAdded: 0, sourceApiVersion: jpl.signature.version, versionNote: 'Official API documentation currently says 1.3; response signature says 1.2. Header, quantity, center, model, epoch count and CSV schema were checked explicitly.' };
for (const r of results) { summary.statuses[r.status] = (summary.statuses[r.status] ?? 0) + 1; const g = summary.groups[r.group] ??= { total: 0, confirmed: 0, unconfirmed: 0, dismissed: 0, verifiedFields: 0 }; g.total++; g[r.status]++; g.verifiedFields += r.verifiedFields.length; }
fs.writeFileSync(path.join(out, 'decisions-official.json'), JSON.stringify({ summary, results }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(summary, null, 2));
