import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {build} from 'esbuild';import {createRequire} from 'node:module';import path from 'node:path';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.history=dom.window.history;globalThis.IS_REACT_ACT_ENVIRONMENT=true;dom.window.scrollTo=()=>{};
const React=require('react'),{createRoot}=require('react-dom/client');
const entry=path.resolve(import.meta.dirname,'../src/App.tsx');
const bundle=await build({entryPoints:[entry],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',define:{'import.meta.env.DEV':'false'},external:['react','react/jsx-runtime'],plugins:[{name:'isolate-home',setup(b){
 b.onResolve({filter:/^\.\/initial-selection\.mjs$/},()=>({path:path.resolve(import.meta.dirname,'../src/initial-selection.mjs')}));
 b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?null:/^react(?:\/jsx-runtime)?$/.test(a.path)?{path:a.path,external:true}:{path:a.path,namespace:'mock'});
 b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p==='./platform'?`export class ApiError extends Error{constructor(code='',id='',status=0){super(code);this.code=code;this.errorId=id;this.status=status}};export const onSessionInvalidated=fn=>{globalThis.__homeRecovery.invalidate=fn;return ()=>{globalThis.__homeRecovery.invalidate=null;}},isToss=()=>true,restoreSession=async()=>globalThis.__homeRecovery.authenticated,recoverAfterAuthentication=async()=>{globalThis.__homeRecovery.calls++;if(globalThis.__homeRecovery.wait)await globalThis.__homeRecovery.wait;if(globalThis.__homeRecovery.error)throw globalThis.__homeRecovery.error;return globalThis.__homeRecovery.notice},saleProducts=async()=>{if(globalThis.__homeRecovery.saleError)throw globalThis.__homeRecovery.saleError;return []},tarotLibraryProducts=async()=>[],event=()=>{},api=async(...args)=>{const result=await globalThis.__homeRecovery.api(...args);if(result?.errorStatus)throw new ApiError('REQUEST_FAILED','',result.errorStatus);return result},login=()=>{},logout=()=>{},purchase=()=>{},restorePurchases=()=>{},unlinkCurrentSession=()=>{};`:p==='./release'?'export const SERVICE_AVAILABLE=true;':p==='./content'?`export const readings=[{id:'saju_mackerel',domain:'saju',serviceId:'yeongnyangi'}],errors={REQUEST_FAILED:'오류',SESSION_EXPIRED:'로그인 시간이 만료되었어요.'},questions=[],birthSystems=[],consultationServices=[],selectionFor=()=>'';`:p.includes('question-policy')?`export const QUESTION_POLICY_VERSION='test',questionTopics=[],recommendQuestion=()=>({missing:[],unsupported:false,fish:'mackerel'});`:p.includes('yeongnyangi-spread-catalog')?`export const yeongnyangiSpreads=[{id:'test'}];`:p.includes('toss-library-flows')?`export const TOSS_TAROT_LIBRARY_FLOWS=[];`:p==='./Brand'?`import React from 'react';export const AdviserChoices=()=>null,AdviserPortrait=()=>null,CharacterGuide=()=>null,PaymentIdentity=()=>null,FloralInputWelcome=()=>null,advisers={yeongnyangi:{name:'영냥이'}};`:p==='./BirthFields'?`export const BirthFields=()=>null,emptyBirth=()=>({}),birthPayload=()=>({});`:p==='./Followup'?`export const Followup=()=>null;`:p==='@apps-in-toss/web-framework'?`export const SafeArea={get:()=>({bottom:0}),subscribe:()=>()=>{}},Screen={close:()=>{}},graniteEvent={addEventListener:()=>()=>{}};`:p==='@toss/tds-mobile'?`export const TextField=()=>null,TextArea=()=>null;`:p==='./Button'?`import React from 'react';export const Button=({children,loading,display,variant,...props})=>React.createElement('button',props,children);`:`import React from 'react';export default function Mock(){return React.createElement('div',null,'홈 화면');}` }));
}}]});
const loaded=new Module(path.resolve(import.meta.dirname,'auto-recovery-home.cjs'));loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);const App=loaded.exports.default;
async function mount(authenticated,notice='',options={}){globalThis.__homeRecovery={authenticated,notice,calls:0,wait:options.wait,error:options.error,saleError:options.saleError,api:options.api||(()=>{})};const root=createRoot(document.getElementById('root'));await React.act(async()=>{root.render(React.createElement(App));});return {state:globalThis.__homeRecovery,close:async()=>{await React.act(async()=>root.unmount());delete globalThis.__homeRecovery;}};}
test('home checks pending orders after restoring a session',async()=>{const view=await mount(true,'1건 복구');try{assert.equal(view.state.calls,1);assert.match(document.body.textContent,/1건 복구/);}finally{await view.close();}});
test('home does not check pending orders without a restored session',async()=>{const view=await mount(false);try{assert.equal(view.state.calls,0);}finally{await view.close();}});

