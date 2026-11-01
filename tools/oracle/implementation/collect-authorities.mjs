// Approved CR-001/002 public data collection. No service, Swiss or ephemeris library execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { REPO } from '../service-runner.mjs';

const out = path.join(REPO, 'docs/engine-audit/results/implementation-20261101');
fs.mkdirSync(path.join(out, 'sources'), { recursive: true });
const sha = s => createHash('sha256').update(s).digest('hex');
async function capture(name, url) {
  const file = path.join(out, 'sources', name + '.json');
  if (fs.existsSync(file)) {
    const c = JSON.parse(fs.readFileSync(file)); assert.equal(c.url, url); assert.equal(c.status, 200); assert.equal(sha(c.body), c.bodySha256); return c;
  }
  const parsed = new URL(url); assert.equal(parsed.protocol, 'https:'); assert.ok(['astro.kasi.re.kr', 'ssd.jpl.nasa.gov'].includes(parsed.hostname));
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(45000) }), body = await response.text();
  assert.equal(response.status, 200);
  const record = { url, status: response.status, capturedAt: new Date().toISOString(), bodySha256: sha(body), body };
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' }); return record;
}
const old = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/engine-audit/results/adjudication-20261101/requests.json')));
// Read the frozen minute table as seed data only. No calendar/astronomy engine invocation.
const source = fs.readFileSync(path.join(REPO, 'lib/korean-calendar/table.generated.js'), 'utf8');
const termsText = JSON.parse(source.match(/export const SOLAR_TERMS = ("[^\n]+")/)[1]);
const seeds = new Map(termsText.split(';').map(row => { const [y, text] = row.split(':'); return [+y, text.split(',')]; }));
const keys = new Set(old.years.flatMap(year => [...Array.from({ length: 12 }, (_, i) => `${year}:${i * 2}`), `${year - 1}:22`, `${year + 1}:0`]));
const terms = [...keys].map(key => {
  const [year, index] = key.split(':').map(Number), cell = seeds.get(year)[index];
  return { year, index, target: (285 + index * 15) % 360, seedMs: Date.UTC(year, +cell.slice(0, 2) - 1, +cell.slice(2, 4), +cell.slice(4, 6) - 9, +cell.slice(6, 8)) };
}).sort((a, b) => a.seedMs - b.seedMs);
const delta = (lon, target) => ((lon - target + 540) % 360) - 180;
async function positions(label, epochs) {
  const all = [];
  for (let n = 0; n < epochs.length; n += 40) {
    const batch = epochs.slice(n, n + 40);
    const params = { format: 'json', COMMAND: "'10'", CENTER: "'500@399'", EPHEM_TYPE: "'OBSERVER'", QUANTITIES: "'31'", TIME_TYPE: "'UT'", TLIST_TYPE: "'JD'", CAL_TYPE: "'GREGORIAN'", CAL_FORMAT: "'BOTH'", TIME_DIGITS: "'FRACSEC'", EXTRA_PREC: "'YES'", CSV_FORMAT: "'YES'", TLIST: batch.map(ms => `'${(ms / 86400000 + 2440587.5).toFixed(10)}'`).join(' ') };
    const raw = await capture(`jpl-${label}-${n / 40}`, 'https://ssd.jpl.nasa.gov/api/horizons.api?' + new URLSearchParams(params));
    const response = JSON.parse(raw.body); assert.ok(!response.error); assert.match(response.result, /Sun \(10\).*DE441/); assert.match(response.result, /Earth \(399\).*DE441/); assert.match(response.result, /GEOCENTRIC/); assert.match(response.result, /Date_________JDUT.*ObsEcLon/);
    const rows = response.result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map(line => line.split(',').map(s => s.trim()));
    assert.equal(rows.length, batch.length);
    for (const ms of batch) { const r = rows.find(r => Math.abs(+r[1] - (ms / 86400000 + 2440587.5)) < 1e-8); assert.ok(r); assert.equal(r.length, 7); all.push(+r[4]); }
    console.log(`JPL ${label}: ${Math.min(n + 40, epochs.length)}/${epochs.length}`);
  }
  return all;
}
const coarse = await positions('coarse', terms.flatMap(t => [t.seedMs - 180000, t.seedMs + 180000]));
const estimated = terms.map((t, i) => {
  const before = delta(coarse[i * 2], t.target), after = delta(coarse[i * 2 + 1], t.target);
  assert.ok(before < 0 && after > 0); return Math.round(t.seedMs - 180000 - before / (after - before) * 360000);
});
// A fresh direct JPL evaluation proves a 40 ms bracket; interpolation alone is never authoritative.
const fine = await positions('fine', estimated.flatMap(ms => [ms - 20, ms + 20]));
const verifiedTerms = terms.map((t, i) => {
  const before = delta(fine[i * 2], t.target), after = delta(fine[i * 2 + 1], t.target);
  assert.ok(before < 0 && after > 0, `FINE_BRACKET_FAILED ${t.year}:${t.index}`);
  return { year: t.year, index: t.index, utcMs: estimated[i], lowerUtcMs: estimated[i] - 20, upperUtcMs: estimated[i] + 20, beforeLongitude: fine[i * 2], afterLongitude: fine[i * 2 + 1] };
});

