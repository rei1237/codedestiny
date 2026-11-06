import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require=createRequire(new URL('../package.json',import.meta.url));
const Module=require('node:module'),React=require('react'),{createRoot}=require('react-dom/client');
const repo=path.resolve(import.meta.dirname,'../../..');

async function compile(entry,stubs={}){
 const bundle=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',alias:{'@':repo},external:['react','react/jsx-runtime'],plugins:[{name:'maya-fixtures',setup(b){
  b.onResolve({filter:/.*/},args=>stubs[args.path]?{path:args.path,namespace:'mock'}:null);
  b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:stubs[args.path],loader:'jsx'}));
 }}]});
 const loaded=new Module(entry+'.fixture.cjs');loaded.paths=Module._nodeModulePaths(path.join(repo,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);return loaded.exports;
}

test('Toss Maya calendar preserves original date calculation and hides the web payment gate',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/maya/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const stubs={
  '@/app/components/CraftedProductDisclosure':"import React from 'react';export default ()=>React.createElement('p',null,'WEB_DISCLOSURE');",
  '@/constants/loadingMessages':"export const getCurrentLoadingLocale=()=>globalThis.__mayaLocale||'ko';",
  './MayaPromptGeneratorCard':"import React from 'react';export default ()=>React.createElement('p',null,'WEB_PAYMENT_GATE');",
 };
 const {default:Calendar}=await compile(path.join(repo,'src/components/maya/MayaCalendarView.tsx'),stubs);
 const {calculateMayaCalendar}=await compile(path.join(repo,'src/lib/maya-calendar.ts'));
 const root=createRoot(document.getElementById('root'));
 try{
  await React.act(async()=>root.render(React.createElement(Calendar,{paymentSurface:'toss'})));
  assert.match(document.body.textContent,/토스용 프롬프트 생성은 아직 제공하지 않아요/);assert.doesNotMatch(document.body.textContent,/WEB_DISCLOSURE|WEB_PAYMENT_GATE|3,000원/);
  const selects=document.querySelectorAll('select');assert.equal(selects.length,3);
  async function select(element,value){await React.act(async()=>{element.value=value;element.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});}
  await select(selects[0],'2024');await select(selects[1],'1');await select(selects[2],'31');await select(selects[1],'2');
  assert.equal(selects[2].value,'29');assert.match(document.body.textContent,/2024-02-29/);
  assert.ok(document.body.textContent.includes(calculateMayaCalendar(2024,2,29).longCount.label));
  assert.match(document.querySelector('main').getAttribute('style'),/--toss-service-bottom/);
  globalThis.__mayaLocale='ja';await React.act(async()=>window.dispatchEvent(new dom.window.Event('cd:locale-ready')));
  assert.match(document.body.textContent,/Tossでのプロンプト生成はまだ提供していません/);assert.doesNotMatch(document.body.textContent,/トス用フロン|토스용 프롬프트 생성/);
  assert.match(document.body.textContent,/選択した日付のLong Count/);assert.doesNotMatch(document.body.textContent,/相談プロンプトを準備しましょう/);
  globalThis.__mayaLocale='ko';await React.act(async()=>window.dispatchEvent(new dom.window.Event('cd:locale-ready')));
  const Prompt=({result})=>React.createElement('p',{'data-prompt-date':result.gregorian.iso},'TOSS_PROMPT');
  await React.act(async()=>root.render(React.createElement(Calendar,{paymentSurface:'toss',TossPrompt:Prompt})));
  assert.equal(document.querySelector('[data-prompt-date]')?.getAttribute('data-prompt-date'),'2024-02-29');assert.doesNotMatch(document.body.textContent,/WEB_DISCLOSURE|WEB_PAYMENT_GATE/);
  await React.act(async()=>root.render(React.createElement(Calendar)));
  assert.match(document.body.textContent,/WEB_DISCLOSURE/);assert.match(document.body.textContent,/WEB_PAYMENT_GATE/);
 }finally{await React.act(async()=>root.unmount());delete globalThis.__mayaLocale;dom.window.close();}
});

