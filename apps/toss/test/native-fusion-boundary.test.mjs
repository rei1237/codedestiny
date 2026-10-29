import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const auth={_id:'identity',ownerId:'owner',userId:'owner',revision:1,userKey:'123',environment:'SANDBOX'};
const product={approved:true,nativeService:'fusion',sku:'offline-fusion',featureKey:'fusion-fortune-consultation',productId:'native:fusion:fusion-fortune-consultation',approvedPriceKRW:50000,priceEvidence:'offline fixture'};
const input={requestId:'original-fusion',birthDate:'1990-01-01',birthTime:'08:00',topic:'삶의 흐름',concern:'진로 질문'};
const order={orderId:'01900000-1111-7111-8111-000000000042',sku:product.sku,status:'PURCHASED'};
const state={rows:[],purchases:[],catalog:[product],order,doc:null,identity:true,generated:0,web:0,failSave:false,refundAtDelivery:false};
const matches=(row,q)=>Object.entries(q).every(([k,v])=>{
 if(k==='$or')return v.some(item=>matches(row,item));
 if(v===null)return row?.[k]==null;
 if(v&&typeof v==='object')return '$lt'in v?row?.[k]<v.$lt:'$lte'in v?row?.[k]<=v.$lte:false;
 return row?.[k]===v;
});
const query=value=>({lean:async()=>value,sort(){return this},limit(){return this}});
state.models={
 TossNativeConsultation:{findOne:q=>query(state.rows.find(r=>matches(r,q))||null),find:q=>query(state.rows.filter(r=>matches(r,q))),
 findOneAndUpdate:(q,u)=>{let row=state.rows.find(r=>matches(r,q));if(!row){row={...q,...u.$setOnInsert,createdAt:new Date(Date.now()-600000)};state.rows.push(row)}return query(row)},
 updateOne:async(q,u)=>{const row=state.rows.find(r=>matches(r,q));if(row)Object.assign(row,u.$set)}},
 TossPurchase:{findOne:q=>query(state.purchases.find(r=>matches(r,q))||null)},
 TossIdentity:{findOne:()=>query(state.identity?auth:null)},
};
state.transaction=async fn=>fn({assertIdentity:async()=>assert.ok(state.identity),purchase:async id=>state.purchases.find(r=>r._id===id),insertPurchase:async r=>state.purchases.push(r),nativeIntent:async id=>state.rows.find(r=>r._id===id),fundNativeIntent:async(id,owner,orderId)=>Object.assign(state.rows.find(r=>r._id===id),{orderId,status:'paid'}),assignPurchase:async(id,requestId)=>Object.assign(state.purchases.find(r=>r._id===id),{requestId})});
globalThis.__fusionNative=state;
const root=path.resolve(import.meta.dirname,'../../..');
const stubs={
 'worker/toss/models.js':'export const {TossNativeConsultation,TossPurchase,TossIdentity}=globalThis.__fusionNative.models;',
 'worker/toss/catalog.js':'export const APPROVED_TOSS_NATIVE_PRODUCTS=globalThis.__fusionNative.catalog;',
 'worker/toss/partner.js':'export const lookupOrder=async()=>globalThis.__fusionNative.order;',
 'worker/toss/purchases.js':'export const purchaseStore={transaction:globalThis.__fusionNative.transaction};export const recordTossRefund=async()=>{};',
 'worker/toss/crypto.js':`import {createHash} from 'node:crypto';export const hash=async x=>createHash('sha256').update(x).digest('hex');export const unseal=async()=> '123';`,
 'worker/lib/db.js':'export const connectDb=async()=>{};export const withMongoRetry=async(e,f)=>f();',
 'worker/lib/auth.js':'export const requireUserFromRequest=async()=>{globalThis.__fusionNative.web++;throw Error("WEB_FORBIDDEN")};export const getOptionalUserFromRequest=requireUserFromRequest;',
 'worker/lib/paid-result-revocation.js':'export const isPaidResultRevoked=async()=>{throw Error("WEB_PROOF_FORBIDDEN")};',
 'worker/lib/nakshatra-paid-access.js':'export const verifyPerUsePayment=async()=>{throw Error("WEB_PAYMENT_FORBIDDEN")};export const logPerUsePaymentProof=()=>{};',
 'worker/lib/paid-feature-registry.js':'export const FEATURE_KEY_PRICE_TABLE={};',
 'worker/lib/billing-feature-registry.js':'export const getBillingFeaturePricing=()=>({pricing:{amountKRW:50000}});',
 'worker/routes/fortune-tea-house.js':'export const nativeTeaContract=()=>{};export const nativeTeaStoredState=()=>{};export const handleFortuneTeaHouseRoutes=()=>{};',
 'worker/toss/native-neo.js':'export const nativeNeoLibraryItem=()=>{};',
 'worker/lib/fusion-fortune-consultation.js':`
 const s=globalThis.__fusionNative;
 export const getFusionFortuneConsultationByRequestId=async({userId,requestId})=>s.doc?.userId===userId&&s.doc?.idempotencyKey===requestId?s.doc:null;
 export const getFusionFortuneConsultation=async({userId,id})=>s.doc?.userId===userId&&s.doc?.id===id?s.doc:null;
 export const getLatestPendingFusionConsultation=async()=>s.doc?.status==='partial'?s.doc:null;
 export const listFusionFortuneConsultations=async()=>s.doc?[s.doc]:[];
 export const fusionConsultationPublicStatus=d=>d.status;
 export const saveFusionGenerationSnapshot=async({input,userId,requestId})=>{s.doc={id:'original-saved',userId,idempotencyKey:requestId,generationSnapshot:{input},status:'partial',result:{}}};
 export const saveFusionFortuneConsultation=async p=>{if(s.failSave)return '';Object.assign(s.doc,{result:p.result,status:p.deliveryState|| (p.stage===1?'partial':'completed'),stage:p.stage,nextStage:p.nextStage});return s.doc.id;};
 export const reserveFusionGroupAttempt=async()=>{};export const claimFusionDeliveryLease=async()=>({token:'lease'});export const releaseFusionDeliveryLease=async()=>{};export const requestFusionRecovery=async()=>{};
 `,
 'worker/lib/fusion-fortune.js':`
 export const FUSION_FORTUNE_PAID_FEATURE_KEY='fusion-fortune-consultation',FUSION_GENERATION_DEADLINE_MS=120000,FUSION_FORTUNE_ERROR_CODES={};
 export const normalizeFusionFortuneInput=({requestId,stage,resumeGeneration,...input})=>input;
 export const validateFusionFortuneInput=normalizeFusionFortuneInput;
 export const isFusionFortuneApiEnabled=()=>true,isFusionFortuneUiEnabled=()=>true,isFusionFortuneMockFlowEnabled=()=>true,isFusionFortuneRealLlmAllowed=()=>false;
 export const hasFusionStageOneResult=x=>!!x?.sajuSection,buildFusionFortuneStatus=async()=>({canGenerate:true}),createMongoFusionFortuneStore=()=>({}),getFusionFortuneDateKey=()=> '2026-10-29';
 export async function generateFusionFortuneRequest(args){
  const access=await args.resolvePaidAccess({userId:args.userId,requestId:args.requestId});if(!access.ok)return {ok:false,status:402};
  const s=globalThis.__fusionNative;s.generated++;
  await args.onReserved();
  if(!s.doc)await args.onSnapshot({userId:args.userId,requestId:args.requestId,input:normalizeFusionFortuneInput(args.input)});
  if(s.refundAtDelivery)s.order={...s.order,status:'REFUNDED'};
  const delivery={requestId:args.requestId,result:{sajuSection:{content:'원본 목'},stage:args.stage},stage:args.stage,nextStage:args.stage===1?2:null,status:args.stage===1?'partial':'completed'};
  await args.onCheckpoint(delivery);await args.onDelivery(delivery);
  return {ok:true,...delivery,stageStatus:delivery.status};
 }
 `,
};
const bundle=await build({stdin:{contents:"export * from './worker/toss/native-fusion.js';export * from './worker/toss/native-consultation.js';",resolveDir:root},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline',setup(b){b.onLoad({filter:/\.js$/},args=>{const contents=stubs[path.relative(root,args.path).replaceAll('\\','/')];if(contents)return {contents,loader:'js'}})}}]});
const loaded=new Module(path.join(root,'fusion-native-test.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);const api=loaded.exports;
const call=(suffix,body,who=auth)=>api.handleNativeFusion(new Request('https://example.invalid'+suffix,{method:body?'POST':'GET',headers:{Cookie:'forbidden',Authorization:'forbidden'},...(body?{body:JSON.stringify(body)}:{})}),{},who,suffix.split('?')[0]);

test('original Fusion handler: immutable purchase, first checkpoint recovery, two SSE stages, durable reread and refund fences',async()=>{
 const prepared=await api.prepareNativeFusion({},auth,input);
 assert.equal(prepared.paid,false);
 await assert.rejects(api.prepareNativeFusion({},auth,{...input,concern:'변조'}),/REQUEST_INPUT_MISMATCH/);
 assert.equal((await call('/generate',input)).status,402);
 const args={store:{transaction:state.transaction},auth,order,product,requestId:prepared.id};
 await api.grantNativeOrder(args);await api.grantNativeOrder(args);assert.equal(state.purchases.length,1);
 state.catalog.length=0;
 const pending=await call('/result?pending=1');assert.equal(pending.status,202);assert.deepEqual((await pending.json()).consultation.resumeBody,input);
 for(const stage of [1,2]){const response=await call('/generate/stream',{...input,stage});assert.match(response.headers.get('Content-Type'),/event-stream/);const stream=await response.text();assert.match(stream,/event: checkpoint/);assert.match(stream,/event: result/);assert.match(stream,/event: complete/);assert.equal(state.doc.status,stage===1?'partial':'completed')}
 const reread=await call('/result?id=original-saved');assert.deepEqual((await reread.json()).consultation.result,state.doc.result);
 await call('/generate',{...input,stage:2});assert.equal(state.generated,2);
 await assert.rejects(call('/generate',{...input,concern:'변조'}),/REQUEST_INPUT_MISMATCH/);
 for(const who of [{...auth,ownerId:'other',userId:'other'},{...auth,environment:'DEFAULT'}])assert.notEqual((await call('/result?id=original-saved',null,who)).status,200);
 state.order={...order,status:'REFUNDED'};assert.notEqual((await call('/result?id=original-saved')).status,200);await assert.rejects(call('/generate',input),/ORDER_REFUNDED/);
 state.order=order;state.identity=false;assert.notEqual((await call('/result?id=original-saved')).status,200);state.identity=true;
 const recovery=await api.nativeFusionRecoveryContext({TOSS_RELEASE_READY:'true'},auth.userId,input.requestId);assert.equal(recovery.auth.userId,auth.userId);
 assert.equal(state.web,0);
});

test('checkpoint failure or refund never emits a successful result or complete event',async()=>{
 state.doc=null;state.failSave=true;
 const failed=await(await call('/generate/stream',input)).text();assert.match(failed,/event: error/);assert.doesNotMatch(failed,/event: (result|complete)/);
 state.failSave=false;state.doc=null;state.refundAtDelivery=true;
 const revoked=await(await call('/generate/stream',input)).text();assert.match(revoked,/event: error/);assert.doesNotMatch(revoked,/event: (result|complete)/);
 state.refundAtDelivery=false;state.order=order;
});

test('cron uses the paid original input before the first snapshot and rechecks active identity and refund proof',async()=>{
 state.doc=null;state.rows[0].generationStartedAt=null;state.rows[0].recoveryNextAt=null;
 const runs=[];
 const options={now:Date.now(),deadline:Date.now()+240000,runStage:async(_env,args)=>{runs.push(args);assert.deepEqual(args.body,input);assert.equal(args.native.auth.userId,auth.userId);return {ok:true,stageStatus:'partial'}}};
 assert.equal((await api.bootstrapNativeFusionOrders({},options)).length,0);
 assert.equal((await api.bootstrapNativeFusionOrders({TOSS_RELEASE_READY:'true'},options)).length,1);assert.equal(runs.length,1);
 state.rows[0].recoveryNextAt=null;state.order={...order,status:'REFUNDED'};
 await api.bootstrapNativeFusionOrders({TOSS_RELEASE_READY:'true'},options);assert.equal(runs.length,1);
 state.order=order;state.rows[0].recoveryNextAt=null;state.identity=false;
 await api.bootstrapNativeFusionOrders({TOSS_RELEASE_READY:'true'},options);assert.equal(runs.length,1);state.identity=true;
 state.doc={id:'lease-only',userId:auth.userId,idempotencyKey:input.requestId,status:'partial',result:{},generationSnapshot:null};
 const pending=await call('/result?pending=1');assert.deepEqual((await pending.json()).consultation.resumeBody,input);
 state.rows[0].recoveryNextAt=null;await api.bootstrapNativeFusionOrders({TOSS_RELEASE_READY:'true'},options);assert.equal(runs.length,2);
 assert.equal(runs[1].prior,state.doc);
});
