import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

const read = async name => JSON.parse(await readFile(new URL(name, import.meta.url)));
const {bodies} = await read('./horizons-earth-ecliptic.json');
const reference = await read('./sidereal-reference.json');
const {outputFiles} = await build({entryPoints:['worker/lib/verified-natal.js'],bundle:true,platform:'node',format:'esm',write:false});
const {vedicPositions} = await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].contents).toString('base64'));
const distance = (a,b) => Math.abs(((a-b+540)%360)-180);
const maxima = {ayanamsha:0, planet:0, lagna:0};
let checked = 0;
for (const [i, [jd,offset,asc]] of reference.entries()) {
  const date = new Date(Math.round((jd-2440587.5)*864e5));
  const chart = vedicPositions(date,37.5665,126.978);
  maxima.ayanamsha=Math.max(maxima.ayanamsha,distance(chart.ayanamsha.degrees,offset));
  maxima.lagna=Math.max(maxima.lagna,distance(chart.lagna.longitude,asc));
  for (const [name,planet] of Object.entries(chart.planets)) {
    const [instant,lon]=bodies[name].regular[i];
    assert.equal(instant,jd);
    const expected=(lon-offset+360)%360;
    maxima.planet=Math.max(maxima.planet,distance(planet.longitude,expected));
    const quadrant=Math.floor(expected*108/360);
    const segment=expected%(360/108);
    if (Math.min(segment,360/108-segment)>2/60) {
      assert.equal(planet.pada,quadrant%4+1);
      assert.equal(Math.floor(planet.longitude*27/360),Math.floor(quadrant/4));
    }
    checked++;
  }
}
console.log({years:'1900–2050', epochs:reference.length,checked,maxima});
assert.ok(reference.length===124 && checked===868);
assert.ok(maxima.ayanamsha<1/60 && maxima.planet<2/60 && maxima.lagna<0.05);
