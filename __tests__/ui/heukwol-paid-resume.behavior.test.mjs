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
// respond(url,body) 가 값을 주면 그 응답({status,data})을 쓰고, 없으면 기본 응답을 쓴다.
async function fixture({url='https://mock.test/heukwol/',respond=null,hidden=false}={}){
 const dom=new JSDOM('<div id="root"></div>',{url});
 for(const name of ['window','document','location','history'])globalThis[name]=name==='window'?dom.window:dom.window[name];
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
 let visibility=hidden?'hidden':'visible';Object.defineProperty(dom.window.document,'visibilityState',{configurable:true,get:()=>visibility});
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const gate=deferred(),start=deferred(),calls=[];
 const runtime={account:'owner',handler:null,input:null,gateCalls:0,setVisible(value){visibility=value?'visible':'hidden';},gate(input){this.input=input;this.gateCalls++;return gate.promise;},fetch:async(url,init)=>{
  calls.push({url,body:init?.body?JSON.parse(init.body):null});
  const custom=respond&&await respond(url,init?.body?JSON.parse(init.body):null);
  if(custom){const status=custom.status||200;return {ok:status<300,status,json:async()=>custom.data};}
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

const generating=(n,id='heukwol:paid')=>({ok:true,id,status:'generating',completedChapters:n,totalChapters:27});
const resultUrl='https://mock.test/heukwol/?result=heukwol%3Apaid';
async function until(check,ms=9000){const end=Date.now()+ms;while(!check()){if(Date.now()>end)throw new Error('timed out: '+document.body.textContent.slice(0,200));await act(async()=>{await new Promise(r=>setTimeout(r,40));});}}

test('a generation paused in a background tab resumes on return with a single loop, however many wake events fire',async()=>{
 let continues=0,active=0,peak=0;
 const f=await fixture({url:resultUrl,hidden:true,respond:async url=>{
  if(url.includes('/result?'))return {data:generating(continues+1)};
  if(url.endsWith('/continue')){continues++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,30));active--;return {data:continues>=2?completed:generating(2)};}
 }});
 try{
  await until(()=>document.body.textContent.includes('1 / 27장 저장'));
  await act(async()=>{await new Promise(r=>setTimeout(r,1500));});
  assert.equal(continues,0,'a hidden tab must not keep writing');
  f.runtime.setVisible(true);
  await act(async()=>{document.dispatchEvent(new window.Event('visibilitychange'));document.dispatchEvent(new window.Event('visibilitychange'));window.dispatchEvent(new window.Event('online'));window.dispatchEvent(new window.PageTransitionEvent('pageshow',{persisted:true}));});
  await until(()=>/저장된 상담 본문/.test(document.body.textContent));
  assert.equal(peak,1,'continue requests must never overlap');
  assert.equal(continues,2);
 }finally{await f.close();}
});

test('revisiting ?result= of an unfinished paid generation continues it without a click',async()=>{
 const f=await fixture({url:resultUrl,respond:async url=>url.includes('/result?')?{data:generating(3)}:url.endsWith('/continue')?{data:completed}:null});
 try{
  await until(()=>/저장된 상담 본문/.test(document.body.textContent));
  assert.equal(f.calls.filter(c=>c.url.endsWith('/continue')).length,1);
  assert.equal(f.runtime.gateCalls,0);
 }finally{await f.close();}
});

test('a transient continue failure keeps the generating screen and retries on its own',async()=>{
 let continues=0;
 const f=await fixture({url:resultUrl,respond:async url=>{
  if(url.includes('/result?'))return {data:generating(1)};
  if(url.endsWith('/continue'))return ++continues===1?{status:503,data:{ok:false,code:'HEUKWOL_RETRYABLE',message:'완성된 장은 보관했어요. 이어서 작성하기를 눌러 주세요.'}}:{data:completed};
 }});
 try{
  await until(()=>/저장된 상담 본문/.test(document.body.textContent));
  assert.equal(continues,2);
 }finally{await f.close();}
});

test('a terminal failure ends the generating screen with an automatic refund notice',async()=>{
 let reads=0;
 const f=await fixture({url:resultUrl,respond:async url=>{
  if(url.includes('/result?'))return {data:++reads===1?generating(2):{...generating(2),status:'failed',refundStatus:'refunded'}};
  if(url.endsWith('/continue'))return {status:503,data:{ok:false,code:'HEUKWOL_DELIVERY_FAILED',message:'리포트를 완성하지 못했어요.'}};
 }});
 try{
  await until(()=>/결제·이용권을 자동으로 되돌렸어요/.test(document.body.textContent));
  assert.ok(![...document.querySelectorAll('button')].some(b=>b.textContent==='이어서 작성하기'),'a closed failure must not offer to keep writing');
  assert.equal(f.calls.filter(c=>c.url.endsWith('/continue')).length,1);
 }finally{await f.close();}
});

test('revisiting a failed paid generation shows the refund in progress without writing again',async()=>{
 const f=await fixture({url:resultUrl,respond:async url=>url.includes('/result?')?{data:{...generating(0),status:'failed',refundStatus:'pending'}}:null});
 try{
  await until(()=>/자동 환불을 진행하고 있어요/.test(document.body.textContent));
  assert.equal(f.calls.filter(c=>c.url.endsWith('/continue')).length,0);
 }finally{await f.close();}
});

test('once payment is confirmed a generating screen replaces the form, and a failed start retries there without another gate',async()=>{
 const f=await fixture();try{
  await f.begin();
  await act(async()=>f.gate.resolve({ok:true}));
  assert.match(document.body.textContent,/결제를 확인했어요/);
  assert.equal(document.querySelector('textarea'),null,'a paid user must not see the question form again');
  await act(async()=>f.start.reject(new Error('상담 연결을 다시 확인해 주세요.')));
  assert.equal(document.querySelector('textarea'),null);
  const retry=[...document.querySelectorAll('button')].find(b=>b.textContent==='다시 시도하기');assert.ok(retry,'the retry must stay on the generating screen');
  f.runtime.fetch=async()=>({ok:true,json:async()=>completed});
  await act(async()=>retry.click());
  await until(()=>/저장된 상담 본문/.test(document.body.textContent));
  assert.equal(f.runtime.gateCalls,1);
 }finally{await f.close();}
});

test('a paid start the user must fix (4xx) returns to the form with the reason',async()=>{
 const f=await fixture();try{
  await f.begin();
  f.runtime.fetch=async url=>url.endsWith('/start')?{ok:false,status:400,json:async()=>({ok:false,code:'BIRTH_TIME_REQUIRED',message:'출생 시각이 기록된 프로필이 필요해요.'})}:{ok:true,json:async()=>completed};
  await act(async()=>f.gate.resolve({ok:true}));
  await until(()=>/출생 시각이 기록된 프로필이 필요해요/.test(document.body.textContent));
  assert.ok(document.querySelector('textarea'));
 }finally{await f.close();}
});

// 2026-11-19 R6 다시 시도 우선: 무료 다시 시도가 열린 실패는 환불 안내 대신 다시 시도·환불 요청을 고르게 한다. 둘 다 상담 id 만 보내고 결제창을 열지 않는다.
const held={...generating(4),status:'failed',retry:{available:true,refundAt:'2026-11-26T00:00:00.000Z',sessionId:'heukwol:paid'}};
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
test('a held failure offers a free retry that reopens the same session and keeps writing without a payment gate',async()=>{
 let reopened=false;
 const f=await fixture({url:resultUrl,respond:async url=>url.includes('/result?')?{data:reopened?generating(4):held}
  :url.endsWith('/retry')?(reopened=true,{status:202,data:generating(4)}):url.endsWith('/continue')?{data:completed}:null});
 try{
  await until(()=>/추가 결제·차감은 없어요/.test(document.body.textContent));
  assert.doesNotMatch(document.body.textContent,/자동 환불을 진행하고 있어요/);
  await act(async()=>button('다시 시도 · 추가 결제·차감 없음').click());
  await until(()=>/저장된 상담 본문/.test(document.body.textContent));
  assert.deepEqual(f.calls.find(c=>c.url.endsWith('/retry')).body,{id:'heukwol:paid'});
  assert.equal(f.calls.filter(c=>c.url.endsWith('/continue')).length,1);
  assert.equal(f.runtime.gateCalls,0);
 }finally{await f.close();}
});
test('a held failure can ask for a refund instead, sending only the session id',async()=>{
 const f=await fixture({url:resultUrl,respond:async url=>url.includes('/result?')?{data:held}
  :url.endsWith('/refund-request')?{data:{...generating(4),status:'failed',refundStatus:'pending'}}:null});
 try{
  await until(()=>Boolean(button('다시 시도 대신 환불 요청')));
  await act(async()=>button('다시 시도 대신 환불 요청').click());
  await until(()=>/자동 환불을 진행하고 있어요/.test(document.body.textContent));
  assert.deepEqual(f.calls.find(c=>c.url.endsWith('/refund-request')).body,{id:'heukwol:paid'});
  assert.equal(button('다시 시도 · 추가 결제·차감 없음'),undefined);
  assert.equal(f.calls.filter(c=>c.url.endsWith('/retry')||c.url.endsWith('/continue')).length,0);
  assert.equal(f.runtime.gateCalls,0);
 }finally{await f.close();}
});
