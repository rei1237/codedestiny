// CR-003: public official evidence only. Never imports or executes a service engine.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const out = path.join(root, 'docs/engine-audit/results/expansion-20261101');
fs.mkdirSync(path.join(out, 'sources'), { recursive: true });
const sha = s => createHash('sha256').update(s).digest('hex');
async function capture(name, url) {
  const file = path.join(out, 'sources', name + '.json');
  if (fs.existsSync(file)) {
    const c = JSON.parse(fs.readFileSync(file)); assert.equal(c.url, url); assert.equal(c.status, 200); assert.equal(sha(c.body), c.bodySha256); return c;
  }
  const parsed = new URL(url); assert.equal(parsed.protocol, 'https:'); assert.ok(['astro.kasi.re.kr', 'ssd.jpl.nasa.gov'].includes(parsed.hostname));
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(45000) }), body = await response.text();
  assert.equal(response.status, 200, `${name}: HTTP ${response.status}`);
  const record = { url, status: response.status, capturedAt: new Date().toISOString(), bodySha256: sha(body), body };
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' }); return record;
}
function save(name, data) {
  const text = JSON.stringify(data, null, 2) + '\n', file = path.join(out, name);
  if (fs.existsSync(file)) assert.equal(fs.readFileSync(file, 'utf8'), text); else fs.writeFileSync(file, text, { flag: 'wx' });
}
const old = JSON.parse(fs.readFileSync(path.join(root, 'docs/engine-audit/results/implementation-20261101/verified-authorities.json')));
if (process.argv.includes('--terms')) {
  const years = Array.from({length:29}, (_, i) => 2000 + i);
  const wanted = new Set([...years.flatMap(y=>Array.from({length:12},(_,i)=>`${y}:${i*2}`)), '1999:22', '2029:0']);
  const reused = old.terms.filter(t => wanted.has(`${t.year}:${t.index}`));
  const reusedKeys = new Set(reused.map(t=>`${t.year}:${t.index}`));
  const source = fs.readFileSync(path.join(root, 'lib/korean-calendar/table.generated.js'),'utf8');
  const seeds = new Map(JSON.parse(source.match(/export const SOLAR_TERMS = ("[^\n]+")/)[1]).split(';').map(row=>{const [y,t]=row.split(':');return [+y,t.split(',')];}));
  const terms = [...wanted].filter(k=>!reusedKeys.has(k)).map(k=>{const [year,index]=k.split(':').map(Number),cell=seeds.get(year)[index];return {year,index,target:(285+index*15)%360,seedMs:Date.UTC(year,+cell.slice(0,2)-1,+cell.slice(2,4),+cell.slice(4,6)-9,+cell.slice(6,8))};}).sort((a,b)=>a.seedMs-b.seedMs);
  async function positions(label,epochs) {
    const all=[];
    for(let n=0;n<epochs.length;n+=40){
      const batch=epochs.slice(n,n+40);
      const params={format:'json',COMMAND:"'10'",CENTER:"'500@399'",EPHEM_TYPE:"'OBSERVER'",QUANTITIES:"'31'",TIME_TYPE:"'UT'",TLIST_TYPE:"'JD'",CAL_TYPE:"'GREGORIAN'",CAL_FORMAT:"'BOTH'",TIME_DIGITS:"'FRACSEC'",EXTRA_PREC:"'YES'",CSV_FORMAT:"'YES'",TLIST:batch.map(ms=>`'${(ms/86400000+2440587.5).toFixed(10)}'`).join(' ')};
      const raw=await capture(`jpl-${label}-${n/40}`,'https://ssd.jpl.nasa.gov/api/horizons.api?'+new URLSearchParams(params));
      const response=JSON.parse(raw.body);assert.ok(!response.error);assert.match(response.result,/Sun \(10\).*DE441/);assert.match(response.result,/Earth \(399\).*DE441/);assert.match(response.result,/GEOCENTRIC/);assert.match(response.result,/Date_________JDUT.*ObsEcLon/);
      const rows=response.result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map(line=>line.split(',').map(s=>s.trim()));assert.equal(rows.length,batch.length);
      for(const ms of batch){const r=rows.find(r=>Math.abs(+r[1]-(ms/86400000+2440587.5))<1e-8);assert.ok(r);assert.equal(r.length,7);assert.ok(Number.isFinite(+r[4]));all.push(+r[4]);}
      console.log(`JPL ${label} ${Math.min(n+40,epochs.length)}/${epochs.length}`);
    }return all;
  }
  const delta=(lon,target)=>((lon-target+540)%360)-180;
  const coarse=await positions('coarse',terms.flatMap(t=>[t.seedMs-180000,t.seedMs+180000]));
  const estimated=terms.map((t,i)=>{const a=delta(coarse[i*2],t.target),b=delta(coarse[i*2+1],t.target);assert.ok(a<0&&b>0);return Math.round(t.seedMs-180000-a/(b-a)*360000);});
  const fine=await positions('fine',estimated.flatMap(ms=>[ms-20,ms+20]));
  const added=terms.map((t,i)=>{assert.ok(delta(fine[2*i],t.target)<0&&delta(fine[2*i+1],t.target)>0,`FINE_BRACKET_FAILED ${t.year}:${t.index}`);return {year:t.year,index:t.index,utcMs:estimated[i],lowerUtcMs:estimated[i]-20,upperUtcMs:estimated[i]+20,beforeLongitude:fine[2*i],afterLongitude:fine[2*i+1]};});
  const sorted=[...reused,...added].sort((a,b)=>a.utcMs-b.utcMs);assert.equal(sorted.length,350);
  save('terms.json',{termYears:years,terms:sorted,reusedKeys:[...reusedKeys].sort(),priorSourceSha256:sha(fs.readFileSync(path.join(root,'docs/engine-audit/results/implementation-20261101/verified-authorities.json')))});
  console.log(JSON.stringify({years:years.length,terms:sorted.length,added:added.length,reused:reused.length}));
} else if(process.argv.includes('--months')) {
  const keys=new Set(['1899-11','1899-12','1913-01','1999-11','1999-12','2029-01']);
  for(const [first,last] of [[1900,1912],[2000,2028]])for(let y=first;y<=last;y++)for(let m=1;m<=12;m++)keys.add(`${y}-${String(m).padStart(2,'0')}`);
  const dateString=(r,p)=>`${r[p+'_YYYY']}-${r[p+'_MM']}-${r[p+'_DD']}`;
  const months=[];let completed=0;
  const queue=[...keys].sort();
  async function worker(){
    while(queue.length){const key=queue.shift(),[yyyy,mm]=key.split('-');
      const rows=JSON.parse((await capture(`kasi-month-${key}`,'https://astro.kasi.re.kr/life/lunc?'+new URLSearchParams({yyyy,mm,dd:'01'}))).body);assert.ok(rows.length===1||rows.length===2);
      for(const r of rows){assert.equal(dateString(r,'LUNC'),key+'-01');const length=+r.LUNC_EN_DD;assert.ok([29,30].includes(length));
        const startDay=Date.parse(dateString(r,'SOLC'))/86400000;assert.ok(Number.isInteger(startDay));const entry={lunarYear:+yyyy,monthNumber:+mm,isLeap:r.LUNC_LEAP_MM==='윤',startDay,length};
        for(const offset of [length-1,length]){const solar=new Date((startDay+offset)*86400000).toISOString().slice(0,10),[sy,sm,sd]=solar.split('-');
          const end=JSON.parse((await capture(`kasi-solc-${solar}`,'https://astro.kasi.re.kr/life/solc?'+new URLSearchParams({yyyy:sy,mm:sm,dd:sd}))).body);assert.equal(dateString(end,'SOLC'),solar);
          if(offset===length-1){assert.equal(+end.LUNC_DD,length);assert.equal(dateString(end,'LUNC').slice(0,7),key);assert.equal(end.LUNC_LEAP_MM==='윤',entry.isLeap);}else assert.equal(+end.LUNC_DD,1);
        }months.push(entry);
      }
      completed++;if(completed%10===0)console.log(`KASI months ${completed}/${keys.size}`);
    }
  }
  await Promise.all([worker(),worker()]);months.sort((a,b)=>a.startDay-b.startDay);
  for(let i=1;i<months.length;i++){const prev=months[i-1],m=months[i];assert.ok(m.startDay>=prev.startDay+prev.length);if(m.lunarYear-prev.lunarYear<2)assert.equal(m.startDay,prev.startDay+prev.length);}
  for(const m of old.months)assert.deepEqual(months.find(n=>n.lunarYear===m.lunarYear&&n.monthNumber===m.monthNumber&&n.isLeap===m.isLeap),m,'PREVIOUS_OFFICIAL_MONTH_CHANGED');
  save('months.json',{months});console.log(JSON.stringify({months:months.length,leapMonths:months.filter(m=>m.isLeap).length,days:months.reduce((s,m)=>s+m.length,0)}));
}else throw new Error('Specify --terms or --months');
