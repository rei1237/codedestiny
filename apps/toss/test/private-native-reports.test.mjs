import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReportProducts,nativeReportRequest} from '../private-simulation/native-reports.mjs';
import {createSimulationApi} from '../private-simulation/api.mjs';

const profiles=[{id:'mock-profile',profileId:'mock-profile',gender:'F',birthDate:'1990-01-01',birth:{year:1990,month:1,day:1,timeUnknown:false,hour:8,minute:35}}];
const state=()=>({profiles:structuredClone(profiles),intents:new Map(),orders:new Map(),letters:new Map(),sequence:0});
const now=()=>new Date('2026-11-14T00:00:00Z');
const birthInfo={birthDate:'1990-01-01',gender:'F',timeUnknown:true};
function inputFor(product){
  const service=product.id.split(':')[1],base={requestId:'same-attempt',featureKey:product.featureKey};
  if(service==='life-book')return {...base,serviceType:product.featureKey,consultationType:product.featureKey.startsWith('life-fortune')?'lifeFortune':'lifeBook',birthInfo,topic:'내 삶의 방향을 읽고 싶어요.'};
  if(service==='guardian'||service==='sibyl')return {...base,profileId:'mock-profile',year:2026};
  if(service==='palm')return {...base,reading:{rightPalmImage:'data:image/png;base64,c3ludGhldGlj',dominantHand:'right',analysisPurpose:'general'}};
  if(service.startsWith('totem-'))return {...base,mode:service==='totem-deep'?'five':'three',animalIds:service==='totem-deep'?['lion','wolf','owl','fox','bear']:['lion','wolf','owl'],question:'어떤 선택을 할까요?'};
  if(service==='saju-compat')return {...base,compatType:'friend',partnerName:'상대',self:{pillars:['a','b','c','d']},partner:{pillars:['a','b','c','d']},facts:{score:55}};
  if(service==='geomancy')return {...base,question:'어떤 선택을 할까요?',counts:Array(16).fill(2)};
  if(service==='codex')return {...base,mode:product.featureKey.endsWith('-compat')?'compat':'solo',reading:{birthInfo,...(product.featureKey.endsWith('-compat')?{partnerInfo:{...birthInfo,birthDate:'1992-02-02'}}:{})}};
  if(service==='naming')return {...base,input:{familyName:'김',birthDate:'1990-01-01',gender:'F'}};
  if(service==='dream')return {...base,dreamText:'바닷가에서 오래된 열쇠를 발견했어요.'};
  return {...base,profileId:'mock-profile',year:2026,question:'올해의 흐름을 알고 싶어요.'};
}
const call=async(s,path,body)=>{
  const url=new URL('https://mock.invalid/private-simulation-api'+path);
  const req=new Request(url,{method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body),headers:{'content-type':'application/json'}})});
  return nativeReportRequest(req,url,path,s,()=>true,now);
};

test('native simulation catalog is separate from tea, Neo and production SKU',()=>{
  assert.equal(nativeReportProducts.length,14);
  assert.equal(new Set(nativeReportProducts.map(p=>p.sku)).size,14);
  for(const p of nativeReportProducts){assert.equal(p.approvedPriceKRW,1);assert.match(p.sku,/^mock-/);assert.doesNotMatch(p.id,/^native:(tea|neo):/);}
});

