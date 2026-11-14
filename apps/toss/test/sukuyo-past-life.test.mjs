import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module} from 'node:module';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..');const bundled=await build({entryPoints:[path.join(root,'worker/toss/sukuyo-past-life.js')],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const compiled=new Module(path.join(root,'test-sukuyo-past-life.cjs'));compiled.paths=Module._nodeModulePaths(root);compiled._compile(bundled.outputFiles[0].text,compiled.id);
const read=compiled.exports.tossSukuyoPastLife;
const auth={ownerId:'toss-owner-A'};
const input={userName:'나',userBirthDate:'1990-02-03',userBirthTime:'08:35',userCalendarType:'solar',userGender:'F',partnerName:'상대',partnerBirthDate:'1991-04-05',partnerBirthTime:'12:30',partnerCalendarType:'solar',partnerGender:'M',purpose:'love'};
test('all nine original purposes expose the web bond engine full radar, chapters, dialogue and prompt without writes or LLM',async()=>{
 for(const purpose of ['love','reunion','marriage','crush','friend','family','business','work','general']){const result=await read({},auth,{...input,purpose},{requestUrl:''});assert.equal(result.ok,true);assert.equal(result.source,'public');assert.equal(result.stored,false);assert.equal(result.reportId,null);assert.equal(result.data.purpose,purpose);assert.equal(result.data.logicVersion,'sukyo-bond-report-v1');assert.ok(Object.keys(result.data.scores).length>=10);assert.ok(result.data.selfPortrait.length>10);assert.ok(result.data.partnerPortrait.length>10);assert.ok(result.data.thirtyDayPlan.length>0);assert.ok(result.data.conversationScript.length>0);assert.ok(result.data.aiFollowupPrompt.length>100);assert.match(result.html,/<svg/);assert.match(result.html,/30일 실행 플랜/);assert.match(result.css,/sy-past-life/);assert.doesNotMatch(result.html,/잠긴 심층 리딩/);}
});
test('login and explicit free policy are required; saved birth is read only from the authenticated owner',async()=>{
 await assert.rejects(read({},null,input),e=>e.status===401);await assert.rejects(read({},auth,input,{free:()=>false}),e=>e.code==='TOSS_PRODUCT_NOT_APPROVED');
 const queries=[];const findProfile=async query=>{queries.push(query);return query.userId===auth.ownerId&&query.profileId==='mine'?{profileId:'mine',name:'소유자',gender:'F',birth:{year:1990,month:2,day:3,hour:8,minute:35,calType:'solar'},location:{tz:'Asia/Seoul'}}:null;};
 const result=await read({},auth,{...input,profileId:'mine',userId:'other',userBirthDate:'2001-01-01'},{findProfile,requestUrl:''});assert.deepEqual(queries[0],{userId:'toss-owner-A',profileId:'mine'});assert.equal(result.data.userName,'소유자');assert.equal(result.data.userProfileId,'mine');
 await assert.rejects(read({},{ownerId:'toss-owner-B'},{...input,profileId:'mine'},{findProfile}),e=>e.status===403);
 await assert.rejects(read({},auth,{...input,userBirthDate:'not-a-date'}),e=>e.code==='BIRTH_INVALID');
});
