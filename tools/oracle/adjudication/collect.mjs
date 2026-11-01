// Explicitly authorized public-source collection. No service/oracle execution.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readRows } from '../phase2/io.mjs';
import { OUT } from './output.mjs';

const sourceDir = path.join(OUT, 'sources');
fs.mkdirSync(sourceDir, { recursive: true });
const cases = new Map(), previous = new Map();
for await (const row of readRows('a-candidates.jsonl.gz')) {
  if (!cases.has(row.id)) cases.set(row.id, { id: row.id, group: row.group, input: row.input, anchor: row.anchor, differences: [] });
  cases.get(row.id).differences.push({ field: row.field, service: row.service, oracle: row.oracle });
}
for await (const row of readRows('adjudication.jsonl.gz')) if (cases.has(row.id)) previous.set(row.id, row);
if (cases.size !== 101) throw new Error('CANDIDATE_SET_CHANGED');

async function capture(name, url) {
  const target = path.join(sourceDir, name + '.json');
  const parsed = new URL(url);
  if (!['astro.kasi.re.kr', 'ssd.jpl.nasa.gov'].includes(parsed.hostname) || parsed.protocol !== 'https:') throw new Error('SOURCE_NOT_ALLOWED');
  if (fs.existsSync(target)) {
    const cached = JSON.parse(fs.readFileSync(target));
    if (cached.url !== String(url) || cached.status !== 200) throw new Error('CAPTURE_CONFLICT');
    return cached;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  const body = await response.text();
  const record = { url: String(url), method: 'GET', status: response.status, capturedAt: new Date().toISOString(), contentType: response.headers.get('content-type'), bodySha256: createHash('sha256').update(body).digest('hex'), body };
  fs.writeFileSync(target, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}: ${name}`);
  return record;
}
const lunarDates = new Set(), solarDates = new Set(), years = new Set();
for (const row of cases.values()) {
  if (row.group === 'A-saju-term-minute-boundary') years.add(row.anchor.year);
  else if (row.group === 'A-saju-residual') lunarDates.add(row.input.date);
  else solarDates.add(previous.get(row.id).clockInput.date);
}
for (const [kind, dates] of [['solc', solarDates], ['lunc', lunarDates]]) {
  let n = 0;
  for (const date of [...dates].sort()) {
    const [yyyy, mm, dd] = date.split('-');
    await capture(`kasi-${kind}-${date}`, `https://astro.kasi.re.kr/life/${kind}?` + new URLSearchParams({ yyyy, mm, dd }));
    if (++n % 10 === 0) console.log(JSON.stringify({ source: `KASI-${kind}`, complete: n, total: dates.size }));
  }
}
for (const year of [...years].sort()) await capture(`kasi-terms-${year}-official`, `https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=${year}`);

const times = [];
for (const row of cases.values()) if (row.group === 'A-saju-term-minute-boundary') {
  const birthMs = Date.parse(`${row.input.date}T${row.input.time}:00+09:00`);
  for (const deltaSeconds of [0, 60]) times.push({ id: row.id, deltaSeconds, utc: new Date(birthMs + deltaSeconds * 1000).toISOString(), jd: (birthMs + deltaSeconds * 1000) / 86400000 + 2440587.5 });
}
times.sort((a, b) => a.jd - b.jd);
const parameters = { format: 'json', COMMAND: "'10'", EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'", QUANTITIES: "'31'", TIME_TYPE: "'UT'", TLIST_TYPE: "'JD'", CAL_TYPE: "'GREGORIAN'", CAL_FORMAT: "'BOTH'", TIME_DIGITS: "'FRACSEC'", EXTRA_PREC: "'YES'", CSV_FORMAT: "'YES'", TLIST: times.map(t => `'${t.jd.toFixed(10)}'`).join(' ') };
const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + new URLSearchParams(parameters);
const response = await capture('jpl-solar-boundaries', url);
const jpl = JSON.parse(response.body);
if (jpl.error || !jpl.result?.includes('$$SOE')) throw new Error(`JPL_RESPONSE: ${jpl.error}`);
fs.writeFileSync(path.join(OUT, 'requests.json'), JSON.stringify({ candidateCount: cases.size, cases: [...cases.values()], solarDates: [...solarDates].sort(), lunarDates: [...lunarDates].sort(), years: [...years].sort(), jplTimes: times, authorization: 'Public KASI and NASA/JPL read-only adjudication; no Swiss/service execution or credentials' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidates: cases.size, kasiSolarQueries: solarDates.size, kasiLunarQueries: lunarDates.size, annualPages: years.size, jplEpochs: times.length, complete: true }));
