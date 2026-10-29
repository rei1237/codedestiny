import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');

async function adapter(available=true){
 const state={orders:[],ack:[],requests:[],reply:()=>({}),failAck:false};
 globalThis.tossRecoveryTest=state;
 const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../src/platform.ts')],bundle:true,write:false,format:'cjs',platform:'node',plugins:[{name:'offline-sdk',setup(b){
  b.onResolve({filter:/^(@apps-in-toss\/web-framework|\.\/release)$/},args=>({path:args.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='./release'?'export const SERVICE_AVAILABLE='+available+';':`
   export const Environment={environment:'sandbox'},TossAuth={},Storage={},Share={};
   const buy=options=>{globalThis.tossRecoveryTest.purchaseOptions=options;return ()=>{};};buy.isSupported=()=>true;
   export const IAP={createOneTimePurchaseOrder:buy,getPendingOrders:async()=>({orders:globalThis.tossRecoveryTest.orders}),completeProductGrant:async({params})=>{const s=globalThis.tossRecoveryTest;s.ack.push(params.orderId);return !s.failAck;}};
  `}));
 }}]});
 const loaded=new Module('purchase-recovery-check.cjs');loaded._compile(bundle.outputFiles[0].text,loaded.id);
 return {state,restore:loaded.exports.restorePurchases,purchase:loaded.exports.purchase,purchaseTarot:loaded.exports.purchaseTarotLibrary};
}

test('pending purchases use server-owned product routing and acknowledge durable grants only',async()=>{
 const {state,restore}=await adapter(),previous=globalThis.fetch;
 state.orders=[{orderId:'saved',sku:'tarot'},{orderId:'unconfirmed',sku:'consultation'},{orderId:'failed',sku:'other'}];
 globalThis.fetch=async(url,options)=>{
  assert.equal(new URL(url).pathname,'/api/toss/orders/restore');
  const body=JSON.parse(options.body);state.requests.push(body);
  if(body.orderId==='failed')return Response.json({error:'TOSS_PARTNER_UNAVAILABLE'},{status:503});
  return Response.json({orderId:body.orderId,entitlement:'granted',durable:body.orderId==='saved'});
 };
 try{
  assert.deepEqual(await restore(),{recovered:1,failed:2});
  assert.deepEqual(state.ack,['saved']);assert.equal(state.requests.length,3);
  assert.ok(state.requests.every(body=>Object.keys(body).sort().join(',')==='orderId,sku'));
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('an SDK acknowledgement failure remains recoverable and is never counted as success',async()=>{
 const {state,restore}=await adapter(),previous=globalThis.fetch;
 state.orders=[{orderId:'saved',sku:'tarot'}];state.failAck=true;
 globalThis.fetch=async()=>Response.json({orderId:'saved',entitlement:'granted',durable:true});
 try{assert.deepEqual(await restore(),{recovered:0,failed:1});}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const kind of ['purchase','purchaseTarot'])test(kind+' refuses SDK success without a durable matching grant and settles once',async()=>{
 const adapterResult=await adapter(),{state}=adapterResult,previous=globalThis.fetch;
 let done=0;const errors=[];
 globalThis.fetch=async()=>Response.json({orderId:'order',requestId:'other-request',entitlement:'granted',durable:kind==='purchase'});
 try{
  adapterResult[kind]({sku:'mock'},kind==='purchase'?'request':{},()=>done++,error=>errors.push(error));
  assert.equal(await state.purchaseOptions.options.processProductGrant({orderId:'order'}),false);
  state.purchaseOptions.onEvent({type:'success'});state.purchaseOptions.onEvent({type:'success'});
  assert.equal(done,0);assert.equal(errors.length,1);assert.equal(errors[0].code,'GRANT_NOT_DURABLE');
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});
for(const kind of ['purchase','purchaseTarot'])test(kind+' completes only after durable grant, with duplicate event ignored',async()=>{
 const adapterResult=await adapter(),{state}=adapterResult,previous=globalThis.fetch;let done=0;
 globalThis.fetch=async()=>Response.json({orderId:'order',requestId:'request',entitlement:'granted',durable:true});
 try{
  adapterResult[kind]({sku:'mock'},kind==='purchase'?'request':{},()=>done++,error=>assert.fail(error));
  assert.equal(await state.purchaseOptions.options.processProductGrant({orderId:'order'}),true);
  assert.equal(done,0);state.purchaseOptions.onEvent({type:'success'});state.purchaseOptions.onEvent({type:'success'});assert.equal(done,1);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});
test('disabled release cannot even open the native payment sheet',async()=>{
 const {state,purchase,purchaseTarot}=await adapter(false);
 try{for(const buy of [purchase,purchaseTarot])assert.throws(()=>buy({sku:'mock'},'request',()=>{},()=>{}),/TOSS_RELEASE_PENDING/);assert.equal(state.purchaseOptions,undefined);}
 finally{delete globalThis.tossRecoveryTest;}
});
