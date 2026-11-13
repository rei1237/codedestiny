import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineFixtureApi} from './offline/fixture.mjs';
import {expertProducts} from './offline/experts.mjs';
import {ownsReviewReceipt} from '../src/review-scope.mjs';

for(const product of expertProducts)test(product.service+' recover paid original after closing, reject second account and cross-service result',async()=>{
  const memory=new Map(),storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
  let api=createOfflineFixtureApi(storage);
  const call=(path,body,token='local-mock-token')=>api.handle(new Request('https://code-destiny.com/api/toss'+path,{method:body?'POST':'GET',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
  await call('/login',{});
  const endpoint='/canonical/'+product.api,prepare='/native/'+product.service+'/prepare',input={birthDate:'1990-01-02',question:'이직 준비에 관한 테스트 질문',idempotencyKey:'immutable-'+product.service};
  const {id}=await (await call(prepare,{input})).json();
  assert.ok(id);
  assert.equal((await call(prepare,{input:{...input,question:'다른 질문'}})).status,409);
  assert.equal((await call(endpoint+'/'+product.generation,input)).status,402);
  const purchase={orderId:'order-'+product.service,sku:product.sku,requestId:id};
  assert.equal((await call('/orders/grant',{...purchase,sku:'other'})).status,403);
  assert.ok((await call('/orders/grant',purchase)).ok);
  api=createOfflineFixtureApi(storage);
  const library=async()=> (await call('/library')).json();
  const [pending]=(await library()).purchases;assert.equal(pending.state,'PENDING');
  assert.equal(pending.nativeService,product.service);assert.equal(await ownsReviewReceipt(pending.href,library),true);
  const get=id=>endpoint+'/result?id='+id;
  assert.equal((await call(get(pending.resultId))).status,202);
  storage.setItem('toss-offline-generation-delay-ms','10');
  const resume=product.service==='fusion'?{...input,requestId:input.idempotencyKey}:{resumeSessionId:pending.resultId};
  const generated=await Promise.all([call(endpoint+'/'+product.generation,resume),call(endpoint+'/'+product.generation,resume)]);
  for(const response of generated){assert.equal(response.status,200);assert.match(await response.text(),/테스트 전용 예시/);}
  api=createOfflineFixtureApi(storage);
  const [done]=(await library()).purchases;assert.equal(done.state,'COMPLETED');assert.ok(await ownsReviewReceipt(done.href,library));
  const stored=await (await call(get(done.resultId))).text();assert.match(stored,/테스트 전용 예시/);
  assert.equal((await call(prepare,{input,orderId:purchase.orderId})).status,200);
  assert.equal((await call(prepare,{input,orderId:'other-order'})).status,404);
  await call(endpoint+'/'+product.generation,resume);assert.equal(await (await call(get(done.resultId))).text(),stored);
  const snapshot=JSON.parse(storage.getItem('toss-offline-fixture'));
  assert.equal(snapshot.intents[0][1].generationCount,1);assert.equal(snapshot.orders.length,1);
  const other=expertProducts.find(item=>item!==product);
  assert.equal((await call('/canonical/'+other.api+'/result?id='+done.resultId)).status,404);
  storage.setItem('toss-offline-login-person','second');await call('/login',{});
  assert.equal(await ownsReviewReceipt(done.href,async()=> (await call('/library',null,'local-mock-token-2')).json()),false);
  assert.equal((await call(get(done.resultId),null,'local-mock-token-2')).status,404);
});

