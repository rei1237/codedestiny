import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {dispatchServiceBack} from '../service/native-back.mjs';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const React=require('react'),{createRoot}=require('react-dom/client');

test('Toss shell omits the duplicate back button while the web keeps it',async()=>{
 const entry=path.resolve(import.meta.dirname,'../../../src/features/fortune-tea-house/components/FortuneTeaHouseImmersiveShell.tsx');
 const bundle=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'shell-boundaries',setup(b){
  b.onResolve({filter:/^(next\/link|\.\/FloatingPetals|\.\.\/lib\/teaHouseCopy|.*\.css)$/},args=>({path:args.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p==='next/link'?`import React from 'react';export default ({children,href,...props})=>React.createElement('a',{href,...props},children);`:p==='../lib/teaHouseCopy'?`export const useTeaHouseCopy=(_key,fallback)=>fallback;`:p.endsWith('.css')?'export default {};':`export default ()=>null;`}));
 }}]});
 const loaded=new Module(entry+'.cjs');loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
 const {renderToStaticMarkup}=require('react-dom/server'),render=surface=>renderToStaticMarkup(React.createElement(loaded.exports.default,{stage:'teaSelect',paymentSurface:surface,onBackToLanding:()=>{}},'찻집'));
 assert.match(render('web'),/<button[^>]*>돌아가기<\/button>/);
 assert.doesNotMatch(render('toss'),/<button[^>]*>돌아가기<\/button>/);
 assert.match(render('toss'),/연이의 운명 찻집/);
});

test('tea back closes overlays, preserves active work and navigates the current stage',async()=>{
 const entry=path.resolve(import.meta.dirname,'../../../src/features/fortune-tea-house/lib/tossBack.ts');
 const bundle=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs'});
 const loaded=new Module(entry+'.cjs');loaded._compile(bundle.outputFiles[0].text,loaded.id);
 const dom=new JSDOM(''),seen=[];
 try{
  const context={stage:'landing',historyOpen:false,albumOpen:false,submitting:false,closeHistory:()=>seen.push('history'),closeAlbum:()=>seen.push('album'),showBusy:()=>seen.push('busy'),selectTea:()=>seen.push('tea'),goLanding:()=>seen.push('landing')};
  const run=changes=>{const event=new dom.window.Event('back',{cancelable:true});loaded.exports.handleTeaNativeBack(event,{...context,...changes});return event.defaultPrevented;};
  assert.equal(run({}),false);
  assert.equal(run({historyOpen:true,submitting:true}),true);assert.equal(seen.pop(),'history');
  assert.equal(run({albumOpen:true}),true);assert.equal(seen.pop(),'album');
  assert.equal(run({stage:'scentLoading',submitting:true}),true);assert.equal(seen.pop(),'busy');
  assert.equal(run({stage:'questionInput'}),true);assert.equal(seen.pop(),'tea');
  assert.equal(run({stage:'teaCupRitual'}),true);assert.equal(seen.pop(),'tea');
  assert.equal(run({stage:'result'}),true);assert.equal(seen.pop(),'landing');
  const consumed=new dom.window.Event('back',{cancelable:true});consumed.preventDefault();loaded.exports.handleTeaNativeBack(consumed,{...context,stage:'questionInput'});assert.deepEqual(seen,[]);
 }finally{dom.window.close();}
});

