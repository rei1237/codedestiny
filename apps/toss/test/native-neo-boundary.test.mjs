import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const auth={_id:'identity',ownerId:'owner',userId:'owner',revision:1,userKey:'123',environment:'SANDBOX'};
const product={approved:true,nativeService:'neo',sku:'offline-tea',featureKey:'neo-operation-room-consultation',
  productId:'native:neo:neo-operation-room-consultation',approvedPriceKRW:6000,priceEvidence:'offline fixture'};
const input={idempotencyKey:'original-neo-request',question:'원본 질문'};
const order={orderId:'01900000-1111-7111-8111-000000000042',sku:product.sku,status:'PURCHASED'};
const state={rows:[],purchases:[],catalog:[product],order,doc:null,identity:true,lookups:0,web:0,refunds:0};
const matches=(row,query)=>Object.entries(query).every(([key,value])=>row?.[key]===value);
const query=value=>({lean:async()=>value,sort(){return this;},limit(){return this;}});
state.models={
  TossNativeConsultation:{findOne:q=>query(state.rows.find(r=>matches(r,q))||null),find:q=>query(state.rows.filter(r=>matches(r,q))),
    findOneAndUpdate:(q,u)=>{let row=state.rows.find(r=>matches(r,q));if(!row){row={...q,...u.$setOnInsert,createdAt:new Date()};state.rows.push(row);}return query(row);}},
  TossPurchase:{findOne:q=>query(state.purchases.find(r=>matches(r,q))||null)},
  TossIdentity:{findOne:()=>query(state.identity?auth:null)},
};
globalThis.__nativeNeoBoundary=state;
const root=path.resolve(import.meta.dirname,'../../..');
const stubs={
 'worker/toss/native-life-book.js':'export const nativeLifeBookLibraryItem=()=>{throw Error("LIFE_OUTSIDE_TEST")};',
 'worker/toss/native-love-secret.js':'export const nativeLoveSecretLibraryItem=()=>{throw Error("LOVE_OUTSIDE_TEST")};',
  'worker/lib/db.js':'export const withMongoRetry=async(e,f)=>f();',
  'worker/toss/native-fusion.js':'export const nativeFusionLibraryItem=()=>{throw Error("FUSION_OUTSIDE_TEST")};',
  'worker/toss/models.js':'export const {TossNativeConsultation,TossPurchase,TossIdentity}=globalThis.__nativeNeoBoundary.models;',
  'worker/toss/catalog.js':'export const APPROVED_TOSS_NATIVE_PRODUCTS=globalThis.__nativeNeoBoundary.catalog;',
  'worker/toss/partner.js':'export const lookupOrder=async()=>{globalThis.__nativeNeoBoundary.lookups++;return globalThis.__nativeNeoBoundary.order;};',
  'worker/toss/purchases.js':'export const purchaseStore={};export const recordTossRefund=async()=>{globalThis.__nativeNeoBoundary.refunds++;};',
  'worker/lib/billing-feature-registry.js':'export const getBillingFeaturePricing=()=>({pricing:{amountKRW:6000}});',
  'worker/routes/fortune-tea-house.js':'export const nativeTeaContract=()=>{};export const nativeTeaStoredState=()=>{};export const handleFortuneTeaHouseRoutes=()=>{};',
  'worker/routes/neo-operation-room.js':`
    import {nativeTossContext} from '../toss/native-context.js';
    import {createHash} from 'node:crypto';
    export const nativeNeoContract=input=>({requestId:input.idempotencyKey,resultId:input.idempotencyKey,featureKey:'neo-operation-room-consultation',
      inputHash:createHash('sha256').update(JSON.stringify(input)).digest('hex'),pricing:{amountKRW:6000}});
    export const nativeNeoStoredState=async()=>globalThis.__nativeNeoBoundary.doc;
    export async function handleNeoOperationRoomRoutes(request){
      if(request.headers.get('Authorization')||request.headers.get('Cookie'))throw Error('WEB_CREDENTIAL_FORWARDED');
      const state=globalThis.__nativeNeoBoundary,context=nativeTossContext(request);
      if(!context){state.web++;throw Error('WEB_AUTH_FORBIDDEN');}
      const url=new URL(request.url);
      if(url.pathname.endsWith('/result')){
        const doc=state.doc,id=url.searchParams.get('attemptId');
        if(!doc||id&&id!==doc.id&&id!==doc.idempotencyKey)return Response.json({ok:false},{status:404});
        await context.assertStored(doc);return Response.json({initialBriefing:doc.initialBriefing,status:doc.status,sessionId:doc.id});
      }
      const body=await request.json();state.forwarded=body;
      if(state.doc){await context.assertStored(state.doc);return Response.json({status:state.doc.status});}
      const contract=nativeNeoContract(body),access=await context.access(body,contract,contract.requestId);
      return Response.json(access,{status:access.ok?200:402});
    }`,

};
const bundle=await build({entryPoints:[path.join(root,'worker/toss/native-neo.js')],bundle:true,platform:'node',format:'cjs',write:false,
  plugins:[{name:'offline-native-boundaries',setup(b){b.onLoad({filter:/\.js$/},args=>{const contents=stubs[path.relative(root,args.path).replaceAll('\\','/')];if(contents)return {contents,loader:'js'};});}}]});
