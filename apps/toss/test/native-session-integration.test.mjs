import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const repo=path.resolve(import.meta.dirname,'../../..');
const require=createRequire(new URL('../package.json',import.meta.url));
const Module=require('node:module'),React=require('react'),{createRoot}=require('react-dom/client');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/result?id=result-1'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.history=dom.window.history;globalThis.IS_REACT_ACT_ENVIRONMENT=true;dom.window.scrollTo=()=>{};

const bundle=await build({
  stdin:{contents:"export * as platform from './apps/toss/src/platform.ts';export {default as App} from './apps/toss/src/App.tsx';",resolveDir:repo,loader:'tsx'},
  bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',define:{'import.meta.env.DEV':'false'},external:['react','react/jsx-runtime'],
  plugins:[{name:'offline-app-integration',setup(b){
    b.onResolve({filter:/^\.\/apps\/toss\/src\/(platform\.ts|App\.tsx)$/},a=>({path:path.resolve(repo,a.path)}));
    b.onResolve({filter:/^\.\/platform$/},()=>({path:path.join(repo,'apps/toss/src/platform.ts')}));
    b.onResolve({filter:/toss-library-links\.mjs$/},()=>({path:path.join(repo,'lib/tarot/toss-library-links.mjs')}));
    b.onResolve({filter:/toss-letter-recovery-link\.mjs$/},()=>({path:path.join(repo,'lib/fortune/toss-letter-recovery-link.mjs')}));
    b.onResolve({filter:/^\.\/initial-selection\.mjs$/},()=>({path:path.join(repo,'apps/toss/src/initial-selection.mjs')}));
    b.onResolve({filter:/native-back\.mjs$/},()=>({path:path.join(repo,'apps/toss/service/native-back.mjs')}));
    b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?null:/^react(?:\/jsx-runtime)?$/.test(a.path)?{path:a.path,external:true}:{path:a.path,namespace:'mock'});
    b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:
      p==='./release'?'export const SERVICE_AVAILABLE=true;':
      p==='@apps-in-toss/web-framework'?`const supported=fn=>Object.assign(fn,{isSupported:()=>true});export const Environment={environment:'sandbox'},isMinVersionSupported=()=>true,TossAuth={login:async()=>({authorizationCode:'mock',referrer:'SANDBOX'})},Storage={getItem:async()=>globalThis.__nativeIntegration.stored,setItem:async(_key,value)=>{globalThis.__nativeIntegration.stored=value},removeItem:async()=>{if(globalThis.__nativeIntegration.removeError)throw globalThis.__nativeIntegration.removeError;globalThis.__nativeIntegration.stored=null}},Share={},IAP={getProductItemList:supported(async()=>({products:[]})),getPendingOrders:supported(async()=>({orders:[]})),completeProductGrant:supported(async()=>true)},SafeArea={get:()=>({bottom:0}),subscribe:()=>()=>{}},Screen={close:()=>{}},graniteEvent={addEventListener:()=>()=>{}};`:
      p==='./content'?`export const readings=[{id:'saju_mackerel',domain:'saju',serviceId:'yeongnyangi'}],errors={REQUEST_FAILED:'오류',SESSION_EXPIRED:'로그인 시간이 만료되었어요.'},questions=[],birthSystems=[],consultationServices=[],selectionFor=()=>'';`:
      p.includes('question-policy')?`export const QUESTION_POLICY_VERSION='test',questionTopics=[],recommendQuestion=()=>({missing:[],unsupported:false,fish:'mackerel'});`:
      p.includes('yeongnyangi-spread-catalog')?`export const yeongnyangiSpreads=[{id:'test'}];`:
      p.includes('toss-library-flows')?`export const TOSS_TAROT_LIBRARY_FLOWS=[];`:
      p==='./Brand'?`import React from 'react';export const AdviserChoices=()=>null,AdviserPortrait=()=>null,CharacterGuide=()=>null,PaymentIdentity=()=>null,FloralInputWelcome=()=>null,advisers={yeongnyangi:{name:'영냥이'}};`:
      p==='./BirthFields'?`export const BirthFields=()=>null,emptyBirth=()=>({}),birthPayload=()=>({});`:
      p==='./Followup'?`export const Followup=()=>null;`:
      p==='@toss/tds-mobile'?`export const TextField=()=>null,TextArea=()=>null;`:
      p==='./Button'?`import React from 'react';export const Button=({children,loading,display,variant,...props})=>React.createElement('button',props,children);`:
      `import React from 'react';export default function Mock(){return React.createElement('div',null,'홈 화면');}`
    }));
  }}]
});
const loaded=new Module(path.join(repo,'apps/toss/native-session-integration.cjs'));
loaded.paths=Module._nodeModulePaths(path.join(repo,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {platform,App}=loaded.exports;
const result=summary=>({id:'result-1',state:'COMPLETED',chapters:[{title:'결과',summary}],manifest:[{title:'결과'}],recovery:{savedChapters:1,totalChapters:1,canRetryNow:false,reviewRequired:false}});

async function mount(readResult){
  const originalFetch=globalThis.fetch;globalThis.__nativeIntegration={stored:'account-a',reads:[]};
  globalThis.fetch=async(url,options={})=>{
    const pathname=new URL(url).pathname.replace('/api/toss',''),authorization=options.headers?.Authorization;
    if(pathname==='/login')return Response.json({token:'account-b'});
    if(pathname==='/session')return Response.json({authenticated:true});
    if(pathname==='/logout')return globalThis.__nativeIntegration.logoutResponse?.()??Response.json({error:'REQUEST_FAILED'},{status:503});
    if(pathname==='/catalog')return Response.json({products:[]});
    if(pathname==='/tarot-library/catalog')return Response.json({flows:[]});
    if(pathname==='/events')return Response.json({});
    if(pathname==='/results/result-1'){globalThis.__nativeIntegration.reads.push(authorization);return readResult(authorization);}
    throw new Error(`Unexpected offline request: ${pathname}`);
  };
  const root=createRoot(document.getElementById('root'));
  await React.act(async()=>root.render(React.createElement(App)));
  return {close:async()=>{await React.act(async()=>root.unmount());await platform.clearSession();globalThis.fetch=originalFetch;delete globalThis.__nativeIntegration;}};
}

test('actual app and platform recheck result permission after the Toss credential changes',async()=>{
  const view=await mount(auth=>auth==='Bearer account-a'?Response.json(result('이전 계정의 상담 원문')):Response.json({error:'ACCESS_DENIED'},{status:403}));
  try{
    assert.match(document.body.textContent,/이전 계정의 상담 원문/);
    await React.act(async()=>platform.login());
    assert.doesNotMatch(document.body.textContent,/이전 계정의 상담 원문|추가 결제 없이 이어서 생성/);
    assert.match(document.body.textContent,/접근 권한을 확인할 수 없어요/);
    assert.ok(globalThis.__nativeIntegration.reads.includes('Bearer account-b'));
  }finally{await view.close();}
});

test('actual platform rejects a delayed result from the previous account',async()=>{
  let finish;const delayed=new Promise(resolve=>{finish=resolve;});
  const view=await mount(auth=>auth==='Bearer account-a'?delayed:Response.json(result('새 계정의 상담 원문')));
  try{
    await React.act(async()=>platform.login());
    assert.match(document.body.textContent,/새 계정의 상담 원문/);
    await React.act(async()=>finish(Response.json(result('늦게 도착한 이전 상담 원문'))));
    assert.match(document.body.textContent,/새 계정의 상담 원문/);
    assert.doesNotMatch(document.body.textContent,/늦게 도착한 이전 상담 원문/);
  }finally{await view.close();}
});

test('a failed logout cannot leave the app displaying an authenticated session',async()=>{
  history.replaceState({},'','/settings');
  const view=await mount(()=>{throw new Error('unexpected result request');});
  try{
    const logout=[...document.querySelectorAll('button')].find(button=>button.textContent==='로그아웃');
    assert.ok(logout);
    await React.act(async()=>logout.click());
    assert.equal(platform.hasTossSession(),false);
    assert.ok([...document.querySelectorAll('button')].some(button=>button.textContent==='토스 로그인'));
    assert.ok(![...document.querySelectorAll('button')].some(button=>button.textContent==='로그아웃'));
  }finally{await view.close();history.replaceState({},'','/result?id=result-1');}
});

test('a denied logout preserves permission guidance after clearing the local token',async()=>{
  history.replaceState({},'','/settings');
  const view=await mount(()=>{throw new Error('unexpected result request');});
  try{
    globalThis.__nativeIntegration.logoutResponse=()=>Response.json({error:'ACCESS_DENIED'},{status:403});
    const logout=[...document.querySelectorAll('button')].find(button=>button.textContent==='로그아웃');
    assert.ok(logout);await React.act(async()=>logout.click());
    assert.equal(platform.hasTossSession(),false);
    assert.match(document.body.textContent,/접근 권한을 확인할 수 없어요/);
    assert.ok([...document.querySelectorAll('button')].some(button=>button.textContent==='토스 로그인'));
  }finally{await view.close();history.replaceState({},'','/result?id=result-1');}
});

for(const status of [401,403])test(`a late ${status} logout cannot replace a newly authenticated session`,async()=>{
  history.replaceState({},'','/settings');let finish;
  const view=await mount(()=>{throw new Error('unexpected result request');});
  try{
    globalThis.__nativeIntegration.logoutResponse=()=>new Promise(resolve=>{finish=resolve;});
    const logout=[...document.querySelectorAll('button')].find(button=>button.textContent==='로그아웃');
    assert.ok(logout);await React.act(async()=>logout.click());assert.equal(typeof finish,'function');
    await React.act(async()=>platform.login());
    await React.act(async()=>finish(Response.json({error:status===401?'SESSION_EXPIRED':'ACCESS_DENIED'},{status})));
    assert.equal(platform.hasTossSession(),true);
    assert.doesNotMatch(document.body.textContent,/접근 권한을 확인할 수 없어요|로그인 시간이 만료/);
    assert.ok([...document.querySelectorAll('button')].some(button=>button.textContent==='로그아웃'));
  }finally{await view.close();history.replaceState({},'','/result?id=result-1');}
});

test('an expired logout session asks the user to log in again',async()=>{
  history.replaceState({},'','/settings');
  const view=await mount(()=>{throw new Error('unexpected result request');});
  try{
    globalThis.__nativeIntegration.logoutResponse=()=>Response.json({error:'SESSION_EXPIRED'},{status:401});
    const logout=[...document.querySelectorAll('button')].find(button=>button.textContent==='로그아웃');
    assert.ok(logout);await React.act(async()=>logout.click());
    assert.equal(platform.hasTossSession(),false);
    assert.match(document.body.textContent,/로그인 시간이 만료/);
    assert.ok([...document.querySelectorAll('button')].some(button=>button.textContent==='토스 로그인'));
  }finally{await view.close();history.replaceState({},'','/result?id=result-1');}
});

test('a denied session cleanup remains a permission error after an expired logout',async()=>{
  history.replaceState({},'','/settings');
  const view=await mount(()=>{throw new Error('unexpected result request');});
  try{
    globalThis.__nativeIntegration.logoutResponse=()=>Response.json({error:'SESSION_EXPIRED'},{status:401});
    globalThis.__nativeIntegration.removeError={status:403,code:'ACCESS_DENIED'};
    const logout=[...document.querySelectorAll('button')].find(button=>button.textContent==='로그아웃');
    assert.ok(logout);await React.act(async()=>logout.click());
    assert.equal(platform.hasTossSession(),false);
    assert.match(document.body.textContent,/접근 권한을 확인할 수 없어요/);
  }finally{delete globalThis.__nativeIntegration.removeError;await view.close();history.replaceState({},'','/result?id=result-1');}
});
