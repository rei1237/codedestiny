import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),React=require('react');
const {act}=React,{Simulate}=require('react-dom/test-utils'),{createRoot}=require('react-dom/client');
const fixtures={
 css:'export default new Proxy({},{get:(_,key)=>key});',
 empty:'export default ()=>null;',
 picker:'import React from "react";export default ({onSelect})=>React.createElement("button",{onClick:()=>onSelect({}, {profileId:"profile"})},"선택");',
 result:'import React from "react";export default ()=>React.createElement("p",null,"저장된 상담 본문");',
 auth:'export const authFetch=(...args)=>globalThis.__heukwolTest.fetch(...args);',
 account:'export const readDestinyProfileAccountId=()=>globalThis.__heukwolTest.account;',
 billing:'export const runPaidAccessGate=input=>globalThis.__heukwolTest.gate(input);',
 checkout:'export default {registerPaidResumeHandler:(_,handler)=>globalThis.__heukwolTest.handler=handler,unregisterPaidResumeHandler:()=>{globalThis.__heukwolTest.handler=null;}};',
};
const bundled=await build({entryPoints:['app/heukwol/HeukwolClient.tsx'],bundle:true,write:false,jsx:'automatic',format:'cjs',platform:'node',external:['react','react/jsx-runtime'],plugins:[{name:'heukwol-fixtures',setup(b){
 for(const [filter,path] of [[/\.module\.css$/,'css'],[/FateWarningEpisode$|ProfileForm$|^next\/image$/,'empty'],[/SavedBirthProfilePicker$/,'picker'],[/HeukwolResult$/,'result'],[/auth-client$/,'auth'],[/profile-card-storage$/,'account'],[/billing-client$/,'billing'],[/checkout-entry\.js$/,'checkout']])b.onResolve({filter},()=>({path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'js',contents:fixtures[path]}));
}}]});
const compiled={exports:{}};new Function('require','module','exports',bundled.outputFiles[0].text)(require,compiled,compiled.exports);
const price={cost:500,amountKRW:50000,displayPrice:'50,000원'};
const completed={ok:true,id:'heukwol:saved',status:'completed',completedChapters:27,totalChapters:27,report:{}};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
async function fixture(){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://mock.test/heukwol/'});
 for(const name of ['window','document','location','history'])globalThis[name]=name==='window'?dom.window:dom.window[name];
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const gate=deferred(),start=deferred(),calls=[];
 const runtime={account:'owner',handler:null,input:null,gateCalls:0,gate(input){this.input=input;this.gateCalls++;return gate.promise;},fetch:async(url,init)=>{
  calls.push({url,body:init?.body?JSON.parse(init.body):null});
  const data=url.endsWith('/start')?await start.promise:url.endsWith('/prepare')||url.endsWith('/pricing')?{ok:true,pricing:price}:completed;
  return {ok:true,json:async()=>data};
 }};globalThis.__heukwolTest=runtime;
 const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(compiled.exports.default)));
 return {runtime,gate,start,calls,async begin(){
  await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='선택').click());
  await act(async()=>Simulate.change(document.querySelector('textarea'),{target:{value:'결제 후 상담을 이어서 받을 수 있는지 확인합니다.'}}));
  await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('이용 조건 확인하기')).click());
  assert.ok(runtime.input?.resume);
 },async close(){await act(async()=>{root.unmount();gate.resolve({ok:true});start.resolve(completed);});dom.window.close();delete globalThis.__heukwolTest;}};
}

test('approved order resumes while the easy-pay callback is pending; late callback and repeated resumes share one delivery',async()=>{
 const f=await fixture();try{
  await f.begin();let first,second;
  await act(async()=>{first=f.runtime.handler(f.runtime.input.resume);second=f.runtime.handler(f.runtime.input.resume);});
  assert.equal(f.calls.filter(c=>c.url.endsWith('/start')).length,1,'server-confirmed resume must start despite pending checkout');
  assert.match(document.body.textContent,/상담을 준비하고 있어요. 완성된 장은 차례로 저장해요/);
  await act(async()=>{f.start.resolve(completed);assert.equal(await first,true);assert.equal(await second,true);});
  assert.match(document.body.textContent,/저장된 상담 본문/);
  await act(async()=>f.gate.resolve({ok:true}));
  assert.equal(f.calls.filter(c=>c.url.endsWith('/start')).length,1);
  assert.equal(f.runtime.gateCalls,1);
  assert.equal(f.calls.find(c=>c.url.endsWith('/start')).body.requestId,f.runtime.input.requestId);
 }finally{await f.close();}
});

test('fresh redirect resumes original input without opening a new payment gate',async()=>{
 const f=await fixture();try{
  let delivery;const input={profileId:'profile',year:2027,question:'복귀한 상담 질문을 그대로 사용합니다.',requestId:'heukwol-original'};
  await act(async()=>{delivery=f.runtime.handler({args:{payload:JSON.stringify(input)}});});
  await act(async()=>{f.start.resolve(completed);assert.equal(await delivery,true);});
  assert.equal(f.runtime.gateCalls,0);assert.deepEqual(f.calls.find(c=>c.url.endsWith('/start')).body,input);
 }finally{await f.close();}
});

test('a different resume cannot replace an active checkout; account changes suppress late results',async()=>{
 const f=await fixture();try{
  await f.begin();let active;
  const other={...JSON.parse(f.runtime.input.resume.args.payload),requestId:'heukwol-other'};
  await act(async()=>assert.equal(await f.runtime.handler({args:{payload:JSON.stringify(other)}}),false));
  await act(async()=>{active=f.runtime.handler(f.runtime.input.resume);});
  await act(async()=>{f.runtime.account='another';window.dispatchEvent(new window.Event('cd:auth-changed'));});
  await act(async()=>{f.runtime.account='owner';window.dispatchEvent(new window.Event('cd:auth-changed'));});
  await act(async()=>{f.start.resolve(completed);f.gate.resolve({ok:true});await active;});
  assert.doesNotMatch(document.body.textContent,/저장된 상담 본문/);
  assert.equal(f.calls.filter(c=>c.url.endsWith('/start')).length,1);
 }finally{await f.close();}
});

test('a failed delivery can retry the same paid request without another gate',async()=>{
 const f=await fixture();try{
  await f.begin();let failed;
  await act(async()=>{failed=f.runtime.handler(f.runtime.input.resume);});
  await act(async()=>{f.start.reject(new Error('상담 연결을 다시 확인해 주세요.'));assert.equal(await failed,false);});
  const retryCalls=[];
  f.runtime.fetch=async(url,init)=>{retryCalls.push({url,body:JSON.parse(init.body)});return {ok:true,json:async()=>completed};};
  await act(async()=>assert.equal(await f.runtime.handler(f.runtime.input.resume),true));
  await act(async()=>f.gate.resolve({ok:true}));
  assert.equal(retryCalls.length,1);assert.equal(retryCalls[0].body.requestId,f.runtime.input.requestId);
  assert.equal(f.runtime.gateCalls,1);assert.match(document.body.textContent,/저장된 상담 본문/);
 }finally{await f.close();}
});