test('Maya is reachable from the Toss home without starting payment',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const {default:Home}=await compile(path.join(repo,'apps/toss/src/UnifiedHome.tsx'),{
  './Button':"import React from 'react';export const Button=({children,...p})=>React.createElement('button',p,children);",
  './content':"export const questions=[];",
 });
 const root=createRoot(document.getElementById('root')),opened=[];
 try{await React.act(async()=>root.render(React.createElement(Home,{onOpen:value=>opened.push(value),onConsult:()=>{}})));
  const world=[...document.querySelectorAll('nav button')].find(button=>button.textContent==='꿀꿀 운세');assert.ok(world);await React.act(async()=>world.click());
  const maya=[...document.querySelectorAll('button')].find(button=>button.textContent.includes('마야 달력'));assert.ok(maya);await React.act(async()=>maya.click());assert.deepEqual(opened,['maya']);
 }finally{await React.act(async()=>root.unmount());dom.window.close();}
});

test('direct Maya route opens the Toss calendar and native back returns to the previous app page',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/maya/'});dom.window.fetch=globalThis.fetch;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 Object.defineProperty(document,'referrer',{configurable:true,value:'http://localhost/'});let back=0;globalThis.history={length:2,back:()=>back++};globalThis.__mayaEvents={};
 const entry=path.join(repo,'apps/toss/service/Screens.jsx');
 const bundle=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'maya-service-fixtures',setup(b){
  b.onResolve({filter:/.*/},args=>args.kind==='entry-point'?null:/^react(?:\/jsx-runtime)?$/.test(args.path)?{path:args.path,external:true}:{path:args.path,namespace:'mock'});
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p.endsWith('.css')?'export default {};':p==='@/src/components/maya/MayaCalendarView'?`import React from 'react';export default ({paymentSurface,TossPrompt})=>React.createElement('p',{'data-maya-surface':paymentSurface,'data-maya-prompt':Boolean(TossPrompt)},'마야 달력');`:p==='./letter-draft-bootstrap.mjs'?'export const captureLetterDraft=()=>null,restoreLetterDraft=()=>{};':p==='./tea-draft-bootstrap.mjs'?'export const captureTeaDraft=()=>null,restoreTeaDraft=()=>{};':p==='./sukuyo-draft-bootstrap.mjs'?'export const captureSukuyoDraft=()=>null,restoreSukuyoDraft=()=>{};':p==='./draft-quarantine.mjs'?'export const recallPendingAuthDrafts=()=>({}),rememberPendingAuthDrafts=()=>{},clearPendingAuthDrafts=()=>{};':p==='../src/release'?'export const SERVICE_AVAILABLE=false;':p==='../src/platform'?`export const isToss=()=>true,restoreSession=async()=>false,recoverAfterAuthentication=async()=>'',onSessionInvalidated=()=>()=>{},canonicalResponse=()=>{},login=()=>{};`:p==='./native-back.mjs'?'export const dispatchServiceBack=()=>false;':p==='./transport.mjs'?'export const createServiceFetch=()=>globalThis.fetch;':p==='@/app/_lib/auth-client'?'export const clearClientAuthState=()=>{};':p==='@/app/_lib/auth-store'?'export const refreshAuth=async()=>{},handleSessionInvalidated=()=>{};':p==='@apps-in-toss/web-framework'?`export const Screen={close:async()=>{}},SafeArea={get:()=>({bottom:0}),subscribe:()=>()=>{}},graniteEvent={addEventListener:(name,{onEvent})=>{globalThis.__mayaEvents[name]=onEvent;return ()=>delete globalThis.__mayaEvents[name];}};`:p==='framer-motion'?`import React from 'react';export const LazyMotion=({children})=>React.createElement(React.Fragment,null,children),domAnimation={};`:p==='@/app/components/Toast'?'export const ToastProvider=()=>null;':`import React from 'react';export default ({children})=>React.createElement('div',null,children);`,loader:'jsx'}));
 }}]});
 const loaded=new Module(entry+'.fixture.cjs');loaded.paths=Module._nodeModulePaths(path.join(repo,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);const root=createRoot(document.getElementById('root'));
 try{await React.act(async()=>root.render(React.createElement(loaded.exports.default)));assert.equal(document.querySelector('[data-maya-surface]')?.getAttribute('data-maya-surface'),'toss');assert.equal(document.querySelector('[data-maya-surface]')?.getAttribute('data-maya-prompt'),'true');await React.act(async()=>globalThis.__mayaEvents.backEvent());assert.equal(back,1);}
 finally{await React.act(async()=>root.unmount());assert.deepEqual(globalThis.__mayaEvents,{});delete globalThis.__mayaEvents;dom.window.close();}
});
