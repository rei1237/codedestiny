import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
const require=createRequire(import.meta.url), Module=require('node:module');
const React=require('react');
async function mount(entry, responder, props={}) {
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/reviews/'});
 for(const key of ['window','document','HTMLElement','Event','MouseEvent']) globalThis[key]=dom.window[key];
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 globalThis.IntersectionObserver=class{observe(){} disconnect(){}};
 globalThis.__reviewFetch=responder;
 const bundle=await build({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'mock-only',setup(b){b.onResolve({filter:/auth-client|analytics|next\/image|ReviewSocialFields/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.includes('auth-client')?'export const authFetch=(...args)=>globalThis.__reviewFetch(...args)':a.path.includes('analytics')?'export const trackEvent=()=>{}':a.path.includes('next/image')?'import React from "react"; export default props=>React.createElement("img",props)':'export default ()=>null',loader:'js'}));}}]});
 const mod=new Module(entry);mod.paths=Module._nodeModulePaths(process.cwd());mod._compile(bundle.outputFiles[0].text,entry);
 const {createRoot}=require('react-dom/client');const root=createRoot(document.getElementById('root'));
 await React.act(async()=>{root.render(React.createElement(mod.exports.default,props));});
 return {dom,async click(node){assert.ok(node);await React.act(async()=>{node.click();});},async close(){await React.act(async()=>root.unmount());dom.window.close();}};
}
const response=(data,ok=true)=>({ok,status:ok?200:500,json:async()=>data});
const button=text=>[...document.querySelectorAll('button')].find(x=>x.textContent.includes(text));
test('quick review is opt-in, retry-safe and respects server privacy hold',async()=>{
 let fail=true;const writes=[];
 const ui=await mount('app/components/QuickReviewComposer.tsx',async(url,init)=>{
  if(init.method==='GET')return response({items:[{productId:'tarot',productName:'타로'}]});
  writes.push(JSON.parse(init.body));return fail?response({message:'다시 시도'},false):response({id:'abc',publicConsent:false,privacyHold:true});
 },{rewardLabel:'관리자 승인 후 월정석 지급'});
 try{
  const consent=document.querySelector('input[type=checkbox]');assert.equal(consent.checked,false);
  await ui.click(document.querySelector('[aria-label="별점 3점"]'));
  await ui.click(button('후기 등록하기'));assert.equal(writes[0].publicConsent,false);assert.match(document.body.textContent,/다시 시도/);
  await ui.click(button('후기 등록하기'));assert.equal(writes[0].submissionId,writes[1].submissionId);
  await ui.click(consent);fail=false;
  await ui.click(button('후기 등록하기'));assert.equal(writes[2].publicConsent,true);assert.notEqual(writes[1].submissionId,writes[2].submissionId);
  assert.match(document.body.textContent,/개인정보로 보이는 내용이 있어 비공개/);assert.ok(document.querySelector('a[href="/reviews/#my-reviews"]'));
 }finally{await ui.close();}
});
test('late consent requires explicit confirmation and can be revoked',async()=>{
 let consent=false;const writes=[];
 const ui=await mount('app/reviews/ReviewRewardHistory.tsx',async(url,init)=>{
  if(init.method==='GET')return response({items:[{id:'a',productName:'타로',status:'pending',createdAt:'2026-11-01',publicConsent:consent}]});
  writes.push(JSON.parse(init.body));consent=writes.at(-1).publicConsent;return response({item:{publicConsent:consent}});
 });
 try{
  await ui.click(button('내 후기'));assert.match(document.body.textContent,/서비스 내 비공개/);
  await ui.click(button('익명 공개 동의하기'));assert.equal(writes.length,0);
  await ui.click(button('확인하고 공개 동의하기'));assert.deepEqual(writes,[{publicConsent:true}]);assert.match(document.body.textContent,/익명 공개 검토 대기/);
  await ui.click(button('공개 동의 철회'));assert.deepEqual(writes.at(-1),{publicConsent:false});
 }finally{await ui.close();}
});

test('quick review blocks same-tick double submission and shows public pending, never published',async()=>{
 let writes=0,resolve;const pending=new Promise(r=>resolve=r);
 const ui=await mount('app/components/QuickReviewComposer.tsx',async(url,init)=>init.method==='GET'?response({items:[{productId:'a',productName:'상담'}]}):(writes++,await pending),{rewardLabel:'관리자 승인 후 지급'});
 try{
  await ui.click(document.querySelector('[aria-label="별점 1점"]'));await ui.click(document.querySelector('input[type=checkbox]'));
  const send=button('후기 등록하기');await React.act(async()=>{send.click();send.click();});assert.equal(writes,1);
  await React.act(async()=>resolve(response({id:'a',publicConsent:true,privacyHold:false})));
  assert.match(document.body.textContent,/익명 공개 검토 대기/);assert.match(document.body.textContent,/아직 공개되지 않았어요/);
 }finally{await ui.close();}
});
test('history keeps rejected and held reviews private without offering publication',async()=>{
 const ui=await mount('app/reviews/ReviewRewardHistory.tsx',async()=>response({items:[{id:'a',productName:'상담',status:'rejected',createdAt:'2026-11-01',publicConsent:false},{id:'b',productName:'다른 상담',status:'pending',createdAt:'2026-11-01',publicConsent:false,privacyHold:true}]}));
 try{await ui.click(button('내 후기'));assert.match(document.body.textContent,/반려/);assert.match(document.body.textContent,/보호 확인/);assert.equal(button('익명 공개 동의하기'),undefined);}finally{await ui.close();}
});
test('guest inline action retains review return path',async()=>{
 const ui=await mount('app/components/QuickReviewComposer.tsx',async()=>({status:401,ok:false,json:async()=>({})}),{rewardLabel:'관리자 승인 후 지급'});
 try{assert.equal(document.querySelector('a').getAttribute('href'),'/login/?next=%2Freviews%2F%3Fwrite%3D1');}finally{await ui.close();}
});
