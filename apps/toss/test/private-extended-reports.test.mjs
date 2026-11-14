import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
// Match the AIT resolver for the canonical prompt's TS/CMS imports.
const bundled=await build({entryPoints:[new URL('../private-simulation/extended-reports.mjs',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,write:false,platform:'node',format:'esm'});
const {extendedProducts,extendedRequest,extendedLibrary,extendedRecords}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const inputs={
 'ziwei-deep':{idempotencyKey:'private-deep',birthInfo:{birthDate:'1990-01-01'},focusArea:'custom',question:'원본 질문'},
 compass:{idempotencyKey:'private-compass',evidencePack:{systems:['saju','ziwei','sukuyo','vedic','astrology']},question:'원본 질문'},
 yoga:{requestId:'private-yoga',duration:30,mood:'마음의 균형을 살펴보고 싶어요'},
 nakshatra:{requestId:'private-nakshatra',birthInfo:{birthDate:'1990-01-01'},question:'원본 질문'},
};
const empty=()=>({intents:new Map(),orders:new Map(),sequence:0});
const call=(state,path,body)=>{const url=new URL('https://private.invalid'+path);return extendedRequest(new Request(url,{method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body)})}),url,path,state,()=>true,()=>new Date('2026-11-14T00:00:00Z'),0);};
for(const [service,input] of Object.entries(inputs))test(service+' resumes one owned immutable generation and rejects foreign result/order',async()=>{
 let state=empty();const product=extendedProducts.find(p=>p.id.split(':')[1]===service),prepare='/native/'+service+'/prepare';
 const intent=await(await call(state,prepare,{input})).json();assert.equal((await(await call(state,prepare,{input})).json()).id,intent.id);
 assert.equal((await call(state,prepare,{input:{...input,question:'changed'}})).status,409);
 const result='/native/'+service+'/results/'+intent.id;assert.equal((await call(state,result)).status,404);
 const grant={requestId:intent.id,sku:product.sku,orderId:'private-order-A-1'};
 assert.equal((await call(state,'/orders/grant',grant)).status,200);
 assert.equal((await call(state,'/orders/restore',grant)).status,200);
 assert.equal((await call(state,'/orders/grant',{...grant,orderId:'private-order-A-2'})).status,403);
 await call(state,result,{});
 state={sequence:state.sequence,intents:new Map(JSON.parse(JSON.stringify([...state.intents]))),orders:new Map([...state.orders])};
 for(let wave=0;wave<8&&!state.intents.get(intent.id).result;wave++)await call(state,result,{});
 assert.ok(state.intents.get(intent.id).result);assert.equal(state.intents.get(intent.id).generationCount,1);assert.equal(state.orders.size,1);
 const saved=JSON.stringify([...state.intents]);await call(state,result,{});await call(state,result);assert.equal(JSON.stringify([...state.intents]),saved);
 assert.equal(extendedLibrary(state).length,1);assert.equal(extendedRecords(new URL('https://private.invalid/records'),state).length,1);
 assert.equal((await call(empty(),result)).status,404);assert.equal(extendedLibrary(empty()).length,0);
});
test('failed durable grant leaves the extended report unpaid',async()=>{
 const state=empty(),intent=await(await call(state,'/native/yoga/prepare',{input:inputs.yoga})).json();
 const path='/orders/grant',url=new URL('https://private.invalid'+path),body={requestId:intent.id,sku:extendedProducts.find(p=>p.id.includes(':yoga:')).sku,orderId:'private-order-A-1'};
 const response=await extendedRequest(new Request(url,{method:'POST',body:JSON.stringify(body)}),url,path,state,()=>false,()=>new Date(),0);
 assert.equal(response.status,503);assert.equal(state.orders.size,0);assert.equal(state.intents.get(intent.id).paid,false);
});
