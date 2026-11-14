import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const React=require('react'),{createRoot}=require('react-dom/client');

test('tarot confirmation hands displayed price across unmount exactly once and clears abandoned screens',async()=>{
 const folder=path.resolve(import.meta.dirname,'../../../src/features/fortune-tea-house');
 const component=path.join(folder,'components/TeaConsultConfirmation.tsx'),selection=path.join(folder,'lib/tossPriceSelection.ts');
 const bundle=await build({stdin:{contents:`export {default as Confirmation} from ${JSON.stringify(component)};export * from ${JSON.stringify(selection)};`,resolveDir:folder,loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'confirmation-boundaries',setup(b){
  b.onResolve({filter:/.*/},args=>args.path===component||args.path===selection?{path:args.path}:args.path==='../lib/tossPriceSelection'?{path:selection}:/^react(?:\/jsx-runtime)?$/.test(args.path)?{path:args.path,external:true}:{path:args.path,namespace:'mock'});
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p==='@/lib/analytics'?`export const trackEvent=()=>{};`:p==='@/app/_lib/auth-client'?`export const authFetch=async()=>({ok:true,json:async()=>({ok:true,draft:{attemptId:'drawn-attempt',status:'drawn',deckSize:78}})});`:p==='@/app/_lib/auth-store'?`export const getAuthState=()=>({user:{id:'owner-A'}});`:p==='@/lib/fortune-tea-house/tarot-contract.mjs'?`export const teaSpreads=[{id:'yn_knot_three',cardCount:3,positions:[{id:'one'}]}],recommendTeaSpread=()=>({id:'yn_knot_three'});`:p==='../data/teaSpreadCopy'?`export const teaSpreadCopy={yn_knot_three:{title:'배열',reason:'이유',positions:{one:'자리'}}};`:p==='../data/consultPricing'?`export const getFortuneTeaHouseConsultPriceLabel=()=>'',getFortuneTeaHouseConsultFeatureKey=()=>'fortune-tea-house-tarot-consultation';`:p==='@/lib/i18n/useT'?`export const useLocale=()=> 'ko';`:p==='../lib/teaHouseCopy'?`export const useTeaHouseCopy=(_key,fallback)=>fallback;`:p==='../lib/tossPaymentCopy'?`export const tossTeaPaymentCopy=()=>({policy:'결제 안내',action:'확인'});`:p==='./TeaHouseButton'?`import React from 'react';export default ({children,loading,...props})=>React.createElement('button',props,children);`:p.endsWith('.css')?'export default {};':`export default ()=>null;`}));
 }}]});
 const loaded=new Module(component+'.test.cjs');loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
 const {Confirmation,rememberTossTeaPrice,consumeTossTeaPrice}=loaded.exports;
 const expected={featureKey:'fortune-tea-house-tarot-consultation',sku:'mock-tea-tarot',displayAmount:'1원',owner:'owner-A'};
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/fortune-tea-house/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document,oldAct=globalThis.IS_REACT_ACT_ENVIRONMENT;
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const root=createRoot(document.getElementById('root'));let hide,confirmed;
 function Price({onPrice}){React.useEffect(()=>onPrice(expected),[onPrice]);return React.createElement('span',null,'1원');}
 function Host(){const [visible,setVisible]=React.useState(true);hide=()=>setVisible(false);return visible?React.createElement(Confirmation,{paymentSurface:'toss',TossPrice:Price,input:{consultationMode:'tarot',question:'어떤 선택을 준비하면 좋을까요?'},cupId:'cup',onBack:hide,onConfirm:input=>{confirmed=input;hide();}}):null;}
 const button=text=>[...document.querySelectorAll('button')].find(el=>el.textContent===text);
 async function show(key){confirmed=null;await React.act(async()=>root.render(React.createElement(Host,{key})));}
 async function confirm(){await React.act(async()=>button('이 질문으로 카드 준비하기').click());assert.equal(button('확인').disabled,false);await React.act(async()=>button('확인').click());assert.equal(document.querySelector('button'),null);assert.equal(confirmed.attemptId,'drawn-attempt');}
 try{
  await show('confirmed');await confirm();assert.equal(consumeTossTeaPrice(expected),true);assert.equal(consumeTossTeaPrice(expected),false);
  for(const [field,value] of [['owner','owner-B'],['sku','different-sku'],['featureKey','fortune-tea-house-saju-consultation'],['displayAmount','2원']]){
   await show(field);await confirm();assert.equal(consumeTossTeaPrice({...expected,[field]:value}),false);assert.equal(consumeTossTeaPrice(expected),false);
  }
  await show('unmounted');rememberTossTeaPrice(expected);await React.act(async()=>hide());assert.equal(consumeTossTeaPrice(expected),false);
  await show('back');rememberTossTeaPrice(expected);await React.act(async()=>button('질문 수정하기').click());assert.equal(consumeTossTeaPrice(expected),false);assert.equal(confirmed,null);
 }finally{await React.act(async()=>root.unmount());rememberTossTeaPrice(null);dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;globalThis.IS_REACT_ACT_ENVIRONMENT=oldAct;}
});
