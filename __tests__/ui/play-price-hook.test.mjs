import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import * as registry from '../../worker/lib/paid-feature-registry.js';
const source=fs.readFileSync(new URL('../../app/hooks/useServerPrice.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
test('React badge loads Play labels, keeps registry KRW, and refreshes without stale prices',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://fixture.test'});
 const prior={window:globalThis.window,document:globalThis.document,act:globalThis.IS_REACT_ACT_ENVIRONMENT};
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let locale='ja',requests=0,finish,native=false;
 const featureKey=Object.keys(registry.FEATURE_KEY_PRICE_TABLE).find(key=>registry.FEATURE_KEY_PRICE_TABLE[key].amountKRW===30000);
 assert.ok(featureKey);
 const pick=(key,fallback)=>fallback;
 const play={isApp:()=>native,read:async input=>{assert.equal(input.featureKey,featureKey);requests++;return new Promise(resolve=>{finish=resolve;});}};
 const mocks={react:React,'@/worker/lib/paid-feature-registry.js':registry,'@/constants/loadingMessages':{getCurrentLoadingLocale:()=>locale},'@/lib/payment/coin-pricing':{formatKrwFromCoins:()=>{throw Error('No native fallback');}},'@/app/_lib/legacy-core-runtime':{checkoutEntryRuntime:{formatReferenceAmount:()=>{throw Error('No estimated FX in Play');}}},'@/lib/i18n/useT':{useLocale:()=>locale,useTPick:()=>pick},'@/js/core/play-display-price.js':play,'@/app/_lib/auth-client':{authFetch:()=>{throw Error('Injected display resolver owns reads');}}};
 const exports={};vm.runInNewContext(compiled,{exports,require:name=>{assert.ok(name in mocks,name);return mocks[name];},window:dom.window});
 function Display(){const state=exports.useServerPrice({featureKey});return React.createElement('output',null,JSON.stringify(state));}
 const root=createRoot(document.getElementById('root'));const state=()=>JSON.parse(document.querySelector('output').textContent);
 try{
  await act(async()=>root.render(React.createElement(Display)));
  assert.equal(state().source,'registry');assert.equal(requests,0);
  native=true;await act(async()=>dom.window.dispatchEvent(new dom.window.Event('cd:native-ready')));
  assert.equal(state().label,'');assert.equal(state().loading,true);assert.equal(state().amountKRW,30000);
  await act(async()=>finish({formattedPrice:'¥3,900'}));
  assert.equal(state().label,'¥3,900');assert.equal(state().amountKRW,30000);assert.equal(state().source,'google-play');
  locale='en';await act(async()=>root.render(React.createElement(Display)));
  await act(async()=>finish({formattedPrice:'¥3,900'}));assert.equal(state().label,'¥3,900','UI language must not invent USD');
  await act(async()=>dom.window.dispatchEvent(new dom.window.Event('cd:play-prices-changed')));
  assert.equal(state().label,'');await act(async()=>finish(null));assert.equal(state().label,'');assert.equal(state().loading,false);
  assert.equal(requests,3);
 }finally{await act(async()=>root.unmount());dom.window.close();globalThis.window=prior.window;globalThis.document=prior.document;globalThis.IS_REACT_ACT_ENVIRONMENT=prior.act;}
});
