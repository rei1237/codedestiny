import test from 'node:test';
import assert from 'node:assert/strict';
import {paidFamilyRequest,paidFamilyPurchases,paidFamilyRecords} from '../private-simulation/paid-families.mjs';
const pet={name:'모의 아이',species:'dog',breed:'generic',birthDate:'2020-05-15',birthTime:'',birthTimeUnknown:true,gender:'unknown',activityLevel:'normal',environment:'apartment',companion:'none',traits:[]};
for(const family of ['relationship','sukuyo','pet','pet-compat'])test(family+' keeps immutable input, paid checkpoint, unique saved reading and records',async()=>{
 const service=family==='pet-compat'?'pet':family;
 const state={intents:new Map(),orders:new Map(),sequence:0};let clock=10000;
 const call=(path,body)=>paidFamilyRequest(new Request('https://private.invalid'+path,{method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body)})}),new URL('https://private.invalid'+path),path.split('?')[0],state,()=>true,()=>new Date(clock),1000);
 const input=service==='pet'?(family==='pet-compat'?{kind:'compat',requestId:'synthetic-pet',petA:pet,petB:{...pet,name:'모의 둘째',birthDate:'2021-03-02'}}:{kind:'report',requestId:'synthetic-pet',pet}):{idempotencyKey:'synthetic-'+service,targetInfo:{name:'상대'},personA:{name:'A',birthDate:'1990-01-01'},personB:{name:'B',birthDate:'1991-01-01'}};
 const prepared=await(await call('/native/'+service+'/prepare',{input})).json();assert.equal(prepared.paid,false);
 assert.equal((await call('/native/'+service+'/prepare',{input:{...input,question:'changed'}})).status,409);
 const gen=service==='pet'?'/native/pet/intents/'+prepared.id+'/generate':'/canonical/'+(service==='sukuyo'?'sukuyo-compatibility-ai':'relationship-boundary-test')+'/generate';const body=service==='pet'?{}:{resumeSessionId:'toss_'+prepared.id};
 assert.equal((await call(gen,body)).status,402);
 assert.equal((await call('/orders/grant',{sku:prepared.sku,orderId:'private-order-A-synthetic',requestId:prepared.id})).status,200);
 assert.equal((await call(gen,body)).status,202);clock+=1500;
 assert.equal((await call(gen,body)).status,200);const saved=JSON.stringify([...state.intents]);await call(gen,body);assert.equal(JSON.stringify([...state.intents]),saved);
 const purchase=paidFamilyPurchases(state)[0];if(service==='relationship')assert.ok(purchase.href.endsWith(state.intents.get(prepared.id).result.sessionId));if(service==='sukuyo')assert.ok(purchase.href.endsWith(state.intents.get(prepared.id).result.id));assert.equal(paidFamilyPurchases(state).length,1);assert.equal(paidFamilyRecords(new URL('https://private.invalid'),state).length,1);assert.equal(state.intents.get(prepared.id).generationCount,1);
 assert.equal(paidFamilyPurchases({intents:new Map()}).length,0);
});
