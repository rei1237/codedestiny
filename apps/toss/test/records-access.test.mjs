import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const React=require('react'),{createRoot}=require('react-dom/client');

test('records hide previous accounts and revoke links on a denied page',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/records/'});
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.sessionStorage=dom.window.sessionStorage;globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const src=path.resolve(import.meta.dirname,'../../../app/records/RecordsClient.tsx');
 const bundle=await build({entryPoints:[src],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'records-boundaries',setup(b){
  b.onResolve({filter:/.*/},args=>args.kind==='entry-point'?null:/^react(?:\/jsx-runtime)?$/.test(args.path)?{path:args.path,external:true}:{path:args.path,namespace:'mock'});
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p==='@/app/_lib/auth-client'?`export const authFetch=()=>globalThis.recordsFetch();`:p==='@/app/_lib/auth-store'?`export const getAuthState=()=>({authReady:true});export const useAuthStore=()=>globalThis.recordsAuth;export const refreshAuth=async()=>{};`:p==='@/lib/i18n/useT'?`export const useLocale=()=> 'ko';`:p==='@/lib/records/copy'?`export const recordsCopy=()=>new Proxy({},{get:(_,key)=>String(key)});`:p==='@/lib/records/service-registry'?`export const recordService=()=>{globalThis.recordsRenders.push(globalThis.recordsAuth.user.id);return null;};`:p==='@/app/components/review/review-ui'?`export const reviewWriteHref=id=>'/reviews/?write=1'+(id?'&product='+encodeURIComponent(id):'');`:p==='./RecordFrame'?`import React from 'react';export const recordButton='';export default ({children})=>React.createElement('main',null,children);`:p.endsWith('.css')?`export default {};`:p==='lucide-react'?`export const Search=()=>null,ArrowUpRight=()=>null,BookOpen=()=>null,MessageCircleHeart=()=>null;`:`export default {};`}));
 }}]});
 const loaded=new Module(src+'.cjs');loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
 const root=createRoot(document.getElementById('root'));
 try{
  const render=(paymentSurface='toss')=>React.act(async()=>root.render(React.createElement(loaded.exports.default,{showWebReception:false,paymentSurface}))),delay=()=>React.act(async()=>new Promise(resolve=>setTimeout(resolve,400)));
  globalThis.recordsAuth={authReady:true,isAuthenticated:true,user:{id:'a'}};globalThis.recordsRenders=[];globalThis.recordsFetch=async()=>Response.json({ok:true,items:[{key:'k',title:'비공개 제목',status:'saved',source:'x'}],failures:[]});await render();await delay();assert.match(document.body.textContent,/비공개 제목/);
  globalThis.recordsAuth={authReady:true,isAuthenticated:true,user:{id:'b'}};globalThis.recordsFetch=()=>new Promise(()=>{});globalThis.recordsRenders=[];await render();assert.deepEqual(globalThis.recordsRenders,[]);
  globalThis.recordsAuth={authReady:true,isAuthenticated:true,user:{id:'c'}};globalThis.recordsFetch=async()=>new Response('{}',{status:403});await render();await delay();assert.match(document.body.textContent,/접근할 권한/);assert.doesNotMatch(document.body.textContent,/비공개 제목/);
  let calls=0;globalThis.recordsAuth={authReady:true,isAuthenticated:true,user:{id:'d'}};globalThis.recordsFetch=async()=>++calls===1?Response.json({ok:true,items:[{key:'k',title:'비공개 제목',status:'saved',source:'x'}],failures:[],nextCursor:'next'}):new Response('{"code":"ACCESS_DENIED"}',{status:503});await render();await delay();assert.match(document.body.textContent,/비공개 제목/);const more=[...document.querySelectorAll('button')].find(button=>button.textContent==='more');assert.ok(more);await React.act(async()=>more.click());assert.match(document.body.textContent,/접근할 권한/);assert.doesNotMatch(document.body.textContent,/비공개 제목/);
  globalThis.recordsAuth={authReady:true,isAuthenticated:true,user:{}};calls=0;globalThis.recordsFetch=()=>{calls++;throw Error('unidentified');};await render();await delay();assert.equal(calls,0);assert.match(document.body.textContent,/로그인 계정을 확인하지 못했어요/);
  globalThis.recordsAuth={authReady:true,isAuthenticated:true,user:{_id:'e'}};globalThis.recordsFetch=async()=>new Response('{}',{status:403});await render('web');await delay();assert.match(document.body.textContent,/errorLead/);assert.doesNotMatch(document.body.textContent,/접근할 권한/);
 }finally{await React.act(async()=>root.unmount());dom.window.close();}
});
