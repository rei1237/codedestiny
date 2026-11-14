import test from 'node:test';
import assert from 'node:assert/strict';
import {privateTarotRequest,privateTarotProducts} from '../private-simulation/paid-tarot.mjs';
import {tarotResultPath,tarotOrderFromQuery} from '../private-simulation/tarot-links.mjs';
import {TOSS_TAROT_LIBRARY_FLOWS} from '../../../lib/tarot/toss-library-flows.mjs';
import {TAROT_CARDS} from '../../../lib/tarot/tarot-cards.mjs';
const uuid='11111111-2222-4333-8444-555555555555',orderId='private-order-A-'+uuid;
const empty=()=>({intents:new Map(),orders:new Map()});
const call=(state,path,body)=>privateTarotRequest(new Request('https://private.invalid'+path,{method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body)})}),path,state,()=>true);
test('private order aliases preserve the production UUID boundary',()=>{
 assert.equal(tarotResultPath(orderId),'/tarot-library?orderId='+uuid);assert.equal(tarotOrderFromQuery('?orderId='+orderId),uuid);
 for(const invalid of ['private-order-C-'+uuid,'private-order-A-not-a-uuid','other-'+uuid]){assert.equal(tarotResultPath(invalid),'');assert.equal(tarotOrderFromQuery('?orderId='+invalid),'');}
});
for(const product of privateTarotProducts)test(product.featureKey+' retains selected cards and one owned result after restart',async()=>{
 const flow=TOSS_TAROT_LIBRARY_FLOWS.find(flow=>flow.id===product.id),count=flow.resultKind==='oracle'?({'tarot-prompt-maker':1,'tarot-prompt-maker-standard':5,'tarot-prompt-maker-deep':9,'tarot-prompt-maker-master':12}[product.featureKey]):flow.cardCount;
 const input={question:'원본 질문을 다시 열어요',spreadId:'test',spreadTitle:'모의 배열',category:'test',goldenCardId:'M11',...(['mindscan','relationship'].includes(flow.resultKind)?{picks:Array.from({length:count},(_,i)=>i)}:{cards:Array.from({length:count},(_,i)=>({cardId:TAROT_CARDS[i].code,orientation:'upright',position:'slot_'+i,positionLabel:'자리 '+i}))})};
 let state=empty();const body={sku:product.sku,orderId,input};assert.equal((await call(state,'/tarot-library/orders/grant',body)).status,200);
 assert.equal((await call(state,'/tarot-library/orders/grant',body)).status,200);
 assert.equal((await call(state,'/tarot-library/orders/grant',{...body,input:{...input,question:'changed'}})).status,409);
 const path='/tarot-library/results/'+uuid;await call(state,path,{});
 state={orders:new Map([...state.orders]),intents:new Map(JSON.parse(JSON.stringify([...state.intents])))};
 assert.equal((await call(state,'/orders/restore',{orderId,sku:product.sku})).status,200);
 const result=await(await call(state,path,{})).json();assert.equal(result.state,'completed');assert.equal(result.result.cards.length,count);assert.equal(result.result.question,input.question);
 const saved=JSON.stringify([...state.intents]);await call(state,path,{});assert.equal(JSON.stringify([...state.intents]),saved);assert.equal(state.orders.size,1);assert.equal(state.intents.get(orderId).generationCount,1);
 assert.equal((await call(empty(),path)).status,404);assert.equal((await call(empty(),'/orders/restore',{orderId,sku:product.sku})).status,404);
});
