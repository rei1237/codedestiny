import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {join} from 'node:path';
import {chapterRecoveryPlan} from '../../worker/yeongnyangi/recovery-plan.js';
import {CHAPTER_DELIVERY_VERSION} from '../../worker/yeongnyangi/chapter-delivery-contract.js';
const script=readFileSync(new URL('../../scripts/recover-yeongnyangi-request.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const id='a'.repeat(64),baseArgs=['--db','code_destiny','--request',id];
const seed=()=>({
 row:{_id:id,userId:'owner',productId:'saju_tuna',paymentId:'paid',state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',attempts:3,
  updatedAt:new Date('2026-10-04T00:00:00Z'),chapters:[{blocks:[{id:'s',title:'title',paragraphs:['preserved content '.repeat(15)]}]}],
  chapterAttempts:{0:1,1:3},snapshot:{manifest:[{id:'one',minimumChars:120,sections:[{id:'s'}]},{id:'two',minimumChars:120}],
   natalInput:{personA:{}},analysis:{contexts:{saju:{facts:[]}}}},recoveryAudit:[]},
 payment:{_id:'paid',userId:'owner',status:'paid',paymentAmount:10000,metadata:{consumedBy:id}},updates:[],files:[],race:false,
});
async function run(fixture,args=baseArgs){
 const output=[],errors=[],process={argv:['node','recovery',...args],env:{},exitCode:0};
 const context={process,createHash,join,chapterRecoveryPlan,CHAPTER_DELIVERY_VERSION,Date,
  config:()=>{},tmpdir:()=>'/mock',writeFileSync:(path,content,options)=>fixture.files.push({path,content,options}),
  connectDb:async()=>{},mongoose:{connection:{name:'code_destiny'},disconnect:async()=>{}},
  Payment:{findById:()=>({lean:async()=>structuredClone(fixture.payment)})},
  YeongnyangiRequest:{findById:()=>({lean:async()=>structuredClone(fixture.row)}),
   updateOne:async(filter,update)=>{
    fixture.updates.push({filter,update});if(fixture.race)return {modifiedCount:0};
    for(const [key,value] of Object.entries(update.$set)){
     const path=key.split('.');let row=fixture.row;for(const part of path.slice(0,-1))row=row[part]??={};row[path.at(-1)]=value;
    }
    fixture.row.recoveryAudit.push(update.$push.recoveryAudit);return {modifiedCount:1};
   }},
  console:{log:value=>output.push(JSON.parse(value)),error:value=>errors.push(JSON.parse(value))}};
 await runInNewContext('(async()=>{'+script+'})()',context);
 return {output:output.at(-1),errors,exitCode:process.exitCode};
}
const approved=(sha,extra=[])=>[...baseArgs,'--execute','--plan-sha',sha,'--reason','incident-test','--operator','ops-test','--allow-payment-commit-markers',...extra];
test('recovery is read-only by default and requires an unchanged approved plan plus marker exception',async()=>{
 const f=seed(),original=JSON.stringify(f);
 const dry=await run(f);assert.equal(dry.output.applied,false);assert.equal(dry.output.expectedFirstCalls,1);
 assert.equal(JSON.stringify(f),original);
 const noException=await run(f,approved(dry.output.planSha).filter(x=>x!=='--allow-payment-commit-markers'));
 assert.equal(noException.exitCode,1);assert.match(noException.errors[0].error,/PAYMENT_COMMIT_MARKER_APPROVAL_REQUIRED/);
 f.row.updatedAt=new Date('2026-10-04T00:01:00Z');
 const changed=await run(f,approved(dry.output.planSha));assert.equal(changed.exitCode,1);
 assert.equal(f.updates.length,0);assert.equal(f.files.length,0);
});
test('one authorization preserves content, snapshot and payment; repeating it cannot grant or write again',async()=>{
 const f=seed(),protectedBefore=JSON.stringify([f.row.chapters,f.row.snapshot,f.payment]);
 const dry=await run(f),execute=await run(f,approved(dry.output.planSha));
 assert.equal(execute.exitCode,0);assert.equal(execute.output.applied,true);assert.equal(f.updates.length,1);
 assert.equal(f.row.manualRecoveryGrants[1],1);assert.equal(f.row.generationCheckpoint.recoveryPolicy,CHAPTER_DELIVERY_VERSION);
 assert.equal(JSON.stringify([f.row.chapters,f.row.snapshot,f.payment]),protectedBefore);
 const replay=await run(f,approved(dry.output.planSha));assert.equal(replay.output.alreadyApplied,true);assert.equal(f.updates.length,1);
 assert.equal(f.files.length,1);assert.equal(f.files[0].options.flag,'wx');
 assert.ok(!f.files[0].content.includes('preserved content'),'before-state contains hashes, not customer content');
});
test('payment revocation, missing source input and concurrent claim stop recovery without generation',async()=>{
 for(const change of [
  f=>{f.payment.status='refunded';},f=>{f.row.generationCheckpoint={deliveryRefund:{status:'pending'}};},
  f=>{delete f.row.snapshot.natalInput;},f=>{f.row.leaseUntil=new Date(Date.now()+60000);}
 ]){
  const f=seed();change(f);const dry=await run(f);const result=await run(f,approved(dry.output.planSha));
  assert.equal(result.exitCode,1);assert.equal(f.updates.length,0);assert.equal(f.files.length,0);
 }
 const f=seed(),dry=await run(f);f.race=true;
 const result=await run(f,approved(dry.output.planSha));assert.equal(result.exitCode,1);assert.equal(f.row.state,'FORTUNE_FAILED');
});

test('operator plan includes spent system grants and permits only the eighth call, never a ninth',async()=>{
 const f=seed();f.row.chapterAttempts[1]=7;f.row.systemRecoveryGrants={1:2};f.row.manualRecoveryGrants={1:2};
 const dry=await run(f);assert.equal(dry.output.manualGrant,3);assert.equal(dry.output.automaticCallsUpperBound,1);
 const execute=await run(f,approved(dry.output.planSha));assert.equal(execute.exitCode,0);
 assert.equal(f.row.chapterAttempts[1],7);assert.equal(f.row.manualRecoveryGrants[1],3);
 f.row.chapterAttempts[1]=8;
 const spent=await run(f);assert.ok(spent.output.blockers.includes('RECOVERY_BUDGET_REVIEW_REQUIRED'));
 const blocked=await run(f,approved(spent.output.planSha));assert.equal(blocked.exitCode,1);assert.equal(f.updates.length,1);
});