test('delayed recovery refreshes an already opened library without another purchase',async()=>{
 history.replaceState({},'', '/library');let finish,ready=false,reads=0;const wait=new Promise(resolve=>{finish=()=>{ready=true;resolve();};});
 const row={orderId:'order-1',status:'PURCHASED',state:'UNASSIGNED',serviceId:'yeongnyangi',productId:'saju_mackerel',selectionId:'saju_mackerel',createdAt:'2026-01-01'};
 const view=await mount(true,'1건 복구',{wait,api:async path=>{assert.equal(path,'/library');reads++;return {purchases:ready?[row]:[],nextCursor:null};}});
 try{assert.match(document.body.textContent,/구매한 상담이 아직 없어요/);assert.equal(reads,1);await React.act(async()=>finish());assert.equal(reads,2);assert.match(document.body.textContent,/주문 order-1/);}finally{await view.close();history.replaceState({},'', '/');}
});

test('a partially restored order is reloaded even when a later order fails',async()=>{
 history.replaceState({},'', '/library');let finish,ready=false,reads=0;const wait=new Promise(resolve=>{finish=()=>{ready=true;resolve();};});
 const row={orderId:'saved-before-error',status:'PURCHASED',state:'UNASSIGNED',serviceId:'yeongnyangi',productId:'saju_mackerel',selectionId:'saju_mackerel',createdAt:'2026-01-01'};
 const view=await mount(true,'',{wait,error:new Error('offline'),api:async()=>{reads++;return {purchases:ready?[row]:[],nextCursor:null};}});
 try{assert.equal(reads,1);await React.act(async()=>finish());assert.equal(reads,2);assert.match(document.body.textContent,/주문 saved-before-error/);}finally{await view.close();history.replaceState({},'', '/');}
});

test('a direct result is read again when delayed recovery finishes',async()=>{
 history.replaceState({},'', '/result?id=result-1');let finish,ready=false,reads=0;const wait=new Promise(resolve=>{finish=()=>{ready=true;resolve();};});
 const view=await mount(true,'1건 복구',{wait,api:async path=>{assert.equal(path,'/results/result-1');reads++;if(!ready)throw new Error('not ready');return {id:'result-1',state:'COMPLETED',chapters:[{title:'결과',summary:'복구된 상담 내용'}],manifest:[{title:'결과'}],recovery:{savedChapters:1,totalChapters:1,canRetryNow:false,reviewRequired:false}};}});
 try{assert.equal(reads,1);await React.act(async()=>finish());assert.equal(reads,2);assert.match(document.body.textContent,/복구된 상담 내용/);}finally{await view.close();history.replaceState({},'', '/');}
});

test('a revoked result removes its stale continue action after a permission denial',async()=>{
 history.replaceState({},'', '/result?id=result-1');let finish,ready=false,reads=0;const wait=new Promise(resolve=>{finish=()=>{ready=true;resolve();};});
 const view=await mount(true,'',{wait,api:async()=>{reads++;return ready?{errorStatus:403}:{id:'result-1',state:'PARTIAL',chapters:[{title:'결과',summary:'이전 결과'}],manifest:[{title:'결과'}],recovery:{savedChapters:1,totalChapters:2,canRetryNow:true,reviewRequired:false}};}});
 try{assert.match(document.body.textContent,/추가 결제 없이 이어서 생성/);await React.act(async()=>finish());assert.equal(reads,2);assert.doesNotMatch(document.body.textContent,/추가 결제 없이 이어서 생성|이전 결과/);assert.match(document.body.textContent,/접근 권한을 확인할 수 없어요/);}finally{await view.close();history.replaceState({},'', '/');}
});

test('a failed result recheck hides previously approved content and continuation',async()=>{
 history.replaceState({},'', '/result?id=result-1');let finish,ready=false;const wait=new Promise(resolve=>{finish=()=>{ready=true;resolve();};});
 const view=await mount(true,'',{wait,api:async()=>ready?{errorStatus:404}:{id:'result-1',state:'PARTIAL',chapters:[{title:'결과',summary:'이전 결과'}],manifest:[{title:'결과'}],recovery:{savedChapters:1,totalChapters:2,canRetryNow:true,reviewRequired:false}}});
 try{assert.match(document.body.textContent,/추가 결제 없이 이어서 생성/);await React.act(async()=>finish());assert.doesNotMatch(document.body.textContent,/추가 결제 없이 이어서 생성|이전 결과/);ready=false;const retry=[...document.querySelectorAll('button')].find(button=>button.textContent.includes('다시 확인하기'));assert.ok(retry);await React.act(async()=>retry.click());assert.match(document.body.textContent,/이전 결과/);}finally{await view.close();history.replaceState({},'', '/');}
});

