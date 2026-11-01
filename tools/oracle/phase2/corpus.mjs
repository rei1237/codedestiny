import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { REPO } from '../service-runner.mjs';
import { validateInput } from '../contract.mjs';

export const OUTPUT = path.join(REPO, 'docs/engine-audit/results/phase2-20261101');
export const SEED = 0x20261101;
export function buildCorpus() {
  const rows = [], pad = n => String(n).padStart(2, '0');
  const base = { schemaVersion: 1, calendar: 'solar', leapMonth: false, time: '12:00', timeUnknown: false, gender: 'male', place: { timezone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.978 }, referenceDate: '2026-11-01' };
  const add = (group, tag, fields, anchor) => rows.push({ id: `${group}-${String(rows.length).padStart(6, '0')}`, group, tag, input: validateInput({ ...base, ...fields }), ...(anchor ? { anchor } : {}) });
  const kasi = JSON.parse(fs.readFileSync(path.join(REPO, '__tests__/fixtures/korean-calendar/kasi-samples.json')));
  const terms = JSON.parse(fs.readFileSync(path.join(REPO, '__tests__/fixtures/korean-calendar/kasi-24divisions.json')));
  for (const sample of kasi.samples) {
    add('kasi', 'solar-noon', { date: sample.solar }, { kind: 'kasi-calendar', ...sample });
    add('kasi', 'lunar-noon', { date: `${sample.lunarYear}-${pad(sample.lunarMonth)}-${pad(sample.lunarDay)}`, calendar: 'lunar', leapMonth: sample.isLeapMonth }, { kind: 'kasi-calendar', ...sample });
  }
  // Authored boundary matrix, mechanically expanded. Not 500 independently
  // human-certified answers: anchors retain the original minute precision.
  for (const [year, data] of Object.entries(terms.years)) for (const [index, cell] of data.cells.split(',').entries()) {
    if (index % 2) continue; // jeol, not the intervening junggi
    const stamp = Date.UTC(+year, +cell.slice(0, 2) - 1, +cell.slice(2, 4), +cell.slice(4, 6), +cell.slice(6));
    for (const delta of [-60, -1, 1, 60]) {
      const wall = new Date(stamp + delta * 60000).toISOString();
      add('edge', 'jeol-boundary', { date: wall.slice(0, 10), time: wall.slice(11, 16) }, { kind: 'kasi-term', year: +year, index, name: terms.termNames[index], cell, deltaMinutes: delta });
    }
  }
  const nightDates = ['1899-12-31', '1900-01-01', '1932-10-29', '1954-03-20', '1961-08-09', '1984-02-03', '1987-05-10', '1988-10-09', '1997-02-07', '1997-02-08', '2023-03-22', '2023-04-19', '2050-12-31', '2051-01-01', '2100-12-31', '2101-01-01'];
  const nightTimes = ['00:00', '00:01', '00:31', '00:32', '00:59', '01:00', '01:31', '01:32', '22:59', '23:00', '23:01', '23:31', '23:32', '23:59'];
  for (const date of nightDates) for (const time of nightTimes) add('edge', 'night-zi-range', { date, time });
  // Explicit years required by the audit, plus standard-time transition dates.
  for (const year of [1948, 1949, 1950, 1951, 1954, 1955, 1956, 1957, 1958, 1959, 1960, 1961, 1987, 1988])
    for (const monthDay of ['03-20', '05-10', '07-01', '08-10', '10-09'])
      for (const time of ['00:30', '02:30', '12:00', '23:30']) add('edge', 'historical-clock', { date: `${year}-${monthDay}`, time });
  for (const year of [1900, 1954, 1961, 1997, 2020, 2050]) for (let month = 1; month <= 12; month++)
    for (const day of [29, 30]) add('edge', 'lunar-month-end', { calendar: 'lunar', date: `${year}-${pad(month)}-${day}`, time: '23:35' });
  for (const [year, month] of [[2017, 5], [2020, 4], [2023, 2], [2033, 11]]) for (const day of [1, 15, 16, 29, 30])
    for (const time of ['00:30', '12:00', '23:35']) add('edge', 'leap-month', { calendar: 'lunar', leapMonth: true, date: `${year}-${pad(month)}-${pad(day)}`, time });
  for (const longitude of [120, 126.874, 126.875, 126.876, 126.978, 127.124, 127.125, 127.126, 135]) for (const time of ['00:31', '01:31', '23:31'])
    add('edge', 'longitude-rounding', { date: '1990-06-15', time, place: { ...base.place, longitude } });
  for (const date of ['1900-01-01', '1954-03-21', '1961-08-10', '1997-02-08', '2024-02-04', '2051-01-01'])
    add('edge', 'time-unknown', { date, timeUnknown: true, time: null, gender: 'unknown' });
  let state = SEED;
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
  const first = Date.UTC(1900, 0, 1), days = (Date.UTC(2051, 0, 1) - first) / 86400000;
  for (let n = 0; n < 20000; n++) {
    const solar = new Date(first + Math.floor(random() * days) * 86400000).toISOString().slice(0, 10);
    const lunar = random() < 0.1, unknown = random() < 0.02, gender = random();
    add('random', lunar ? 'uniform-date-lunar-label' : 'uniform-solar-date', {
      date: lunar ? `${solar.slice(0, 8)}${pad(Math.min(+solar.slice(8), 28))}` : solar,
      calendar: lunar ? 'lunar' : 'solar',
      timeUnknown: unknown, time: unknown ? null : `${pad(Math.floor(random() * 24))}:${pad(Math.floor(random() * 60))}`,
      gender: gender < 0.01 ? 'unknown' : gender < 0.505 ? 'male' : 'female',
    });
  }
  return rows;
}
if (process.argv[1]?.endsWith('corpus.mjs')) {
  fs.mkdirSync(OUTPUT, { recursive: true });
  if (fs.existsSync(path.join(OUTPUT, 'inputs.jsonl.gz'))) throw new Error('OUTPUT_EXISTS: preserve the previous corpus');
  const rows = buildCorpus(), body = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
  fs.writeFileSync(path.join(OUTPUT, 'inputs.jsonl.gz'), gzipSync(body));
  const counts = {}; for (const row of rows) counts[row.group] = (counts[row.group] ?? 0) + 1;
  fs.writeFileSync(path.join(OUTPUT, 'corpus.json'), JSON.stringify({ seed: SEED, randomAlgorithm: 'xorshift32', counts, total: rows.length, sha256: createHash('sha256').update(body).digest('hex'), edgeDesign: 'Authored matrix expanded mechanically; not 500 individually hand-certified cases', blocked: ['Swiss service domains', 'Vedic primary oracle', 'nakshatra boundary calculations'] }, null, 2) + '\n');
  console.log(JSON.stringify({ total: rows.length, counts }));
}
