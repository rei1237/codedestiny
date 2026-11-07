import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/life-book-ai/'});
dom.window.fetch=globalThis.fetch;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{createRoot}=require('react-dom/client');
const entry=path.resolve(import.meta.dirname,'../service/Screens.jsx');
const bundle=await build({entryPoints:[entry],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'isolate-screens',setup(b){
 b.onResolve({filter:/^\.\/native-back\.mjs$/},()=>({path:path.resolve(import.meta.dirname,'../service/native-back.mjs')}));
 b.onResolve({filter:/^\.\/fpti-session\.mjs$/},()=>({path:path.resolve(import.meta.dirname,'../service/fpti-session.mjs')}));
 b.onResolve({filter:/.*/},args=>args.kind==='entry-point'?null:/^react(?:\/jsx-runtime)?$/.test(args.path)?{path:args.path,external:true}:{path:args.path,namespace:'mock'});
 b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p.endsWith('.css')?'export default {}':p==='@/app/love-secret-ai/result/LoveSecretAiResultClient'||p==='@/app/life-book-ai/result/LifeBookAiResultClient'?`import React from 'react';export default function Result({paymentSurface}){return React.createElement('span',{'data-surface':paymentSurface},'결과 화면');}`:p==='@/app/records/RecordsClient'?`import React from 'react';export default function Records({refreshKey}){return React.createElement('div',null,React.createElement('input',{defaultValue:'기존 검색'}),React.createElement('span',{'data-refresh':true},String(refreshKey)));}`:p==='./letter-draft-bootstrap.mjs'?'export const captureLetterDraft=()=>null,restoreLetterDraft=()=>{};':p==='./tea-draft-bootstrap.mjs'?'export const captureTeaDraft=()=>null,restoreTeaDraft=()=>{};':p==='./sukuyo-draft-bootstrap.mjs'?'export const captureSukuyoDraft=()=>null,restoreSukuyoDraft=()=>{};':p==='./draft-quarantine.mjs'?'export const recallPendingAuthDrafts=()=>({}),rememberPendingAuthDrafts=()=>{},clearPendingAuthDrafts=()=>{};':p==='../src/release'?'export const SERVICE_AVAILABLE=true;':p==='../src/platform'?`export const isToss=()=>false, restoreSession=()=>Promise.resolve(globalThis.__autoRecovery.authenticated), recoverAfterAuthentication=async()=>{globalThis.__autoRecovery.calls++;if(globalThis.__autoRecovery.error)throw globalThis.__autoRecovery.error;if(globalThis.__autoRecovery.wait)await globalThis.__autoRecovery.wait;return globalThis.__autoRecovery.notice;}, canonicalResponse=()=>{}, onSessionInvalidated=fn=>{globalThis.__autoRecovery.listener=fn;return ()=>{globalThis.__autoRecovery.listener=null;}}, login=()=>{};`:p==='./transport.mjs'?'export const createServiceFetch=()=>globalThis.fetch;':p==='@/app/_lib/auth-client'?'export const clearClientAuthState=()=>{};':p==='@/app/_lib/auth-store'?'export const refreshAuth=async()=>({id:"owner"}),handleSessionInvalidated=()=>{globalThis.__autoRecovery.invalidations=(globalThis.__autoRecovery.invalidations||0)+1};':p==='@apps-in-toss/web-framework'?'export const SafeArea={},Screen={},graniteEvent={};':p==='framer-motion'?`import React from 'react';export const LazyMotion=({children})=>React.createElement(React.Fragment,null,children),domAnimation={};`:p==='@/app/components/Toast'?'export const ToastProvider=()=>null;':`import React from 'react';export default function Mock({children}){return React.createElement('div',null,children||'상담 화면');}` }));
}}]});
const loaded=new Module(path.resolve(import.meta.dirname,'auto-recovery-screens.cjs'));loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
const Screens=loaded.exports.default;
async function mount(authenticated,notice='',error=null,wait=null){globalThis.__autoRecovery={authenticated,notice,error,wait,calls:0};const original=window.fetch,root=createRoot(document.getElementById('root'));await React.act(async()=>{root.render(React.createElement(Screens));});return {state:globalThis.__autoRecovery,close:async()=>{await React.act(async()=>root.unmount());window.fetch=original;delete globalThis.__autoRecovery;}};}
test('direct consultation entry checks pending orders after session restoration and shows recovery notice',async()=>{const view=await mount(true,'1건 복구');try{assert.equal(view.state.calls,1);assert.match(document.body.textContent,/1건 복구/);}finally{await view.close();}});
test('direct consultation entry does not query orders for a guest',async()=>{const view=await mount(false);try{assert.equal(view.state.calls,0);assert.doesNotMatch(document.body.textContent,/복구/);}finally{await view.close();}});

test('direct consultation entry reports a permission denial without hiding the screen',async()=>{const view=await mount(true,'',{status:403});try{assert.match(document.body.textContent,/접근할 권한/);assert.match(document.body.textContent,/상담 화면/);}finally{await view.close();}});
test('recovery preserves the SDK update message and code-only login errors',async()=>{
 let view=await mount(true,'',{code:'UNSUPPORTED_APP_VERSION',message:'토스 앱을 최신 버전으로 업데이트해 주세요.'});try{assert.match(document.body.textContent,/토스 앱을 최신 버전으로 업데이트해 주세요/);}finally{await view.close();}
 view=await mount(true,'',{code:'LOGIN_REQUIRED'});try{assert.match(document.body.textContent,/토스 로그인이 필요해요/);}finally{await view.close();}
});
test('an explicit 403 remains a denial even when an error code conflicts',async()=>{const view=await mount(true,'',{status:403,code:'LOGIN_REQUIRED'});try{assert.match(document.body.textContent,/접근할 권한/);assert.doesNotMatch(document.body.textContent,/토스 로그인이 필요해요/);}finally{await view.close();}});

test('a delayed recovery does not keep the consultation screen loading',async()=>{let release;const wait=new Promise(resolve=>{release=resolve;});const view=await mount(true,'1건 복구',null,wait);try{assert.equal(view.state.calls,1);assert.match(document.body.textContent,/상담 화면/);await React.act(async()=>release());assert.match(document.body.textContent,/1건 복구/);}finally{await view.close();}});

test('records refresh after delayed recovery without remounting or losing search input',async()=>{
 window.history.replaceState({},'', '/records/');let finish;const wait=new Promise(resolve=>{finish=resolve;});const view=await mount(true,'1건 복구',null,wait);
 try{const input=document.querySelector('input');assert.ok(input);input.value='보존할 검색어';assert.equal(document.querySelector('[data-refresh]').textContent,'0');await React.act(async()=>finish());assert.equal(document.querySelector('[data-refresh]').textContent,'1');assert.equal(document.querySelector('input'),input);assert.equal(input.value,'보존할 검색어');}finally{await view.close();window.history.replaceState({},'', '/life-book-ai/');}
});

for(const route of ['/life-book-ai/result/','/love-secret-ai/result/'])test(route+' receives Toss payment surface',async()=>{window.history.replaceState({},'',route);const view=await mount(false);try{assert.equal(document.querySelector('[data-surface]').getAttribute('data-surface'),'toss');}finally{await view.close();window.history.replaceState({},'', '/life-book-ai/');}});

test('service shell subscribes to Toss session invalidation and clears the auth store',async()=>{const view=await mount(true);try{assert.equal(typeof view.state.listener,'function');await React.act(async()=>view.state.listener());assert.equal(view.state.invalidations,1);}finally{await view.close();}});
