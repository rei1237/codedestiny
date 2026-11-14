import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
const require=createRequire(import.meta.url), Module=require('node:module');
const React=require('react');
async function mount(entry, responder, props={}, opts={}) {
 const dom=new JSDOM('<div id="root"></div>',{url:opts.url||'http://localhost/reviews/'});
 for(const [key,value] of Object.entries(opts.storage||{})) dom.window.localStorage.setItem(key,value);
 globalThis.__reviewEvents=[];
 for(const key of ['window','document','HTMLElement','Event','MouseEvent']) globalThis[key]=dom.window[key];
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 globalThis.IntersectionObserver=opts.visible?class{constructor(cb){this.cb=cb} observe(node){this.cb([{isIntersecting:true,target:node}])} disconnect(){}}:class{observe(){} disconnect(){}};
 globalThis.__reviewFetch=responder;
 const bundle=await build({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty'},external:['react','react/jsx-runtime'],plugins:[{name:'mock-only',setup(b){b.onResolve({filter:/auth-client|analytics|next\/image|next\/link|ReviewSocialFields/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.includes('auth-client')?'export const authFetch=(...args)=>globalThis.__reviewFetch(...args)':a.path.includes('analytics')?'export const trackEvent=(name,params)=>globalThis.__reviewEvents.push({name,params})':a.path.includes('next/link')?'import React from "react"; export default ({href,children,...props})=>React.createElement("a",{href,...props},children)':a.path.includes('next/image')?'import React from "react"; export default props=>React.createElement("img",props)':'export default ()=>null',loader:'js'}));}}]});
 const mod=new Module(entry);mod.paths=Module._nodeModulePaths(process.cwd());mod._compile(bundle.outputFiles[0].text,entry);
 const {createRoot}=require('react-dom/client');const root=createRoot(document.getElementById('root'));
 await React.act(async()=>{root.render(React.createElement(mod.exports.default,props));});
 return {dom,async click(node){assert.ok(node);await React.act(async()=>{node.click();});},async close(){await React.act(async()=>root.unmount());dom.window.close();}};
}
const response=(data,ok=true)=>({ok,status:ok?200:500,json:async()=>data});
const dom=()=>globalThis.window;
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
test('guest return path pre-selects the result product by catalog slug only',async()=>{
 const ui=await mount('app/components/QuickReviewComposer.tsx',async()=>({status:401,ok:false,json:async()=>({})}),{rewardLabel:'관리자 승인 후 지급',reviewProductId:'tarot'},{visible:true});
 try{
  assert.equal(document.querySelector('a').getAttribute('href'),'/login/?next=%2Freviews%2F%3Fwrite%3D1%26product%3Dtarot');
  assert.deepEqual(globalThis.__reviewEvents.filter(e=>e.name==='review_invite_view').map(e=>e.params),[{service:'ggulggul',product_id:'tarot',surface:'paid_result',eligibility:'unknown',metric_version:1}]);
 }finally{await ui.close();}
 const unsafe=await mount('app/components/QuickReviewComposer.tsx',async()=>({status:401,ok:false,json:async()=>({})}),{rewardLabel:'관리자 승인 후 지급',reviewProductId:'Consultation/abc?x=1'});
 try{assert.equal(document.querySelector('a').getAttribute('href'),'/login/?next=%2Freviews%2F%3Fwrite%3D1');}finally{await unsafe.close();}
});
test('result composer pre-selects the product, restores the draft silently and sends S00 events without review text',async()=>{
 const key='cd_review_draft_v1:tarot',writes=[];
 const draft=JSON.stringify({savedAt:Date.now(),rating:4,tags:['기대와 달랐어요','임의 태그'],body:'초안에 남긴 비밀 메모'});
 const ui=await mount('app/components/QuickReviewComposer.tsx',async(url,init)=>{
  if(init.method==='GET')return response({items:[{productId:'saju-ai',productName:'사주'},{productId:'tarot',productName:'타로'}]});
  writes.push(JSON.parse(init.body));return response({id:'r1',publicConsent:true,privacyHold:false});
 },{rewardLabel:'관리자 승인 후 지급',reviewProductId:'tarot'},{visible:true,storage:{[key]:draft}});
 const names=()=>globalThis.__reviewEvents.map(e=>e.name);
 try{
  assert.equal(document.querySelector('select').value,'tarot');
  assert.equal(document.querySelector('[aria-label="별점 4점"]').getAttribute('aria-pressed'),'true');
  assert.equal(document.querySelector('textarea').value,'초안에 남긴 비밀 메모');
  assert.equal(button('기대와 달랐어요').getAttribute('aria-pressed'),'true');assert.equal(button('임의 태그'),undefined);
  assert.match(document.body.textContent,/4점 · 좋아요/);assert.match(document.body.textContent,/저장해 둔 작성 내용을 불러왔어요/);
  assert.equal(names().includes('review_write_start'),false);
  assert.deepEqual(globalThis.__reviewEvents.find(e=>e.name==='review_invite_view').params,{service:'ggulggul',product_id:'tarot',surface:'paid_result',eligibility:'eligible',metric_version:1});
  await ui.click(document.querySelector('[aria-label="별점 3점"]'));await ui.click(document.querySelector('[aria-label="별점 5점"]'));
  assert.equal(names().filter(n=>n==='review_write_start').length,1);assert.match(document.body.textContent,/5점 · 최고예요/);
  assert.equal(JSON.parse(dom().localStorage.getItem(key)).rating,5);
  await ui.click(document.querySelector('input[type=checkbox]'));await ui.click(button('후기 등록하기'));
  assert.equal(writes[0].productId,'tarot');assert.deepEqual(writes[0].quickTags,['기대와 달랐어요']);
  assert.deepEqual(names().filter(n=>n.startsWith('review_submit_')),['review_submit_attempt','review_submit_success']);
  assert.equal(globalThis.__reviewEvents.find(e=>e.name==='review_submit_success').params.review_status,'pending');
  assert.equal(dom().localStorage.getItem(key),null);
  assert.deepEqual([...document.querySelectorAll('.cd-quick-review__timeline li')].map(li=>li.querySelector('strong').textContent),['접수','관리자 검토','익명 공개·월정석 지급']);
  assert.doesNotMatch(JSON.stringify(globalThis.__reviewEvents),/비밀 메모/);
 }finally{await ui.close();}
});
test('failed submit reports a coarse reason and keeps the draft',async()=>{
 const ui=await mount('app/components/QuickReviewComposer.tsx',async(url,init)=>init.method==='GET'?response({items:[{productId:'tarot',productName:'타로'}]}):{ok:false,status:409,json:async()=>({message:'이미 접수된 후기예요.'})},{rewardLabel:'관리자 승인 후 지급'});
 try{
  await ui.click(document.querySelector('[aria-label="별점 2점"]'));await ui.click(button('후기 등록하기'));
  assert.deepEqual(globalThis.__reviewEvents.find(e=>e.name==='review_submit_failed').params,{service:'ggulggul',product_id:'tarot',surface:'paid_result',eligibility:'eligible',metric_version:1,reason:'duplicate'});
  assert.equal(JSON.parse(dom().localStorage.getItem('cd_review_draft_v1:tarot')).rating,2);
 }finally{await ui.close();}
});
test('quick tags stay balanced, shared and inside the server whitelist',async()=>{
 const workerSource=fs.readFileSync('worker/routes/reviews.js','utf8');
 const whitelist=new Set([...workerSource.match(/const REVIEW_QUICK_TAGS = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]));
 const bundle=await build({entryPoints:['app/components/review/review-ui.ts'],bundle:true,platform:'node',format:'cjs',write:false,external:['react']});
 const mod=new Module('review-ui');mod.paths=Module._nodeModulePaths(process.cwd());mod._compile(bundle.outputFiles[0].text,'review-ui.js');
 const ui=mod.exports;
 assert.equal(ui.REVIEW_POSITIVE_TAGS.length,ui.REVIEW_IMPROVE_TAGS.length);
 for(const tag of ui.REVIEW_QUICK_TAGS)assert.ok(whitelist.has(tag),tag);
 assert.deepEqual(Object.values(ui.REVIEW_RATING_LABELS),['별로예요','아쉬워요','보통이에요','좋아요','최고예요']);
 assert.equal(ui.reviewWriteHref('tarot'),'/reviews/?write=1&product=tarot');assert.equal(ui.reviewWriteHref('../x'),'/reviews/?write=1');
 const composer=fs.readFileSync('app/components/QuickReviewComposer.tsx','utf8'),client=fs.readFileSync('app/reviews/ReviewsClient.tsx','utf8');
 assert.match(composer,/from "\.\/review\/review-ui"/);assert.match(client,/import \{[^}]*\bREVIEW_QUICK_TAGS\b[^}]*\} from "\.\.\/components\/review\/review-ui"/);
 for(const source of [composer,client])assert.doesNotMatch(source,/QUICK_(REVIEW_)?TAGS\s*=\s*\[/);
});
test('/reviews pre-selects an eligible requested product, keeps it on the guest return path and discloses rewarded cards',async()=>{
 const realFetch=globalThis.fetch;
 const card={authorName:'익명',authorImage:'',productId:'tarot',productName:'타로',rating:5,title:'',isVerifiedPurchase:true,displayedAt:'2026-11-01T00:00:00.000Z'};
 globalThis.fetch=async url=>String(url).includes('/api/reviews/products')?response({items:[{productId:'saju-ai',name:'사주'},{productId:'tarot',name:'타로'}]})
  :String(url).includes('/api/reviews/summary')?response({total:2,average:5,distribution:{5:2}})
  :response({items:[{...card,id:'r1',body:'보상 받은 후기 본문',rewarded:true},{...card,id:'r2',body:'보상 없는 후기 본문',rewarded:false}],pagination:{totalPages:1}});
 const eligibility=async()=>response({items:[{productId:'saju-ai',productName:'사주'},{productId:'tarot',productName:'타로'}]});
 const guest=async()=>({status:401,ok:false,json:async()=>({})});
 const at=query=>({url:`http://localhost/reviews/?${query}`});
 try{
  const ui=await mount('app/reviews/ReviewsClient.tsx',eligibility,{},at('write=1&product=tarot'));
  try{
   assert.equal(document.querySelector('[aria-modal="true"] select').value,'tarot');
   const articles=body=>[...document.querySelectorAll('article')].filter(a=>a.textContent.includes(body));
   assert.ok(articles('보상 받은 후기 본문').length>0);
   for(const a of articles('보상 받은 후기 본문'))assert.match(a.textContent,/작성 보상\(월정석\) 지급 후기/);
   for(const a of articles('보상 없는 후기 본문'))assert.doesNotMatch(a.textContent,/작성 보상/);
  }finally{await ui.close();}
  const other=await mount('app/reviews/ReviewsClient.tsx',eligibility,{},at('write=1&product=naming'));
  try{assert.equal(document.querySelector('[aria-modal="true"] select').value,'saju-ai');}finally{await other.close();}
  const login=await mount('app/reviews/ReviewsClient.tsx',guest,{},at('write=1&product=tarot'));
  try{assert.ok(document.querySelector('a[href="/login?next=%2Freviews%2F%3Fwrite%3D1%26product%3Dtarot"]'));}finally{await login.close();}
  const unsafe=await mount('app/reviews/ReviewsClient.tsx',guest,{},at('write=1&product=..%2Fconsultation%2Fabc'));
  try{assert.ok(document.querySelector('a[href="/login?next=%2Freviews%2F%3Fwrite%3D1"]'));}finally{await unsafe.close();}
 }finally{globalThis.fetch=realFetch;}
});
test('/reviews/?product= filters the list and summary to a catalog product only, ignoring unknown slugs',async()=>{
 const realFetch=globalThis.fetch;
 let calls=[];
 globalThis.fetch=async url=>{const text=String(url);calls.push(text);return text.includes('/api/reviews/products')?response({items:[{productId:'saju-ai',name:'사주',total:1},{productId:'tarot',name:'타로',total:2}]})
  :text.includes('/api/reviews/summary')?response({total:0,average:0,distribution:{}})
  :response({items:[],pagination:{totalPages:1}});};
 const guest=async()=>({status:401,ok:false,json:async()=>({})});
 const lists=()=>calls.filter(url=>/\/api\/reviews\?/.test(url)),summaries=()=>calls.filter(url=>url.includes('/api/reviews/summary'));
 try{
  const known=await mount('app/reviews/ReviewsClient.tsx',guest,{},{url:'http://localhost/reviews/?product=tarot'});
  try{
   assert.ok(lists().length>0&&summaries().length>0);
   for(const url of [...lists(),...summaries()])assert.match(url,/productId=tarot/,'no unfiltered request before the catalog check');
   assert.equal(button('타로 (2)').className.includes('bg-[#b31955]'),true);
  }finally{await known.close();}
  calls=[];
  const unknown=await mount('app/reviews/ReviewsClient.tsx',guest,{},{url:'http://localhost/reviews/?product=naming'});
  try{
   assert.ok(lists().length>0);
   for(const url of [...lists(),...summaries()])assert.doesNotMatch(url,/productId=/);
  }finally{await unknown.close();}
 }finally{globalThis.fetch=realFetch;}
});
