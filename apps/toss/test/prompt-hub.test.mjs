import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulationApi} from '../private-simulation/api.mjs';
import examples from '../private-simulation/prompt-hub-examples.json' with {type:'json'};
import {buildStructuredFortunePrompt,PROMPT_HUB_TOOL_IDS} from '../../../lib/fortune/prompt-hub-template.js';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';
import {generateFreeTossPrompt} from '../../../worker/routes/prompt-hub.js';

const data=new Map(),store={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
const app=createSimulationApi(store,'A'),token='private-simulation-token-A';
const request=(path,body,bearer='')=>new Request('https://mock.invalid/private-simulation-api'+path,{
 method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+bearer},body:JSON.stringify(body)
});
const path='/canonical/fortune/prompt-hub/generate';
const fields=[{id:'question',label:'구체적인 질문',value:'이번 달 진로를 어떻게 정리할까요?'}];
const body={toolId:'basic',requestId:'test:prompt-hub',fields,computedFacts:''};
test('authenticated free adapter shares the original 15 structured roles, facts and answer chapters',async()=>{
 assert.ok(isFreeFortuneFeatureKey('fortune-prompt-hub-generate'));
 for(const toolId of PROMPT_HUB_TOOL_IDS.filter(id=>id!=='horary')){
  const input={...body,toolId,computedFacts:'[확정 계산 데이터] 입력된 날짜 기준'};
  const actual=await generateFreeTossPrompt({},input);
  assert.equal(actual.paidWith,'public');assert.equal(actual.prompt,buildStructuredFortunePrompt(toolId,fields,input.computedFacts));
 }
 await assert.rejects(generateFreeTossPrompt({},{...body,paymentRequestId:'not-permitted'}),e=>e.status===409);
 await assert.rejects(generateFreeTossPrompt({},{...body,toolId:'unknown'}),e=>e.status===400);
});
test('private transport requires the current account, replays the exact computed example and opens no order',async()=>{
 assert.equal((await app(request(path,body))).status,401);
 await app(request('/login',{authorizationCode:'private-simulation-person-A'}));
 assert.equal((await app(request(path,body,'private-simulation-token-B'))).status,401);
 assert.equal((await app(request(path,{...body,paymentRequestId:'closed'},token))).status,409);
 for(const row of examples.rows){
  const response=await app(request('/canonical'+row.path,row.input,token));assert.equal(response.status,200);assert.deepEqual(await response.json(),row.result);
  assert.equal((await app(request('/canonical'+row.path,{...row.input,unrecognized:true},token))).status,422);
 }
 const horary={...body,toolId:'horary',locale:'ko',horary:examples.horary.input};
 const original=await app(request(path,horary,token));assert.equal((await original.json()).prompt,examples.horary.prompt);
 assert.equal((await app(request(path,{...horary,horary:{...horary.horary,question:'다른 질문'}},token))).status,422);
 assert.deepEqual(JSON.parse(store.getItem('consultations')).orders,[]);
});

test('unlink removes only its owner’s prompts, and callback revision hides older documents on reentry',async()=>{
 const {tossPromptLibraryScope,clearTossPromptLibrary}=await import('../../../lib/fortune/toss-prompt-library.mjs');
 const owner='private-simulation-person-A',scope=tossPromptLibraryScope(owner,0,'SANDBOX');
 const next=tossPromptLibraryScope(owner,1,'SANDBOX'),prod=tossPromptLibraryScope(owner,1,'DEFAULT'),other=tossPromptLibraryScope('private-simulation-person-B',0,'SANDBOX');
 const prefix='cd:promptHub:library:v1:',raw=new Map([scope,next,prod,other].map(key=>[prefix+key,'prompt']));
 const local={get length(){return raw.size;},key:i=>[...raw.keys()][i],removeItem:key=>raw.delete(key)};
 clearTossPromptLibrary(local,owner,1);assert.deepEqual([...raw.keys()],[prefix+next,prefix+prod,prefix+other]);
 clearTossPromptLibrary(local,owner);assert.deepEqual([...raw.keys()],[prefix+other]);
 const readSession=()=>app(new Request('https://mock.invalid/private-simulation-api/canonical/fortune/prompt-hub/session',{headers:{Authorization:'Bearer '+token}}));
 assert.deepEqual(await (await readSession()).json(),{owner,scope});
 assert.equal((await (await app(request('/unlink',{},token))).json()).promptLibraryOwner,owner);
 assert.equal((await readSession()).status,401);await app(request('/login',{authorizationCode:owner}));
 assert.deepEqual(await (await readSession()).json(),{owner,scope:next});
});