test('an older result response cannot restore content after a newer denial',async()=>{
 history.replaceState({},'', '/result?id=result-1');Object.defineProperty(document,'hidden',{configurable:true,value:false});let release,reads=0;
 const pending=new Promise(resolve=>{release=resolve;});
 const result={id:'result-1',state:'PARTIAL',chapters:[{title:'결과',summary:'이전 결과'}],manifest:[{title:'결과'}],recovery:{savedChapters:1,totalChapters:2,canRetryNow:true,reviewRequired:false}};
 const view=await mount(true,'',{api:async()=>++reads===1?result:reads===2?pending:{errorStatus:403}});
 try{await React.act(async()=>document.dispatchEvent(new dom.window.Event('visibilitychange')));await React.act(async()=>document.dispatchEvent(new dom.window.Event('visibilitychange')));assert.doesNotMatch(document.body.textContent,/이전 결과|추가 결제 없이 이어서 생성/);await React.act(async()=>release(result));assert.doesNotMatch(document.body.textContent,/이전 결과|추가 결제 없이 이어서 생성/);}
 finally{await view.close();delete document.hidden;history.replaceState({},'', '/');}
});

test('library distinguishes life-fortune and life-book purchase titles',async()=>{
 history.replaceState({},'', '/library');const base={status:'PURCHASED',state:'UNASSIGNED',nativeService:'life-book',createdAt:'2026-01-01'};
 const view=await mount(true,'',{api:async()=>({purchases:[{...base,orderId:'book',featureKey:'life-book-ai-consultation'},{...base,orderId:'fortune',featureKey:'life-fortune-ai-consultation'}],nextCursor:null})});
 try{assert.match(document.body.textContent,/인생의 책/);assert.match(document.body.textContent,/인생 총운/);}finally{await view.close();history.replaceState({},'', '/');}
});

test('background session expiry hides an opened private result and requires login',async()=>{
 history.replaceState({},'', '/result?id=result-1');const view=await mount(true,'',{api:async()=>({id:'result-1',state:'COMPLETED',chapters:[{title:'결과',summary:'이전 계정의 결과'}],manifest:[{title:'결과'}],recovery:{savedChapters:1,totalChapters:1,canRetryNow:false,reviewRequired:false}})});
 try{assert.match(document.body.textContent,/이전 계정의 결과/);await React.act(async()=>globalThis.__homeRecovery.invalidate());assert.doesNotMatch(document.body.textContent,/이전 계정의 결과/);assert.match(document.body.textContent,/로그인/);}
 finally{await view.close();history.replaceState({},'', '/');}
});

test('a delayed result cannot reappear after background session expiry',async()=>{
 history.replaceState({},'', '/result?id=result-1');let release;const pending=new Promise(resolve=>{release=resolve;});const view=await mount(true,'',{api:async()=>pending});
 try{await React.act(async()=>{view.state.invalidate();release({id:'result-1',state:'COMPLETED',chapters:[{title:'결과',summary:'늦게 도착한 이전 결과'}],manifest:[{title:'결과'}],recovery:{savedChapters:1,totalChapters:1,canRetryNow:false,reviewRequired:false}});await Promise.resolve();});assert.doesNotMatch(document.body.textContent,/늦게 도착한 이전 결과/);assert.match(document.body.textContent,/로그인/);}
 finally{await view.close();history.replaceState({},'', '/');}
});

test('direct result can be read again after session expiry and login',async()=>{
 history.replaceState({},'', '/result?id=result-1');let reads=0;const view=await mount(true,'',{api:async()=>({id:'result-1',state:'COMPLETED',chapters:[{title:'결과',summary:++reads===1?'만료 전 결과':'다시 확인한 결과'}],manifest:[{title:'결과'}],recovery:{savedChapters:1,totalChapters:1,canRetryNow:false,reviewRequired:false}})});
 try{await React.act(async()=>view.state.invalidate());const resume=[...document.querySelectorAll('button')].find(button=>button.textContent.includes('로그인하고 결과 보기'));assert.ok(resume);await React.act(async()=>resume.click());const login=[...document.querySelectorAll('button')].find(button=>button.textContent.includes('토스로 로그인하기'));assert.ok(login);await React.act(async()=>login.click());assert.match(document.body.textContent,/다시 확인한 결과/);assert.ok(reads>=2);}
 finally{await view.close();history.replaceState({},'', '/');}
});

test('an unknown 401 code still asks for login rather than showing a general error',async()=>{
 history.replaceState({},'', '/result?id=result-1');const view=await mount(true,'',{api:async()=>({errorStatus:401})});
 try{assert.match(document.body.textContent,/로그인 시간이 만료/);assert.doesNotMatch(document.body.textContent,/오류/);}
 finally{await view.close();history.replaceState({},'', '/');}
});

test('unsupported product listing shows the SDK update guidance',async()=>{
 history.replaceState({},'', '/');const sdkError={code:'UNSUPPORTED_APP_VERSION',message:'토스 앱을 최신 버전으로 업데이트해 주세요.'};const view=await mount(false,'',{saleError:sdkError});
 try{assert.match(document.body.textContent,/토스 앱을 최신 버전으로 업데이트해 주세요/);}
 finally{await view.close();}
});
