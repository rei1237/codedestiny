import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulationApi} from '../private-simulation/api.mjs';
test('free Human Design chart requires login and never creates an order or stored report',async()=>{
 const memory=new Map(),storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
 const handle=createSimulationApi(storage,'A');
 const call=(path,body)=>handle(new Request('https://mock.invalid/private-simulation-api'+path,{method:'POST',headers:{authorization:'Bearer private-simulation-token-A','content-type':'application/json'},body:JSON.stringify(body)}));
 const birth={birthDate:'1990-01-01',birthTime:'08:35',timezone:'Asia/Seoul',calendar:'solar'};
 assert.equal((await call('/human-design/chart',{birth})).status,401);
 await call('/login',{authorizationCode:'private-simulation-person-A'});
 assert.equal((await call('/human-design/chart',{birth:{...birth,birthTime:''}})).status,422);
 const result=await (await call('/human-design/chart',{birth})).json();assert.equal(result.stored,false);assert.ok(result.chart);
 const saved=JSON.parse(memory.get('consultations'));assert.deepEqual(saved.orders,[]);assert.deepEqual(saved.intents,[]);
});
