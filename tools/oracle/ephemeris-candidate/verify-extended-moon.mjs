import assert from 'node:assert/strict';
import fs from 'node:fs';
import './guard-vedic-imports.mjs';
const A = await import('./node_modules/astronomy-engine/esm/astronomy.js');
const { imdOriginLongitude } = await import('./imd-origin.mjs');
const { nakshatraInfo, buildVimshottariDasha } = await import('../../../worker/lib/vedic-derived-calculations.js');
const { buildSukuyoFromMoonLongitude } = await import('../../../worker/lib/sukuyo-coordinate.js');

const data = JSON.parse(fs.readFileSync(new URL('./extended-observations.json', import.meta.url)));
const wrap = x => ((x % 360) + 360) % 360;
const lords = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const years = [7,20,6,10,7,18,16,19,17];
function compare(jd, reference, stats) {
  const date = new Date(Math.round((jd - 2440587.5) * 864e5));
  const moon = wrap(A.Ecliptic(A.GeoVector('Moon', date, true)).elon - imdOriginLongitude(jd));
  const arcminutes = Math.abs(wrap(moon-reference+180)-180)*60;
  const quadrant = Math.floor(wrap(reference)*108/360);
  const mansion = Math.floor(quadrant / 4);
  const {index,pada} = nakshatraInfo(moon);
  const dasha = buildVimshottariDasha(moon,date,date);
  const expectedYears = years[mansion%9] * (1 - (wrap(reference)*27/360 - mansion));
  stats.maxArcmin = Math.max(stats.maxArcmin,arcminutes);
  if (dasha.firstDashaLord === lords[mansion%9]) {
    stats.maxBalanceDays = Math.max(stats.maxBalanceDays, Math.abs(dasha.birthBalanceYears-expectedYears)*365.2425);
  } else stats.wrongLord++;
  if (index !== mansion || pada !== quadrant%4+1) {
    stats.wrongPada++;
    stats.differences.push({instant:date.toISOString(), reference, candidate:moon, expectedPada:quadrant, actualPada:index*4+pada-1});
    const segment = moon%(360/108);
    assert.ok(Math.min(segment,360/108-segment)*60 < 2);
  }
  if (buildSukuyoFromMoonLongitude(moon).index !== (mansion+16)%27) stats.wrongSukuyo++;
  stats.samples++;
}
function stats() { return { samples:0, wrongPada:0, wrongSukuyo:0, wrongLord:0, maxArcmin:0, maxBalanceDays:0, differences:[] }; }
for (const {year,rows,ayanamsaDegrees,sideRows} of data.moon) {
  const hourly = stats(), sides = stats(), boundaries = new Set();
  const sidereal = rows.map(([jd,lon]) => {
    // 05:29 IST (23:59 UTC on the preceding civil date), published every 3 days.
    const pos = (jd-rows[0][0]+1/1440)/3;
    const i = Math.min(Math.floor(pos),9);
    return wrap(lon - ayanamsaDegrees[i] - (pos-i)*(ayanamsaDegrees[i+1]-ayanamsaDegrees[i]));
  });
  // Final sample is just beyond the last published ayanamsa, so skip it.
  for (let i=0;i<rows.length-1;i++) {
    compare(rows[i][0],sidereal[i],hourly);
    if (!i) continue;
    const start=sidereal[i-1], step=wrap(sidereal[i]-start);
    assert.ok(step>0 && step<1);
    const target = (Math.floor(start*108/360)+1)*360/108;
    if (target>start+step) continue;
    boundaries.add(Math.round(target*108/360)%108);
    const center = rows[i-1][0]+(target-start)/step/24;
    for (const minutes of [-2,2]) {
      const [jd,longitude]=sideRows[sides.samples];
      assert.ok(Math.abs(jd-center-minutes/1440)<1e-7);
      const pos=(jd-rows[0][0]+1/1440)/3, j=Math.floor(pos);
      const official=wrap(longitude-ayanamsaDegrees[j]-(pos-j)*(ayanamsaDegrees[j+1]-ayanamsaDegrees[j]));
      assert.equal(Math.floor(official*108/360),Math.floor(wrap(target+step*minutes/60)*108/360));
      compare(jd,official,sides);
    }
  }
  assert.equal(sideRows.length,sides.samples);
  assert.equal(boundaries.size,108);
  assert.equal(sides.wrongPada + sides.wrongSukuyo + sides.wrongLord,0);
  assert.equal(hourly.wrongLord,year===2025 ? 1 : 0);
  assert.equal(hourly.wrongSukuyo,hourly.wrongLord);
  assert.equal(hourly.wrongPada,hourly.wrongLord);
  assert.ok(sides.maxArcmin<2 && hourly.maxArcmin<2);
  assert.ok(sides.maxBalanceDays<1 && hourly.maxBalanceDays<1);
  console.log(JSON.stringify({year,boundaries:boundaries.size,hourly,sides}));
}
