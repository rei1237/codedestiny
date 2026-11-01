import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {inputAt,reference} from './daeun-reference.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const data=JSON.parse(fs.readFileSync(path.join(root,'docs/engine-audit/results/implementation-20261101/verified-authorities.json')));
const cases=[];
for(const t of data.terms.filter(t=>data.termYears.includes(t.year)))for(const offset of [-60,-2,-1,1,2,60])for(const gender of ['male','female']){
 const input=inputAt(Math.floor(t.utcMs/60000)*60000+offset*60000,gender);cases.push({id:`${t.year}-${t.index}-${offset}-${gender}`,input,expected:reference(input,data)});
}
assert.equal(cases.length,2016);assert.equal(new Set(cases.map(c=>JSON.stringify(c.input))).size,2016);
const supplemental=[];
for(const birthDate of ['2000-01-01','2000-01-31','2000-02-29','2012-02-29','2012-12-31','2023-02-04'])for(const birthTime of [...Array.from({length:24},(_,h)=>`${String(h).padStart(2,'0')}:00`),'00:59','22:59','23:59'])for(const gender of ['male','female']){const input={birthDate,birthTime,gender,calendarType:'solar'};supplemental.push({id:`${birthDate}-${birthTime}-${gender}`,input,expected:reference(input,data)});}
const text=JSON.stringify({basis:'Official JPL brackets plus preserved sect-1 absolute tick specification; public minute-resolution inputs at -60/-2/-1/+1/+2/+60 minute offsets from the containing minute.',cases,supplemental},null,2)+'\n';
const file=path.join(root,'__tests__/fixtures/korean-calendar/daeun-authority-v2-golden.json');if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),text);else fs.writeFileSync(file,text);console.log(`Independent daeun golden: 2016 unique boundary inputs plus ${supplemental.length} clock/month-end inputs`);
