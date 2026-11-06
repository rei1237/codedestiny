// Exercise the actual fortune builders with the reviewed, isolated library at KST noon.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
const serviceFile='../../../scripts/lib/moon-sky.mjs';
const library=new URL('./node_modules/astronomy-engine/esm/astronomy.js',import.meta.url).href;
registerHooks({ resolve(specifier,context,next) {
  if(specifier==='astronomy-engine') return { url:library,shortCircuit:true };
  if(specifier===serviceFile) return next(specifier,context);
  throw Error('UNEXPECTED_SKY_IMPORT:'+specifier);
} });
globalThis.fetch=()=>{throw Error('OFFLINE_ONLY')};
const { sunSignForDate, moonSkyForDate }=await import(serviceFile);
const { bodies }=JSON.parse(fs.readFileSync(new URL('./horizons-earth-ecliptic.json',import.meta.url)));
const signs='aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces'.split(' ');
const mismatches=[];
for (const body of ['Sun','Moon']) {
  assert.equal(bodies[body].daily.length,124);
  for(const [jd,longitude] of bodies[body].daily) {
    const date=new Date(Math.round((jd-2440587.5)*864e5));
    assert.equal(date.toISOString().slice(11,19),'03:00:00');
    const actual=body==='Sun' ? sunSignForDate(date.toISOString().slice(0,10)) :
      moonSkyForDate(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate()).moonSignEn.toLowerCase();
    const expected=signs[Math.floor(longitude/30)];
    if(actual!==expected) mismatches.push({ body, jd, longitude, expected, actual });
  }
}
const result={ cases:248, mismatches };
const file=new URL('./daily-sky-results.json',import.meta.url);
if(process.argv.includes('--record')) fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
else assert.deepEqual(result,JSON.parse(fs.readFileSync(file)));
console.log(JSON.stringify(result));
