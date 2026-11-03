import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import path from 'node:path';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module'),{JSDOM}=require('jsdom'),{build}=require('esbuild');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/records/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.sessionStorage=dom.window.sessionStorage;globalThis.IS_REACT_ACT_ENVIRONMENT=true;dom.window.scrollTo=()=>{};
const React=require('react'),{createRoot}=require('react-dom/client');
const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../../../app/records/RecordsClient.tsx')],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'mock-records',setup(b){
 b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?null:/^react(?:\/jsx-runtime)?$/.test(a.path)?{path:a.path,external:true}:{path:a.path,namespace:'mock'});
 b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p.endsWith('.css')?'export default {}':p==='@/app/_lib/auth-client'?`export const authFetch=async url=>{globalThis.__recordRequests.push(url);return {ok:true,json:async()=>({ok:true,items:[],failures:[]})}};`:p==='@/app/_lib/auth-store'?`export const getAuthState=()=>({authReady:true}),refreshAuth=async()=>{},useAuthStore=()=>({authReady:true,isAuthenticated:true,user:{id:'test'}});`:p==='@/lib/i18n/useT'?`export const useLocale=()=> 'ko';`:p==='@/lib/records/copy'?`export const recordsCopy=()=>new Proxy({},{get:(_,key)=>String(key)});`:p==='@/lib/records/service-registry'?`export const recordService=()=>null;`:p==='./RecordFrame'?`import React from 'react';export const recordButton='button';export default function Frame({children}){return React.createElement('div',null,children);}`:`import React from 'react';export const Search=()=>null,ArrowUpRight=()=>null,BookOpen=()=>null,MessageCircleHeart=()=>null;`}));
}}]});
const loaded=new Module(path.resolve(import.meta.dirname,'records-test.cjs'));loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);const Records=loaded.exports.default;
const tick=()=>new Promise(resolve=>setTimeout(resolve,310));
test('refresh re-reads records while preserving the selected filter',async()=>{globalThis.__recordRequests=[];const root=createRoot(document.getElementById('root'));try{
 await React.act(async()=>{root.render(React.createElement(Records,{showWebReception:false,refreshKey:0}));await tick();});
 await React.act(async()=>{document.querySelectorAll('button')[1].click();await tick();});
 const filter=document.querySelectorAll('button')[1];assert.equal(filter.getAttribute('aria-pressed'),'true');const before=globalThis.__recordRequests.length;
 await React.act(async()=>{root.render(React.createElement(Records,{showWebReception:false,refreshKey:1}));await tick();});
 assert.equal(globalThis.__recordRequests.length,before+1);assert.match(globalThis.__recordRequests.at(-1),/group=report/);assert.equal(filter.getAttribute('aria-pressed'),'true');
 }finally{await React.act(async()=>root.unmount());delete globalThis.__recordRequests;}});