for(const product of nativeReportProducts)test(product.featureKey+' keeps one intent, exact SKU, immutable input and owner-local result',async()=>{
  let s=state();const service=product.id.split(':')[1],input=inputFor(product),prepare='/native/'+service+'/prepare';
  const response=await call(s,prepare,{input});assert.equal(response.status,200);
  const row=await response.json(),id=row.id;
  assert.equal(row.sku,product.sku);assert.equal(s.intents.size,1);
  assert.equal((await (await call(s,prepare,{input})).json()).id,id);
  assert.equal((await call(s,'/orders/grant',{requestId:id,sku:'mock-other',orderId:'private-order-A-1'})),null);
  assert.equal((await call(s,'/orders/grant',{requestId:'f'.repeat(64),sku:product.sku,orderId:'private-order-A-1'})).status,403);
  const grant={requestId:id,sku:product.sku,orderId:'private-order-A-1'};
  assert.equal((await call(s,'/orders/grant',grant)).status,200);
  assert.equal((await call(s,'/orders/grant',grant)).status,200);
  assert.equal(s.orders.size,1);
  assert.equal((await call(s,'/orders/grant',{...grant,orderId:'private-order-A-2'})).status,409);
  const saved=structuredClone(s);s={...saved,intents:new Map(saved.intents),orders:new Map(saved.orders)};
  assert.equal((await call(s,'/orders/restore',grant)).status,200);
  assert.equal((await call(state(),'/orders/restore',grant)).status,403);
  assert.equal((await call(state(),'/native/'+service+'/intents/'+id)).status,404);
  if(!['guardian','sibyl'].includes(service)){
    const changed=structuredClone(input);if(service==='palm')changed.reading.rightPalmImage+='changed';else changed.question='different input';
    assert.equal((await call(s,prepare,{input:changed})).status,409);
  }
  if(['guardian','sibyl'].includes(service))return;
  const resultPath=service==='life-book'?'/canonical/life-book-ai/generate':'/native/'+service+'/results/'+id;
  if(service==='life-book')assert.equal((await call(s,resultPath,{...input,topic:'Changed after payment'})).status,409);
  for(let i=0;i<2;i++)assert.ok((await call(s,resultPath,service==='palm'?undefined:service==='life-book'?input:{})).ok);
  const result=structuredClone(s.intents.get(id).result);assert.ok(result);
  const generations=s.intents.get(id).generationCount??s.intents.get(id).generations;
  assert.equal(generations,1);
  const readPath=service==='life-book'?'/canonical/life-book-ai/result?attemptId='+input.requestId:resultPath;
  // The wrapper receives URL pathname separately, as the simulation API does.
  const resultUrl=new URL('https://mock.invalid'+readPath);
  const reread=await nativeReportRequest(new Request(resultUrl),resultUrl,resultUrl.pathname,s,()=>true,now);
  assert.ok(reread.ok);assert.deepEqual(s.intents.get(id).result,result);
  assert.equal((await nativeReportRequest(new Request(resultUrl),resultUrl,resultUrl.pathname,state(),()=>true,now)).status,404);
});

test('private API authenticates native orders and isolates owner B after cold reopen',async()=>{
 const stores={A:new Map(),B:new Map()},storage=person=>({getItem:key=>stores[person].get(key)??null,setItem:(key,value)=>stores[person].set(key,value)});
 const apis={A:createSimulationApi(storage('A'),'A'),B:createSimulationApi(storage('B'),'B')};
 const request=(person,path,body,token=true)=>apis[person](new Request('https://mock.invalid/private-simulation-api'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer private-simulation-token-'+person}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}));
 for(const person of ['A','B'])assert.equal((await request(person,'/login',{authorizationCode:'private-simulation-person-'+person},false)).status,200);
 const input=inputFor(nativeReportProducts.find(p=>p.id.includes(':dream:')));
 assert.equal((await request('A','/native/dream/prepare',{input},false)).status,401);
 const row=await (await request('A','/native/dream/prepare',{input})).json();
 const grant={sku:row.sku,requestId:row.id,orderId:'private-order-A-1'};
 assert.equal((await request('A','/orders/grant',{...grant,orderId:'private-order-B-1'})).status,403);
 assert.equal((await request('A','/orders/grant',grant)).status,200);
 const path='/native/dream/results/'+row.id;
 await request('A',path,{});apis.A=createSimulationApi(storage('A'),'A');await request('A',path,{});
 const original=await (await request('A',path)).json();assert.equal(original.saved,true);
 apis.A=createSimulationApi(storage('A'),'A');assert.deepEqual(await (await request('A',path)).json(),original);
 assert.equal((await request('B',path)).status,404);
 assert.equal((await request('B','/orders/restore',grant)).status,403);
 assert.equal((await (await request('B','/canonical/records')).json()).items.length,0);
 const saved=JSON.parse(stores.A.get('consultations'));assert.equal(saved.orders.length,1);assert.equal(saved.intents[0][1].generationCount,1);
});
