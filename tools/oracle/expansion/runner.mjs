import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { buildAdapter, evaluateBundle, REPO } from '../service-runner.mjs';
import { blockNetwork } from '../network-guard.mjs';
import { projectSaju, projectZiwei } from '../phase2/projection.mjs';
blockNetwork();process.env.TZ='UTC';
const pins=JSON.parse(fs.readFileSync(path.join(REPO,'tools/oracle/expansion/service-source-pins.json'))),bundles=new Map();
export async function invoke(domain,input,context,execution){
  if(!['saju','ziwei'].includes(domain))throw new Error('SWISS_CONNECTED_SERVICE_PATH');
  if(!bundles.has(domain)){const b=await buildAdapter(domain);assert.deepEqual(b.sources,pins.domains[domain],'APPROVED_SOURCE_CHANGED');
    if(domain==='saju')b.code+='\nconst auditedPublicRun = module.exports.run; module.exports = {run: (input, options) => auditedPublicRun(input, options?.context, options?.execution)};';
    bundles.set(domain,b);}
  const adapterInput=domain==='saju'?{birthDate:input.date,birthTime:input.time??'',gender:input.gender,calendarType:input.calendar,lunarLeap:input.leapMonth}:{birthDate:input.date,birthTime:input.time,hasBirthTime:!input.timeUnknown,calendarType:input.calendar,isLeapMonth:input.leapMonth,gender:input.gender,birthPlace:input.place,targetDate:input.referenceDate,topic:'daily'};
  return evaluateBundle(bundles.get(domain).code,adapterInput,input.referenceDate,domain==='saju'?{context,execution}:{fusionExpert:true,...context});
}
const stems='갑을병정무기경신임계',branches='자축인묘진사오미신유술해';
export function pillarFacts(raw){return Object.fromEntries(Object.entries(raw.pillars).map(([k,p])=>[k,p?'甲乙丙丁戊己庚辛壬癸'[stems.indexOf(p.stem)]+'子丑寅卯辰巳午未申酉戌亥'[branches.indexOf(p.branch)]:null]));}
export async function project(domain,input,context){
  if(input.place.utcOffsetMinutes!=null)return {status:'unsupported',reason:'Public adapter has no UTC offset override'};
  if(domain==='ziwei'&&(input.timeUnknown||input.gender==='unknown'))return {status:'unsupported',reason:'Known birth time and gender required'};
  if(domain==='saju'&&input.place.timezone!=='Asia/Seoul')return {status:'unsupported',reason:'Public adapter does not forward timezone'};
  try{const raw=await invoke(domain,input,context);return domain==='saju'?projectSaju({status:'ok',raw,facts:{pillars:pillarFacts(raw)}}):projectZiwei({status:'ok',facts:{ziwei:raw.expertEvidence}},true);}catch(e){return {status:'error',error:e.message};}
}