const oldMonths = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/engine-audit/results/adjudication-20261101/moon-epochs.json'))).months;
const monthKeys = new Set();
for (const key of Object.keys(oldMonths)) { const [y, m] = key.split('-').map(Number); for (const d of [-1, 0, 1]) { const date = new Date(Date.UTC(y, m - 1 + d, 1)); monthKeys.add(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`); } }
const dateString = (r, p) => `${r[p + '_YYYY']}-${r[p + '_MM']}-${r[p + '_DD']}`;
const months = [];
for (const key of [...monthKeys].sort()) {
  const [yyyy, mm] = key.split('-');
  const response = await capture(`kasi-month-${key}`, 'https://astro.kasi.re.kr/life/lunc?' + new URLSearchParams({ yyyy, mm, dd: '01' }));
  for (const r of JSON.parse(response.body)) {
    assert.equal(dateString(r, 'LUNC'), key + '-01');
    const length = +r.LUNC_EN_DD; assert.ok([29, 30].includes(length));
    const start = dateString(r, 'SOLC'), startDay = Date.parse(start) / 86400000;
    const entry = { lunarYear: +yyyy, monthNumber: +mm, isLeap: r.LUNC_LEAP_MM === '윤', startDay, length };
    for (const offset of [length - 1, length]) {
      const solar = new Date((startDay + offset) * 86400000).toISOString().slice(0, 10), [sy, sm, sd] = solar.split('-');
      const end = JSON.parse((await capture(`kasi-solc-${solar}`, 'https://astro.kasi.re.kr/life/solc?' + new URLSearchParams({ yyyy: sy, mm: sm, dd: sd }))).body);
      assert.equal(dateString(end, 'SOLC'), solar);
      if (offset === length - 1) { assert.equal(+end.LUNC_DD, length); assert.equal(dateString(end, 'LUNC').slice(0, 7), key); assert.equal(end.LUNC_LEAP_MM === '윤', entry.isLeap); }
      else assert.equal(+end.LUNC_DD, 1);
    }
    months.push(entry);
  }
  console.log(`KASI month ${key}`);
}
months.sort((a, b) => a.startDay - b.startDay);
for (let i = 1; i < months.length; i++) assert.ok(months[i].startDay >= months[i - 1].startDay + months[i - 1].length);
const authority = { version: 'kasi-jpl-authority-20261101', termYears: old.years, termPrecision: 'Direct DE441 apparent-longitude sign brackets, width 40 ms; instants inside a bracket are rejected.', terms: verifiedTerms, months };
fs.writeFileSync(path.join(out, 'verified-authorities.json'), JSON.stringify(authority, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ years: old.years.length, terms: verifiedTerms.length, months: months.length }));
