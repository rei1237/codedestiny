import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {createRequire} from 'node:module';
import path from 'node:path';
const repo=path.resolve(import.meta.dirname,'../../..'),require=createRequire(path.join(repo,'apps/toss/package.json')),Module=require('node:module');
const React=require('react'),{createRoot}=require('react-dom/client');
const dom=new JSDOM('<div id="root"></div>',{url:'https://miniapp.example/checkout/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const source=path.resolve(import.meta.dirname,'../service/PreparedCheckout.jsx');
const bundle=await build({entryPoints:[source],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'offline-screen-boundaries',setup(b){
 b.onLoad({filter:/PreparedCheckout\.jsx$/},async()=>({contents:await readFile(source,'utf8'),loader:'jsx'}));
 b.onResolve({filter:/worker\/toss\/review-products\.js$/},()=>({path:path.join(repo,'worker/toss/review-products.js')}));
 b.onResolve({filter:/.*/},args=>args.kind==='entry-point'||args.path==='react'||args.path==='react/jsx-runtime'?undefined:{path:args.path,namespace:'fixture'});
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`
  import React from 'react';
  export default function Checkout({draft}){globalThis.checkoutReentry.drafts.push(draft);return React.createElement('div',{'data-checkout':true,'data-question':draft.question},draft.product.name);}
  export const canonicalResponse=(...args)=>globalThis.checkoutReentry.send(...args);
  export const LazyMotion=()=>null,domAnimation={},SafeArea={},Screen={},graniteEvent={},ToastProvider=()=>null,dispatchServiceBack=()=>false;
  export const captureTeaDraft=()=>null,restoreTeaDraft=()=>{},captureLetterDraft=()=>null,restoreLetterDraft=()=>{},clearClientAuthState=()=>{},refreshAuth=()=>{},handleSessionInvalidated=()=>{},SERVICE_AVAILABLE=false,restoreSession=()=>{},recoverAfterAuthentication=()=>{},onSessionInvalidated=()=>()=>{},login=()=>{},isToss=()=>false,createServiceFetch=()=>{};
  export const useAuthStore=()=>globalThis.checkoutReentry.auth;export const captureSukuyoDraft=()=>null,restoreSukuyoDraft=()=>{},recallPendingAuthDrafts=()=>({}),rememberPendingAuthDrafts=()=>{},clearPendingAuthDrafts=()=>{};
 `}));
}}]});
const loaded=new Module(path.resolve(import.meta.dirname,'checkout-reentry.cjs'));
loaded.paths=Module._nodeModulePaths(path.join(repo,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
const Screen=loaded.exports.default,id='a'.repeat(64);
const fortune={id,paid:false,state:'CREATED',product:{id:'saju_mackerel',name:'원본 상품'},consultation:{question:'원본 질문'},manifest:[{id:'first'}]};
async function mount(send,query='?requestId='+id,reviewOnly=false){
 const calls=[],redirects=[],drafts=[];
 globalThis.location={origin:dom.window.location.origin,search:query,replace:href=>redirects.push(href)};
 globalThis.checkoutReentry={auth:{isAuthenticated:true,user:{id:'owner'}},drafts,send:(...args)=>{calls.push(args);return send(...args);}};
 const root=createRoot(document.getElementById('root'));
 await React.act(async()=>root.render(React.createElement(Screen,{reviewOnly})));
 return {calls,redirects,drafts,close:()=>React.act(()=>root.unmount())};
}
test('review checkout blocks a new non-Saju product and reopens a previously paid one',async()=>{
 const product={id:'tarot_mackerel',name:'타로'};
 for(const paid of [false,true]){
  const view=await mount(async()=>Response.json({fortune:{...fortune,product,paid}}),'?requestId='+id,true);
  try{
   assert.equal(view.drafts.length,0);
   if(paid)assert.deepEqual(view.redirects,['/yeongnyangi/result/?id='+id]);
   else assert.match(document.body.textContent,/신규 구매는 열려 있지 않아요/);
  }finally{await view.close();}
 }
});
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

test('account switch hides the previous checkout question before fetching the new account',async()=>{let release;const drafts=[],calls=[];globalThis.location={origin:dom.window.location.origin,pathname:'/checkout/',search:'?requestId='+id,replace:()=>{}};globalThis.checkoutReentry={auth:{isAuthenticated:true,user:{id:'owner-a'}},drafts,send:async()=>{calls.push(globalThis.checkoutReentry.auth.user.id);return calls.length===1?Response.json({fortune:{...fortune,consultation:{question:'이전 계정 비공개 질문'}}}):new Promise(resolve=>{release=resolve;});}};const root=createRoot(document.getElementById('root'));try{await React.act(async()=>root.render(React.createElement(Screen)));assert.equal(document.querySelector('[data-checkout]').dataset.question,'이전 계정 비공개 질문');globalThis.checkoutReentry.auth={isAuthenticated:true,user:{id:'owner-b'}};await React.act(async()=>root.render(React.createElement(Screen)));assert.equal(document.querySelector('[data-checkout]'),null);assert.deepEqual(calls,['owner-a','owner-b']);await React.act(async()=>release(Response.json({fortune:{...fortune,consultation:{question:'새 계정 질문'}}})));assert.equal(document.querySelector('[data-checkout]').dataset.question,'새 계정 질문');}finally{await React.act(async()=>root.unmount());}});
test('checkout rechecks the owned consultation immediately before payment',async()=>{let reads=0;const view=await mount(async()=>{reads++;return reads===1?Response.json({fortune}):new Response('denied',{status:403});});try{assert.equal(view.drafts.length,1);await assert.rejects(view.drafts[0].onPrepare(),e=>e.status===403);assert.equal(reads,2);}finally{await view.close();}});
test('checkout refuses a different consultation or product on the payment reread',async()=>{let reads=0;const view=await mount(async()=>{reads++;return Response.json({fortune:reads===1?fortune:{...fortune,product:{...fortune.product,id:'other'}}});});try{await assert.rejects(view.drafts[0].onPrepare(),/RESULT_MISMATCH/);assert.equal(reads,2);}finally{await view.close();}});
test('checkout read failure can be retried without starting a purchase',async()=>{let reads=0;const view=await mount(async()=>++reads===1?new Response('offline',{status:503}):Response.json({fortune}));try{assert.equal(view.drafts.length,0);const retry=[...document.querySelectorAll('button')].find(b=>b.textContent==='다시 확인하기');assert.ok(retry);await React.act(async()=>retry.click());assert.equal(reads,2);assert.equal(view.drafts.length,1);}finally{await view.close();}});
test('a refunded consultation never redirects or offers checkout even if its paid flag remains true',async()=>{const view=await mount(async()=>Response.json({fortune:{...fortune,state:'REFUNDED',paid:true}}));try{assert.deepEqual(view.redirects,[]);assert.equal(view.drafts.length,0);assert.match(document.body.textContent,/환불된 상담/);}finally{await view.close();}});
for(const [label,change] of [['refund pending',{recovery:{refundPending:true}}],['inactive payment',{errorCode:'PAYMENT_NOT_ACTIVE'}]])test(`a ${label} consultation cannot redirect or offer checkout`,async()=>{const view=await mount(async()=>Response.json({fortune:{...fortune,paid:true,state:'COMPLETED',...change}}));try{assert.deepEqual(view.redirects,[]);assert.equal(view.drafts.length,0);assert.match(document.body.textContent,/추가 결제하지 말고/);}finally{await view.close();}});
test('checkout reread refuses an inactive payment before starting a purchase',async()=>{let reads=0;const view=await mount(async()=>Response.json({fortune:++reads===1?fortune:{...fortune,errorCode:'PAYMENT_NOT_ACTIVE'}}));try{await assert.rejects(view.drafts[0].onPrepare(),/PAYMENT_REVIEW_REQUIRED/);assert.equal(reads,2);}finally{await view.close();}});
test('a draft that is no longer eligible cannot open a new purchase',async()=>{let reads=0;const view=await mount(async()=>Response.json({fortune:++reads===1?fortune:{...fortune,state:'AWAITING_DRAW',paid:false}}));try{await assert.rejects(view.drafts[0].onPrepare(),/RESULT_MISMATCH/);}finally{await view.close();}});
test('a malformed paid flag cannot expose a result or checkout',async()=>{const view=await mount(async()=>Response.json({fortune:{...fortune,paid:'true'}}));try{assert.equal(view.drafts.length,0);assert.deepEqual(view.redirects,[]);}finally{await view.close();}});
test('an old checkout response cannot repaint after the account changes',async()=>{let finishA,finishB;const drafts=[];globalThis.location={origin:dom.window.location.origin,pathname:'/checkout/',search:'?requestId='+id,replace:()=>{}};globalThis.checkoutReentry={auth:{isAuthenticated:true,user:{id:'owner-a'}},drafts,send:()=>new Promise(resolve=>{if(globalThis.checkoutReentry.auth.user.id==='owner-a')finishA=resolve;else finishB=resolve;})};const root=createRoot(document.getElementById('root'));try{await React.act(async()=>root.render(React.createElement(Screen)));globalThis.checkoutReentry.auth={isAuthenticated:true,user:{id:'owner-b'}};await React.act(async()=>root.render(React.createElement(Screen)));await React.act(async()=>finishB(Response.json({fortune:{...fortune,consultation:{question:'새 계정'}}})));assert.equal(document.querySelector('[data-checkout]').dataset.question,'새 계정');await React.act(async()=>finishA(Response.json({fortune:{...fortune,consultation:{question:'오래된 비공개 질문'}}})));assert.equal(document.querySelector('[data-checkout]').dataset.question,'새 계정');}finally{await React.act(async()=>root.unmount());}});
test('a previous account denial is not displayed for the next account',async()=>{let release;const drafts=[];globalThis.location={origin:dom.window.location.origin,pathname:'/checkout/',search:'?requestId='+id,replace:()=>{}};globalThis.checkoutReentry={auth:{isAuthenticated:true,user:{id:'owner-a'}},drafts,send:()=>globalThis.checkoutReentry.auth.user.id==='owner-a'?Promise.resolve(new Response('denied',{status:403})):new Promise(resolve=>{release=resolve;})};const root=createRoot(document.getElementById('root'));try{await React.act(async()=>root.render(React.createElement(Screen)));assert.match(document.body.textContent,/접근할 권한/);globalThis.checkoutReentry.auth={isAuthenticated:true,user:{id:'owner-b'}};await React.act(async()=>root.render(React.createElement(Screen)));assert.doesNotMatch(document.body.textContent,/접근할 권한/);await React.act(async()=>release(Response.json({fortune})));assert.ok(document.querySelector('[data-checkout]'));}finally{await React.act(async()=>root.unmount());}});
test('checkout navigation to a different request hides the previous question before reloading',async()=>{let finish;const drafts=[];globalThis.location={origin:dom.window.location.origin,pathname:'/checkout/',search:'?requestId='+id,replace:()=>{}};globalThis.checkoutReentry={auth:{isAuthenticated:true,user:{id:'owner'}},drafts,send:async(path)=>path.endsWith(id)?Response.json({fortune:{...fortune,consultation:{question:'이전 질문'}}}):new Promise(resolve=>{finish=resolve;})};const root=createRoot(document.getElementById('root'));try{await React.act(async()=>root.render(React.createElement(Screen)));assert.equal(document.querySelector('[data-checkout]').dataset.question,'이전 질문');const next='b'.repeat(64);globalThis.location.search='?requestId='+next;await React.act(async()=>window.dispatchEvent(new window.Event('popstate')));assert.equal(document.querySelector('[data-checkout]'),null);await React.act(async()=>finish(Response.json({fortune:{...fortune,id:next,consultation:{question:'새 질문'}}})));assert.equal(document.querySelector('[data-checkout]').dataset.question,'새 질문');}finally{await React.act(async()=>root.unmount());}});
test('checkout load preserves 403 even when an unrelated refund code is present',async()=>{const view=await mount(async()=>{throw {status:403,code:'ORDER_REFUNDED'};});try{assert.match(document.body.textContent,/접근할 권한/);assert.equal(view.drafts.length,0);}finally{await view.close();}});
test('a refunded order response is reported explicitly and never opens checkout',async()=>{const view=await mount(async()=>Response.json({error:'ORDER_REFUNDED'},{status:409}));try{assert.equal(view.drafts.length,0);assert.deepEqual(view.redirects,[]);assert.match(document.body.textContent,/환불된 상담/);}finally{await view.close();}});
test('an unpaid existing order does not offer a fresh checkout',async()=>{const view=await mount(async()=>Response.json({error:'ORDER_NOT_PAID'},{status:409}));try{assert.equal(view.drafts.length,0);assert.match(document.body.textContent,/추가 결제하지 말고/);}finally{await view.close();}});
for(const [label,change] of [['question',{consultation:{question:'다른 질문'}}],['product label',{product:{...fortune.product,name:'다른 상품'}}],['manifest',{manifest:[{id:'other',title:'다른 구성'}]}]])test(`checkout reread rejects a changed ${label}`,async()=>{let reads=0;const view=await mount(async()=>Response.json({fortune:++reads===1?fortune:{...fortune,...change}}));try{await assert.rejects(view.drafts[0].onPrepare(),/RESULT_MISMATCH/);}finally{await view.close();}});
test('checkout does not offer an empty consultation manifest',async()=>{const view=await mount(async()=>Response.json({fortune:{...fortune,manifest:[]}}));try{assert.equal(view.drafts.length,0);assert.deepEqual(view.redirects,[]);}finally{await view.close();}});
