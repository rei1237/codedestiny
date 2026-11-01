import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { OUT } from '../adjudication/output.mjs';
import { REPO } from '../service-runner.mjs';
import { readRows } from '../phase2/io.mjs';
import { blockNetwork } from '../network-guard.mjs';

blockNetwork();
const read = file => JSON.parse(fs.readFileSync(path.join(OUT, file)));
const decisions = read('decisions-official.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const date = (r, prefix) => `${r[prefix + '_YYYY']}-${r[prefix + '_MM']}-${r[prefix + '_DD']}`;
function points(file) {
  const raw = JSON.parse(read(`sources/${file}.json`).body);
  assert.equal(raw.signature.source, 'NASA/JPL Horizons API');
  assert.match(raw.result, /DE441/); assert.match(raw.result, /GEOCENTRIC/);
  assert.match(raw.result, /Date_________JDUT.*ObsEcLon/);
  return raw.result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map(line => {
    const cells = line.split(',').map(s => s.trim());
    assert.equal(cells.length, 7);
    return { jd: +cells[1], longitude: +cells[4] };
  });
}
test('all 101 decisions preserve the original 1109 A observations without admitting B fields', async () => {
  const original = new Map();
  for await (const row of readRows('a-candidates.jsonl.gz')) {
    const rows = original.get(row.id) ?? []; rows.push(row); original.set(row.id, rows);
  }
  assert.equal(original.size, 101); assert.equal(decisions.results.length, 101);
  assert.equal(new Set(decisions.results.map(r => r.id)).size, 101);
  let count = 0;
  for (const r of decisions.results) {
    const prior = original.get(r.id); assert.ok(prior);
    assert.deepEqual(r.input, prior[0].input); assert.equal(r.status, 'confirmed');
    assert.equal(r.verifiedFields.length, prior.length);
    for (const field of r.verifiedFields) {
      const old = prior.find(p => p.field === field.field); assert.ok(old);
      assert.deepEqual(field.service, old.service); assert.deepEqual(field.expected, old.oracle);
      assert.notDeepEqual(field.expected, field.service); count++;
    }
  }
  assert.equal(count, 1109);
  assert.deepEqual([...new Set(decisions.results.map(r => r.defect))].sort(), ['HISTORICAL_KOREAN_CALENDAR', 'TERM_INGRESS_PRECISION']);
});
test('23 ingress decisions are supported by raw JPL positions at the actual input and 60 seconds later', () => {
  const rows = points('jpl-solar-boundaries'); assert.equal(rows.length, 46);
  const cases = decisions.results.filter(r => r.defect === 'TERM_INGRESS_PRECISION'); assert.equal(cases.length, 23);
  let live = 0;
  for (const c of cases) {
    const ev = c.evidence[0];
    for (const sample of ev.observations) {
      const expectedMs = Date.parse(`${c.input.date}T${c.input.time}:00+09:00`) + sample.deltaSeconds * 1000;
      assert.equal(Date.parse(sample.utc), expectedMs);
      assert.ok(Math.abs(sample.jd - (expectedMs / 86400000 + 2440587.5)) < 1e-8);
      assert.equal(rows.find(r => Math.abs(r.jd - sample.jd) < 1e-8).longitude, sample.longitude);
    }
    const delta = longitude => ((longitude - ev.target + 540) % 360) - 180;
    assert.ok(delta(ev.observations[0].longitude) < 0); assert.ok(delta(ev.observations[1].longitude) > 0);
    if (c.evidence[1].liveCell) { live++; assert.equal(c.evidence[1].liveCell, c.anchor.cell); }
  }
  assert.equal(live, 8);
});
test('historical calendar decisions use official dates and unchanged ziwei lunar echoes', () => {
  const cases = decisions.results.filter(r => r.defect === 'HISTORICAL_KOREAN_CALENDAR'); assert.equal(cases.length, 78);
  for (const c of cases) {
    const ev = c.evidence[0], body = JSON.parse(read(ev.sourceFile).body);
    const official = Array.isArray(body) ? body.find(r => (r.LUNC_LEAP_MM === '윤') === c.input.leapMonth) : body;
    assert.equal(date(official, 'SOLC'), ev.officialSolar);
    if (ev.officialLunar) {
      assert.equal(date(official, 'LUNC'), ev.officialLunar);
      assert.equal(official.LUNC_LEAP_MM === '윤', ev.leapMonth);
      assert.equal(c.evidence[1].echoMatches, true);
      assert.ok(c.verifiedFields.every(f => f.agreesWithOriginalOracle));
    } else assert.equal(date(official, 'LUNC'), c.input.date);
  }
});
test('public adapter probes corroborate 66 delayed dates, one valid-day rejection and two evidence/pillar divergences', () => {
  const probes = read('calendar-probes.json').results; assert.equal(probes.length, 67);
  assert.equal(probes.filter(r => r.differenceDays === 1).length, 66);
  const errors = probes.filter(r => r.status === 'error'); assert.equal(errors.length, 1);
  assert.equal(errors[0].lunar, '1903-09-30');
  const official = JSON.parse(read(errors[0].sourceFile).body);
  assert.equal(official.LUNC_EN_DD, '30'); assert.equal(date(official, 'LUNC'), errors[0].lunar);
  for (const p of probes.filter(r => r.status !== 'error')) assert.equal(Date.parse(p.serviceSolar) - Date.parse(p.officialSolar), 86400000);
  const controls = read('prefetch-controls.json').results; assert.equal(controls.length, 2);
  for (const c of controls) {
    assert.deepEqual(Object.keys(c.suppliedContext), ['kasiSolarDate']);
    assert.deepEqual(c.evidenceSolarDate, c.suppliedContext.kasiSolarDate);
    assert.equal(c.canonicalCivil.day, c.evidenceSolarDate.day + 1);
  }
});
test('eight historical conjunction brackets agree with raw Sun/Moon epochs and direct official month starts', () => {
  const sun = points('jpl-historical-sun'), moon = points('jpl-historical-moon');
  assert.equal(sun.length, 32); assert.equal(moon.length, 32);
  const rows = read('moon-support.json').rows; assert.equal(rows.length, 8);
  for (const row of rows) {
    const official = JSON.parse(read(`sources/kasi-month-start-${row.lunarMonth}.json`).body).find(r => r.LUNC_LEAP_MM === '평');
    assert.equal(date(official, 'SOLC'), row.officialFirstSolarDate); assert.equal(official.LUNC_DD, '01');
    for (const t of row.samples) {
      const s = sun.find(p => Math.abs(p.jd - t.jd) < 1e-8), m = moon.find(p => Math.abs(p.jd - t.jd) < 1e-8);
      assert.equal(t.elongation, ((m.longitude - s.longitude + 540) % 360) - 180);
    }
    assert.ok(row.samples[1].elongation < 0); assert.ok(row.samples[3].elongation > 0);
  }
});
test('captured evidence and all original Phase 2 artifacts retain their frozen hashes', () => {
  for (const dir of [OUT, path.join(REPO, 'docs/engine-audit/results/phase2-20261101')]) {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));
    for (const e of manifest.files) {
      const bytes = fs.readFileSync(path.join(dir, e.file)); assert.equal(bytes.length, e.bytes); assert.equal(hash(bytes), e.sha256);
      if (e.file.startsWith('sources/') && e.file.endsWith('.json')) {
        const source = JSON.parse(bytes); if (source.bodySha256) assert.equal(hash(source.body), source.bodySha256);
      }
    }
  }
});
test('all 39 approved service source pins are unchanged without importing service modules', () => {
  const pins = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/oracle/service-source-pins.json')));
  let count = 0;
  for (const files of Object.values(pins.domains)) for (const [file, expected] of Object.entries(files)) {
    assert.equal(hash(fs.readFileSync(path.join(REPO, file), 'utf8').replaceAll('\r\n', '\n')), expected); count++;
  }
  assert.equal(count, 39);
});
