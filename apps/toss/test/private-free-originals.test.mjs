import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createSimulationApi} from '../private-simulation/api.mjs';
import example from '../private-simulation/free-original-examples.json' with {type:'json'};
test('original compatibility, Prashna and four flowers require login and reject unsupported examples without orders',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},api=createSimulationApi(storage,'A');
 let token='';const req=(path,body)=>api(new Request('http://localhost/private-simulation-api'+path,{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(body)}));
 const cases=[['/vedic/compatibility',example.compatInput,example.compatibility],['/vedic/prashna',example.prashnaInput,example.prashna],['/flower/match',{birth:example.compatInput.birth},example.flower]];
 for(const [path,input] of cases)assert.equal((await req(path,input)).status,401);
 token=(await (await req('/login',{authorizationCode:'private-simulation-person-A'})).json()).token;
 for(const [path,input,result] of cases){assert.deepEqual(await (await req(path,input)).json(),result);assert.equal((await req(path,{})).status,422);}
 for(const row of Object.values(example.flower.sources)){assert.equal(row.state,'ready');assert.ok(row.narrative.length>20);}
 const altered=structuredClone(example.compatInput);altered.partner.birth.date.year++;assert.equal((await req('/vedic/compatibility',altered)).status,422);
 assert.equal(JSON.parse(values.get('consultations')).orders.length,0);
});
