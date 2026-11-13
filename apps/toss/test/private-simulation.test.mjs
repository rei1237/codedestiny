import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulationApi,products} from '../private-simulation/api.mjs';
const url='https://local.invalid/private-simulation-api';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};};
const request=(api,path,token,body)=>api(new Request(url+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token},...(body===undefined?{}:{body:JSON.stringify(body)})}));
test('private archive simulator serves the 28 existing consultation fixtures and isolates every order',async()=>{
  assert.equal(products.length,28);
  assert.equal(new Set(products.map(p=>p.sku)).size,28);
  const a=storage(),b=storage(),api=createSimulationApi(a,'A'),other=createSimulationApi(b,'B');
  const login=async(fn,person)=>(await (await request(fn,'/login','',{authorizationCode:'private-simulation-person-'+person})).json()).token;
  const token=await login(api,'A'),foreign=await login(other,'B');
  for(const p of products){
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
  assert.equal((await request(reentry,'/native/yoga/prepare',token,{})).status,404);
  assert.equal((await request(reentry,'/library',foreign)).status,401);
});
