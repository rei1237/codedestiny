import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulationApi,products,skyExample} from '../private-simulation/api.mjs';
const url='https://local.invalid/private-simulation-api';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};};
const request=(api,path,token,body)=>api(new Request(url+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token},...(body===undefined?{}:{body:JSON.stringify(body)})}));
test('Prashna simulation grants only the separate SKU and reads the same two saved stages',async()=>{
 const a=storage(),b=storage(),api=createSimulationApi(a,'A'),other=createSimulationApi(b,'B');
 const login=async(fn,person)=>(await (await request(fn,'/login','',{authorizationCode:'private-simulation-person-'+person})).json()).token;
 const token=await login(api,'A'),foreign=await login(other,'B'),route='/canonical/yeongnyangi/requests';
 const input={...skyExample.input,mode:'prashna-v1',productId:'saju_flounder',consultationAttemptId:'one-sky-request'};
 assert.equal((await request(api,'/canonical/yeongnyangi/free/horary','',skyExample.input)).status,200);
 assert.equal((await request(api,route,token,{...input,question:'다른 질문으로 물어봐도 될까요?'})).status,422);
 const prepared=await (await request(api,route,token,input)).json(),id=prepared.fortune.id;
 assert.equal((await (await request(api,route,token,input)).json()).fortune.id,id);
 const pay={requestId:id,orderId:'private-order-A-sky',sku:'mock-yeongnyangi-prashna'};
 for(const sku of ['mock-yn-saju-flounder',products.find(item=>item.id==='saju_flounder').sku,'real-console-sku'])assert.equal((await request(api,'/orders/grant',token,{...pay,sku})).status,403);
 assert.equal((await request(api,'/orders/grant',token,pay)).status,200);
 assert.equal((await request(api,'/orders/grant',token,pay)).status,200);
 assert.equal((await request(other,'/results/'+id,foreign)).status,404);
 await new Promise(resolve=>setTimeout(resolve,1150));
 const reopened=createSimulationApi(a,'A'),first=(await (await request(reopened,route+'/'+id,token)).json()).fortune;
 assert.equal(first.state,'AWAITING_FOLLOWUP');assert.equal(first.chapters.length,1);
 const followup={question:'제가 먼저 확인할 점은 무엇인가요?'};
 assert.equal((await request(reopened,route+'/'+id+'/follow-up',token,followup)).status,200);
 await new Promise(resolve=>setTimeout(resolve,1150));
 const saved=(await (await request(createSimulationApi(a,'A'),route+'/'+id,token)).json()).fortune;
 assert.equal(saved.state,'COMPLETED');assert.deepEqual(saved.chapters[0],first.chapters[0]);
 assert.deepEqual(saved.chapters.map(c=>c.id),skyExample.prashna.manifest.map(c=>c.id));
 assert.equal((await request(reopened,route+'/'+id+'/follow-up',token,{question:'두 번째로 더 물어볼 수 있을까요?'})).status,409);
});
test('private archive simulator serves the 28 existing consultation fixtures and isolates every order',async()=>{
  assert.equal(products.length,29);
  assert.equal(new Set(products.map(p=>p.sku)).size,29);
  const a=storage(),b=storage(),api=createSimulationApi(a,'A'),other=createSimulationApi(b,'B');
  const login=async(fn,person)=>(await (await request(fn,'/login','',{authorizationCode:'private-simulation-person-'+person})).json()).token;
  const token=await login(api,'A'),foreign=await login(other,'B');
  for(const p of products.filter(item=>item.id!=='prashna-v1')){
    assert.match(p.sku,/^mock-/);
    const args={productId:p.id,profileId:'mock-profile',question:'새로운 일의 우선순위를 알고 싶어요.',consultationAttemptId:'attempt-'+p.id};
    const {fortune}=await (await request(api,'/canonical/yeongnyangi/requests',token,args)).json();
    const pay={orderId:'private-order-A-'+p.id,requestId:fortune.id,sku:p.sku};
    assert.equal((await request(api,'/orders/grant',token,pay)).status,200);
    assert.equal((await request(api,'/orders/grant',token,pay)).status,200);
    assert.equal((await request(other,'/orders/grant',foreign,pay)).status,403);
    assert.equal((await request(other,'/results/'+fortune.id,foreign)).status,404);
    assert.equal((await request(api,'/orders/restore',token,{...pay,sku:'real-console-sku'})).status,403);
  }
  const reentry=createSimulationApi(a,'A');
  const library=await (await request(reentry,'/library',token)).json();
  assert.equal(library.purchases.length,28);assert.ok(library.purchases.every(row=>row.serviceId==='yeongnyangi'));
  assert.ok(JSON.parse(a.getItem('consultations')).fortunes.every(([,row])=>row.generationCount===1));
  assert.equal((await request(reentry,'/native/unsupported/prepare',token,{})).status,404);
  assert.equal((await request(reentry,'/native/yoga/prepare',token,{})).status,400);
  assert.equal((await request(reentry,'/library',foreign)).status,401);
});

for(const service of ['tea','neo'])test('private '+service+' persists the receipt across interrupted generation and denies other owners',async()=>{
 const data=storage();let api=createSimulationApi(data,'A');
 const token=(await (await request(api,'/login','',{authorizationCode:'private-simulation-person-A'})).json()).token;
 const products=(await (await request(api,'/native/catalog',token)).json()).products;
 const product=products.find(p=>p.id.startsWith('native:'+service+':'));
 assert.notEqual(product.sku,'mock-yeoni');assert.equal(product.approvedPriceKRW,1);
 const input={idempotencyKey:'one-request',question:'테스트 질문입니다.',method:'vedic',featureKey:product.featureKey};
 const route='/native/'+service+'/prepare';
 const row=await (await request(api,route,token,{input})).json();
 const grant={requestId:row.id,orderId:'private-order-A-one',sku:product.sku};
 const generate=service==='tea'?'/canonical/fortune-tea-house/consult':'/canonical/neo-operation-room/start';
 assert.equal((await request(api,generate,token,input)).status,402);
 assert.equal((await request(api,'/orders/grant',token,{...grant,sku:'mock-yeoni'})).status,403);
 assert.equal((await request(api,'/orders/grant',token,grant)).status,200);
 api=createSimulationApi(data,'A');
 assert.equal((await request(api,'/orders/restore',token,grant)).status,200);
 assert.equal((await request(api,'/orders/grant',token,grant)).status,200);
 assert.equal((await (await request(api,route,token,{input})).json()).id,row.id);
 const result=await (await request(api,generate,token,input)).json();
 if(service==='neo'){
  assert.equal(result.selectedMethod,'vedic');
  assert.equal(result.initialBriefing.selectedMethod,'vedic');
  assert.equal((await request(api,generate,token,{...input,method:'astrology'})).status,409);
 }
 assert.deepEqual(await (await request(createSimulationApi(data,'A'),generate,token,input)).json(),result);
 const saved=JSON.parse(data.getItem('consultations'));assert.equal(saved.orders.length,1);assert.equal(saved.intents[0][1].generationCount,1);
 const other=createSimulationApi(storage(),'B'),foreign=(await (await request(other,'/login','',{authorizationCode:'private-simulation-person-B'})).json()).token;
 const read=service==='tea'?'/canonical/fortune-tea-house/results/'+row.resultId:'/canonical/neo-operation-room/result?attemptId='+row.resultId;
 assert.equal((await request(other,read,foreign)).status,404);
 assert.equal((await request(other,'/orders/restore',foreign,grant)).status,403);
 assert.equal((await (await request(other,'/canonical/records',foreign)).json()).items.length,0);
});
