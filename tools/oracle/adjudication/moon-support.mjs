// Astronomical support for historical calendar boundaries, not a historical-law oracle.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { OUT as out } from './output.mjs';

const probes = JSON.parse(fs.readFileSync(path.join(out, 'calendar-probes.json'))).results;
const months = new Map();
for (const p of probes) {
  const start = new Date(Date.parse(p.officialSolar) - (+p.lunar.slice(8) - 1) * 86400000).toISOString().slice(0, 10);
  months.set(p.lunar.slice(0, 7), start);
}
const times = [...months].flatMap(([lunarMonth, start]) => ['14:30', '15:00', '15:30', '16:00'].map(time => ({ lunarMonth, officialFirstSolarDate: start, utc: `${start}T${time}:00Z`, jd: Date.parse(`${start}T${time}:00Z`) / 86400000 + 2440587.5 })));
for (const [lunarMonth, start] of months) {
  const [yyyy, mm] = lunarMonth.split('-');
  const url = 'https://astro.kasi.re.kr/life/lunc?' + new URLSearchParams({ yyyy, mm, dd: '01' });
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) }), text = await response.text();
  const official = JSON.parse(text).find(r => r.LUNC_LEAP_MM === '평');
  if (!response.ok || `${official.SOLC_YYYY}-${official.SOLC_MM}-${official.SOLC_DD}` !== start) throw new Error('OFFICIAL_MONTH_START_MISMATCH');
  fs.writeFileSync(path.join(out, 'sources', `kasi-month-start-${lunarMonth}.json`), JSON.stringify({ url, status: response.status, capturedAt: new Date().toISOString(), bodySha256: createHash('sha256').update(text).digest('hex'), body: text }, null, 2) + '\n', { flag: 'wx' });
}
for (const [body, command] of [['sun', '10'], ['moon', '301']]) {
  const params = { format: 'json', COMMAND: `'${command}'`, EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'", QUANTITIES: "'31'", TIME_TYPE: "'UT'", TLIST_TYPE: "'JD'", CAL_TYPE: "'GREGORIAN'", CAL_FORMAT: "'BOTH'", TIME_DIGITS: "'FRACSEC'", EXTRA_PREC: "'YES'", CSV_FORMAT: "'YES'", TLIST: times.map(t => `'${t.jd.toFixed(10)}'`).join(' ') };
  const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + new URLSearchParams(params);
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) }), text = await response.text();
  const data = JSON.parse(text); if (!response.ok || data.error || !data.result?.includes('$$SOE')) throw new Error('JPL_MOON_SUPPORT_FAILED');
  fs.writeFileSync(path.join(out, 'sources', `jpl-historical-${body}.json`), JSON.stringify({ url, status: response.status, capturedAt: new Date().toISOString(), bodySha256: createHash('sha256').update(text).digest('hex'), body: text }, null, 2) + '\n', { flag: 'wx' });
}
fs.writeFileSync(path.join(out, 'moon-epochs.json'), JSON.stringify({ months: Object.fromEntries(months), times, note: 'Before 1962 JPL UT is UT1. UTC suffixes identify the numeric civil epoch used in the request, not a claim that historical UTC existed. Conjunction is a physical cross-check; KASI remains the authority for historical calendar dates.' }, null, 2) + '\n', { flag: 'wx' });
const parse = body => JSON.parse(JSON.parse(fs.readFileSync(path.join(out, 'sources', `jpl-historical-${body}.json`))).body).result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map(line => {
  const values = line.split(',').map(v => v.trim());
  return { jd: +values[1], longitude: +values[4] };
});
const sun = parse('sun'), moon = parse('moon');
const rows = [...months].map(([lunarMonth, first]) => ({ lunarMonth, officialFirstSolarDate: first, samples: times.filter(t => t.lunarMonth === lunarMonth).map(t => {
  const s = sun.find(p => Math.abs(p.jd - t.jd) < 1e-8), m = moon.find(p => Math.abs(p.jd - t.jd) < 1e-8);
  if (!s || !m) throw new Error('MOON_EPOCH_MISSING');
  return { ...t, elongation: ((m.longitude - s.longitude + 540) % 360) - 180 };
}) }));
fs.writeFileSync(path.join(out, 'moon-support.json'), JSON.stringify({ rows, note: 'Conjunction sign support only; no historical time-zone adoption claim.' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ historicalMonths: months.size, epochsPerBody: times.length, requests: 2 }));
