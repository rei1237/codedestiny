// Offline comparison of apparent tropical coordinates; never import a production provider.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const pkgDir = new URL('./node_modules/astronomy-engine/', import.meta.url);
const metadata = JSON.parse(fs.readFileSync(new URL('package.json', pkgDir)));
const source = fs.readFileSync(new URL('esm/astronomy.js', pkgDir));
const hash = data => createHash('sha256').update(data).digest('hex');
assert.equal(metadata.version, '2.1.19');
assert.equal(metadata.license, 'MIT');
assert.deepEqual(metadata.dependencies || {}, {});
assert.equal(hash(source),'068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7');
assert.ok(source.subarray(0,2000).toString().includes('MIT License'));
globalThis.fetch = () => { throw Error('OFFLINE_ONLY'); };
const A = await import(new URL('esm/astronomy.js', pkgDir));
const raw = fs.readFileSync(new URL('./horizons-earth-ecliptic.json', import.meta.url));
const fixture = JSON.parse(raw);
assert.equal(fixture.center, '500@399');
assert.equal(fixture.quantities, '31');
const bodies = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
assert.deepEqual(Object.keys(fixture.bodies), bodies);
const delta = (a,b) => ((a-b+540)%360)-180;
const round = n => Math.round(n*1e6)/1e6;
const stats = values => {
  const sorted = [...values].sort((a,b)=>a-b);
  return { max: round(sorted.at(-1)), p95: round(sorted[Math.ceil(sorted.length*0.95)-1]) };
};
const result = { library: metadata.name + '@' + metadata.version, fixtureSha256: hash(raw), bodies: {}, totals: {} };
for (const body of bodies) {
  result.bodies[body] = {};
  for (const kind of ['regular','cusp']) {
    const rows = fixture.bodies[body][kind];
    assert.equal(rows.length, kind === 'regular' ? 124 : ['Sun','Moon'].includes(body) ? 60 : 0);
    if (!rows.length) continue;
    const lon=[],lat=[],crossed=[];
    for (const [jd,expectedLon,expectedLat] of rows) {
      const date=new Date(Math.round((jd-2440587.5)*864e5));
      const actual=A.Ecliptic(A.GeoVector(body,date,true));
      assert.ok([actual.elon,actual.elat,expectedLon,expectedLat].every(Number.isFinite));
      lon.push(Math.abs(delta(actual.elon,expectedLon))*60);
      lat.push(Math.abs(actual.elat-expectedLat)*60);
      if (Math.floor(actual.elon/30)!==Math.floor(expectedLon/30)) crossed.push({ date:date.toISOString(),
        expected:expectedLon, actual:round(actual.elon), distanceToCuspArcmin:round(Math.min(expectedLon%30,30-expectedLon%30)*60) });
    }
    result.bodies[body][kind]={ n:rows.length, lonErrorArcmin:stats(lon), latErrorArcmin:stats(lat), signDifferences:crossed };
  }
}
for (const group of ['regular','cusp']) {
  const values = bodies.map(b=>result.bodies[b][group]).filter(Boolean);
  result.totals[group]={ rows:values.reduce((n,v)=>n+v.n,0), maxLongitudeArcmin:Math.max(...values.map(v=>v.lonErrorArcmin.max)),
    mismatchedSigns:values.reduce((n,v)=>n+v.signDifferences.length,0) };
}
const file = new URL('./candidate-results.json', import.meta.url);
if (process.argv.includes('--record')) fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
else assert.deepEqual(result,JSON.parse(fs.readFileSync(file)),fileURLToPath(file));
console.log(JSON.stringify(result.totals));
