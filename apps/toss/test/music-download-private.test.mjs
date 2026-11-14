import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicSimulation} from '../private-simulation/music-download.mjs';
const track={title:'명시적 모의 곡',artist:'Yeoni',audioSourceKey:'yeonisong/mock.mp3',featureKey:'music-track-mock'};
const mock=createMusicSimulation([track]),state=()=>({sequence:0,intents:new Map(),orders:new Map()}),now=()=>new Date('2026-01-01');
async function call(s,path,body,save=()=>true){const url=new URL('https://mock.invalid'+path);return mock.musicRequest(new Request(url,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})}),url,path,s,save,now);}
test('mock track purchase survives reload, reuses order, isolates account and rejects refund',async()=>{
 const a=state(),b=state(),prepared=await (await call(a,'/native/music/prepare',{input:{audioSourceKey:track.audioSourceKey}})).json();
 const grant={orderId:'mock-A-order',sku:'mock-'+track.featureKey,requestId:prepared.id};assert.equal((await call(a,'/orders/grant',grant)).status,200);
 const saved=JSON.parse(JSON.stringify({intents:[...a.intents],orders:[...a.orders]})),restored={sequence:a.sequence,intents:new Map(saved.intents),orders:new Map(saved.orders)};
 assert.equal((await call(restored,'/native/music/prepare',{input:{audioSourceKey:track.audioSourceKey}})).status,200);assert.equal(restored.intents.size,1);assert.equal(restored.orders.size,1);
 const path='/native/music/results/'+prepared.id;assert.equal((await call(restored,path)).status,200);assert.equal((await call(b,path)).status,404);
 const file=await (await call(restored,path+'/file')).json();assert.equal(file.data,'SUQzBAAAAAAAAA==');assert.match(file.fileName,/모의/);
 assert.equal(mock.musicPurchases(restored).length,1);assert.equal(mock.musicRecords(new URL('https://mock.invalid?source=music'),restored).length,1);
 restored.intents.get(prepared.id).refunded=true;assert.equal((await call(restored,path+'/file')).status,409);assert.equal(mock.musicPurchases(restored).length,0);
});
test('storage failure cannot acknowledge a purchase',async()=>{const a=state(),row=await (await call(a,'/native/music/prepare',{input:{audioSourceKey:track.audioSourceKey}})).json();assert.equal((await call(a,'/orders/grant',{orderId:'mock-order',sku:row.sku,requestId:row.id},()=>false)).status,503);assert.equal(a.orders.size,0);assert.equal(a.intents.get(row.id).paid,false);});
