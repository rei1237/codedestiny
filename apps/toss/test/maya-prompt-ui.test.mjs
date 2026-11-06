import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {build} from 'esbuild';import {createRequire} from 'node:module';import path from 'node:path';
const repo=path.resolve(import.meta.dirname,'../../..'),require=createRequire(path.join(repo,'apps/toss/package.json')),Module=require('node:module'),React=require('react'),{createRoot}=require('react-dom/client');
const ui={owner:'owner',products:[],calls:[],listeners:[],purchase:null,read:null};globalThis.__mayaUi=ui;
const entry=path.join(repo,'apps/toss/service/TossMayaPrompt.tsx');
const stubs={
 '@/app/_lib/auth-store':"export const useAuthStore=()=>({isAuthenticated:!!globalThis.__mayaUi.owner,user:{id:globalThis.__mayaUi.owner}});",
 '@/constants/loadingMessages':"export const getCurrentLoadingLocale=()=>globalThis.__mayaUi.locale||'ko';",
 './toss-maya.css':'export {};',
 '@/src/components/maya/_lib/copy':"export const useMayaCopy=()=>({promptHeading:'프롬프트',promptDesc:'설명',resultHeading:'결과',nameLabel:'이름',birthDateLabel:'생년월일',topicLabel:'주제',questionLabel:'질문'});",
 '../src/platform':"export const nativeSaleProducts=async()=>globalThis.__mayaUi.catalog?globalThis.__mayaUi.catalog():globalThis.__mayaUi.products;export const api=(...args)=>globalThis.__mayaUi.read(...args);export const purchase=(...args)=>globalThis.__mayaUi.purchase(...args);export const onSessionInvalidated=fn=>{globalThis.__mayaUi.listeners.push(fn);return()=>{globalThis.__mayaUi.listeners=globalThis.__mayaUi.listeners.filter(x=>x!==fn);};};",
};
const bundle=await build({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',alias:{'@':repo},external:['react','react/jsx-runtime'],plugins:[{name:'offline',setup(b){b.onResolve({filter:/.*/},a=>stubs[a.path]?{path:a.path,namespace:'mock'}:null);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:stubs[a.path],loader:'js'}));}}]});
const loaded=new Module(path.join(repo,'maya-ui-fixture.cjs'));loaded.paths=Module._nodeModulePaths(path.join(repo,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);const Component=loaded.exports.default;
const result={gregorian:{year:2024,month:2,day:29,labelKo:'2024년 2월 29일'}},id='a'.repeat(64),sale={sku:'sku',featureKey:'maya-prompt-generator',approvedPriceKRW:5000,displayAmount:'5,000원'};
async function setup(url='http://localhost/maya/'){
 const dom=new JSDOM('<div id="root"></div>',{url});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.history=dom.window.history;globalThis.IS_REACT_ACT_ENVIRONMENT=true;ui.owner='owner';ui.products=[];ui.catalog=null;ui.calls=[];ui.listeners=[];ui.purchase=null;ui.read=async(...args)=>{ui.calls.push(args);throw new Error('unexpected request');};
 const root=createRoot(document.getElementById('root'));async function render(){await React.act(async()=>root.render(React.createElement(Component,{result})));}await render();return {dom,root,render,close:async()=>{await React.act(async()=>root.unmount());dom.window.close();}};
}
test('unapproved Maya has no price or purchase action and never invokes the SDK',async()=>{const ctx=await setup();try{assert.match(document.body.textContent,/상품 등록 확인 중/);assert.equal([...document.querySelectorAll('button')].find(b=>b.textContent.includes('단건 결제로')).disabled,true);assert.equal(ui.calls.length,0);}finally{await ctx.close();}});
test('non-Korean locale receives English purchase and privacy explanations',async()=>{const ctx=await setup();try{ui.locale='ja';await ctx.render();assert.match(document.body.textContent,/Product registration is being checked/);assert.match(document.body.textContent,/saved to your account when you prepare, before payment/);}finally{delete ui.locale;await ctx.close();}});
test('purchase fixes the input and uses only the matching approved SKU price before showing the saved result',async()=>{const ctx=await setup();try{
 ui.products=[sale];await React.act(async()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==='상품 다시 확인하기')?.click();});
 // Account change triggers a fresh catalog lookup without touching a real service.
 ui.owner='owner2';await ctx.render();ui.read=async(path,body)=>{ui.calls.push([path,body]);if(path.endsWith('/prepare'))return {id,sku:sale.sku,amountKRW:5000,paid:false};if(path.includes('/intents/'))return {id,paid:true};if(path.includes('/results/'))return {id,state:'COMPLETED',prompt:'구매한 프롬프트'};throw new Error('unexpected');};
 ui.purchase=(product,requestId,done)=>{assert.equal(product.sku,sale.sku);assert.equal(requestId,id);queueMicrotask(done);return()=>{};};
 await React.act(async()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.includes('단건 결제로')).click();await new Promise(resolve=>setTimeout(resolve,0));});
 assert.equal(ui.calls[0][1].input.year,2024);assert.equal(ui.calls[0][1].input.day,29);assert.equal(location.search,`?intentId=${id}`);assert.match(document.body.textContent,/구매한 프롬프트/);
 }finally{await ctx.close();}});
