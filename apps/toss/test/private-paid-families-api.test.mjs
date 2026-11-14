import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulationApi} from '../private-simulation/api.mjs';
const memory=()=>{const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};};
const call=(api,person,path,body)=>api(new Request('https://private.invalid/private-simulation-api'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer private-simulation-token-'+person},...(body===undefined?{}:{body:JSON.stringify(body)})}));
test('private paid families authenticate first, reject foreign receipts and preserve unique library rows across restart',async()=>{
 const store=memory();let A=createSimulationApi(store,'A');const B=createSimulationApi(memory(),'B');
 assert.equal((await call(A,'A','/native/relationship/prepare',{input:{}})).status,401);
 for(const [api,person] of [[A,'A'],[B,'B']])await call(api,person,'/login',{authorizationCode:'private-simulation-person-'+person});
 for(const service of ['relationship','sukuyo']){
  const intent=await(await call(A,'A','/native/'+service+'/prepare',{input:{idempotencyKey:'synthetic-'+service,targetInfo:{name:'상대'},personA:{name:'A'},personB:{name:'B'}}})).json();
  const grant={requestId:intent.id,sku:intent.sku,orderId:'private-order-A-'+service};
  assert.equal((await call(A,'A','/orders/grant',{...grant,orderId:'private-order-B-foreign'})).status,403);
  assert.equal((await call(A,'A','/orders/grant',grant)).status,200);
  assert.equal((await call(B,'B','/orders/grant',grant)).status,403);
  const path=service==='sukuyo'?'/canonical/sukuyo-compatibility-ai/result?id=toss_'+intent.id:'/canonical/relationship-boundary-test/result?sessionId=toss_'+intent.id;
  assert.equal((await call(B,'B',path)).status,404);
  assert.equal((await call(A,'A',path)).status,202);
 }
 A=createSimulationApi(store,'A');
 const purchases=(await(await call(A,'A','/library')).json()).purchases;
 assert.equal(purchases.length,2);assert.equal(new Set(purchases.map(row=>row.orderId)).size,2);
 assert.ok(purchases.every(row=>row.href));assert.equal((await(await call(A,'A','/canonical/records')).json()).items.length,2);
 assert.equal((await(await call(B,'B','/library')).json()).purchases.length,0);
});

test('private Vedic example stays public and rejects arbitrary birth inputs without creating orders',async()=>{
 const {vedicExampleBirth}=await import('../private-simulation/vedic-reading.mjs');const store=memory(),api=createSimulationApi(store,'A');
 assert.equal((await call(api,'A','/vedic/reading',{birth:vedicExampleBirth})).status,200);
 assert.equal((await call(api,'A','/vedic/reading',{birth:{...vedicExampleBirth,gender:'M'}})).status,422);
 assert.equal(store.getItem('consultations'),null);
});
