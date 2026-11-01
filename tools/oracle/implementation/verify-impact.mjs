// Explain additional changed facts using official sources, without changing implementation scope.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { REPO } from '../service-runner.mjs';
import { readRows } from '../phase2/io.mjs';
import { utcInstant } from '../contract.mjs';
const dir = path.join(REPO, 'docs/engine-audit/results/implementation-20261101');
const impacts = [0, 1, 2, 3].map(n => JSON.parse(fs.readFileSync(path.join(dir, `impact-${n}.json`))));
assert.equal(impacts.reduce((n, r) => n + r.randomInputs, 0), 20000);
assert.ok(impacts.every(r => r.offDifferences.length === 0 && r.enabledErrors.length === 0));
const prior = new Set(JSON.parse(fs.readFileSync(path.join(REPO, 'docs/engine-audit/results/adjudication-20261101/decisions-official.json'))).results.map(r => r.id));
const changes = impacts.flatMap(r => r.changes).filter(r => !prior.has(r.id));
assert.equal(changes.length, 4);
const inputs = new Map(); for await (const r of readRows('inputs.jsonl.gz')) if (changes.some(c => c.id === r.id)) inputs.set(r.id, r.input);
const data = JSON.parse(fs.readFileSync(path.join(dir, 'verified-authorities.json')));
const stems = '甲乙丙丁戊己庚辛壬癸', branches = '子丑寅卯辰巳午未申酉戌亥';
const results = [];
for (const c of changes) {
  assert.equal(c.domain, 'saju'); const input = inputs.get(c.id); let expected, evidence;
  if (input.calendar === 'lunar') {
    const [yyyy, mm, dd] = input.date.split('-');
    const url = 'https://astro.kasi.re.kr/life/lunc?' + new URLSearchParams({ yyyy, mm, dd });
    const file = path.join(dir, 'sources', `kasi-impact-${input.date}.json`);
    let record;
    if (fs.existsSync(file)) { record = JSON.parse(fs.readFileSync(file)); assert.equal(record.url, url); }
    else {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) }); assert.equal(response.status, 200);
      const body = await response.text(); record = { url, status: 200, capturedAt: new Date().toISOString(), bodySha256: createHash('sha256').update(body).digest('hex'), body };
      fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
    }
    const official = JSON.parse(record.body).find(r => (r.LUNC_LEAP_MM === '윤') === input.leapMonth);
    const solar = `${official.SOLC_YYYY}-${official.SOLC_MM}-${official.SOLC_DD}`, day = official.LUNC_ILJIN.match(/\(([^)]+)\)/)[1];
    const instant = utcInstant({ ...input, date: solar, calendar: 'solar', leapMonth: false });
    const wall = new Date(`${solar}T${input.time}:00Z`); wall.setUTCMinutes(wall.getUTCMinutes() + Math.round(input.place.longitude * 4 - instant.offsetMinutes));
    assert.equal(wall.toISOString().slice(0, 10), solar); assert.ok(wall.getUTCHours() < 23);
    const branch = Math.floor((wall.getUTCHours() + 1) / 2) % 12;
    expected = { day, hour: stems[([0, 2, 4, 6, 8][stems.indexOf(day[0]) % 5] + branch) % 10] + branches[branch] };
    evidence = { sourceFile: `sources/kasi-impact-${input.date}.json`, officialSolar: solar, officialIljin: day, corrected: wall.toISOString() };
  } else {
    const timestamp = Date.parse(`${input.date}T${input.time}:00+09:00`);
    const previous = data.terms.findLast(t => t.upperUtcMs <= timestamp), next = data.terms.find(t => t.lowerUtcMs >= timestamp);
    assert.equal(next.year, 2024); assert.equal(next.index, 12); assert.ok(timestamp < next.lowerUtcMs);
    const year = previous.index >= 2 ? previous.year : previous.year - 1, yearStem = (year - 4) % 10, branch = (previous.index / 2 + 1) % 12;
    expected = { month: stems[([2, 4, 6, 8, 0][yearStem % 5] + (branch - 2 + 12) % 12) % 10] + branches[branch] };
    evidence = { sourceFile: 'verified-authorities.json', timestamp, previous, next, basis: 'Direct JPL sign bracket places input before 소서; month remains 午.' };
  }
  assert.deepEqual(Object.keys(expected).sort(), Object.keys(c.before).filter(k => c.before[k] !== c.after[k]).sort());
  for (const [key, value] of Object.entries(expected)) assert.equal(c.after[key], value);
  results.push({ id: c.id, domain: c.domain, input, flags: c.flags, expected, evidence });
}
fs.writeFileSync(path.join(dir, 'additional-impact-adjudication.json'), JSON.stringify({ status: 'confirmed-within-approved-CR-families', cases: results }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(REPO, '__tests__/fixtures/korean-calendar/authority-v2-impact-golden.json'), JSON.stringify({ basis: 'Three current KASI conversions and one directly bracketed JPL 소서; no new defect family or production path.', cases: results.map(({ evidence, ...r }) => r) }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ randomInputs: 20000, offComparisons: 40000, offDifferences: 0, enabled: { saju: impacts.reduce((n, r) => n + r.enabled.saju, 0), ziwei: impacts.reduce((n, r) => n + r.enabled.ziwei, 0) }, changedFacts: { saju: 6, ziwei: 76 }, extraConfirmedWithinSameFamilies: 4 }));
