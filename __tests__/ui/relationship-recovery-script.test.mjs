import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {RELATIONSHIP_PART_IDS,editRelationshipPart,relationshipScoreAnchor} from '../../worker/lib/relationship-report-delivery.js';
const script=readFileSync(new URL('../../scripts/recover-relationship-report.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const id='rbt_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',args=['--db','code_destiny','--session',id];
const shared='서로 다른 상황의 조건을 충분히 살펴보고 확인된 근거를 중심으로 대화를 이어가는 것이 좋습니다.';
const body=shared+'\n'+Array.from({length:80},(_,i)=>`${i}번째 상황에서는 마음의 속도와 관계의 조건을 함께 살펴보고 서로의 선택을 존중합니다.`).join('\n');
const fixture=()=>({row:{_id:'record',id,userId:'owner',accessType:'monthly',status:'generation_failed',createdAt:new Date('2026-10-04T00:00:00Z'),updatedAt:new Date('2026-10-04T01:00:00Z'),
 llmMeta:{resumeBody:{targetInfo:{}},facts:{},sectionPrompts:['prompt'],evidenceHash:'proof',scoreAnchor:{score:50},
 delivery:{parts:{0:{body:shared}},rawResponses:{1:JSON.stringify({evidenceHash:'proof',body})},attempts:{1:2}}}},ledger:[],assets:{credits:500},updates:[],files:[],revoked:false,race:false,evidence:{settled:true}});
async function run(f,extra=[]){
 const outputs=[],errors=[],process={argv:['node','recovery',...args,...extra],env:{},exitCode:0};
 const query=value=>({lean:async()=>structuredClone(value),select(){return this;},sort(){return this;}});
 await runInNewContext('(async()=>{'+script+'})()',{
  process,Date,createHash,join,RELATIONSHIP_PART_IDS,editRelationshipPart,relationshipScoreAnchor,
  config:()=>{},tmpdir:()=>'/mock',writeFileSync:(_path,data)=>f.files.push(data),connectDb:async()=>{},mongoose:{connection:{name:'code_destiny'},disconnect:async()=>{}},
  findMoonstoneSpendEvidence:async()=>f.evidence,isPaidResultRevoked:async()=>f.revoked,
  User:{findById:()=>query(f.assets)},MonthlyCreditLedger:{find:()=>query(f.ledger)},
  RelationshipBoundaryTest:{findOne:()=>query(f.row),updateOne:async(filter,update)=>{
   f.updates.push({filter,update});if(f.race)return {modifiedCount:0};
   for(const [key,value]of Object.entries(update.$set)){const path=key.split('.');let target=f.row;for(const p of path.slice(0,-1))target=target[p]??={};target[path.at(-1)]=value;}
   return {modifiedCount:1};
  }},console:{log:value=>outputs.push(JSON.parse(value)),error:value=>errors.push(JSON.parse(value))}
 });
 return {output:outputs.at(-1),errors,exitCode:process.exitCode};
}
test('relationship dry-run and execute preserve saved content and debit, with idempotent authorization',async()=>{
 const f=fixture(),before=JSON.stringify(f);const dry=await run(f);assert.equal(JSON.stringify(f),before);assert.equal(dry.output.ready,true);assert.deepEqual(dry.output.localRepair,['1']);
 const protectedBefore=JSON.stringify([f.row.llmMeta.delivery.parts[0],f.ledger,f.assets]);
 const flags=['--execute','--plan-sha',dry.output.planSha];const applied=await run(f,flags);
 assert.equal(applied.output.applied,true);assert.equal(f.row.status,'partial');assert.equal(f.row.llmMeta.recoveryNoRefund,true);
 assert.equal(JSON.stringify([f.row.llmMeta.delivery.parts[0],f.ledger,f.assets]),protectedBefore);assert.ok(!f.row.llmMeta.delivery.parts[1].body.includes(shared));
 assert.equal((await run(f,flags)).output.alreadyApplied,true);assert.equal(f.updates.length,1);assert.ok(!f.files[0].includes(shared));
});
test('revocation, missing debit/input, later compensation, active lease and stale plan cannot authorize',async()=>{
 for(const change of [f=>{f.revoked=true;},f=>{f.evidence=null;},f=>{delete f.row.llmMeta.facts;},
  f=>{f.ledger=[{type:'MONTHLY_CREDIT_GRANT',createdAt:new Date()}];},f=>{f.row.llmMeta.lease={until:new Date(Date.now()+60000)};}]){
  const f=fixture();change(f);const dry=await run(f),result=await run(f,['--execute','--plan-sha',dry.output.planSha]);
  assert.equal(result.exitCode,1);assert.equal(f.updates.length,0);
 }
 const f=fixture(),dry=await run(f);f.row.updatedAt=new Date();assert.equal((await run(f,['--execute','--plan-sha',dry.output.planSha])).exitCode,1);assert.equal(f.updates.length,0);
});
test('editing never accepts contradictory scores or mostly repeated text',()=>{
 assert.equal(editRelationshipPart('99점. '+body,[],50),null);
 assert.equal(editRelationshipPart((shared+'\n').repeat(100),[],50),null);
 assert.equal(editRelationshipPart(' 짧지만 중복이 없는 원래 본문입니다. ',[],50),'짧지만 중복이 없는 원래 본문입니다.');
});
