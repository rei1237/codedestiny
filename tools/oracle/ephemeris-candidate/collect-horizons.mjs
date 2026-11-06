// Refresh only from the JPL service. The verifier consumes committed numbers offline.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

if (!process.argv.includes('--refresh')) throw Error('Pass --refresh to query NASA/JPL.');
const endpoint = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const targets = { Sun:10, Moon:301, Mercury:199, Venus:299, Mars:499, Jupiter:599, Saturn:699, Uranus:799, Neptune:899, Pluto:999 };
const jd = ms => ms / 86400000 + 2440587.5;
const requests = [];
const fixture = { schema: 'horizons-earth-ecliptic-v1', endpoint, center: '500@399', quantities: '31',
  coordinates: 'apparent geocentric Earth ecliptic of date; degrees', requests, bodies: {} };
const regular = [];
for (let year=1900; year<=2050; year+=5) {
  for (const month of [0,3,6,9]) regular.push(jd(Date.UTC(year, month, 1 + (year + month * 7) % 27, month % 2 ? 0 : 12)));
}
async function observations(name, selection, label) {
  const quoted = v => "'" + v + "'";
  const values = { COMMAND: quoted(targets[name]), CENTER: quoted(fixture.center), OBJ_DATA: "'NO'", QUANTITIES: "'31'",
    CSV_FORMAT: "'YES'", EXTRA_PREC: "'YES'", CAL_FORMAT: "'BOTH'", ...selection };
  const url = endpoint + '?' + new URLSearchParams({ format:'json', ...values });
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error('JPL returned HTTP ' + response.status);
  const data = await response.json();
  const text = data.result || '';
  if (!text.includes('$$SOE') || !text.includes('$$EOE') || !/ObsEcLon,\s*ObsEcLat,/.test(text)) throw Error('JPL ' + name + ': ' + (data.error || text.slice(-400)));
  const table = text.split('$$SOE')[1].split('$$EOE')[0].trim();
  const rows = table.split(/\r?\n/).map(line => {
    const fields = line.split(',').map(f => f.trim());
    assert.ok([fields[1], fields[4], fields[5]].every(v => v && Number.isFinite(Number(v))));
    return [Number(fields[1]), Number(fields[4]), Number(fields[5])];
  });
  requests.push({ name, label, url, target: text.match(/Target body name\s*:\s*([^\n]+)/)?.[1]?.trim(),
    rows: rows.length, tableSha256: createHash('sha256').update(table).digest('hex') });
  return rows;
}
async function sampleTimes(name, times, label) {
  const all = [];
  for (let i=0; i<times.length; i+=48) {
    const chunk = times.slice(i,i+48);
    const rows = await observations(name, { TLIST: "'" + chunk.map(n => n.toFixed(9)).join(' ') + "'" }, label);
    assert.equal(rows.length, chunk.length);
    for (let j=0; j<chunk.length; j++) assert.ok(Math.abs(rows[j][0] - chunk[j]) < 1e-7);
    all.push(...rows);
  }
  return all;
}
async function cuspTimes(name) {
  // Select times from JPL's own coarse series, independently of the candidate.
  const coarse = await observations(name, { START_TIME: "'2024-01-01'", STOP_TIME: name === 'Moon' ? "'2024-02-09'" : "'2025-01-02'",
    STEP_SIZE: name === 'Moon' ? "'6 h'" : "'1 d'" }, 'cusp-selection');
  const found = new Set(), times = [];
  for (let i=1; i<coarse.length; i++) {
    const [before, x] = coarse[i-1], [after, y] = coarse[i], sign = Math.floor(y/30);
    if (Math.floor(x/30) === sign || found.has(sign)) continue;
    found.add(sign);
    const center = before + (after-before) * ((sign*30-x+360)%360) / ((y-x+360)%360);
    for (const minutes of [-5,-1,0,1,5]) times.push(center + minutes/1440);
  }
  assert.equal(found.size,12);
  return times.sort((a,b) => a-b);
}
for (const name of Object.keys(targets)) {
  const rows = await sampleTimes(name, regular, 'regular');
  const boundaries = name === 'Sun' || name === 'Moon' ? await sampleTimes(name, await cuspTimes(name), 'cusp') : [];
  const daily = ['Sun','Moon'].includes(name)
    ? await sampleTimes(name, regular.map(day => Math.floor(day - 0.5) + 0.5 + 3/24), 'service-KST-noon') : [];
  fixture.bodies[name] = { target: targets[name], regular: rows, cusp: boundaries, daily };
  console.log(name, rows.length, boundaries.length);
}
fs.writeFileSync(new URL('./horizons-earth-ecliptic.json', import.meta.url), JSON.stringify(fixture)+'\n');
