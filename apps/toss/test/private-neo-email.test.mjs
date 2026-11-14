import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulationApi} from '../private-simulation/api.mjs';
test('private email uses original manual policy, authenticated owner, correction and cancellation without sending mail',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},api=createSimulationApi(storage,'A');
 const request=(fn,path,token,body)=>fn(new Request('http://localhost/private-simulation-api'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token},...(body===undefined?{}:{body:JSON.stringify(body)})}));
 const base='/native/neo-email';assert.equal((await request(api,base,'')).status,401);
 const token=(await (await request(api,'/login','',{authorizationCode:'private-simulation-person-A'})).json()).token;
 const order=async(path,body)=>{const response=await request(api,base+path,token,body);assert.equal(response.status,200);return (await response.json()).order;};
 const attempt=crypto.randomUUID(),input={questions:[{text:'직장에서 어떤 일을 먼저 살펴볼까요?',readingMode:'saju_ziwei',chartReading:false}],email:'fixture@example.invalid',birth:{date:'1990-01-01',time:'08:30',calendar:'solar',leapMonth:false,timeUnknown:false},consent:true};
 const draft=await order('/create',{attempt,input});assert.equal((await order('/create',{attempt,input})).id,draft.id);
 const path='/'+draft.id,quote=await order(path+'/quote',{version:draft.version});await order(path+'/prepare',{quoteId:quote.quote.id});
 let received=await order(path+'/mock-pay',{});assert.equal(received.state,'received');assert.deepEqual(received.deliveries,[]);
 assert.equal((await request(api,base+path+'/correction',token,{version:received.version,questionId:received.questions[0].id,text:'변경할 질문입니다.'})).status,409);
 const key='toss-offline-neo-email:private-simulation-person-A',data=JSON.parse(values.get(key));
 // Controlled operator fixture: no public/admin API is introduced.
 data.rows[draft.id].questions[0].correction='질문에 현재 상황을 적어 주세요.';data.rows[draft.id].state='correction';values.set(key,JSON.stringify(data));
 received=await order(path+'/correction',{version:received.version,questionId:received.questions[0].id,text:'현재 이직을 준비하며 어떤 일을 먼저 살펴볼까요?'});assert.equal(received.state,'received');
 const cancelled=await order(path+'/cancel',{version:received.version});assert.ok(cancelled.cancellationRequestedAt);
 const reopened=createSimulationApi(storage,'A');assert.deepEqual((await (await request(reopened,base+path,token)).json()).order,cancelled);
 const otherStorage=new Map(),other=createSimulationApi({getItem:k=>otherStorage.get(k),setItem:(k,v)=>otherStorage.set(k,v)},'B');
 const tokenB=(await (await request(other,'/login','',{authorizationCode:'private-simulation-person-B'})).json()).token;
 assert.equal((await request(other,base+path,tokenB)).status,404);assert.equal((await request(reopened,base+path,tokenB)).status,401);
 const final=JSON.parse(values.get(key));assert.equal(Object.keys(final.rows).length,1);assert.equal(Object.keys(final.payments).length,1);assert.equal(final.rows[draft.id].mailJobs.filter(j=>j.kind==='receipt').length,1);
});
