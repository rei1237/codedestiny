import '../../../scripts/lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const local=globalThis.__dreamBoundary={};
const auth={_id:'identity',ownerId:'owner',userId:'owner',environment:'SANDBOX'};
const id='a'.repeat(64),feature='dream-psycho-analysis';
const q=value=>({lean:async()=>structuredClone(value)});
const match=(row,f)=>!!row&&Object.entries(f).every(([k,v])=>row[k]===v);
local.intents={findOne:f=>q(match(local.row,f)?local.row:null)};
local.documents={findOne:f=>q(match(local.doc,f)?local.doc:null)};
local.identities={findOne:f=>q(match(local.identity,f)?local.identity:null)};
const stubs={
  '../lib/models.js':'export const ServiceExecutionTransaction=globalThis.__dreamBoundary.documents;',
  './models.js':'const t=globalThis.__dreamBoundary;export const TossNativeConsultation=t.intents,TossIdentity=t.identities;',
  '../routes/dream.js':'export const normalizeDreamText=b=>({ok:b?.dreamText?.length>=8,text:b?.dreamText?.trim()}),seedDreamPsychoNarrative=()=>{},dreamPsychoNarrativeAdapter=()=>({reportType:"dreamPsychoAnalysis"});',
  './native-tea.js':'export const nativeOwnerFilter=(a,nativeService)=>({identityId:a._id,ownerId:a.ownerId,environment:a.environment,nativeService}),prepareNativeConsultation=async(e,a,input,o,contract)=>({input,contract}),verifiedIntent=(e,a,r)=>{if(globalThis.__dreamBoundary.revoked)throw Error("REVOKED");if(!r.orderId)throw Error("UNPAID");return r;};',
  './crypto.js':'import {createHash} from "node:crypto";export const hash=s=>createHash("sha256").update(s).digest("hex"),unseal=async()=>"synthetic";',
  '../lib/paid-narrative-delivery.js':`export const paidNarrativeExecutionKey=(u,f,r)=>[u,f,r].join(":");
    export async function runPaidNarrativeDelivery(req,env,auth,body,adapter){
      const t=globalThis.__dreamBoundary,original=req.method==="POST"?body:t.doc.metadata.paidNarrative.body;
      await adapter.verify(original,t.doc);
      if(req.method==="POST"){t.calls++;t.doc={userId:auth.userId,featureKey:adapter.featureKey,reportType:adapter.reportType,executionKey:paidNarrativeExecutionKey(auth.userId,adapter.featureKey,original.requestId),premiumStatus:"completed",metadata:{tossPaidNarrative:adapter.generationOrigin==="toss",paidNarrative:{body}}};if(t.cancel)t.revoked=true;}
      await adapter.verify(original,t.doc);return Response.json({saved:true});
    }`,
};
const entry=fileURLToPath(new URL('../../../worker/toss/native-dream.js',import.meta.url));
const out=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'offline-dream',setup(b){
  b.onResolve({filter:/.*/},args=>/(?:native-dream|owned-narrative)\.js$/.test(args.importer)&&Object.hasOwn(stubs,args.path)?{namespace:'fixture',path:args.path}:null);
  b.onLoad({namespace:'fixture',filter:/.*/},args=>({contents:stubs[args.path]}));
  b.onResolve({namespace:'fixture',filter:/^node:/},args=>({path:args.path,external:true}));
}}]});
const {readDream,prepareDream,dreamLibraryItem,verifyDreamRecovery}=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].contents).toString('base64'));
test('dream adapter keeps web and Toss executions separate and verifies each archived input and live order',async()=>{
  const input={dreamText:'꿈에 있던 문을 열었어요.',requestId:'dream-00000000-0000-4000-8000-000000000000'};
  const prepared=await prepareDream({},auth,input);
  local.row={...prepared.contract,input:prepared.input,_id:id,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,featureKey:feature,nativeService:'dream',status:'paid',orderId:'order'};
  local.calls=0;local.revoked=false;local.doc=null;
  assert.equal((await readDream({},auth,id,false)).status,202);
  await readDream({},auth,id,true);
  assert.equal((await readDream({},auth,id,false)).status,200);
  assert.equal(local.calls,1);
  assert.equal((await dreamLibraryItem({},auth,{...local.row,_id:'order',requestId:id})).state,'COMPLETED');
  await assert.rejects(readDream({},{...auth,ownerId:'other'},id,false),e=>e.code==='RESULT_NOT_FOUND');
  local.doc.metadata.tossPaidNarrative=false;
  await assert.rejects(readDream({},auth,id,false),e=>e.code==='RESULT_NOT_FOUND');
  local.doc.metadata.tossPaidNarrative=true;
  local.doc.metadata.paidNarrative.body.dreamText='다른 꿈의 내용입니다.';
  await assert.rejects(readDream({},auth,id,false),e=>e.code==='REQUEST_INPUT_MISMATCH');
  local.doc.metadata.paidNarrative.body.dreamText=input.dreamText;
  local.identity={...auth,active:true};
  await verifyDreamRecovery({TOSS_RELEASE_READY:'true'},local.doc);
  local.identity.active=false;
  await assert.rejects(verifyDreamRecovery({TOSS_RELEASE_READY:'true'},local.doc),e=>e.code==='SESSION_EXPIRED');
  local.cancel=true;await assert.rejects(readDream({},auth,id,true),/REVOKED/);
});
