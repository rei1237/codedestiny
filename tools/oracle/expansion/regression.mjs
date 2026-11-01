// Offline public adapters only. Graph is license/Swiss checked and pinned before loading.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createGzip} from 'node:zlib';import {once} from 'node:events';
import {buildAdapter,REPO} from '../service-runner.mjs';import {blockNetwork} from '../network-guard.mjs';import {readRows} from '../phase2/io.mjs';import {validateInput} from '../contract.mjs';import {projectSaju,projectZiwei} from '../phase2/projection.mjs';import {reference,inputAt} from './daeun-reference.mjs';
blockNetwork();process.env.TZ='UTC';
const mode=process.argv[2];assert.ok(['off','daeun'].includes(mode));
const pinsBytes=fs.readFileSync(path.join(REPO,'tools/oracle/expansion/service-source-pins.json')),pins=JSON.parse(pinsBytes);
for(const domain of ['saju','ziwei']){const b=await buildAdapter(domain);assert.deepEqual(b.sources,pins.domains[domain]);}
const {loadTsModule}=await import('../../../scripts/lib/load-ts-module.mjs');const {computeNatalFromInput:run}=loadTsModule('app/saju/animal-destiny/lib/sajuAdapter.ts');const {buildZiweiAdapter}=await import('../../../worker/lib/guardian-fortune/adapters/ziwei.js');
const RealDate=Date;let epoch=Date.parse('2026-11-01T00:00:00Z');globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[epoch]));}static now(){return epoch;}};
const clone=x=>JSON.parse(JSON.stringify(x));const sha=x=>createHash('sha256').update(x).digest('hex');
const out=path.join(REPO,'docs/engine-audit/results/expansion-20261101'),raw=path.join(out,`${mode}-results.jsonl.gz`);assert.ok(!fs.existsSync(raw),'OUTPUT_EXISTS');
const sink=fs.createWriteStream(raw,{flags:'wx'}),gzip=createGzip();gzip.pipe(sink);const write=async row=>{if(!gzip.write(JSON.stringify(row)+'\n'))await once(gzip,'drain');};
const summary={mode,baselineCommit:'d648d9d2453c3ba64a7060175942227e9da9fe39',sourcePinHash:sha(pinsBytes),inputs:0,comparisons:0,differences:[],swissExecuted:false,networkUsed:false};
const pillars=r=>Object.fromEntries(Object.entries(r.pillars).map(([k,p])=>[k,p?'甲乙丙丁戊己庚辛壬癸'['갑을병정무기경신임계'.indexOf(p.stem)]+'子丑寅卯辰巳午未申酉戌亥'['자축인묘진사오미신유술해'.indexOf(p.branch)]:null]));
const sajuInput=i=>({birthDate:i.date,birthTime:i.time??'',gender:i.gender,calendarType:i.calendar,lunarLeap:i.leapMonth});
async function projection(domain,input){
 if(input.place.utcOffsetMinutes!=null)return {status:'unsupported',reason:'Public adapter has no UTC offset override'};
 if(domain==='ziwei'&&(input.timeUnknown||input.gender==='unknown'))return {status:'unsupported',reason:'Known birth time and gender required'};
 if(domain==='saju'&&input.place.timezone!=='Asia/Seoul')return {status:'unsupported',reason:'Public adapter does not forward timezone'};
 try{if(domain==='saju'){const raw=run(sajuInput(input));return clone(projectSaju({status:'ok',raw,facts:{pillars:pillars(raw)}}));}
  const raw=await buildZiweiAdapter({birthDate:input.date,birthTime:input.time,hasBirthTime:!input.timeUnknown,calendarType:input.calendar,isLeapMonth:input.leapMonth,gender:input.gender,birthPlace:input.place,targetDate:input.referenceDate,topic:'daily'},{fusionExpert:true});return clone(projectZiwei({status:'ok',facts:{ziwei:raw.expertEvidence}},true));
 }catch(e){return {status:'error',error:e.message};}
}
function nonDaeun(raw){const r=clone(raw);delete r.daewoonStart;delete r.daewoonStartAge;delete r.daewoonDirection;delete r.calculationEvidence.daewoon;delete r.structuredAdvancedReport.daewoon;for(const report of [r.finalAdvancedReport,r.structuredAdvancedReport.userReport]){for(const section of report.sections)for(const e of section.entries??[])if(['대운 시작 나이','대운 순행/역행'].includes(e.label))e.value='DAEUN_VALUE';report.markdown=report.markdown.replace(/^(- 대운 (?:시작 나이|순행\/역행): ).*?( 근거:)/gm,'$1DAEUN_VALUE$2');}return r;}
if(mode==='off'){
 const inputs=new Map();for await(const r of readRows('inputs.jsonl.gz'))if(r.group==='random')inputs.set(r.id,validateInput(r.input));assert.equal(inputs.size,20000);
 for(let shard=0;shard<4;shard++)for await(const old of readRows(`node-${shard}.jsonl.gz`)){
  const input=inputs.get(old.id);if(!input)continue;epoch=RealDate.parse(input.referenceDate+'T00:00:00Z');
  for(const domain of ['saju','ziwei']){const current=await projection(domain,input);summary.comparisons++;let matched=true;try{assert.deepEqual(current,old[domain]);}catch{matched=false;summary.differences.push({id:old.id,domain,expected:old[domain],actual:current});}await write({id:old.id,domain,status:current.status,matched,resultSha256:sha(JSON.stringify(current))});}
  summary.inputs++;if(summary.inputs%1000===0)console.log(JSON.stringify({mode,inputs:summary.inputs,differences:summary.differences.length}));
 }
 assert.equal(summary.inputs,20000);assert.equal(summary.comparisons,40000);
}else{
 const data=JSON.parse(fs.readFileSync(path.join(REPO,'docs/engine-audit/results/implementation-20261101/verified-authorities.json')));let state=0xc0de0304;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};summary.seed='0xc0de0304';
 for(let i=0;i<20000;i++){const year=data.termYears[Math.floor(random()*data.termYears.length)],start=RealDate.UTC(year,0,1)-32400000,end=RealDate.UTC(year+1,0,1)-32400000;const input=inputAt(start+Math.floor(random()*(end-start)/60000)*60000,i%2?'female':'male');const expected=reference(input,data),ctx={authorityFlags:{sajuTermAuthorityV2:true}};
  const before=run(input,ctx),after=run(input,ctx,{daeunAuthorityV2:true}),s=after.daewoonStart,actual={direction:after.daewoonDirection,start:{years:s.years,months:s.months,days:s.days},startSolar:s.startSolar,age:s.age,baseTermUtcMs:s.baseTerm?.utcMs};let matched=true;
  try{for(const key of Object.keys(actual))assert.deepEqual(actual[key],expected[key]);assert.deepEqual(nonDaeun(after),nonDaeun(before));}catch(e){matched=false;summary.differences.push({id:i,input,expected,actual,error:e.message.slice(0,500)});}
  await write({id:i,input,expected,actual,matched});summary.inputs++;summary.comparisons++;if(summary.inputs%1000===0)console.log(JSON.stringify({mode,inputs:summary.inputs,differences:summary.differences.length}));
 }
}
gzip.end();await once(sink,'finish');summary.rawSha256=sha(fs.readFileSync(raw));fs.writeFileSync(path.join(out,`${mode}-summary.json`),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});assert.equal(summary.differences.length,0);console.log(JSON.stringify({...summary,differences:summary.differences.length}));
