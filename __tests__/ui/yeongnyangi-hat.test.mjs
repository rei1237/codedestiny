import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {build} from 'esbuild';

const inputPath=resolve('worker/yeongnyangi/fortune/shared/input.ts').replaceAll('\\','/');
const replacements={
 '../fortune':`import {validateInput} from ${JSON.stringify(inputPath)};export const domains=Object.fromEntries(['saju','ziwei','vedic','astrology','sukuyo'].map(id=>[id,{validateInput:x=>validateInput(x,id),calculate:(...args)=>globalThis.__hatMocks.calculate(id,...args)}]));`,
 '../../lib/models.js':'export const ProfileCard={findOne:filter=>({lean:()=>globalThis.__hatMocks.findOne(filter)})};',
 '../../lib/db.js':'export const withMongoRetry=async(env,fn)=>fn();',
 '../repository.js':'export const ownerId=id=>id;',
 '../../lib/human-design-ephemeris.js':'export const calculateHumanDesignChart=(...args)=>globalThis.__hatMocks.hd(...args);',
};
const bundled=await build({entryPoints:['worker/yeongnyangi/hat/service.ts'],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'mock-only',setup(b){b.onResolve({filter:/.*/},args=>args.importer.replaceAll('\\','/').endsWith('/hat/service.ts')&&replacements[args.path]?{path:args.path,namespace:'hat-mock'}:undefined);b.onLoad({filter:/.*/,namespace:'hat-mock'},args=>({contents:replacements[args.path],loader:'ts',resolveDir:process.cwd()}));}}]});
const {calculateHat,prepareHat}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const rulesBundle=await build({entryPoints:['worker/yeongnyangi/hat/rules.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {assignHat,hatEvidence}=await import(`data:text/javascript;base64,${Buffer.from(rulesBundle.outputFiles[0].text).toString('base64')}`);
const ids=['moon-library','star-forge','dawn-tower','gold-vault','wind-gallery','star-greenhouse'];
const profile={birth:{year:1992,month:7,day:12,hour:10,minute:30,calType:'solar'},gender:'F',location:{tz:'Asia/Seoul',lat:37.5,lng:127}};
const facts={saju:{tenGods:{편인:3,식신:1,비견:1}},ziwei:{lifePalace:'명궁',bodyPalace:'복덕궁',palaces:[{name:'명궁',mainStars:['천기']},{name:'복덕궁',mainStars:['천량']}]},vedic:{lagna:{sign:'Virgo'},moon:{sign:'Scorpio'},sun:{sign:'Gemini'}},astrology:{planets:{Sun:{sign:5},Moon:{sign:7}}},sukuyo:{personA:{index:9}}};
const context=(id,f)=>({domain:id,engineVersion:'fixture-v1',facts:Object.entries(f).map(([label,value])=>({id:`${id}.${label}`,label,value})),limitations:[]});
function setup(){const calls=[];globalThis.__hatMocks={calculate:async(id,input,options)=>{calls.push({id,input,options});return context(id,facts[id]);},hd:async()=>({type:'TYPE_PROJECTOR',profile:'1/3'}),findOne:async f=>f.userId==='owner'&&f.profileId==='self'?profile:null};return calls;}
test('all six engines are used, result is deterministic and contains no birth/account fields',async()=>{
 const calls=setup(),a=await calculateHat(profile,{}),b=await calculateHat(profile,{});
 assert.deepEqual(a,b);assert.equal(a.usedCount,6);assert.equal(a.mode,'complete');assert.equal(a.houseId,'moon-library');assert.equal(a.reasons.length,3);
 assert.equal(calls.length,10);assert.ok(calls.every(c=>c.options.asOf==='2026-01-01T00:00:00Z'));
 assert.doesNotMatch(JSON.stringify(a),/1992|birthDate|userId|profileId/);
});
test('missing birth time reads saju only without manufacturing an hour',async()=>{
 const calls=setup(),r=await calculateHat({...profile,birth:{...profile.birth,timeUnknown:true}},{});
 assert.equal(r.mode,'reference');assert.equal(r.usedCount,1);assert.equal(calls.length,1);assert.equal(calls[0].input.personA.birthTime,undefined);assert.equal(r.systems.filter(s=>s.status==='omitted').length,5);
});
test('missing place never silently becomes Seoul; unsupported foreign ziwei is explicit',async()=>{
 setup();await assert.rejects(()=>calculateHat({...profile,location:undefined},{}),/HAT_BIRTH_REQUIRED/);
 const r=await calculateHat({...profile,location:{tz:'Europe/London',lat:51.5,lng:0}},{});
 assert.equal(r.usedCount,5);assert.equal(r.systems.find(s=>s.id==='ziwei').status,'omitted');
});
test('lunar birthday is normalized before reaching each calculator',async()=>{
 const calls=setup();await calculateHat({...profile,birth:{...profile.birth,calType:'lunar'}},{});
 assert.ok(calls.every(c=>c.input.personA.calendarType==='solar'));assert.ok(calls.every(c=>c.input.personA.birthDate!=='1992-07-12'));
});
test('each house is reachable, each system gets equal weight, ties use stable order',()=>{
 const s=(id,houseId,weight=1)=>({id,status:'used',evidence:[{source:id,label:'fixture',meaning:'fixture',houseId,weight}]});
 for(const id of ids)assert.equal(assignHat([s('saju',id)]).houseId,id);
 for(const [i,god] of ['편인','식신','비견','정재','겁재','정인'].entries()){
  assert.equal(assignHat([{id:'saju',status:'used',evidence:hatEvidence('saju',{tenGods:{[god]:4}})}]).houseId,ids[i]);
 }
 assert.equal(assignHat([s('saju','moon-library',100),s('astrology','star-forge'),s('vedic','star-forge')]).houseId,'star-forge');
 assert.equal(assignHat([s('saju','star-forge'),s('vedic','moon-library')]).houseId,'moon-library');
});
test('all 27 mansions and 12 signs have evidence; unsupported data does not invent evidence',()=>{
 for(let i=0;i<27;i++)assert.equal(hatEvidence('sukuyo',{personA:{index:i}}).length,1);
 for(let i=0;i<12;i++)assert.equal(hatEvidence('astrology',{planets:{Sun:{sign:i}}}).length,1);
 assert.deepEqual(hatEvidence('human-design',{type:'invented',profile:'unknown'}),[]);
 assert.equal(hatEvidence('sukuyo',{personA:{index:0}})[0].houseId,'dawn-tower');
 assert.equal(hatEvidence('ziwei',{lifePalace:'명궁',palaces:[{name:'명궁',mainStars:[]}],sanFangSiZheng:{byPalace:{명궁:{mainStars:['천기']}}}})[0].houseId,'moon-library');
});
test('engine failure does not become partial success; malformed date stays an input error',async()=>{
 setup();globalThis.__hatMocks.calculate=async()=>{throw new Error('Swiss unavailable');};
 await assert.rejects(()=>calculateHat(profile,{}),/HAT_CALCULATION_UNAVAILABLE/);
 setup();await assert.rejects(()=>calculateHat({...profile,birth:{...profile.birth,month:13}},{}),/INVALID_BIRTH_DATE/);
});
test('profile ownership and duplicate requests are enforced; lock releases after failure',async()=>{
 setup();await assert.rejects(()=>prepareHat({},'other',{profileId:'self'}),/PROFILE_NOT_FOUND/);
 let release;globalThis.__hatMocks.findOne=()=>new Promise(r=>{release=r;});
 const pending=prepareHat({},'owner',{profileId:'self'});
 await assert.rejects(()=>prepareHat({},'owner',{profileId:'self'}),/HAT_CALCULATION_PENDING/);
 release(null);await assert.rejects(()=>pending,/PROFILE_NOT_FOUND/);
 setup();assert.equal((await prepareHat({},'owner',{profileId:'self'})).usedCount,6);
});
test('endpoint sits behind auth and security and never debits attendance or invokes a provider',()=>{
 const route=readFileSync('worker/routes/yeongnyangi.js','utf8'),start=route.indexOf("if(path==='free/hat'");
 assert.ok(start>route.indexOf('await requireUserFromRequest'));
 assert.match(route.slice(start,start+900),/enforceSensitiveEndpointSecurity/);assert.match(route.slice(start,start+900),/no-store/);
 const service=readFileSync('worker/yeongnyangi/hat/service.ts','utf8');
 assert.doesNotMatch(service,/requireDailyPass|unlockToday|\.generate\(|prepareFortune|\.save\(|\.updateOne\(/);
});