test('a denied restored order never displays an old result or a continuation button',async()=>{const ctx=await setup();try{
 history.replaceState({},'',`/maya/?intentId=${id}`);ui.read=async(path)=>{ui.calls.push([path]);throw Object.assign(new Error('denied'),{status:403,code:'ACCESS_DENIED'});};ui.owner='other';await ctx.render();
 assert.match(document.body.textContent,/접근할 권한/);assert.doesNotMatch(document.body.textContent,/이어서 만들기/);assert.equal(document.querySelector('textarea[readonly]'),null);
 }finally{await ctx.close();}});
test('a session invalidation clears a previously delivered prompt',async()=>{const ctx=await setup();try{
 history.replaceState({},'',`/maya/?intentId=${id}`);ui.read=async(path)=>path.includes('/intents/')?{id,paid:true}:{id,state:'COMPLETED',prompt:'비공개 결과'};ui.owner='next';await ctx.render();assert.match(document.body.textContent,/비공개 결과/);
 await React.act(async()=>ui.listeners.forEach(fn=>fn()));assert.doesNotMatch(document.body.textContent,/비공개 결과/);
 }finally{await ctx.close();}});
test('returning to the app hides a previously shown prompt and continuation when authorization is denied',async()=>{const ctx=await setup();try{
 history.replaceState({},'',`/maya/?intentId=${id}`);ui.read=async(path)=>path.includes('/intents/')?{id,paid:true}:{id,state:'COMPLETED',prompt:'이전 결과'};ui.owner='next';await ctx.render();assert.match(document.body.textContent,/이전 결과/);
 ui.read=async()=>{throw Object.assign(new Error('denied'),{status:403,code:'ACCESS_DENIED'});};Object.defineProperty(document,'hidden',{configurable:true,value:false});await React.act(async()=>document.dispatchEvent(new window.Event('visibilitychange')));
 assert.doesNotMatch(document.body.textContent,/이전 결과|이어서 만들기/);assert.match(document.body.textContent,/접근할 권한/);
 }finally{await ctx.close();}});
test('a failed or cancelled SDK attempt keeps its intent and cannot immediately create another order',async()=>{const ctx=await setup();try{
 ui.products=[sale];ui.owner='buyer';await ctx.render();let attempts=0;
 ui.read=async(path)=>{ui.calls.push([path]);if(path.endsWith('/prepare'))return {id,sku:sale.sku,amountKRW:5000,paid:false};throw new Error('unexpected');};
 ui.purchase=(_product,_id,_done,failed)=>{attempts++;queueMicrotask(()=>failed({code:'USER_CANCELED'}));return()=>{};};
 await React.act(async()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.includes('단건 결제로')).click();await new Promise(resolve=>setTimeout(resolve,0));});
 assert.equal(attempts,1);assert.equal(location.search,`?intentId=${id}`);assert.doesNotMatch(document.body.textContent,/단건 결제로 프롬프트 만들기/);assert.match(document.body.textContent,/다시 결제하지 말고/);
 }finally{await ctx.close();}});
test('a late result cannot expose the previous account after an account switch',async()=>{const ctx=await setup();try{
 let resolveResult;history.replaceState({},'',`/maya/?intentId=${id}`);ui.read=async(path)=>path.includes('/intents/')?{id,paid:true}:new Promise(resolve=>{resolveResult=resolve;});ui.owner='buyer';await ctx.render();assert.ok(resolveResult);
 ui.read=async()=>{throw Object.assign(new Error('denied'),{status:403,code:'ACCESS_DENIED'});};ui.owner='other';await ctx.render();await React.act(async()=>resolveResult({id,state:'COMPLETED',prompt:'이전 계정의 비공개 결과'}));
 assert.doesNotMatch(document.body.textContent,/이전 계정의 비공개 결과|이어서 만들기/);
 }finally{await ctx.close();}});
