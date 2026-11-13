import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineFixtureApi} from './offline/fixture.mjs';
import {reviewSdkProducts,reviewCatalog} from './offline/review-fixture.mjs';
import {APPROVED_TOSS_PRODUCTS} from '../../../worker/toss/catalog.js';

function fixture(){
  const memory=new Map(),storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
  let date=new Date('2026-11-08T14:59:00Z'),api=createOfflineFixtureApi(storage,{now:()=>date});
  const request=(route,body,authenticated=true)=>api.handle(new Request('https://code-destiny.com/api/toss'+route,{method:body?'POST':'GET',
    headers:{...(authenticated?{Authorization:'Bearer local-mock-token'}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
  return {request,login:()=>request('/login',{},false),reload(){api=createOfflineFixtureApi(storage,{now:()=>date});},nextDay(){date=new Date('2026-11-08T15:01:00Z');},memory};
}
const makeBody=id=>({productId:id,profileId:'mock-profile',question:'합성 진로 질문',consultationAttemptId:'test-attempt-'+id});

test('the mock SDK and fixture verify the original five product prices',async()=>{
  const f=fixture(),catalog=(await (await f.request('/catalog',null,false)).json()).products;
  assert.equal(catalog.length,5);
  for(const item of reviewCatalog){
    const linked=catalog.find(p=>p.sku===item.sku),sdk=reviewSdkProducts.find(p=>p.sku===item.sku);
    const price=APPROVED_TOSS_PRODUCTS.find(p=>p.productId===item.id.replace(/^yeoni:/,'')).approvedPriceKRW;
    assert.equal(linked.approvedPriceKRW,price);assert.equal(sdk.displayAmount,price.toLocaleString('ko-KR')+'원');
  }
});

test('each mock Saju purchase is tied to its prepared owner-session input and rereads the stored example after reload',async()=>{
  const f=fixture();assert.equal((await f.request('/library')).status,401);await f.login();
  for(const product of reviewCatalog.filter(p=>p.id.startsWith('saju_'))){
    const body=makeBody(product.id),path='/canonical/yeongnyangi/requests';
    assert.equal((await f.request(path,{...body,profileId:'foreign'})).status,400);
    const prepared=(await (await f.request(path,body)).json()).fortune;
    assert.equal((await (await f.request(path,body)).json()).fortune.id,prepared.id);
    assert.equal((await f.request(path,{...body,question:'다른 합성 입력'})).status,409);
    assert.deepEqual(prepared.chapters,[]);assert.equal(prepared.paid,false);
    assert.equal((await f.request(path+'/'+prepared.id+'/generate',{})).status,402);
    const grant={sku:product.sku,orderId:'test-'+product.id,requestId:prepared.id};
    assert.equal((await f.request('/orders/grant',{...grant,sku:'mock-yeoni'})).status,403);
    assert.equal((await f.request('/orders/grant',grant)).status,200);assert.equal((await f.request('/orders/grant',grant)).status,200);
    assert.equal((await f.request('/orders/grant',{...grant,orderId:'different-order'})).status,409);
    const result=(await (await f.request(path+'/'+prepared.id)).json()).fortune;
    assert.equal(result.paid,true);assert.match(result.chapters[0].summary,/테스트 전용/);
    f.reload();
    assert.deepEqual((await (await f.request(path+'/'+prepared.id)).json()).fortune,result);
    assert.equal((await f.request('/orders/restore',{orderId:grant.orderId,sku:product.sku})).status,200);
    assert.equal((await f.request('/orders/restore',{orderId:grant.orderId,sku:'wrong'})).status,403);
    assert.equal((await (await f.request('/library')).json()).purchases.filter(p=>p.requestId===prepared.id).length,1);
    assert.equal((await f.request(path+'/'+prepared.id,null,false)).status,401);
  }
  assert.doesNotMatch(JSON.stringify([...f.memory]),/합성 진로 질문/);
});

test('a mock safety notice precedes preparation and an owned follow-up does not invent an answer',async()=>{
  const f=fixture();await f.login();
  const question='지금 죽고 싶어요';
  for(const [path,body] of [['/canonical/fortune-chat/consultations',{question}],['/canonical/yeongnyangi/requests',{...makeBody('saju_mackerel'),question}],['/canonical/fortune-chat/consultations/recover',{consultation:{question}}],['/prepare',{question}]]){
    const reply=await f.request(path,body);assert.equal(reply.status,422);assert.equal((await reply.json()).error,'TOSS_CRISIS_SUPPORT');
  }
  const path='/canonical/yeongnyangi/requests',prepared=(await (await f.request(path,makeBody('saju_mackerel'))).json()).fortune;
  await f.request('/orders/grant',{requestId:prepared.id,sku:'mock-saju_mackerel',orderId:'test-safety'});
  const followup=path+'/'+prepared.id+'/conversation';
  assert.equal((await f.request(followup,{question})).status,422);
  assert.equal((await f.request('/results/'+prepared.id+'/conversation',{question})).status,422);
  assert.equal((await f.request(followup,{question:'일에서 바꿀 점을 알고 싶어요'})).status,501);
});

test('loss of local persistence does not grant a Saju result',async()=>{
  const api=createOfflineFixtureApi({getItem:()=>null,setItem:()=>{throw Error('storage disabled');}});
  const post=async(path,body)=>api.handle(new Request('https://code-destiny.com/api/toss'+path,{method:'POST',headers:{Authorization:'Bearer local-mock-token','Content-Type':'application/json'},body:JSON.stringify(body)}));
  await post('/login',{});
  const prepared=(await (await post('/canonical/yeongnyangi/requests',makeBody('saju_mackerel'))).json()).fortune;
  const grant=await post('/orders/grant',{requestId:prepared.id,orderId:'test-persistence',sku:'mock-saju_mackerel'});
  assert.equal(grant.status,503);assert.equal(api.state.orders.size,0);assert.equal(api.state.fortunes.get(prepared.id).fortune.paid,false);
});

test('local sample attendance and unlock are idempotent and the stored day result does not cross KST midnight',async()=>{
  const f=fixture();await f.login();
  assert.equal((await f.request('/daily/reading?category=psych')).status,403);
  assert.equal((await f.request('/daily/unlock',{})).status,409);
  for(let i=0;i<2;i++)assert.equal((await (await f.request('/daily/attendance',{})).json()).balance,3);
  for(let i=0;i<2;i++)assert.equal((await (await f.request('/daily/unlock',{})).json()).balance,0);
  assert.equal((await f.request('/daily/reading',{category:'basic',draft:{}})).status,400);
  const row=await (await f.request('/daily/reading',{category:'psych',draft:{}})).json();assert.match(row.title,/테스트 전용/);
  f.reload();assert.deepEqual((await (await f.request('/daily/reading?category=psych')).json()).result,row);
  f.nextDay();assert.equal((await (await f.request('/daily/status')).json()).unlocked,false);
  assert.equal((await f.request('/daily/reading?category=psych')).status,403);
});
