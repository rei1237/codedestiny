import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'worker/toss/daily.js')],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline',setup(b){
 b.onLoad({filter:/worker[\\/]lib[\\/]db\.js$/},()=>({contents:'export const withMongoRetry=(_env,task)=>task();'}));
 b.onLoad({filter:/worker[\\/]lib[\\/]models\.js$/},()=>({contents:'export const ProfileCard={updateOne:(...args)=>globalThis.dailyTest.profile(...args)};'}));
 b.onLoad({filter:/worker[\\/]yeongnyangi[\\/]free-service\.ts$/},()=>({contents:'export const attendanceStatus=()=>{},attend=()=>{},unlockToday=()=>{};export const getFreeReading=(...args)=>globalThis.dailyTest.read(...args);export const prepareFreeReading=(...args)=>globalThis.dailyTest.prepare(...args);'}));
}}]});
const loaded=new Module(path.join(root,'toss-daily-test.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {prepareTossDaily}=loaded.exports;
const auth={userId:'verified-user',ownerId:'verified-owner'},env={};
const birth={gender:'F',date:{year:1997,month:2,day:10,hour:14,minute:30,timeUnknown:false,calType:'solar'},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}};
function fixture(){const calls=[];globalThis.dailyTest={read:async(...args)=>{calls.push(['read',...args]);return {result:null};},profile:async(...args)=>calls.push(['profile',...args]),prepare:async(...args)=>{calls.push(['prepare',...args]);return {title:'계산 결과'};}};return calls;}
test('daily pass rejection occurs before profile creation or calculation',async()=>{
 const calls=fixture();globalThis.dailyTest.read=async()=>{throw Object.assign(Error('locked'),{code:'DAILY_PASS_REQUIRED'});};
 await assert.rejects(prepareTossDaily(env,auth,{category:'saju',birth,draft:{}}),{code:'DAILY_PASS_REQUIRED'});assert.deepEqual(calls,[]);
});
test('stored daily result is returned verbatim without a new profile or generation',async()=>{
 const calls=fixture(),saved={title:'저장 원문',paragraphs:['그대로 읽기']};globalThis.dailyTest.read=async()=>({result:saved});
 assert.equal(await prepareTossDaily(env,auth,{category:'saju',draft:{question:'다른 질문'}}),saved);assert.deepEqual(calls,[]);
});
test('new reading reuses canonical access and engine path with server owner only',async()=>{
 const calls=fixture();await prepareTossDaily(env,auth,{category:'saju',birth,userId:'attacker',profileId:'foreign',draft:{question:'오늘의 흐름은?',userId:'attacker',unlocked:'true'}});
 const profile=calls.find(call=>call[0]==='profile');assert.equal(profile[1].userId,auth.ownerId);assert.match(profile[1].profileId,/^toss-daily-[a-f0-9]{64}$/);
 const prepare=calls.find(call=>call[0]==='prepare');assert.equal(prepare[2],auth.userId);assert.deepEqual(prepare[3].draft,{question:'오늘의 흐름은?'});assert.equal(prepare[3].profileId,profile[1].profileId);
});
test('reflection reading never creates a fabricated birth profile',async()=>{
 const calls=fixture();await prepareTossDaily(env,auth,{category:'dream',draft:{dreamText:'바다를 걷는 꿈'}});assert.ok(!calls.some(call=>call[0]==='profile'));assert.equal(calls.at(-1)[3].profileId,'');
});
test('unsupported horary, unknown categories and malformed drafts fail closed',async()=>{
 fixture();for(const category of ['horary','unknown'])await assert.rejects(prepareTossDaily(env,auth,{category,draft:{}}),{code:'INVALID_CATEGORY'});
 for(const draft of [[],null,{dreamText:'x'.repeat(1001)},{dreamText:{text:'bad'}}])await assert.rejects(prepareTossDaily(env,auth,{category:'dream',draft}),{code:'INVALID_INPUT'});
});