const loaded=new Module(path.join(root,'native-tea-boundary.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const api=loaded.exports;
const call=(suffix,body,who=auth)=>api.handleNativeNeo(new Request('https://example.invalid'+suffix,{method:body?'POST':'GET',
  headers:{Cookie:'must-not-forward',Authorization:'must-not-forward'},...(body?{body:JSON.stringify(body)}:{})}),{},who,suffix.split('?')[0]);


test('Neo preserves its original input and saved result across first-checkpoint recovery, catalog removal and owner/refund fences',async()=>{
 const prepared=await api.prepareNativeNeo({},auth,input);
 assert.equal(prepared.paid,false);
 await assert.rejects(api.prepareNativeNeo({},auth,{...input,question:'다른 질문'}),/REQUEST_INPUT_MISMATCH/);
 assert.equal((await call('/start',input)).status,402);
 const row=state.rows[0];row.status='paid';row.orderId=order.orderId;
 state.purchases.push({...order,_id:order.orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,requestId:row._id,nativeService:'neo',featureKey:product.featureKey});
 state.catalog.length=0;
 const pending=await call('/result');assert.equal(pending.status,202);
 const virtual=(await pending.json()).sessionId;assert.equal(virtual,'toss_'+row._id);
 assert.equal((await call('/start',{sessionId:virtual,question:'무시할 변조 입력'})).status,200);
 assert.deepEqual(state.forwarded,input);
 state.doc={id:'neoop-original',idempotencyKey:input.idempotencyKey,userId:auth.userId,inputHash:row.inputHash,paymentId:order.orderId,status:'completed',initialBriefing:{chapter:'저장된 원문'}};
 assert.deepEqual((await (await call('/result?attemptId='+virtual)).json()).initialBriefing,state.doc.initialBriefing);
 assert.equal((await api.nativeNeoLibraryItem({},auth,state.purchases[0])).href,'/neo-operation-room/result/?attemptId=neoop-original');
 await assert.rejects(call('/result?attemptId='+virtual,null,{...auth,ownerId:'other'}),/RESULT_NOT_FOUND/);
 await assert.rejects(call('/result?attemptId='+virtual,null,{...auth,environment:'DEFAULT'}),/RESULT_NOT_FOUND/);
 state.order={...order,status:'REFUNDED'};
 await assert.rejects(call('/result?attemptId='+virtual),/ORDER_REFUNDED/);
 state.order=order;state.identity=false;
 await assert.rejects(call('/result?attemptId='+virtual),/SESSION_EXPIRED/);
 assert.equal(state.web,0);
});
