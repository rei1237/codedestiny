import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulationApi} from '../private-simulation/api.mjs';
import {CHAT_DOMAINS,chatFishForDomain} from '../../../lib/fortune/chat-products.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};};
const call=(api,path,token,body)=>api(new Request('https://local.invalid/private-simulation-api'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token},...(body===undefined?{}:{body:JSON.stringify(body)})}));
const login=async(api,person)=>(await (await call(api,'/login','',{authorizationCode:'private-simulation-person-'+person})).json()).token;
for(const domain of CHAT_DOMAINS)for(const fishId of chatFishForDomain(domain))test('private letter '+domain+' '+fishId+' preserves scope, draw, one order and followup after restart',async()=>{
 const data=storage();let api=createSimulationApi(data,'A');const token=await login(api,'A');
 const path='/canonical/fortune-chat/consultations';
 const input={persona:'yeoni',domain,fishId,question:'부탁을 거절할 때 어떤 말부터 하면 좋을까요?',profileId:'mock-profile',consultationAttemptId:'test-'+domain+'-'+fishId,
 questionDecision:{version:'question-consultation-20261007',category:'self',target:'self',horizon:'current',situation:'부탁이 이어져 쉬는 시간이 짧아요.',options:'',period:'',constraints:'',confirmed:true},
 ...(domain==='tarot'?{tarotSpreadId:'yn_knot_three',tarotInputs:{}}:{})};
 const prepared=await call(api,path,token,input);assert.equal(prepared.status,200);
 const row=(await prepared.json()).consultation,id=row.id;
 const grant={requestId:id,sku:'mock-question-yeoni-'+domain+'-'+fishId,orderId:'private-order-A-'+domain+'-'+fishId};
 assert.equal((await call(api,'/orders/grant',token,{...grant,sku:'mock-yeoni'})).status,403);
 if(domain==='tarot'){
  assert.equal(row.state,'AWAITING_DRAW');
  assert.equal((await call(api,'/orders/grant',token,grant)).status,409);
  assert.equal((await call(api,path+'/'+id+'/draw',token,{picks:[0,0,0]})).status,400);
  assert.equal((await call(api,path+'/'+id+'/draw',token,{picks:[0,1,2]})).status,200);
 }
 assert.equal((await call(api,'/orders/grant',token,grant)).status,200);
 api=createSimulationApi(data,'A');
 assert.equal((await call(api,'/orders/grant',token,grant)).status,200);
 assert.equal((await (await call(api,path,token,input)).json()).consultation.id,id);
 assert.equal((await call(api,path,token,{...input,question:'변경된 질문'})).status,409);
 let saved=(await (await call(api,path+'/'+id,token)).json()).consultation;
 assert.deepEqual(saved.input,input);assert.equal(saved.paid,true);assert.equal(saved.state,'COMPLETED');
 if(domain==='tarot')assert.deepEqual(saved.tarotSpread.picks,[0,1,2]);
 const original=structuredClone(saved.chapters),limit={mackerel:0,salmon:1,flounder:2,tuna:6}[fishId];
 assert.equal(saved.conversation.limit,limit);
 for(let i=0;i<limit;i++){
  const follow={id:'follow-'+i,question:'이어서 묻는 질문 '+i};
  assert.equal((await call(api,path+'/'+id+'/conversation',token,follow)).status,200);
  assert.equal((await call(api,path+'/'+id+'/conversation',token,follow)).status,200);
 }
 assert.equal((await call(api,path+'/'+id+'/conversation',token,{id:'extra',question:'한도를 넘는 질문'})).status,409);
 api=createSimulationApi(data,'A');saved=(await (await call(api,path+'/'+id,token)).json()).consultation;
 assert.deepEqual(saved.chapters,original);assert.equal(saved.conversation.used,limit);assert.equal(saved.conversation.remaining,0);
 assert.equal(JSON.parse(data.getItem('consultations')).orders.length,1);
 const other=createSimulationApi(storage(),'B'),foreign=await login(other,'B');
 assert.equal((await call(other,path+'/'+id,foreign)).status,404);
 const catLibrary=await (await call(api,'/canonical/yeongnyangi/requests',token)).json();
 assert.equal(JSON.stringify(catLibrary).includes(id),false);
});
