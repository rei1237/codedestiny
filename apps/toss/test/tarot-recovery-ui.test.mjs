import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.__tarotScope={revision:0,listeners:new Set()};
const React=require('react'),{createRoot}=require('react-dom/client');
const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../src/TarotLibrary.tsx')],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'ui-boundaries',setup(b){
 b.onResolve({filter:/^(\.\/platform|\.\/TarotResultActions|@toss\/tds-mobile)$/},args=>({path:args.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='./platform'?`
  export const getTossSessionRevision=()=>globalThis.__tarotScope.revision,onTossSessionRevisionChanged=listener=>{globalThis.__tarotScope.listeners.add(listener);return ()=>globalThis.__tarotScope.listeners.delete(listener);};export const paymentRequiresReview=()=>false;export const tarotLibraryProducts=async()=>{throw Error('recovery must not load a new sale')};
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
async function mount(api,onError=error=>{throw error;},initialLoggedIn=true,initialId=orderId){
 const calls=[];globalThis.tarotRecoveryUi={api:async(...args)=>{calls.push(args);return api(...args);}};
 const root=createRoot(document.getElementById('root'));
 const props={products:[],loggedIn:initialLoggedIn,initialOrderId:initialId,onLogin:()=>assert.fail(),onError,onBack:()=>{},onRereadClosed:()=>{globalThis.__tarotClosed=(globalThis.__tarotClosed||0)+1;}};await React.act(async()=>{root.render(React.createElement(TarotLibrary,props));});
 return {calls,setAuth:value=>React.act(async()=>root.render(React.createElement(TarotLibrary,{...props,loggedIn:value}))),close:()=>React.act(()=>root.unmount())};
}
async function click(text){
 const button=[...document.querySelectorAll('button')].find(item=>item.textContent===text);
 assert.ok(button,`missing button: ${text}`);await React.act(async()=>button.click());
}

test('completed library reread displays stored text without a generation or payment request',async()=>{
 const view=await mount(()=>({flowId:result.flowId,state:'completed',result,canRetryNow:false}));
 try{assert.match(document.body.textContent,/완료된 원문/);assert.doesNotMatch(document.body.textContent,/AI가 작성한 상담 결과/);assert.deepEqual(view.calls,[[`/tarot-library/results/${orderId}`]]);}
 finally{view.close();}
});

test('AI oracle discloses its use before input and labels restored generated results',async()=>{
 const oracle={...result,flowId:'tarot-prompt-maker'};
 let view=await mount(()=>({flowId:oracle.flowId,state:'input_required',result:null,canRetryNow:false}));
 try{assert.match(document.body.textContent,/AI를 활용해 작성/);}finally{view.close();}
 view=await mount(()=>({flowId:oracle.flowId,state:'completed',result:oracle,canRetryNow:false}));
 try{assert.match(document.body.textContent,/AI가 작성한 상담 결과/);}finally{view.close();}
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
  for(let i=0;i<10;i++)await React.act(async()=>document.querySelectorAll('.tarot-deck button')[i].click());
  await click('선택한 카드 열기');await click('구매한 리딩 이어서 보기');
  assert.equal(view.calls[1][0],`/tarot-library/results/${orderId}`);assert.equal(view.calls[1][1].input.picks.length,10);
  assert.match(document.body.textContent,/완료된 원문/);
 }finally{view.close();}
});

test('a denied reading does not imply ownership or offer to continue generation',async()=>{
 const errors=[];
 const denied=Object.assign(new Error('ACCESS_DENIED'),{code:'ACCESS_DENIED',status:403});
 const view=await mount(()=>Promise.reject(denied),error=>errors.push(error));
 try{
  assert.deepEqual(errors,[denied]);
  assert.doesNotMatch(document.body.textContent,/새로 결제하지 않아도|추가 결제 없이 이어서 생성/);
  await click('진행 상태 확인하기');
  assert.deepEqual(view.calls,[[`/tarot-library/results/${orderId}`],[`/tarot-library/results/${orderId}`,undefined]]);
 }finally{view.close();}
});


test('a paid saved reading disappears immediately when the session expires',async()=>{
 const view=await mount(()=>({flowId:result.flowId,state:'completed',result,canRetryNow:false}));
 try{assert.match(document.body.textContent,/완료된 원문/);await view.setAuth(false);assert.doesNotMatch(document.body.textContent,/완료된 원문/);}finally{view.close();}
});

test('a late paid reading response cannot restore a result after session expiry',async()=>{
 let finish,started;const begun=new Promise(resolve=>{started=resolve;});
 const view=await mount((_path,body)=>body?new Promise(resolve=>{finish=resolve;started();}):{flowId:result.flowId,state:'generation_failed',result:null,canRetryNow:true});
 try{await click('추가 결제 없이 이어서 생성');await begun;await view.setAuth(false);await React.act(async()=>finish({state:'completed',result,canRetryNow:false}));assert.doesNotMatch(document.body.textContent,/완료된 원문/);}finally{view.close();}
});

test('session expiry during initial recovery exits the loading state and ignores the late result',async()=>{
 let finish;const view=await mount(()=>new Promise(resolve=>{finish=resolve;}));
 try{
  assert.match(document.body.textContent,/저장된 타로 리딩을 다시 열고 있어요/);
  await view.setAuth(false);
  assert.doesNotMatch(document.body.textContent,/저장된 타로 리딩을 다시 열고 있어요/);
  assert.match(document.body.textContent,/카드에 담긴, 나의 이야기/);
  await React.act(async()=>finish({flowId:result.flowId,state:'completed',result,canRetryNow:false}));
  assert.doesNotMatch(document.body.textContent,/완료된 원문/);
 }finally{view.close();}
});


test('a guest question remains intact when the user logs in',async()=>{
 const view=await mount(()=>assert.fail('guest input should not fetch'),()=>{},false,'');
 try{
  await React.act(async()=>document.querySelector('.tarot-library-item').click());
  const field=document.querySelector('textarea');await React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value').set.call(field,'지금 나에게 필요한 방향은?');field.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
  await React.act(async()=>{globalThis.__tarotScope.revision++;for(const listener of [...globalThis.__tarotScope.listeners])listener();});await view.setAuth(true);assert.equal(document.querySelector('textarea').value,'지금 나에게 필요한 방향은?');
 }finally{view.close();}
});

test('session expiry clears old result but keeps the direct order for a newly verified login',async()=>{globalThis.__tarotClosed=0;const view=await mount(()=>({flowId:result.flowId,state:'completed',result,canRetryNow:false}));try{assert.match(document.body.textContent,/완료된 원문/);await view.setAuth(false);assert.doesNotMatch(document.body.textContent,/완료된 원문/);assert.equal(globalThis.__tarotClosed,0);await view.setAuth(true);assert.equal(view.calls.length,2);assert.match(document.body.textContent,/완료된 원문/);}finally{view.close();}});

test('a different account cannot reuse the previous account result after login',async()=>{let calls=0;const errors=[];const view=await mount(()=>++calls===1?{flowId:result.flowId,state:'completed',result,canRetryNow:false}:Promise.reject(Object.assign(new Error('denied'),{status:403,code:'ACCESS_DENIED'})),error=>errors.push(error));try{assert.match(document.body.textContent,/완료된 원문/);await view.setAuth(false);assert.doesNotMatch(document.body.textContent,/완료된 원문/);await view.setAuth(true);assert.doesNotMatch(document.body.textContent,/완료된 원문|추가 결제 없이 이어서 생성/);assert.equal(errors.at(-1).status,403);}finally{view.close();}});

test('credential replacement hides the prior paid result and rechecks the original order',async()=>{const errors=[],start=globalThis.__tarotScope.revision;const view=await mount(()=>globalThis.__tarotScope.revision===start?{flowId:result.flowId,state:'completed',result,canRetryNow:false}:Promise.reject(Object.assign(new Error('denied'),{status:403,code:'ACCESS_DENIED'})),error=>errors.push(error));try{assert.match(document.body.textContent,/완료된 원문/);await React.act(async()=>{globalThis.__tarotScope.revision++;for(const listener of [...globalThis.__tarotScope.listeners])listener();});assert.doesNotMatch(document.body.textContent,/완료된 원문|추가 결제 없이 이어서 생성/);assert.equal(view.calls.length,2);assert.equal(errors.at(-1)?.status,403);}finally{await view.close();}});

test('a late result from the previous credential never overwrites the new denial',async()=>{let resolve;const errors=[],start=globalThis.__tarotScope.revision;const view=await mount(()=>globalThis.__tarotScope.revision===start?new Promise(done=>{resolve=done}):Promise.reject(Object.assign(new Error('denied'),{status:403,code:'ACCESS_DENIED'})),error=>errors.push(error));try{assert.equal(typeof resolve,'function');await React.act(async()=>{globalThis.__tarotScope.revision++;for(const listener of [...globalThis.__tarotScope.listeners])listener();});await React.act(async()=>resolve({flowId:result.flowId,state:'completed',result,canRetryNow:false}));assert.doesNotMatch(document.body.textContent,/완료된 원문|추가 결제 없이 이어서 생성/);assert.equal(errors.at(-1)?.status,403);}finally{await view.close();}});
