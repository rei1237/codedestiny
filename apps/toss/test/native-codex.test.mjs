import '../../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const state=globalThis.__codexNative={};
const query=(key,filter)=>({lean:async()=>{const row=state[key];return row&&Object.entries(filter).every(([k,v])=>k.split('.').reduce((o,x)=>o?.[x],row)===v)?structuredClone(row):null;}});
state.intents={findOne:q=>query('row',q)};state.sessions={findOne:q=>query('doc',q)};state.identities={findOne:q=>query('identity',q)};
const stubs={
 '../lib/models.js':'export const MasterLoveCodexSession=globalThis.__codexNative.sessions;',
 './models.js':'const t=globalThis.__codexNative;export const TossNativeConsultation=t.intents,TossIdentity=t.identities;',
 './crypto.js':'export const unseal=async()=>"mock";',
 '../lib/billing-feature-registry.js':'export const getBillingFeaturePricing=()=>({pricing:{amountKRW:1}});',
 './native-tea.js':`const t=globalThis.__codexNative;
   export const nativeOwnerFilter=(a,nativeService)=>({identityId:a._id,ownerId:a.ownerId,environment:a.environment,nativeService}),prepareNativeConsultation=async(e,a,input,o,contract)=>({input,contract}),verifiedIntent=async()=>{if(t.revoked)throw Error("REVOKED");};`,
 '../routes/master-love-codex.js':`const t=globalThis.__codexNative;
   export const BATCH_BUDGET_MS=3000,prepareCodexForToss=(e,input)=>({input,mode:input.partnerInfo?"compat":"solo",featureKey:input.partnerInfo?"master-love-codex-compat":"master-love-codex",sourceHash:"births",inputHash:"source-with-question"});
   export const codexSessionForToss=doc=>({sessionId:doc.id,done:doc.status==="completed"});
   export const acquireBatchLock=async()=>({ok:true,doc:t.doc,lockToken:"lock"}),runCodexWave=async()=>{t.calls++;t.doc.status="completed";if(t.refundAfterWave)t.revoked=true;return {outcome:"completed"};};
   export async function startCodexSession(r,e,a,b,n){await n.verify();t.doc={id:"saved-book",userId:a.userId,inputHash:"births",paymentId:n.access.paymentId,idempotencyKey:b.idempotencyKey,mode:b.partnerInfo?"compat":"solo",status:"generating",deliveryMeta:{tossIntentId:n.id,tossInputHash:n.inputHash}};await n.verify(t.doc);return Response.json({started:true},{status:202});}`,
};
const out=await build({entryPoints:[fileURLToPath(new URL('../../../worker/toss/native-codex.js',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'codex-offline',setup(b){
 b.onResolve({filter:/.*/},a=>a.importer.endsWith('native-codex.js')&&Object.hasOwn(stubs,a.path)?{path:a.path,namespace:'local'}:null);
 b.onLoad({filter:/.*/,namespace:'local'},a=>({contents:stubs[a.path]}));
}}]});
const {prepareNativeCodex,readNativeCodex,verifyCodexRecovery,codexLibraryItem}=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].contents).toString('base64'));
test('codex grants bind mode, account, full question hash and live order to one stored session',async()=>{
 const id='c'.repeat(64),auth={_id:'identity',userId:'owner',ownerId:'owner',environment:'SANDBOX'};
 const input={mode:'compat',reading:{partnerInfo:{birthDate:'1990-01-01'}},requestId:'codex-00000000-0000-4000-8000-000000000000'};
 await assert.rejects(prepareNativeCodex({},auth,{...input,mode:'solo'}),e=>e.code==='ORDER_PRODUCT_MISMATCH');
 const {input:snapshot,contract}=await prepareNativeCodex({},auth,input);
 const purchase={_id:'order',identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:'codex',featureKey:contract.featureKey,requestId:id};
 state.row={...purchase,...contract,input:snapshot,_id:id,orderId:'order',status:'paid'};
 state.calls=0;assert.equal((await readNativeCodex({},auth,id,false)).status,202);
 await readNativeCodex({},auth,id,true);await readNativeCodex({},auth,id,true);await readNativeCodex({},auth,id,true);
 assert.equal(state.calls,1);assert.equal((await codexLibraryItem({},auth,purchase)).state,'COMPLETED');
 const denied=e=>e.code==='RESULT_NOT_FOUND';
 await assert.rejects(readNativeCodex({},{...auth,_id:'other'},id,false),denied);
 state.doc.mode='solo';await assert.rejects(readNativeCodex({},auth,id,false),denied);state.doc.mode='compat';
 state.doc.deliveryMeta.tossInputHash='different question';await assert.rejects(readNativeCodex({},auth,id,false),denied);state.doc.deliveryMeta.tossInputHash=contract.inputHash;
 state.identity={...auth,active:true};await verifyCodexRecovery({TOSS_RELEASE_READY:'true'},state.doc);state.identity.active=false;
 await assert.rejects(verifyCodexRecovery({TOSS_RELEASE_READY:'true'},state.doc),e=>e.code==='SESSION_EXPIRED');
 state.doc.status='generating';state.refundAfterWave=true;
 await assert.rejects(readNativeCodex({},auth,id,true),/REVOKED/);
});
