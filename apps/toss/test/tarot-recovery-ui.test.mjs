import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{createRoot}=require('react-dom/client');
const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../src/TarotLibrary.tsx')],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'ui-boundaries',setup(b){
 b.onResolve({filter:/^(\.\/platform|\.\/TarotResultActions|@toss\/tds-mobile)$/},args=>({path:args.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='./platform'?`
  export const api=(...args)=>globalThis.tarotRecoveryUi.api(...args);
  export const purchaseTarotLibrary=()=>{throw Error('recovery must not open another purchase')};
 `:args.path==='./TarotResultActions'?'export default ()=>null;':`
  import React from 'react';
  export const Button=({children,display,variant,loading,...props})=>React.createElement('button',props,children);
  export const TextArea=({label,labelOption,variant,...props})=>React.createElement('textarea',{'aria-label':label,...props});
 `}));
}}]});
const loaded=new Module(path.resolve(import.meta.dirname,'tarot-recovery-ui.cjs'));
loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
const TarotLibrary=loaded.exports.default,orderId='01900000-1111-7111-8111-000000000042';
const result={flowId:'tarot-mindscan',title:'저장된 리딩',question:'질문',cards:[],summary:'완료된 원문'};
async function mount(api){
 const calls=[];globalThis.tarotRecoveryUi={api:async(...args)=>{calls.push(args);return api(...args);}};
 const root=createRoot(document.getElementById('root'));
 await React.act(async()=>{root.render(React.createElement(TarotLibrary,{products:[],loggedIn:true,initialOrderId:orderId,onLogin:()=>assert.fail(),onError:error=>{throw error;},onBack:()=>{}}));});
 return {calls,close:()=>React.act(()=>root.unmount())};
}
async function click(text){
 const button=[...document.querySelectorAll('button')].find(item=>item.textContent===text);
 assert.ok(button,`missing button: ${text}`);await React.act(async()=>button.click());
}

test('completed library reread displays stored text without a generation or payment request',async()=>{
 const view=await mount(()=>({flowId:result.flowId,state:'completed',result,canRetryNow:false}));
 try{assert.match(document.body.textContent,/완료된 원문/);assert.deepEqual(view.calls,[[`/tarot-library/results/${orderId}`]]);}
 finally{view.close();}
});

test('a failed paid reading can resume from the library on the original order',async()=>{
 const view=await mount((_path,body)=>body?{state:'completed',result,canRetryNow:false}:{flowId:result.flowId,state:'generation_failed',result:null,canRetryNow:true});
 try{await click('추가 결제 없이 이어서 생성');assert.deepEqual(view.calls[1],[`/tarot-library/results/${orderId}`,{}]);assert.match(document.body.textContent,/완료된 원문/);}
 finally{view.close();}
});

test('a recovered order with no input collects cards and resumes even without a currently sold SKU',async()=>{
 const view=await mount((_path,body)=>body?{state:'completed',result,canRetryNow:false}:{flowId:result.flowId,state:'input_required',result:null,canRetryNow:false});
 try{
  const field=document.querySelector('textarea');assert.ok(field);
  await React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value').set.call(field,'지금 관계에서 필요한 행동은?');field.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
  await click('카드 펼치기');
  for(let i=0;i<5;i++)await React.act(async()=>document.querySelectorAll('.tarot-deck button')[i].click());
  await click('선택한 카드 열기');await click('구매한 리딩 이어서 보기');
  assert.equal(view.calls[1][0],`/tarot-library/results/${orderId}`);assert.equal(view.calls[1][1].input.cards.length,5);
  assert.match(document.body.textContent,/완료된 원문/);
 }finally{view.close();}
});
