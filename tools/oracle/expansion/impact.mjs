// Measure explicit expanded-version impact on the original random corpus. OFF baseline is frozen.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {buildAdapter,REPO} from '../service-runner.mjs';import {blockNetwork} from '../network-guard.mjs';import {readRows} from '../phase2/io.mjs';import {validateInput} from '../contract.mjs';import {projectSaju,projectZiwei} from '../phase2/projection.mjs';
blockNetwork();process.env.TZ='UTC';const pinsBytes=fs.readFileSync(path.join(REPO,'tools/oracle/expansion/service-source-pins.json')),pins=JSON.parse(pinsBytes);for(const domain of ['saju','ziwei'])assert.deepEqual((await buildAdapter(domain)).sources,pins.domains[domain]);
const {loadTsModule}=await import('../../../scripts/lib/load-ts-module.mjs');const {computeNatalFromInput:run}=loadTsModule('app/saju/animal-destiny/lib/sajuAdapter.ts');const {buildZiweiAdapter}=await import('../../../worker/lib/guardian-fortune/adapters/ziwei.js');
const originalDate=Date;let epoch=Date.parse('2026-11-01T00:00:00Z');globalThis.Date=class extends originalDate{constructor(...args){super(...(args.length?args:[epoch]));}static now(){return epoch;}};
const out=path.join(REPO,'docs/engine-audit/results/expansion-20261101'),data=JSON.parse(fs.readFileSync(path.join(out,'verified-authorities.json'))),inputs=new Map();for await(const r of readRows('inputs.jsonl.gz'))if(r.group==='random')inputs.set(r.id,validateInput(r.input));
const summary={inputs:inputs.size,sourcePinHash:createHash('sha256').update(pinsBytes).digest('hex'),enabled:{saju:0,ziwei:0},changed:{saju:0,ziwei:0},rejected:[],unexpectedErrors:[],fieldChanges:{},changes:[]};
const pillars=r=>Object.fromEntries(Object.entries(r.pillars).map(([k,p])=>[k,p?'甲乙丙丁戊己庚辛壬癸'['갑을병정무기경신임계'.indexOf(p.stem)]+'子丑寅卯辰巳午未申酉戌亥'['자축인묘진사오미신유술해'.indexOf(p.branch)]:null]));
let completed=0;
for(let shard=0;shard<4;shard++)for await(const old of readRows(`node-${shard}.jsonl.gz`)){
 const input=inputs.get(old.id);if(!input)continue;epoch=originalDate.parse(input.referenceDate+'T00:00:00Z');const [y,m,d]=input.date.split('-').map(Number);
 const month=input.calendar==='lunar'?data.months.find(t=>t.lunarYear===y&&t.monthNumber===m&&t.isLeap===input.leapMonth):data.months.find(t=>t.startDay<=Date.parse(input.date)/86400000&&Date.parse(input.date)/86400000<t.startDay+t.length);
 const officialInvalid=input.calendar==='lunar'&&month&&d>month.length;
 const day=input.calendar==='solar'?Date.parse(input.date)/86400000:month?month.startDay+d-1:NaN;const termCandidate=Number.isFinite(day)&&data.termYears.includes(new Date(day*86400000).getUTCFullYear());
 for(const domain of ['saju','ziwei']){if(old[domain].status!=='ok')continue;const flags={sajuTermAuthorityV2:domain==='saju'&&termCandidate,koreanCalendarAuthorityV2:Boolean(month),authorityVersion:data.version};if(!flags.sajuTermAuthorityV2&&!flags.koreanCalendarAuthorityV2)continue;summary.enabled[domain]++;
  try{let facts;if(domain==='saju'){const raw=run({birthDate:input.date,birthTime:input.time??'',gender:input.gender,calendarType:input.calendar,lunarLeap:input.leapMonth},{authorityFlags:flags});facts=projectSaju({status:'ok',raw,facts:{pillars:pillars(raw)}}).pillars;}
   else{const raw=await buildZiweiAdapter({birthDate:input.date,birthTime:input.time,hasBirthTime:!input.timeUnknown,calendarType:input.calendar,isLeapMonth:input.leapMonth,gender:input.gender,birthPlace:input.place,targetDate:input.referenceDate,topic:'daily'},{fusionExpert:true,authorityFlags:flags});facts=projectZiwei({status:'ok',facts:{ziwei:raw.expertEvidence}},true);}
   const before=domain==='saju'?old[domain].pillars:old[domain],fields=Object.keys(facts).filter(k=>JSON.stringify(facts[k])!==JSON.stringify(before[k]));if(fields.length){summary.changed[domain]++;for(const f of fields)summary.fieldChanges[domain+'.'+f]=(summary.fieldChanges[domain+'.'+f]??0)+1;summary.changes.push({id:old.id,domain,input,flags,fields,before,after:facts});}
  }catch(e){const row={id:old.id,domain,error:e.message};if(officialInvalid)summary.rejected.push({...row,classification:'C: input day exceeds official month length'});else summary.unexpectedErrors.push(row);}
 }
 completed++;if(completed%5000===0)console.log(JSON.stringify({inputs:completed,enabled:summary.enabled,errors:summary.unexpectedErrors.length}));
}
summary.changedInputUnion=new Set(summary.changes.map(r=>r.id)).size;fs.writeFileSync(path.join(out,'expanded-impact.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});assert.equal(summary.unexpectedErrors.length,0);console.log(JSON.stringify({...summary,changes:summary.changes.length,rejected:summary.rejected.length,unexpectedErrors:summary.unexpectedErrors.length}));