test('Toss shell delegates native back to the active service before navigating home',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/fortune-tea-house/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location={pathname:'/fortune-tea-house/',search:'',origin:'http://localhost',assign:path=>globalThis.teaNativeNavigation.push(path)};globalThis.history=dom.window.history;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.teaNativeNavigation=[];globalThis.teaNativeEvents={};
 const entry=path.resolve(import.meta.dirname,'../service/Screens.jsx');
 const bundle=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'service-boundaries',setup(b){
  b.onResolve({filter:/^\.\/native-back\.mjs$/},()=>({path:path.resolve(import.meta.dirname,'../service/native-back.mjs')}));
  b.onResolve({filter:/.*/},args=>args.kind==='entry-point'?null:/^react(?:\/jsx-runtime)?$/.test(args.path)?{path:args.path,external:true}:{path:args.path,namespace:'mock'});
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p.endsWith('.css')?'export default {}':p==='./letter-draft-bootstrap.mjs'?'export const captureLetterDraft=()=>null,restoreLetterDraft=()=>{};':p==='./tea-draft-bootstrap.mjs'?'export const captureTeaDraft=()=>null,restoreTeaDraft=()=>{};':p==='./sukuyo-draft-bootstrap.mjs'?'export const captureSukuyoDraft=()=>null,restoreSukuyoDraft=()=>{};':p==='./draft-quarantine.mjs'?'export const recallPendingAuthDrafts=()=>({}),rememberPendingAuthDrafts=()=>{},clearPendingAuthDrafts=()=>{};':p==='../src/release'?'export const SERVICE_AVAILABLE=false;':p==='../src/platform'?`export const isToss=()=>true,restoreSession=async()=>false,recoverAfterAuthentication=async()=>'',onSessionInvalidated=()=>()=>{},canonicalResponse=()=>{},login=()=>{};`:p==='./transport.mjs'?'export const createServiceFetch=()=>globalThis.fetch;':p==='@/app/_lib/auth-client'?'export const clearClientAuthState=()=>{};':p==='@/app/_lib/auth-store'?'export const refreshAuth=async()=>{},handleSessionInvalidated=()=>{};':p==='@apps-in-toss/web-framework'?`export const Screen={close:async()=>globalThis.teaNativeNavigation.push('closed')},SafeArea={get:()=>({bottom:0}),subscribe:()=>()=>{}},graniteEvent={addEventListener:(name,{onEvent})=>{globalThis.teaNativeEvents[name]=onEvent;return ()=>delete globalThis.teaNativeEvents[name];}};`:p==='framer-motion'?`import React from 'react';export const LazyMotion=({children})=>React.createElement(React.Fragment,null,children),domAnimation={};`:p==='@/app/components/Toast'?'export const ToastProvider=()=>null;':`import React from 'react';export default ({children})=>React.createElement('div',null,children);`}));
 }}]});
 const loaded=new Module(entry+'.cjs');loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);const root=createRoot(document.getElementById('root'));
 try{
  dom.window.fetch=globalThis.fetch;await React.act(async()=>root.render(React.createElement(loaded.exports.default)));
  const consume=event=>event.preventDefault();window.addEventListener('code-destiny:toss-back',consume);
  await React.act(async()=>globalThis.teaNativeEvents.backEvent());assert.deepEqual(globalThis.teaNativeNavigation,[]);
  window.removeEventListener('code-destiny:toss-back',consume);
  await React.act(async()=>globalThis.teaNativeEvents.backEvent());assert.deepEqual(globalThis.teaNativeNavigation,['closed']);
  await React.act(async()=>globalThis.teaNativeEvents.homeEvent());assert.deepEqual(globalThis.teaNativeNavigation,['closed','/']);
  Object.defineProperty(document,'referrer',{configurable:true,value:'http://localhost/'});globalThis.history={length:2,back:()=>globalThis.teaNativeNavigation.push('previous')};
  await React.act(async()=>globalThis.teaNativeEvents.backEvent());assert.deepEqual(globalThis.teaNativeNavigation,['closed','/','previous']);
 }finally{await React.act(async()=>root.unmount());assert.deepEqual(globalThis.teaNativeEvents,{});dom.window.close();}
});

