import '../../../scripts/lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const state=globalThis.__namingBoundary={};
const auth={_id:'identity',ownerId:'owner',userId:'owner',environment:'SANDBOX'};
const feature='premium-naming-prompt',id='a'.repeat(64),order='offline-order';
const find=key=>({findOne:filter=>({lean:async()=>{
  const row=state[key];
  return row&&Object.entries(filter).every(([field,value])=>row[field]===value)?structuredClone(row):null;
}})});
state.intents=find('row');state.executions=find('doc');state.identities=find('identity');
const stubs={
  '../lib/models.js':'export const PaidExecutionRecord=globalThis.__namingBoundary.executions;',
  './models.js':'export const TossNativeConsultation=globalThis.__namingBoundary.intents,TossIdentity=globalThis.__namingBoundary.identities;',
  '../lib/billing-feature-registry.js':'export const getBillingFeaturePricing=()=>({pricing:{amountKRW:1}});',
  './crypto.js':'export const unseal=async()=>"synthetic";',
  './native-tea.js':`export const nativeOwnerFilter=(a,nativeService)=>({identityId:a._id,ownerId:a.ownerId,environment:a.environment,nativeService});
    export const prepareNativeConsultation=async(e,a,input,order,contract)=>({input,contract});
    export const verifiedIntent=async(e,a,r)=>{if(globalThis.__namingBoundary.revoked||!r.orderId)throw Error("ORDER_DENIED");};`,
  '../routes/naming-prompt.js':`const t=globalThis.__namingBoundary;
    export const prepareNamingInput=async({input})=>({input,inputHash:"normalized-hash"});
    export const storedNamingResponse=d=>Response.json({result:d.result});
    export async function generateNamingForToss(e,a,body,native){
      await native.verify(t.doc);
      if(body.inputHash!==t.row.inputHash||body.input.familyName!=="김")throw Error("INPUT_MISMATCH");
      t.calls++;t.doc={userId:a.userId,featureId:t.row.featureKey,paymentId:native.access.paymentId,orderId:native.access.evidenceId,executionId:"source-execution",status:"completed",result:{namingPrompt:{tossIntentId:native.id,inputHash:body.inputHash}}};
      if(t.cancel)t.revoked=true;
      await native.verify(t.doc);return storedNamingResponse(t.doc);
    }`,
};
const entry=fileURLToPath(new URL('../../../worker/toss/native-naming.js',import.meta.url));
const out=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'local-naming',setup(b){
  b.onResolve({filter:/.*/},args=>args.importer.endsWith('native-naming.js')&&Object.hasOwn(stubs,args.path)?{namespace:'mock',path:args.path}:null);
  b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:stubs[args.path]}));
}}]});
const {prepareNativeNaming,readNativeNaming,namingLibraryItem,resumeNativeNaming}=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].contents).toString('base64'));
const denied=error=>error.code==='RESULT_NOT_FOUND';
test('naming uses its own verified order and source snapshot before and after generation or recovery',async()=>{
  const input={familyName:'김',birthDate:'1990-01-01'},requestId='naming-00000000-0000-4000-8000-000000000000';
  await assert.rejects(prepareNativeNaming({},auth,{requestId,input,orderId:order}),e=>e.code==='INVALID_INPUT');
  const prepared=await prepareNativeNaming({},auth,{requestId,input});
  state.row={...prepared.contract,input:prepared.input,_id:id,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:'naming',orderId:order,status:'paid'};
  state.calls=0;
  assert.equal((await readNativeNaming({},auth,id,false)).status,202);
  await readNativeNaming({},auth,id,true);
  await readNativeNaming({},auth,id,true);
  assert.equal(state.calls,1);
  const item=await namingLibraryItem({},auth,{...state.row,_id:order,requestId:id});
  assert.deepEqual([item.state,item.href],['COMPLETED','/naming-ai/result/?intentId='+id]);
  await assert.rejects(readNativeNaming({},{...auth,_id:'second'},id,false),denied);
  state.doc.result.namingPrompt.inputHash='other';
  await assert.rejects(readNativeNaming({},auth,id,true),denied);
  state.doc.result.namingPrompt.inputHash=state.row.inputHash;
  delete state.doc.result.namingPrompt.tossIntentId;
  await assert.rejects(readNativeNaming({},auth,id,false),denied);
  state.doc.result.namingPrompt.tossIntentId=id;
  state.identity={...auth,active:true};
  await resumeNativeNaming({TOSS_RELEASE_READY:'true'},state.doc);
  state.identity.active=false;
  await assert.rejects(resumeNativeNaming({TOSS_RELEASE_READY:'true'},state.doc),e=>e.code==='SESSION_EXPIRED');
  state.doc=null;state.cancel=true;
  await assert.rejects(readNativeNaming({},auth,id,true),/ORDER_DENIED/);
  await assert.rejects(readNativeNaming({},auth,id,false),/ORDER_DENIED/);
});
