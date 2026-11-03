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
 b.onResolve({filter:/.*/},args=>args.kind==='entry-point'?null:/^react(?:\/jsx-runtime)?$/.test(args.path)?{path:args.path,external:true}:{path:args.path,namespace:'mock'});
 b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p.endsWith('.css')?'export default {}':p==='../src/release'?'export const SERVICE_AVAILABLE=true;':p==='../src/platform'?`export const isToss=()=>false, restoreSession=()=>Promise.resolve(globalThis.__autoRecovery.authenticated), recoverAfterAuthentication=async()=>{globalThis.__autoRecovery.calls++;if(globalThis.__autoRecovery.error)throw globalThis.__autoRecovery.error;return globalThis.__autoRecovery.notice;}, canonicalResponse=()=>{}, login=()=>{};`:p==='./transport.mjs'?'export const createServiceFetch=()=>globalThis.fetch;':p==='@/app/_lib/auth-client'?'export const clearClientAuthState=()=>{};':p==='@/app/_lib/auth-store'?'export const refreshAuth=async()=>{};':p==='@apps-in-toss/web-framework'?'export const SafeArea={},graniteEvent={};':p==='framer-motion'?`import React from 'react';export const LazyMotion=({children})=>React.createElement(React.Fragment,null,children),domAnimation={};`:p==='@/app/components/Toast'?'export const ToastProvider=()=>null;':`import React from 'react';export default function Mock({children}){return React.createElement('div',null,children||'상담 화면');}` }));
}}]});
const loaded=new Module(path.resolve(import.meta.dirname,'auto-recovery-screens.cjs'));loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
const Screens=loaded.exports.default;
async function mount(authenticated,notice='',error=null){globalThis.__autoRecovery={authenticated,notice,error,calls:0};const original=window.fetch,root=createRoot(document.getElementById('root'));await React.act(async()=>{root.render(React.createElement(Screens));});return {state:globalThis.__autoRecovery,close:async()=>{await React.act(async()=>root.unmount());window.fetch=original;delete globalThis.__autoRecovery;}};}
test('direct consultation entry checks pending orders after session restoration and shows recovery notice',async()=>{const view=await mount(true,'1건 복구');try{assert.equal(view.state.calls,1);assert.match(document.body.textContent,/1건 복구/);}finally{await view.close();}});
test('direct consultation entry does not query orders for a guest',async()=>{const view=await mount(false);try{assert.equal(view.state.calls,0);assert.doesNotMatch(document.body.textContent,/복구/);}finally{await view.close();}});

test('direct consultation entry reports a permission denial without hiding the screen',async()=>{const view=await mount(true,'',{status:403});try{assert.match(document.body.textContent,/접근할 권한/);assert.match(document.body.textContent,/상담 화면/);}finally{await view.close();}});
