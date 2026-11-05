import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {build} from 'esbuild';import {createRequire} from 'node:module';import path from 'node:path';import fs from 'node:fs';
const root=path.resolve(import.meta.dirname,'../../..'),require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module'),React=require('react'),{createRoot}=require('react-dom/client');
const src=fs.readFileSync(path.join(root,'apps/toss/service/Screens.jsx'),'utf8');
const mocks={
 './TossLetterRoom':"import React from 'react';export default p=>React.createElement('span',{'data-letter':p.initialId,'data-order':p.initialOrderId});",
 '@/app/fortune-tea-house/SavedTeaReading':"import React from 'react';export default p=>React.createElement('span',{'data-saved':p.resultId});",
 '../src/release':"export const SERVICE_AVAILABLE=false;",
 '../src/platform':"export const isToss=()=>false,restoreSession=async()=>false,recoverAfterAuthentication=async()=>'',onSessionInvalidated=()=>()=>{},canonicalResponse=()=>{},login=()=>{};",
 './transport.mjs':"export const createServiceFetch=()=>globalThis.fetch;",
 './native-back.mjs':"export const dispatchServiceBack=()=>false;",
 '@/app/_lib/auth-client':"export const clearClientAuthState=()=>{};",
 '@/app/_lib/auth-store':"export const refreshAuth=async()=>{},handleSessionInvalidated=()=>{};",
 '@apps-in-toss/web-framework':"export const SafeArea={},Screen={},graniteEvent={};",
 'framer-motion':"import React from 'react';export const LazyMotion=({children})=>React.createElement(React.Fragment,null,children),domAnimation={};",
 '@/app/components/Toast':"export const ToastProvider=()=>null;"
};
const bundle=await build({stdin:{contents:src,resolveDir:path.join(root,'apps/toss/service'),loader:'jsx'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'screens-mocks',setup(b){b.onResolve({filter:/.*/},a=>/^react(?:\/jsx-runtime)?$/.test(a.path)?{path:a.path,external:true}:{path:a.path,namespace:'mock'});b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:mocks[p]||(p.endsWith('.css')?'export default {};':"import React from 'react';export default ({children})=>React.createElement('div',null,children);" )}));}}]});
const loaded=new Module(path.join(root,'letter-screens-test.cjs'));loaded.paths=Module._nodeModulePaths(path.join(root,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
test('tea shell preserves saved result priority and passes direct letter and order IDs',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});dom.window.fetch=globalThis.fetch;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;let destination='';
 const render=async query=>{globalThis.location={pathname:'/fortune-tea-house/',search:query,origin:'http://localhost',replace:value=>{destination=value;}};const app=createRoot(document.getElementById('root'));await React.act(async()=>app.render(React.createElement(loaded.exports.default)));return app;};
 let app;try{const id='a'.repeat(64),order='01900000-1111-7111-8111-000000000001';app=await render('?resultId=saved&counsel=letter&consultation='+id);assert.equal(document.querySelector('[data-saved]').getAttribute('data-saved'),'saved');await React.act(async()=>app.unmount());app=await render('?counsel=letter&consultation='+id+'&orderId='+order);const letter=document.querySelector('[data-letter]');assert.equal(letter.getAttribute('data-letter'),id);assert.equal(letter.getAttribute('data-order'),order);await React.act(async()=>app.unmount());app=await render('?counsel=letter&consultation=bad');assert.match(document.body.textContent,/상담 주소를 확인하지 못했어요/);await React.act(async()=>app.unmount());app=await render('?consultation='+id);assert.equal(destination,'/result?id='+id);}finally{await React.act(async()=>app.unmount());dom.window.close();}
});
