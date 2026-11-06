import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const React=require('react'),{createRoot}=require('react-dom/client');
const dom=new JSDOM('<div id="root"></div>',{url:'https://miniapp.example/checkout/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const source=path.resolve(import.meta.dirname,'../service/Screens.jsx');
const bundle=await build({entryPoints:[source],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'offline-screen-boundaries',setup(b){
 b.onLoad({filter:/Screens\.jsx$/},async()=>({contents:await readFile(source,'utf8')+'\nexport {PreparedCheckout};',loader:'jsx'}));
 b.onResolve({filter:/.*/},args=>args.kind==='entry-point'||args.path==='react'||args.path==='react/jsx-runtime'?undefined:{path:args.path,namespace:'fixture'});
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`
  import React from 'react';
  export default function Checkout({draft}){globalThis.checkoutReentry.drafts.push(draft);return React.createElement('div',{'data-checkout':true},draft.product.name);}
  export const canonicalResponse=(...args)=>globalThis.checkoutReentry.send(...args);
  export const LazyMotion=()=>null,domAnimation={},SafeArea={},Screen={},graniteEvent={},ToastProvider=()=>null,dispatchServiceBack=()=>false;
  export const captureTeaDraft=()=>null,restoreTeaDraft=()=>{},captureLetterDraft=()=>null,restoreLetterDraft=()=>{},clearClientAuthState=()=>{},refreshAuth=()=>{},handleSessionInvalidated=()=>{},SERVICE_AVAILABLE=false,restoreSession=()=>{},recoverAfterAuthentication=()=>{},onSessionInvalidated=()=>()=>{},login=()=>{},isToss=()=>false,createServiceFetch=()=>{};
  export const captureSukuyoDraft=()=>null,restoreSukuyoDraft=()=>{},recallPendingAuthDrafts=()=>({}),rememberPendingAuthDrafts=()=>{},clearPendingAuthDrafts=()=>{};
 `}));
}}]});
const loaded=new Module(path.resolve(import.meta.dirname,'checkout-reentry.cjs'));
loaded.paths=Module._nodeModulePaths(import.meta.dirname);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const Screen=loaded.exports.PreparedCheckout,id='a'.repeat(64);
const fortune={id,paid:false,state:'CREATED',product:{id:'saju_mackerel',name:'원본 상품'},consultation:{question:'원본 질문'},manifest:[{id:'first'}]};
async function mount(send,query='?requestId='+id){
 const calls=[],redirects=[],drafts=[];
 globalThis.location={origin:dom.window.location.origin,search:query,replace:href=>redirects.push(href)};
 globalThis.checkoutReentry={drafts,send:(...args)=>{calls.push(args);return send(...args);}};
 const root=createRoot(document.getElementById('root'));
 await React.act(async()=>root.render(React.createElement(Screen)));
 return {calls,redirects,drafts,close:()=>React.act(()=>root.unmount())};
}
test('a server-verified paid consultation reopens its original result without mounting the sale checkout',async()=>{
 const view=await mount(async()=>Response.json({fortune:{...fortune,paid:true,state:'COMPLETED'}}));
 try{assert.deepEqual(view.redirects,['/yeongnyangi/result/?id='+id]);assert.equal(view.drafts.length,0);assert.equal(view.calls.length,1);assert.equal(view.calls[0][0],'/canonical/yeongnyangi/requests/'+id);}
 finally{await view.close();}
});
test('an unpaid consultation preserves original input and manifest without granting payment',async()=>{
 const view=await mount(async()=>Response.json({fortune}));
 try{assert.deepEqual(view.redirects,[]);assert.equal(view.drafts.length,1);assert.equal(view.drafts[0].question,fortune.consultation.question);assert.equal(view.drafts[0].chapters,1);assert.deepEqual(await view.drafts[0].onPrepare(),fortune);}
 finally{await view.close();}
});
test('denied reads and malformed identifiers cannot redirect or open a payment checkout',async()=>{
 for(const status of [401,403,404,409,503]){
  const view=await mount(async()=>Response.json({fortune:{...fortune,paid:true}},{status}));
  try{assert.deepEqual(view.redirects,[]);assert.equal(view.drafts.length,0);assert.ok(document.querySelector('[role="alert"]'));}finally{await view.close();}
 }
 const view=await mount(()=>assert.fail('invalid id must not request'),'?requestId=invalid');
 try{assert.equal(view.calls.length,0);assert.equal(view.drafts.length,0);}finally{await view.close();}
});
test('leaving before the verified read completes cannot navigate or reopen checkout',async()=>{
 let finish;
 const view=await mount(()=>new Promise(resolve=>{finish=resolve;}));
 await view.close();assert.equal(view.calls[0][1].signal.aborted,true);
 await React.act(async()=>finish(Response.json({fortune:{...fortune,paid:true}})));
 assert.deepEqual(view.redirects,[]);assert.equal(view.drafts.length,0);
});

for(const status of [401,403])test('non-JSON denied checkout read preserves '+status,async()=>{
 const view=await mount(async()=>new Response('refused',{status}));
 try{assert.equal(view.drafts.length,0);assert.match(document.querySelector('[role="alert"]').textContent,status===401?/로그인/:/권한/);}finally{await view.close();}
});

test('a checkout read permission error code without HTTP status remains explicit',async()=>{
 const view=await mount(async()=>{throw Object.assign(new Error('ACCESS_DENIED'),{code:'ACCESS_DENIED'});});
 try{assert.equal(view.drafts.length,0);assert.match(document.querySelector('[role="alert"]').textContent,/권한/);}finally{await view.close();}
});