test('an unassigned recovered purchase attaches its original order without starting another SDK payment',async()=>{const orderId='01900000-1111-7111-8111-000000000042',ctx=await setup(`http://localhost/maya/?orderId=${orderId}`);try{
 let attempts=0;ui.purchase=()=>{attempts++;};ui.read=async(path,body)=>{ui.calls.push([path,body]);if(path.endsWith('/prepare'))return {id,paid:true};if(path.includes('/intents/'))return {id,paid:true};return {id,state:'COMPLETED',prompt:'복구된 프롬프트'};};
 await React.act(async()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.includes('결제한 프롬프트 이어가기')).click();await new Promise(resolve=>setTimeout(resolve,0));});
 assert.equal(attempts,0);assert.equal(ui.calls[0][1].orderId,orderId);assert.match(document.body.textContent,/복구된 프롬프트/);assert.equal(location.search,`?intentId=${id}`);
 }finally{await ctx.close();}});
test('a server and SDK price mismatch never opens the purchase sheet',async()=>{const ctx=await setup();try{
 ui.products=[sale];ui.owner='buyer';await ctx.render();let attempts=0;ui.purchase=()=>{attempts++;};ui.read=async()=>({id,sku:sale.sku,amountKRW:1,paid:false});
 await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('단건 결제로')).click());assert.equal(attempts,0);assert.equal(location.search,'');
 }finally{await ctx.close();}});
test('switching accounts immediately hides the previous account price until the new catalog is verified',async()=>{const ctx=await setup();try{
 ui.products=[sale];ui.owner='buyer';await ctx.render();assert.match(document.body.textContent,/5,000원/);let resolveCatalog;ui.catalog=()=>new Promise(resolve=>{resolveCatalog=resolve;});ui.owner='other';await ctx.render();assert.doesNotMatch(document.body.textContent,/5,000원/);assert.equal([...document.querySelectorAll('button')].find(b=>b.textContent.includes('단건 결제로')).disabled,true);
 await React.act(async()=>resolveCatalog([sale]));assert.match(document.body.textContent,/5,000원/);
 }finally{await ctx.close();}});
test('late product data cannot restore a price after session invalidation',async()=>{const ctx=await setup();try{
 let resolveCatalog;ui.catalog=()=>new Promise(resolve=>{resolveCatalog=resolve;});ui.owner='buyer';await ctx.render();await React.act(async()=>ui.listeners.forEach(fn=>fn()));await React.act(async()=>resolveCatalog([sale]));
 assert.doesNotMatch(document.body.textContent,/5,000원/);assert.equal([...document.querySelectorAll('button')].find(b=>b.textContent.includes('단건 결제로')).disabled,true);
 }finally{await ctx.close();}});
test('session invalidation still clears purchase state if SDK cleanup throws',async()=>{const ctx=await setup();try{
 ui.products=[sale];ui.owner='buyer';await ctx.render();ui.read=async()=>({id,sku:sale.sku,amountKRW:sale.approvedPriceKRW,paid:false});ui.purchase=()=>()=>{throw new Error('cleanup failed');};
 await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('단건 결제로')).click());assert.match(document.body.textContent,/구매와 결과를 확인하고 있어요/);
 await React.act(async()=>ui.listeners.forEach(fn=>fn()));assert.match(document.body.textContent,/다시 로그인/);assert.doesNotMatch(document.body.textContent,/5,000원|이어서 만들기/);assert.equal(document.querySelector('textarea[readonly]'),null);
 }finally{await ctx.close();}});
test('native back cannot leave during payment but is available before a purchase starts',async()=>{const ctx=await setup();try{
 let back=new window.Event('code-destiny:toss-back',{cancelable:true});await React.act(async()=>window.dispatchEvent(back));assert.equal(back.defaultPrevented,false);
 ui.products=[sale];ui.owner='buyer';await ctx.render();ui.read=async()=>({id,sku:sale.sku,amountKRW:sale.approvedPriceKRW,paid:false});ui.purchase=()=>()=>{};
 await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('단건 결제로')).click());back=new window.Event('code-destiny:toss-back',{cancelable:true});await React.act(async()=>window.dispatchEvent(back));assert.equal(back.defaultPrevented,true);assert.equal(location.search,`?intentId=${id}`);
 }finally{await ctx.close();}});
test('unsupported Toss versions are identified without showing a fabricated result',async()=>{const ctx=await setup();try{
 ui.products=[sale];ui.owner='buyer';await ctx.render();ui.read=async()=>({id,sku:sale.sku,amountKRW:sale.approvedPriceKRW,paid:false});ui.purchase=()=>{throw {code:'IAP_NOT_SUPPORTED'};};
 await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('단건 결제로')).click());assert.match(document.body.textContent,/앱 업데이트/);assert.equal(document.querySelector('textarea[readonly]'),null);assert.equal(location.search,'');
 }finally{await ctx.close();}});
