import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineFixtureApi} from './offline/fixture.mjs';
import {roomProducts} from './offline/room-fixture.mjs';

for(const product of roomProducts)test(product.name+' resumes only the original owner and order',async()=>{
  const service=product.id.split(':')[1],tea=service==='tea';
  const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
  let api=createOfflineFixtureApi(storage),account='';
  const request=(path,body)=>api.handle(new Request('https://code-destiny.com/api/toss'+path,{
    method:body?'POST':'GET',headers:{Authorization:'Bearer local-mock-token'+account},
    ...(body?{body:JSON.stringify(body)}:{}),
  }));
  const generate=tea?'/canonical/fortune-tea-house/consult':'/canonical/neo-operation-room/start';
  const input={idempotencyKey:'synthetic-question-one',question:'가상 질문',featureKey:product.featureKey,selectedMethod:'saju'};
  const prepare='/native/'+service+'/prepare';
  assert.equal((await request(prepare,{input})).status,401);
  await request('/login',{});
  const saved=await (await request(prepare,{input})).json();
  const grant={requestId:saved.id,sku:product.sku,orderId:'local-order'};
  assert.equal((await request(generate,input)).status,402);
  assert.equal((await request('/orders/grant',grant)).status,200);
  // Drop the grant response and rebuild the isolated API over the same device storage.
  api=createOfflineFixtureApi(storage);
  assert.equal((await request('/orders/restore',grant)).status,200);
  assert.equal((await request(prepare,{input,orderId:grant.orderId})).status,200);
  assert.equal((await request('/orders/grant',{...grant,orderId:'duplicate'})).status,409);
  const pendingPath=tea?'/canonical/fortune-tea-house/pending?resultId='+saved.resultId:'/canonical/neo-operation-room/result?attemptId=toss_'+saved.id;
  const pending=await request(pendingPath);
  assert.equal(pending.status,202);
  const checkpoint=await pending.json();
  const resumed=tea?checkpoint.requestPayload:{sessionId:checkpoint.sessionId};
  const first=await (await request(generate,resumed)).json();
  const resultPath=tea?'/canonical/fortune-tea-house/results/'+saved.resultId:'/canonical/neo-operation-room/result?attemptId='+saved.resultId;
  assert.deepEqual(await (await request(generate,input)).json(),first);
  assert.deepEqual(await (await request(resultPath)).json(),first);
  assert.equal(api.state.intents.get(saved.id).generationCount,1);
  assert.equal(api.state.orders.size,1);
  const send=tea?resultPath+'/follow-up':'/canonical/neo-operation-room/refine';
  const responseInput=n=>tea?{question:'가상 추가 질문 '+n,clientQuestionId:'test-'+n}:{sessionId:saved.resultId,selectedChecks:[],freeform:'현실 점검 '+n};
  const follow=await (await request(send,responseInput(1))).json();
  const replay=await (await request(send,responseInput(1))).json();
  assert.deepEqual(tea?follow.followUp:follow.refinedOrder,tea?replay.followUp:replay.refinedOrder);
  if(!tea)assert.equal((await request(send,responseInput(2))).status,200);
  assert.equal((await request(send,responseInput(3))).status,409);
  assert.equal(api.state.orders.size,1);
  memory.set('toss-offline-login-person','second');account='-2';
  await request('/login',{});
  assert.equal((await request(resultPath)).status,404);
  assert.equal((await request(send,responseInput(1))).status,404);
  assert.equal((await request('/orders/restore',grant)).status,403);
  assert.equal((await request('/orders/grant',grant)).status,403);
  assert.deepEqual((await (await request('/canonical/records')).json()).items,[]);
});
