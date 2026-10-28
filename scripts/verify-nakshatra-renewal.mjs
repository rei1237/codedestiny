import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const state = { documents: new Map(), proven: true, revoked: false, checks: 0, calculations: 0, moons: [359, 1] };
globalThis.__nakshatraTest = state;
const mock = {
  'db.js': 'export async function connectDb(){}; export const withMongoRetry = async (env,fn)=>fn();',
  'models.js': 'const s=globalThis.__nakshatraTest;const key=f=>JSON.stringify(f); export const ServiceExecutionTransaction={findOne:f=>({lean:async()=>s.documents.get(key(f))}),findOneAndUpdate:(f,u)=>({lean:async()=>{if(!s.documents.has(key(f)))s.documents.set(key(f),u.$setOnInsert);return s.documents.get(key(f));}})};',
  'paid-result-revocation.js': 'export async function isPaidResultRevoked(){return globalThis.__nakshatraTest.revoked;}',
  'nakshatra-paid-access.js': 'export async function verifyPerUsePayment(env,args){globalThis.__nakshatraTest.checks++; if(args.coinPrice!==200 || !args.requireExisting) throw Error("price/proof contract"); return {proven:globalThis.__nakshatraTest.proven};}',
  'swiss-ephemeris.js': 'export async function getSwissVedicPlanets(env,input){return {planets:{Moon:globalThis.__nakshatraTest.moons[input.hour===0?0:1]}};}',
};
const names = ['nakshatra-japanese-calendar','nakshatra-ashtakuta-v2','nakshatra-codex','nakshatra-compat','nakshatra-birth-evidence','nakshatra-compat-delivery','sukuyo-relation-core','vedic-derived-calculations'];
const bundle=await build({stdin:{contents:names.map(x=>'export * from "./worker/lib/'+x+'.js";').join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline-only',setup(b){b.onLoad({filter:/[\\/](db|models|paid-result-revocation|nakshatra-paid-access|swiss-ephemeris)\.js$/},args=>({contents:mock[args.path.split(/[\\/]/).at(-1)],loader:'js'}));}}]});
const mod={exports:{}};new Function('module','exports','require',bundle.outputFiles[0].text)(mod,mod.exports,require);const m=mod.exports;
for(const [date,month,day,leap,han] of [
 ['2020-01-25',1,1,false,'室'],['2020-05-23',4,1,true,'畢'],['1986-10-19',9,16,false,'畢'],['2023-03-22',2,1,true,'奎'],['2033-12-22',11,1,true,'斗']]){
 const s=m.japaneseSukuyoFromDate(new Date(date+'T03:00:00Z'));assert.deepEqual([s.lunarMonth,s.lunarDay,s.isLeapMonth,s.nameHan],[month,day,leap,han],date);
}
assert.equal(m.japaneseLunarFromDate(new Date('2020-01-24T14:59:59Z')).day,30);
assert.equal(m.japaneseLunarFromDate(new Date('2020-01-24T15:00:00Z')).day,1);
for(let month=1;month<=12;month++){
 const seen=new Set();for(let day=1;day<=27;day++){const a=m.japaneseSukuyoFromLunar({month,day,isLeap:false}),b=m.japaneseSukuyoFromLunar({month,day,isLeap:true});seen.add(a.index);assert.equal(a.index,b.index);}
 assert.equal(seen.size,27);assert.equal(m.japaneseSukuyoFromLunar({month,day:28}).index,m.japaneseSukuyoFromLunar({month,day:1}).index);
}
for(let i=0;i<27;i++){
 assert.equal(m.nakshatraInfo(i*360/27).index,i);assert.equal(m.nakshatraInfo((i+1)*360/27-0.00001).index,i);
 const forward=m.relationFromForwardDistance(i),reverse=m.relationFromForwardDistance((27-i)%27);assert.equal(forward.aRole,reverse.bRole);assert.equal(forward.bRole,reverse.aRole);
 for(let j=0;j<27;j++){
 const args={nakIndexA:i,moonLonA:(i+.5)*360/27,nakIndexB:j,moonLonB:(j+.5)*360/27};const a=m.ashtakutaFromMoon(args),b=m.ashtakutaFromMoon({nakIndexA:j,moonLonA:args.moonLonB,nakIndexB:i,moonLonB:args.moonLonA});assert.deepEqual(a.totalRange,b.totalRange);assert.ok(a.total>=0&&a.total<=36);assert.equal(a.items.length,8);
 }
}
assert.equal(m.__ashtakutaTestUtils.vashyaGroup(8,254.999),'Manava');assert.equal(m.__ashtakutaTestUtils.vashyaGroup(8,255),'Chatushpada');assert.equal(m.__ashtakutaTestUtils.vashyaGroup(9,285),'Jalachara');
assert.equal(m.__ashtakutaTestUtils.kutaTara(0,0).score,3);
assert.equal(m.__ashtakutaTestUtils.kutaGrahaMaitri(2,3).score,2);
assert.equal(m.__ashtakutaTestUtils.kutaGrahaMaitri(3,9).score,1);
for (const [index,label] of [[17,'근거리'],[8,'중거리'],[26,'원거리']]) {
 const result=m.assembleNakshatraCompat({moonLon:0,sukuyo:{index:16,nameKo:'묘',nameHan:'昴'}},{moonLon:20,sukuyo:{index,nameKo:'상대',nameHan:''}});
 assert.equal(result.dongyang.relationType,'영친');assert.equal(result.dongyang.distanceLabel,label);
}
const birth={year:2020,month:1,day:25,hour:12,minute:0,timezone:9,lat:37,lon:127,timeUnknown:true};
assert.ok(m.validNakshatraBirth(birth));assert.ok(!m.validNakshatraBirth({...birth,month:2,day:30}));assert.ok(!m.validNakshatraBirth({...birth,hour:24}));assert.ok(!m.validNakshatraBirth({...birth,timezone:15}));
const evidence=await m.buildNakshatraBirthEvidence({},birth,{planets:{Moon:0},ascendantSidereal:100},'http://localhost');assert.equal(evidence.uncertainty.possibleNakshatras.length,2);
const codex=m.assembleNatalCodex({moonLon:0,timeUnknown:true,...evidence});assert.equal(codex.transparency.pada,null);assert.equal(codex.india.dasha,null);assert.equal(codex.natalEvidence.lagna,null);assert.equal(codex.natalEvidence.houses.length,0);assert.equal(codex.natalEvidence.planets[0].navamsaSignKo,null);assert.equal(codex.lifeReading.length,5);assert.equal(codex.unified.crosswalk,null);
const calculate=async()=>{state.calculations++;return Response.json({personA:{name:'A'},personB:{name:'B'},india:{total:25}});};
const auth={userId:'owner'},body={requestId:'nak-test-001',a:{year:1990},b:{year:1991}};
state.proven=false;assert.equal((await m.deliverNakshatraCompat({},auth,body,calculate)).status,402);assert.equal(state.calculations,0);
state.proven=null;assert.equal((await m.deliverNakshatraCompat({},auth,body,calculate)).status,503);
state.proven=true;const responses=await Promise.all([m.deliverNakshatraCompat({},auth,body,calculate),m.deliverNakshatraCompat({},auth,body,calculate)]);assert.ok(responses.every(r=>r.status===200));assert.equal(state.documents.size,1);const result=await responses[0].json();
state.proven=false;const checks=state.checks;assert.equal((await m.deliverNakshatraCompat({},auth,{resumeResultId:result.resultId},calculate)).status,200);assert.equal(state.checks,checks);
assert.equal((await m.deliverNakshatraCompat({},{userId:'other'},{resumeResultId:result.resultId},calculate)).status,404);
assert.equal((await m.deliverNakshatraCompat({},auth,{...body,b:{year:1992}},calculate)).status,409);
state.revoked=true;assert.equal((await m.deliverNakshatraCompat({},auth,{resumeResultId:result.resultId},calculate)).status,403);state.revoked=false;
state.proven=true;const failed={...body,requestId:'nak-test-002'};assert.equal((await m.deliverNakshatraCompat({},auth,failed,async()=>Response.json({error:'unavailable'},{status:503}))).status,503);assert.equal(state.documents.size,1);assert.equal((await m.deliverNakshatraCompat({},auth,failed,calculate)).status,200);
delete globalThis.__nakshatraTest;
console.log('[nakshatra-renewal] PASS calendar fixtures, 27 boundaries, 729 pair reversals, unknown-time limits, price proof, owner, duplicate, recovery, refund and retry mocks');
