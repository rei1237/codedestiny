import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineFixtureApi} from './offline/fixture.mjs';
import {reviewSdkProducts,reviewCatalog,unsoldFixtureProducts,unsoldLetters} from './offline/review-fixture.mjs';
import {APPROVED_TOSS_PRODUCTS} from '../../../worker/toss/catalog.js';

function fixture(){
  const memory=new Map(),storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
  let date=new Date('2026-11-08T14:59:00Z'),api=createOfflineFixtureApi(storage,{now:()=>date});
  const request=(route,body,authenticated=true)=>api.handle(new Request('https://code-destiny.com/api/toss'+route,{method:body?'POST':'GET',
    headers:{...(authenticated?{Authorization:'Bearer local-mock-token'}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
  const asAccount=(route,token)=>api.handle(new Request('https://code-destiny.com/api/toss'+route,{headers:{Authorization:'Bearer '+token}}));
  return {request,asAccount,login:()=>request('/login',{},false),reload(){api=createOfflineFixtureApi(storage,{now:()=>date});},nextDay(){date=new Date('2026-11-08T15:01:00Z');},memory};
}
const makeBody=id=>({productId:id,profileId:'mock-profile',question:'합성 진로 질문',consultationAttemptId:'test-attempt-'+id});

test('the mock SDK and fixture verify the original five product prices',async()=>{
  const f=fixture(),catalog=(await (await f.request('/catalog',null,false)).json()).products;
  assert.equal(reviewCatalog.length,5);
  assert.equal(catalog.length,reviewCatalog.length+unsoldFixtureProducts.length+unsoldLetters.length);
  for(const item of reviewCatalog){
    const linked=catalog.find(p=>p.sku===item.sku),sdk=reviewSdkProducts.find(p=>p.sku===item.sku);
    const price=APPROVED_TOSS_PRODUCTS.find(p=>p.productId===item.id.replace(/^yeoni:/,'')).approvedPriceKRW;
    assert.equal(linked.approvedPriceKRW,price);assert.equal(sdk.displayAmount,price.toLocaleString('ko-KR')+'원');
  }
});

test('both letter rooms bind all six base methods to their own owner, order and result',async()=>{
 const f=fixture(),path='/canonical/fortune-chat/consultations';
 await f.login();
 const letters=[...unsoldLetters,reviewCatalog.find(p=>p.id==='yeoni:chat_saju')];
 assert.equal(new Set(letters.map(p=>p.sku)).size,12);
 for(const product of letters){
   const [persona,productId]=product.id.split(':'),domain=productId.slice(5);
   const input={persona,domain,question:'합성 질문입니다.',consultationAttemptId:'local-'+domain};
   const {consultation}=await (await f.request(path,input)).json();
   assert.equal(consultation.persona,persona);
   const other=letters.find(p=>p.id===(persona==='yeoni'?'neo':'yeoni')+':'+productId);
   const grant={requestId:consultation.id,orderId:'mock-'+product.sku,sku:product.sku};
   assert.equal((await f.request('/orders/grant',{...grant,sku:other.sku})).status,403);
   assert.equal((await f.request('/orders/grant',grant)).status,200);
   assert.equal((await f.request('/orders/restore',{...grant,sku:other.sku})).status,403);
   assert.equal((await (await f.request(path,input)).json()).consultation.id,consultation.id);
   const {consultations}=await (await f.request(path+'?persona='+persona)).json();
   assert.ok(consultations.every(r=>r.persona===persona));
   const {consultation:stored}=await (await f.request(path+'/'+consultation.id)).json();
   assert.match(stored.chapters[0].summary,new RegExp(persona==='yeoni'?'연이':'네오'));
 }
});

test('all 24 unregistered single and combined mock grants use isolated test SKUs and survive a restart',async()=>{
 const f=fixture();
 await f.login();
 assert.equal(unsoldFixtureProducts.length,24);assert.equal(new Set(unsoldFixtureProducts.map(p=>p.sku)).size,24);
 for(const product of unsoldFixtureProducts){
  assert.ok(!APPROVED_TOSS_PRODUCTS.some(row=>row.productId===product.id||row.sku===product.sku));
  const path='/canonical/yeongnyangi/requests',prepared=await (await f.request(path,makeBody(product.id))).json();
  const {id}=prepared.fortune,order={orderId:'test-'+product.sku,requestId:id,sku:product.sku};
  assert.equal(prepared.fortune.product.domain,product.id.startsWith('fusion_')?(product.id==='fusion_all'?'saju':product.id.split('_')[1]):product.id.split('_')[0]);
  assert.equal((await f.request('/orders/grant',{...order,sku:'mock-yeoni'})).status,403);
  assert.equal((await f.request('/orders/grant',order)).status,200);
  const result=(await (await f.request(path+'/'+id)).json()).fortune;
  assert.equal(result.state,'COMPLETED');
  f.reload();assert.deepEqual((await (await f.request(path+'/'+id)).json()).fortune,result);
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

test('a lost grant response, restart and second person preserve exactly one owned order and generation',async()=>{
 const f=fixture(),path='/canonical/yeongnyangi/requests',body=makeBody('saju_mackerel');
 f.memory.set('toss-offline-generation-delay-ms','60000');
 await f.login();
 const id=(await (await f.request(path,body)).json()).fortune.id;
 const order={requestId:id,orderId:'lost-response',sku:'mock-saju_mackerel'};
 // The grant is durably accepted. The client loses its reply before it can acknowledge.
 await f.request('/orders/grant',order);
 f.reload();
 assert.equal((await (await f.request(path+'/'+id)).json()).fortune.state,'GENERATING');
 assert.equal((await f.request('/orders/grant',order)).status,200);
 assert.equal((await f.request('/orders/restore',order)).status,200);
 assert.equal((await f.request('/orders/grant',{...order,orderId:'second-order'})).status,409);
 assert.equal((await f.request('/logout',{})).status,200);
 assert.equal((await f.request(path+'/'+id)).status,401);
 f.memory.set('toss-offline-login-person','second');
 const token=(await (await f.login()).json()).token;
 const storage={getItem:key=>f.memory.get(key),setItem:(key,value)=>f.memory.set(key,value)};
 const api=createOfflineFixtureApi(storage);
 const second=(route,input)=>api.handle(new Request('https://code-destiny.com/api/toss'+route,{
   method:input?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:input?JSON.stringify(input):undefined
 }));
 assert.equal((await (await second('/canonical/auth/me')).json()).user.id,'offline-test-user-2');
 assert.deepEqual((await (await second('/library')).json()).purchases,[]);
 assert.equal((await second(path+'/'+id)).status,404);
 assert.equal((await second('/orders/restore',order)).status,403);
 const otherId=(await (await second(path,body)).json()).fortune.id;
 assert.notEqual(otherId,id);
 assert.equal((await second('/orders/grant',{...order,requestId:otherId})).status,403);
 f.memory.delete('toss-offline-login-person');
 f.reload();await f.login();f.nextDay();
 const result=(await (await f.request(path+'/'+id)).json()).fortune;
 assert.equal(result.state,'COMPLETED');
 assert.deepEqual((await (await f.request(path+'/'+id+'/generate',{})).json()).fortune,result);
 const saved=JSON.parse(f.memory.get('toss-offline-fixture'));
 assert.equal(saved.orders.length,1);assert.equal(saved.fortunes.length,1);
 assert.equal(saved.fortunes[0][1].generationCount,1);
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
  f.memory.set('toss-offline-login-person','second');
  const token=(await (await f.login()).json()).token;
  const secondStatus=await (await f.asAccount('/daily/status',token)).json();
  assert.equal(secondStatus.unlocked,false);assert.equal(secondStatus.attended,false);assert.equal(secondStatus.balance,2);
  assert.equal((await f.asAccount('/daily/reading?category=psych',token)).status,403);
  f.nextDay();assert.equal((await (await f.request('/daily/status')).json()).unlocked,false);
  assert.equal((await f.request('/daily/reading?category=psych')).status,403);
});
