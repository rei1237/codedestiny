// Probe calendar consistency only via the already reviewed public saju adapter.
import fs from 'node:fs';
import path from 'node:path';
import { prepareServiceRunner } from '../service-runner.mjs';
import { OUT as out } from './output.mjs';
import { blockNetwork } from '../network-guard.mjs';
import { verifyLicenses } from '../verify-licenses.mjs';

process.env.TZ = 'UTC'; verifyLicenses(); blockNetwork();
const request = JSON.parse(fs.readFileSync(path.join(out, 'requests.json')));
const runner = await prepareServiceRunner('saju');
const probes = new Map();
for (const solar of request.solarDates) {
  const file = `kasi-solc-${solar}.json`, source = JSON.parse(fs.readFileSync(path.join(out, 'sources', file))), r = JSON.parse(source.body);
  const date = `${r.LUNC_YYYY}-${r.LUNC_MM}-${r.LUNC_DD}`;
  probes.set(date, { lunar: date, leapMonth: r.LUNC_LEAP_MM === '윤', officialSolar: solar, sourceFile: `sources/${file}`, url: source.url });
}
for (const lunar of request.lunarDates) {
  const file = `kasi-lunc-${lunar}.json`, source = JSON.parse(fs.readFileSync(path.join(out, 'sources', file))), r = JSON.parse(source.body).find(r => r.LUNC_LEAP_MM === '평');
  probes.set(lunar, { lunar, leapMonth: false, officialSolar: `${r.SOLC_YYYY}-${r.SOLC_MM}-${r.SOLC_DD}`, sourceFile: `sources/${file}`, url: source.url });
}
const results = [];
for (const probe of probes.values()) {
  const input = { schemaVersion: 1, calendar: 'lunar', date: probe.lunar, leapMonth: probe.leapMonth, time: '12:00', timeUnknown: false, gender: 'unknown', place: { timezone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.978 }, options: {}, referenceDate: '2026-11-01' };
  try {
    const result = await runner(input), ev = result.raw.calculationEvidence, s = ev.solarDate;
    const serviceSolar = `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
    results.push({ ...probe, input, status: result.status, serviceSolar, differenceDays: (Date.parse(serviceSolar) - Date.parse(probe.officialSolar)) / 86400000, tableFingerprint: ev.canonicalNatal.tableFingerprint, sourceFiles: result.policy.sourceFiles });
  } catch (error) {
    results.push({ ...probe, input, status: 'error', error: error.message });
  }
}
fs.writeFileSync(path.join(out, 'calendar-probes.json'), JSON.stringify({ publicInterface: 'computeNatalFromInput', noPrefetch: true, noTimezoneInjection: true, results }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ probes: results.length, differences: results.reduce((a, r) => (a[r.differenceDays ?? 'error'] = (a[r.differenceDays ?? 'error'] ?? 0) + 1, a), {}), errors: results.filter(r => r.status === 'error').map(r => ({ lunar: r.lunar, officialSolar: r.officialSolar, error: r.error })) }));
