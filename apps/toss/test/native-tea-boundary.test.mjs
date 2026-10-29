import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const auth={_id:'identity',ownerId:'owner',userId:'owner',revision:1,userKey:'123',environment:'SANDBOX'};
const product={approved:true,nativeService:'tea',sku:'offline-tea',featureKey:'fortune-tea-house-tarot-consultation',
  productId:'native:tea:fortune-tea-house-tarot-consultation',approvedPriceKRW:6000,priceEvidence:'offline fixture'};
const input={requestId:'original',resultId:'fortune-tea-house:original',featureKey:product.featureKey,question:'원본 질문'};
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
globalThis.__nativeTeaBoundary=state;
const root=path.resolve(import.meta.dirname,'../../..');
const stubs={
 'worker/toss/native-neo.js':"export const nativeNeoLibraryItem=()=>{};",
  'worker/toss/models.js':'export const {TossNativeConsultation,TossPurchase,TossIdentity}=globalThis.__nativeTeaBoundary.models;',
  'worker/toss/catalog.js':'export const APPROVED_TOSS_NATIVE_PRODUCTS=globalThis.__nativeTeaBoundary.catalog;',
  'worker/toss/partner.js':'export const lookupOrder=async()=>{globalThis.__nativeTeaBoundary.lookups++;return globalThis.__nativeTeaBoundary.order;};',
  'worker/toss/purchases.js':'export const purchaseStore={};export const recordTossRefund=async()=>{globalThis.__nativeTeaBoundary.refunds++;};',
  'worker/lib/billing-feature-registry.js':'export const getBillingFeaturePricing=()=>({pricing:{amountKRW:6000}});',
  'worker/routes/fortune-tea-house.js':`
    import {nativeTossContext} from '../toss/native-context.js';
    import {createHash} from 'node:crypto';
    export const nativeTeaContract=input=>({requestId:input.requestId,resultId:input.resultId,featureKey:input.featureKey,
      inputHash:createHash('sha256').update(JSON.stringify(input)).digest('hex'),pricing:{amountKRW:6000}});
    export const nativeTeaStoredState=async()=>globalThis.__nativeTeaBoundary.doc;
    export async function handleFortuneTeaHouseRoutes(request){
      if(request.headers.get('Authorization')||request.headers.get('Cookie'))throw Error('WEB_CREDENTIAL_FORWARDED');
      const context=nativeTossContext(request);if(!context){globalThis.__nativeTeaBoundary.web++;throw Error('WEB_AUTH_FORBIDDEN');}
      const path=new URL(request.url).pathname;
      if(path.endsWith('/pending'))return Response.json({ok:false},{status:404});
      if(path.includes('/results/')){await context.assertStored(globalThis.__nativeTeaBoundary.doc);return Response.json({result:globalThis.__nativeTeaBoundary.doc.result});}
      const access=await context.access(await request.json());return access.response||Response.json({ok:true,paymentId:access.accessDecision.paymentId,pricing:access.pricing});
    }`,
};
const bundle=await build({entryPoints:[path.join(root,'worker/toss/native-tea.js')],bundle:true,platform:'node',format:'cjs',write:false,
  plugins:[{name:'offline-native-boundaries',setup(b){b.onLoad({filter:/\.js$/},args=>{const contents=stubs[path.relative(root,args.path).replaceAll('\\','/')];if(contents)return {contents,loader:'js'};});}}]});
const loaded=new Module(path.join(root,'native-tea-boundary.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const api=loaded.exports;
const call=(suffix,body,who=auth)=>api.handleNativeTea(new Request('https://example.invalid'+suffix,{method:body?'POST':'GET',
  headers:{Cookie:'must-not-forward',Authorization:'must-not-forward'},...(body?{body:JSON.stringify(body)}:{})}),{},who,suffix);

test('native adapter preserves immutable input, proves live orders and rereads the saved original after catalog removal',async()=>{
  const prepared=await api.prepareNativeTea({},auth,input);
  assert.equal(prepared.paid,false);assert.equal(state.rows.length,1);
  assert.deepEqual(await api.prepareNativeTea({},auth,input),prepared);
  await assert.rejects(api.prepareNativeTea({},auth,{...input,question:'변경한 질문'}),/REQUEST_INPUT_MISMATCH/);
  assert.equal((await call('/ensure-access',input)).status,402);
  const row=state.rows[0];row.status='paid';row.orderId=order.orderId;
  state.purchases.push({...order,_id:order.orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,
    requestId:row._id,nativeService:'tea',featureKey:product.featureKey});
  state.catalog.length=0;
  const access=await (await call('/ensure-access',input)).json();assert.equal(access.paymentId,order.orderId);
  // Simulate an acknowledged purchase whose generator has not created a checkpoint yet.
  const pending=await call('/pending');assert.equal(pending.status,202);assert.deepEqual((await pending.json()).requestPayload,input);
  state.doc={userId:auth.userId,resultId:row.resultId,featureKey:row.featureKey,generationRequestHash:row.inputHash,
    deliveryAccessKey:order.orderId,status:'completed',result:{original:'저장된 원문',tarotSpreadCards:[{cardId:'P10'}]}};
  assert.deepEqual((await (await call('/results/original')).json()).result,state.doc.result);
  assert.equal((await api.nativeTeaLibraryItem({},auth,state.purchases[0])).state,'COMPLETED');
  assert.equal((await call('/pending')).status,404);
  await assert.rejects(api.readNativeTeaIntent({}, {...auth,ownerId:'other'},prepared.id),/RESULT_NOT_FOUND/);
  await assert.rejects(api.readNativeTeaIntent({}, {...auth,environment:'DEFAULT'},prepared.id),/RESULT_NOT_FOUND/);
  state.order={...order,status:'REFUNDED'};
  await assert.rejects(call('/results/original'),/ORDER_REFUNDED/);assert.equal(state.refunds,1);
  state.order=order;state.identity=false;
  await assert.rejects(call('/results/original'),/SESSION_EXPIRED/);
  assert.equal(state.web,0);assert.ok(state.lookups>=3);
});
