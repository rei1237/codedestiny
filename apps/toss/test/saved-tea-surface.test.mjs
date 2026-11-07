import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const base=path.resolve(import.meta.dirname,'../../..'),require=createRequire(path.join(base,'apps/toss/package.json')),Module=require('node:module');
const React=require('react'),{createRoot}=require('react-dom/client');
test('saved Toss tea passes its surface through to its result and navigation',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const src=path.join(base,'app/fortune-tea-house/SavedTeaReading.tsx');
 const bundle=await build({entryPoints:[src],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'saved-tea',setup(b){
  b.onResolve({filter:/^@\//},args=>({path:args.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p==='@/app/_lib/auth-client'?`export const authFetch=async()=>({ok:true,json:async()=>({ok:true,result:{}})});`:p==='@/app/_lib/auth-store'?`export const getAuthState=()=>({authReady:true});export const useAuthStore=()=>({authReady:true,isAuthenticated:true,user:{id:'owner'}});export const refreshAuth=async()=>{};`:p==='@/lib/i18n/useT'?`export const useLocale=()=> 'ko';`:p==='@/lib/records/copy'?`export const recordsCopy=()=>({result:'결과',loading:'로딩'});`:p==='@/app/records/RecordFrame'?`import React from 'react';export const recordButton='';export default ({children,paymentSurface})=>React.createElement('main',{'data-frame':paymentSurface},children);`:p.endsWith('.css')?`export default {};`:`import React from 'react';export default ({paymentSurface})=>React.createElement('p',{'data-sheet':paymentSurface||'web'},paymentSurface==='toss'?'토스 결과':'웹 꿀방울');`}));
 }}]});
 const loaded=new Module(src+'.cjs');loaded.paths=Module._nodeModulePaths(path.join(base,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);const root=createRoot(document.getElementById('root'));
 try{
  await React.act(async()=>root.render(React.createElement(loaded.exports.default,{resultId:'mock',paymentSurface:'toss'})));
  assert.equal(document.querySelector('main').dataset.frame,'toss');assert.equal(document.querySelector('[data-sheet]').dataset.sheet,'toss');assert.doesNotMatch(document.body.textContent,/웹 꿀방울/);
  await React.act(async()=>root.render(React.createElement(loaded.exports.default,{resultId:'mock',paymentSurface:'web'})));
  assert.equal(document.querySelector('main').dataset.frame,'web');assert.equal(document.querySelector('[data-sheet]').dataset.sheet,'web');assert.match(document.body.textContent,/웹 꿀방울/);
 }finally{React.act(()=>root.unmount());dom.window.close();}
});
