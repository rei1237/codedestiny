// Official numerical observations. Explicit refresh only; no application imports.
import fs from 'node:fs';
import assert from 'node:assert/strict';
if (!process.argv.includes('--refresh')) throw Error('Pass --refresh to retrieve government data.');
const observations = { moon: [], sidereal: [] };
// True ayanamsa, Jan 1,4,...31 at 05:29 IST. IAE 2024 p417 and 2025 p415.
// Arcseconds after 24°11' (2024) or 24°12' (2025).
const arcseconds = {
  2024: [27.1,27.3,27.7,28.6,29.5,29.9,30.2,30.8,31.6,32.1,32.3],
  2025: [23.0,23.7,23.9,24.4,25.4,26.1,26.4,26.6,27.2,28.0,28.6],
};
for (const [year, seconds] of Object.entries(arcseconds)) {
  const args = new URLSearchParams({format:'json', COMMAND:"'301'", CENTER:"'500@399'", QUANTITIES:"'31'",
    START_TIME:"'"+year+"-01-01'", STOP_TIME:"'"+year+"-01-31'", STEP_SIZE:"'1 h'", CSV_FORMAT:"'YES'", CAL_FORMAT:"'BOTH'", EXTRA_PREC:"'YES'"});
  const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + args;
  const r = await fetch(url, {signal:AbortSignal.timeout(60000)});
  assert.ok(r.ok);
  const result = (await r.json()).result;
  assert.match(result,/ObsEcLon,\s*ObsEcLat,/);
  const rows = result.split('$$SOE')[1].split('$$EOE')[0].trim().split(/\r?\n/).map(line => {
    const cols = line.split(',');
    return [+cols[1], +cols[4]];
  });
  assert.equal(rows.length,721);
  assert.ok(rows.every(([jd,lon],i) => lon>=0 && lon<360 && Math.abs(jd-(Date.UTC(+year,0,1)/864e5+2440587.5+i/24))<1e-7));
  const ayanamsaDegrees=seconds.map(s=>24+(+year===2024?11:12)/60+s/3600);
  const longitudes=rows.map(([jd,lon])=>{
    const pos=(jd-rows[0][0]+1/1440)/3, i=Math.min(Math.floor(pos),9);
    return (lon-ayanamsaDegrees[i]-(pos-i)*(ayanamsaDegrees[i+1]-ayanamsaDegrees[i])+360)%360;
  });
  const epochs=[];
  for(let i=1;i<rows.length-1;i++){
    const start=longitudes[i-1], step=(longitudes[i]-start+360)%360;
    const target=(Math.floor(start*108/360)+1)*360/108;
    if(target<=start+step){
      const center=rows[i-1][0]+(target-start)/step/24;
      epochs.push(center-2/1440,center+2/1440);
    }
  }
  const sideQueries=[], sideRows=[];
  for(let i=0;i<epochs.length;i+=48){
    const chunk=epochs.slice(i,i+48);
    const query=new URLSearchParams(args);
    for(const key of ['START_TIME','STOP_TIME','STEP_SIZE'])query.delete(key);
    query.set('TLIST',"'"+chunk.map(t=>t.toFixed(9)).join(' ')+"'");
    const sideUrl='https://ssd.jpl.nasa.gov/api/horizons.api?'+query;
    const reply=await fetch(sideUrl,{signal:AbortSignal.timeout(60000)});
    assert.ok(reply.ok);
    const table=(await reply.json()).result;
    assert.match(table,/ObsEcLon,\s*ObsEcLat,/);
    const values=table.split('$$SOE')[1].split('$$EOE')[0].trim().split(/\r?\n/).map(line=>{
      const cols=line.split(','); return [+cols[1],+cols[4]];
    });
    assert.equal(values.length,chunk.length);
    assert.ok(values.every(([jd,lon],j)=>Math.abs(jd-chunk[j])<1e-7 && Number.isFinite(lon)));
    sideQueries.push(sideUrl); sideRows.push(...values);
  }
  observations.moon.push({year:+year,url,iae:'https://packolkata.imd.gov.in/download/IAE'+year+'.zip',
    ayanamsaDegrees,rows,sideQueries,sideRows});
}
for (const date of ['2000-01-01','2024-06-21','2025-12-21']) {
  const url='https://aa.usno.navy.mil/api/siderealtime?'+new URLSearchParams({date,time:'00:00:00',coords:'0,0',reps:'8',intv_mag:'3',intv_unit:'hours'});
  const r=await fetch(url, {signal:AbortSignal.timeout(30000)});
  assert.ok(r.ok);
  const rows=(await r.json()).properties.data;
  assert.equal(rows.length,8);
  observations.sidereal.push({url, rows:rows.map(row=>[date+'T'+row.ut1time+'Z',row.gast])});
}
fs.writeFileSync(new URL('./extended-observations.json',import.meta.url),JSON.stringify(observations)+'\n');
