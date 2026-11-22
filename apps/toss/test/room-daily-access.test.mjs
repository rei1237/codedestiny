import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createSimulationApi} from '../private-simulation/api.mjs';
import {handleReviewFixture} from './offline/review-fixture.mjs';

function simulatedOwner(person){
 const saved=new Map();let writable=true;
 const storage={getItem:key=>saved.get(key)||null,setItem(key,value){if(!writable)throw Error('storage unavailable');saved.set(key,value);}};
 const api=createSimulationApi(storage,person);
 const token='private-simulation-token-'+person;
 const call=(path,body,credential=token)=>api(new Request('https://mock.invalid/private-simulation-api'+path,{headers:{authorization:'Bearer '+credential},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})}));
 return {call,setWritable:value=>{writable=value;},login:()=>call('/login',{authorizationCode:'private-simulation-person-'+person})};
}

test('room pass requires the current owner, retries do not double-credit or debit and storage failures remain closed',async()=>{
 const a=simulatedOwner('A'),b=simulatedOwner('B');
 assert.equal((await a.call('/daily/status')).status,401);
 await a.login();await b.login();
 assert.equal((await a.call('/daily/status',undefined,'private-simulation-token-B')).status,401);
 assert.equal((await a.call('/daily/unlock',{})).status,409);
 a.setWritable(false);assert.equal((await a.call('/daily/attendance',{})).status,503);
 assert.equal((await (await a.call('/daily/status')).json()).balance,2);
 a.setWritable(true);
 for(const response of await Promise.all([a.call('/daily/attendance',{}),a.call('/daily/attendance',{})]))assert.equal((await response.json()).balance,3);
 a.setWritable(false);assert.equal((await a.call('/daily/unlock',{})).status,503);
 assert.equal((await (await a.call('/daily/status')).json()).unlocked,false);
 a.setWritable(true);
 for(const response of await Promise.all([a.call('/daily/unlock',{}),a.call('/daily/unlock',{})]))assert.equal((await response.json()).balance,0);
 assert.equal((await (await b.call('/daily/status')).json()).unlocked,false);
 assert.equal((await b.call('/daily/reading?category=basic')).status,403);
});

test('a KST day change resets the pass, attendance and saved readings without carrying the old permission',async()=>{
 const state={daily:{day:'2026-11-22',balance:1,attended:true,unlocked:true,readings:{basic:{title:'first'}}},fortunes:new Map()};
 const url=new URL('https://mock.invalid/daily/status');
 const status=async time=>(await handleReviewFixture(new Request(url),url,'/daily/status',state,()=>true,()=>new Date(time))).json();
 assert.equal((await status('2026-11-22T14:59:59Z')).unlocked,true);
 assert.deepEqual(await status('2026-11-22T15:00:00Z'),{day:'2026-11-23',balance:1,attended:false,unlocked:false,unlockCost:3});
 assert.deepEqual(state.daily.readings,{});
});

test('only the private device draw seed is shared across simulated people',()=>{
 const raw=()=>{const values={};return new Proxy({getItem:key=>values[key]??null,setItem:(key,value)=>{values[key]=value;},removeItem:key=>{delete values[key];}},{ownKeys:()=>Object.keys(values),getOwnPropertyDescriptor:()=>({configurable:true,enumerable:true})});};
 const local=raw(),session=raw(),seed='cd:yn:daily-tarot-device:v1';
 const module=readFileSync(new URL('../private-simulation/storage.mjs',import.meta.url),'utf8').replaceAll('export ','');
 function visit(person){
  local.setItem('ai-saju-studio:private-simulation:v1:selected-person',person);
  const window={localStorage:local,sessionStorage:session};
  vm.runInNewContext(module,{window});return window.localStorage;
 }
 local.setItem(seed,'ordinary-app');const a=visit('A');assert.equal(a.getItem(seed),null);
 a.setItem(seed,'private-device');a.setItem('consultations','owner-A');
 const b=visit('B');assert.equal(b.getItem('consultations'),null);assert.equal(b.getItem(seed),'private-device');
 assert.deepEqual(Object.keys(b),[seed]);assert.equal(local.getItem(seed),'ordinary-app');
});