test('Toss narrative back returns to the previous line and falls through at the start',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const entry=path.resolve(import.meta.dirname,'../../../src/features/fortune-tea-house/components/TeaHouseEntryScene.tsx');
 const bundle=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'entry-boundaries',setup(b){
  b.onResolve({filter:/^(next\/image|lucide-react|\.\/YeoniTalkingPortrait|\.\.\/lib\/(teaHouseCopy|entryBookmark|usePrefersReducedMotion)|.*\.css)$/},args=>({path:args.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p==='next/image'?`import React from 'react';export default ({alt})=>React.createElement('span',{'aria-label':alt});`:p==='lucide-react'?`export const ArrowLeft=()=>null,ArrowRight=()=>null,BookOpen=()=>null,Eye=()=>null,Pause=()=>null,Play=()=>null,X=()=>null;`:p==='../lib/teaHouseCopy'?`export const useTeaHouseCopy=(_key,fallback)=>fallback;`:p==='../lib/entryBookmark'?`export const readEntryBookmark=()=>null,saveEntryBookmark=()=>{};`:p==='../lib/usePrefersReducedMotion'?`export const usePrefersReducedMotion=()=>true;`:p.endsWith('.css')?'export default {};':`export default ()=>null;`}));
 }}]});
 const loaded=new Module(entry+'.cjs');loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
 const root=createRoot(document.getElementById('root'));
 try{
  await React.act(async()=>root.render(React.createElement(loaded.exports.default,{stage:'doorOpened',paymentSurface:'toss',onStageChange:()=>{},onComplete:()=>{},onSkip:()=>{}})));
  assert.equal(dispatchServiceBack(window),false);
  const dialogue=[...document.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')?.includes('돌아가는 길'));
  assert.ok(dialogue);await React.act(async()=>dialogue.click());
  assert.match(document.body.textContent,/문패에는/);
  await React.act(async()=>assert.equal(dispatchServiceBack(window),true));
  assert.match(document.body.textContent,/돌아가는 길/);
  assert.equal(dispatchServiceBack(window),false);
 }finally{await React.act(async()=>root.unmount());dom.window.close();}
});

test('Toss confirmation back preserves an in-flight card preparation',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const entry=path.resolve(import.meta.dirname,'../../../src/features/fortune-tea-house/components/TeaConsultConfirmation.tsx');
 const bundle=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'confirmation-boundaries',setup(b){
  b.onResolve({filter:/.*/},args=>args.kind==='entry-point'?null:/^react(?:\/jsx-runtime)?$/.test(args.path)?{path:args.path,external:true}:{path:args.path,namespace:'mock'});
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p==='@/lib/analytics'?`export const trackEvent=()=>{};`:p==='@/app/_lib/auth-client'?`export const authFetch=()=>globalThis.teaConfirmationFetch();`:p==='@/app/_lib/auth-store'?`export const getAuthState=()=>({user:{id:'test'}});`:p==='@/lib/fortune-tea-house/tarot-contract.mjs'?`export const teaSpreads=[{id:'yn_knot_three',cardCount:1,positions:[{id:'one'}]}],recommendTeaSpread=()=>({id:'yn_knot_three'});`:p==='../data/teaSpreadCopy'?`export const teaSpreadCopy={yn_knot_three:{title:'배열',reason:'이유',positions:{one:'자리'}}};`:p==='../data/consultPricing'?`export const getFortuneTeaHouseConsultPriceLabel=()=>'',getFortuneTeaHouseConsultFeatureKey=()=>'';`:p==='@/lib/i18n/useT'?`export const useLocale=()=> 'ko';`:p==='../lib/teaHouseCopy'?`export const useTeaHouseCopy=(_key,fallback)=>fallback;`:p==='../lib/tossPriceSelection'?'export const rememberTossTeaPrice=()=>{};':p==='../lib/tossPaymentCopy'?`export const tossTeaPaymentCopy=()=>({policy:'결제 안내',action:'확인'});`:p==='./TeaHouseButton'?`import React from 'react';export default ({children,loading,...props})=>React.createElement('button',props,children);`:p.endsWith('.css')?'export default {};':`export default ()=>null;`}));
 }}]});
 const loaded=new Module(entry+'.cjs');loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
 const root=createRoot(document.getElementById('root'));let returned=0,finish;
 globalThis.teaConfirmationFetch=()=>new Promise(resolve=>{finish=resolve;});
 try{
  await React.act(async()=>root.render(React.createElement(loaded.exports.default,{paymentSurface:'toss',input:{consultationMode:'tarot',question:'질문'},cupId:'cup',onBack:()=>returned++,onConfirm:()=>{}})));
  const prepare=[...document.querySelectorAll('button')].find(button=>button.textContent==='이 질문으로 카드 준비하기');assert.ok(prepare);
  await React.act(async()=>prepare.click());assert.equal(typeof finish,'function');
  await React.act(async()=>assert.equal(dispatchServiceBack(window),true));assert.equal(returned,0);
  await React.act(async()=>finish({ok:true,json:async()=>({ok:true,draft:{attemptId:'test',status:'drawn',deckSize:1}})}));
  await React.act(async()=>assert.equal(dispatchServiceBack(window),true));assert.equal(returned,1);
 }finally{await React.act(async()=>root.unmount());dom.window.close();}
});
