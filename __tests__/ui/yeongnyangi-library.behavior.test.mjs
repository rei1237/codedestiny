import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
require('../../scripts/lib/mock-network-guard.cjs');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');
const { build } = require('esbuild');
const entry = fileURLToPath(new URL('../../app/yeongnyangi/_components/Library.tsx', import.meta.url));
const fixtures = {
  './OrderRecovery': 'export const OrderLookup=()=>null;',
  '../_lib/reading-copy': 'export const readingCopy=()=>({library:"영냥이 보관함",loading:"불러오는 중",empty:"기록 없음",more:"더 보기",retry:"다시 불러오기",view:"결과 보기",login:"로그인",loginHint:"로그인이 필요합니다",language:"언어"});',
  '../_lib/result-state-copy': 'export const resultStateCopy=()=>({loadFailed:"조회 실패"});',
  '@/worker/yeongnyangi/fortune/reading-locale': 'export const readingLanguageNames={ko:"한국어"};',
  '../_lib/use-reading-language': 'export const useReadingLanguage=()=>({siteLocale:"ko"});',
  '../_lib/consultation-locale-copy': 'export const localizedSystem=()=>"사주",localizedTier=()=>"고등어",localizedKind=()=>"상담",consultationLocaleCopy=()=>({start:"상담 시작"});',
  './ReadingIdentity': 'export const readingArtwork=()=>"/fixture.webp";',
  '@/app/_lib/profile-card-storage': 'export const readDestinyProfileAccountId=()=>globalThis.__yn.scope;',
  '@/app/_lib/auth-store': 'export const subscribeAuth=listener=>{globalThis.__yn.listeners.add(listener);return()=>globalThis.__yn.listeners.delete(listener);};',
  '../_lib/api': 'export const fortuneApi=(...args)=>globalThis.__yn.request(...args),FortuneApiError=globalThis.__yn.Error,loginForCurrentPage=()=>{},resultPath=id=>"/yeongnyangi/result/?id="+id;',
  '../yeongnyangi.module.css': 'export default {};',
};
const bundle = await build({entryPoints:[entry],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'library-boundaries',setup(b){
  b.onResolve({filter:/.*/},args=>Object.hasOwn(fixtures,args.path)?{path:args.path,namespace:'fixture'}:undefined);
  b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:fixtures[args.path],loader:'js'}));
}}]});
const row = id => ({id,product:{name:'저장 상담',fishName:'고등어',chapterCount:5},state:'COMPLETED',paid:true,locale:'ko',createdAt:'2020-01-01',completedChapters:5});
const page = (ids,cursor=null) => ({fortunes:ids.map(row),nextCursor:cursor});
class ApiError extends Error {constructor(status){super('조회 실패');this.status=status;this.retryable=false;this.retryAfterSeconds=0;}}
function pending(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}

async function mount(t,request){
  const dom=new JSDOM('<div id="root"></div>',{url:'https://test.invalid/yeongnyangi/library/'});
  const keys=['window','document','navigator','CustomEvent','StorageEvent','IS_REACT_ACT_ENVIRONMENT','__yn'];
  const saved=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const key of keys)Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:key==='IS_REACT_ACT_ENVIRONMENT'?true:key==='__yn'?{scope:'owner',request,Error:ApiError,listeners:new Set()}:dom.window[key]});
  const fixtureModule={exports:{}};
  new Function('require','module','exports',bundle.outputFiles[0].text)(require,fixtureModule,fixtureModule.exports);
  const root=createRoot(document.getElementById('root'));
  t.after(async()=>{await act(async()=>root.unmount());dom.window.close();for(const key of keys){const descriptor=saved.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  await act(async()=>root.render(React.createElement(fixtureModule.exports.default)));
  return {text:()=>document.body.textContent,links:()=>[...document.querySelectorAll('a[href*="/result/"]')].map(a=>a.href),event:async detail=>act(async()=>window.dispatchEvent(new CustomEvent('cd:auth-changed',{detail}))),owner:async scope=>act(async()=>{globalThis.__yn.scope=scope;for(const notify of globalThis.__yn.listeners)notify();})};
}

test('same-account refresh failure retains purchased records and shows an error',async t=>{
  let calls=0;const ui=await mount(t,async()=>{if(++calls===1)return page(['old']);throw new ApiError(503);});
  await ui.event({event:'login'});
  assert.equal(ui.links().length,1);assert.match(ui.text(),/조회 실패/);assert.doesNotMatch(ui.text(),/기록 없음/);
});
test('auth-store account switch reloads and ignores the old in-flight response',async t=>{
  const old=pending();let calls=0;const ui=await mount(t,()=>++calls===1?old.promise:Promise.resolve(page(['new'])));
  await ui.owner('other');await act(async()=>old.resolve(page(['old'])));
  assert.equal(calls,2);assert.equal(ui.links().length,1);assert.match(ui.links()[0],/id=new/);
});
test('logout clears private records without launching another request',async t=>{
  let calls=0;const ui=await mount(t,async()=>{calls++;return page(['private']);});
  await ui.event({event:'logout'});assert.equal(calls,1);assert.equal(ui.links().length,0);assert.match(ui.text(),/로그인이 필요/);
});
test('failed pagination retries that page and deduplicates records',async t=>{
  const paths=[];const ui=await mount(t,async path=>{paths.push(path);if(paths.length===1)return page(['one'],'page2');if(paths.length===2)throw new ApiError(503);return page(['one','two']);});
  await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='더 보기').click());
  await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='다시 불러오기').click());
  assert.equal(ui.links().length,2);assert.deepEqual(paths,['requests','requests?cursor=page2','requests?cursor=page2']);
});
test('refresh failure retries the first page even when a next-page cursor was saved',async t=>{
 const paths=[];const ui=await mount(t,async path=>{paths.push(path);if(paths.length===2)throw new ApiError(503);return page(['old'],'page2');});
 await ui.event({event:'login'});
 await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='다시 불러오기').click());
 assert.deepEqual(paths,['requests','requests','requests']);assert.equal(ui.links().length,1);
});
test('an error after an empty list is never presented as no records',async t=>{
 let calls=0;const ui=await mount(t,async()=>{if(++calls===1)return page([]);throw new ApiError(503);});
 await ui.event({event:'login'});assert.match(ui.text(),/조회 실패/);assert.doesNotMatch(ui.text(),/기록 없음/);
});
test('missing saved product does not hide the record or crash other rows',async t=>{
  const data=page(['legacy','valid']);data.fortunes[0].product=null;
  const ui=await mount(t,async()=>data);assert.equal(ui.links().length,2);assert.match(ui.links()[0],/id=legacy/);
});
