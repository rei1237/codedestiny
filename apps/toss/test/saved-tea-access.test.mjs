import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const React=require('react'),{createRoot}=require('react-dom/client');

test('saved tea preserves permission errors and never renders a previous owner or result',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const src=path.resolve(import.meta.dirname,'../../../app/fortune-tea-house/SavedTeaReading.tsx');
 const bundle=await build({entryPoints:[src],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'saved-tea-boundaries',setup(b){
  b.onResolve({filter:/^@\//},args=>({path:args.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p==='@/app/_lib/auth-client'?`export const authFetch=()=>globalThis.savedTeaMock();`:p==='@/app/_lib/auth-store'?`export const getAuthState=()=>({authReady:true});export const useAuthStore=()=>globalThis.savedTeaAuth;export const refreshAuth=async()=>{};`:p==='@/lib/i18n/useT'?`export const useLocale=()=> 'ko';`:p==='@/lib/records/copy'?`export const recordsCopy=()=>({result:'결과',error:'일반 오류',retry:'다시 시도',loading:'로딩'});`:p==='@/app/records/RecordFrame'?`import React from 'react';export const recordButton='';export default ({children})=>React.createElement('main',null,children);`:p.endsWith('.css')?`export default {};`:`import React from 'react';export default ()=>{globalThis.savedTeaRenders.push(globalThis.savedTeaAuth.user.id);return React.createElement('p',null,'결과 원문');};`}));
 }}]});
 const loaded=new Module(src+'.cjs');loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
 const root=createRoot(document.getElementById('root')),render=(resultId,paymentSurface='toss')=>React.act(async()=>root.render(React.createElement(loaded.exports.default,{resultId,paymentSurface})));
 try{
  globalThis.savedTeaAuth={authReady:true,isAuthenticated:true,user:{id:'a'}};globalThis.savedTeaRenders=[];globalThis.savedTeaMock=async()=>new Response('{}',{status:403});
  await render('example');assert.match(document.body.textContent,/접근할 권한/);assert.doesNotMatch(document.body.textContent,/일반 오류|결과 원문/);
  globalThis.savedTeaMock=async()=>new Response('{}',{status:503});await React.act(async()=>document.querySelector('button').click());assert.match(document.body.textContent,/일반 오류/);
  globalThis.savedTeaMock=async()=>new Response('{"code":"ACCESS_DENIED"}',{status:503});await React.act(async()=>document.querySelector('button').click());assert.match(document.body.textContent,/접근할 권한/);
  globalThis.savedTeaMock=async()=>new Response('{}',{status:403});await render('example','web');assert.match(document.body.textContent,/일반 오류/);
  globalThis.savedTeaMock=async()=>Response.json({ok:true,result:{}});await render('owned');assert.match(document.body.textContent,/결과 원문/);
  globalThis.savedTeaAuth={authReady:true,isAuthenticated:true,user:{id:'b'}};globalThis.savedTeaMock=()=>new Promise(()=>{});await render('owned');assert.deepEqual(globalThis.savedTeaRenders,['a']);
  globalThis.savedTeaMock=async()=>Response.json({ok:true,result:{}});await render('second');assert.match(document.body.textContent,/결과 원문/);
  globalThis.savedTeaMock=()=>new Promise(()=>{});await render('third');assert.deepEqual(globalThis.savedTeaRenders,['a','b']);
  let calls=0;globalThis.savedTeaAuth={authReady:true,isAuthenticated:true,user:{}};globalThis.savedTeaMock=()=>{calls++;throw Error('no identified account');};await render('third');assert.equal(calls,0);assert.match(document.body.textContent,/로그인 계정을 확인하지 못했어요/);
 }finally{React.act(()=>root.unmount());dom.window.close();}
});

test('the Toss saved tea and records routes pass their payment surface',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/fortune-tea-house/?resultId=example'});
 dom.window.fetch=globalThis.fetch;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const entry=path.resolve(import.meta.dirname,'../service/Screens.jsx');
 const bundle=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'service-boundaries',setup(b){
  b.onResolve({filter:/.*/},args=>args.kind==='entry-point'?null:/^react(?:\/jsx-runtime)?$/.test(args.path)?{path:args.path,external:true}:{path:args.path,namespace:'mock'});
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p.endsWith('.css')?'export default {}':p==='@/app/fortune-tea-house/SavedTeaReading'?`import React from 'react';export default ({paymentSurface,resultId})=>React.createElement('span',{'data-surface':paymentSurface,'data-result':resultId});`:p==='@/app/records/RecordsClient'?`import React from 'react';export default ({paymentSurface})=>React.createElement('span',{'data-surface':paymentSurface});`:p==='../src/release'?'export const SERVICE_AVAILABLE=false;':p==='../src/platform'?`export const isToss=()=>false,restoreSession=async()=>false,recoverAfterAuthentication=async()=>'',onSessionInvalidated=()=>()=>{},canonicalResponse=()=>{},login=()=>{};`:p==='./transport.mjs'?'export const createServiceFetch=()=>globalThis.fetch;':p==='@/app/_lib/auth-client'?'export const clearClientAuthState=()=>{};':p==='@/app/_lib/auth-store'?'export const refreshAuth=async()=>{},handleSessionInvalidated=()=>{};':p==='@apps-in-toss/web-framework'?'export const SafeArea={},graniteEvent={};':p==='framer-motion'?`import React from 'react';export const LazyMotion=({children})=>React.createElement(React.Fragment,null,children),domAnimation={};`:p==='@/app/components/Toast'?'export const ToastProvider=()=>null;':`import React from 'react';export default ({children})=>React.createElement('div',null,children);`}));
 }}]});
 const loaded=new Module(entry+'.cjs');loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
 let root=createRoot(document.getElementById('root'));
 try{await React.act(async()=>root.render(React.createElement(loaded.exports.default)));const saved=document.querySelector('[data-surface]');assert.ok(saved);assert.equal(saved.getAttribute('data-surface'),'toss');assert.equal(saved.getAttribute('data-result'),'example');await React.act(async()=>root.unmount());dom.window.history.replaceState({},'','/records/');root=createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(loaded.exports.default)));assert.equal(document.querySelector('[data-surface]').getAttribute('data-surface'),'toss');}
 finally{await React.act(async()=>root.unmount());dom.window.close();}
});
