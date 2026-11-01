import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { REPO } from '../service-runner.mjs';
const dir = path.join(REPO, 'docs/engine-audit/results/implementation-20261101');
const data = JSON.parse(fs.readFileSync(path.join(dir, 'verified-authorities.json')));
const read = name => JSON.parse(fs.readFileSync(path.join(dir, 'sources', name)));
const points = [];
for (const file of fs.readdirSync(path.join(dir, 'sources'))) {
  const record = read(file);
  assert.equal(createHash('sha256').update(record.body).digest('hex'), record.bodySha256);
  assert.equal(record.status, 200);
  assert.ok(['astro.kasi.re.kr', 'ssd.jpl.nasa.gov'].includes(new URL(record.url).hostname));
  if (file.startsWith('jpl-fine-')) {
    const jpl = JSON.parse(record.body);
    assert.match(jpl.result, /Sun \(10\).*DE441/); assert.match(jpl.result, /Earth \(399\).*DE441/); assert.match(jpl.result, /GEOCENTRIC/); assert.match(jpl.result, /Date_________JDUT.*ObsEcLon/);
    for (const line of jpl.result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n')) { const cells = line.split(',').map(s => s.trim()); assert.equal(cells.length, 7); points.push({ jd: +cells[1], longitude: +cells[4] }); }
  }
}
assert.equal(points.length, data.terms.length * 2);
for (const t of data.terms) {
  const target = (285 + 15 * t.index) % 360;
  const before = points.find(p => Math.abs(p.jd - (t.lowerUtcMs / 86400000 + 2440587.5)) < 1e-8);
  const after = points.find(p => Math.abs(p.jd - (t.upperUtcMs / 86400000 + 2440587.5)) < 1e-8);
  assert.equal(before.longitude, t.beforeLongitude); assert.equal(after.longitude, t.afterLongitude);
  const delta = lon => ((lon - target + 540) % 360) - 180;
  assert.ok(delta(before.longitude) < 0 && delta(after.longitude) > 0);
  assert.equal(t.upperUtcMs - t.lowerUtcMs, 40);
}
for (const m of data.months) {
  const key = `${m.lunarYear}-${String(m.monthNumber).padStart(2, '0')}`;
  const official = JSON.parse(read(`kasi-month-${key}.json`).body).find(r => (r.LUNC_LEAP_MM === '윤') === m.isLeap);
  assert.equal(Date.parse(`${official.SOLC_YYYY}-${official.SOLC_MM}-${official.SOLC_DD}`) / 86400000, m.startDay);
  assert.equal(+official.LUNC_EN_DD, m.length);
  for (const offset of [m.length - 1, m.length]) {
    const solar = new Date((m.startDay + offset) * 86400000).toISOString().slice(0, 10);
    const r = JSON.parse(read(`kasi-solc-${solar}.json`).body);
    assert.equal(+r.LUNC_DD, offset === m.length ? 1 : m.length);
  }
}
console.log(JSON.stringify({ officialNodeBrackets: data.terms.length, historicalMonths: data.months.length, historicalDays: data.months.reduce((n, m) => n + m.length, 0), status: 'verified' }));
