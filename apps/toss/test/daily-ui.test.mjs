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
const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../src/DailyReadings.tsx')],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'ui-boundaries',setup(b){
 b.onResolve({filter:/^(\.\/platform|@toss\/tds-mobile)$/},args=>({path:args.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='./platform'?'export const api=()=>{throw Error("unexpected real API")};':`
 import React from 'react';
 export const Button=({children,display,variant,loading,...props})=>React.createElement('button',props,children);
 export const TextArea=({label,labelOption,variant,...props})=>React.createElement('textarea',{'aria-label':label,...props});
 export const TextField=({label,labelOption,variant,...props})=>React.createElement('input',{'aria-label':label,...props});
 `}));
}}]});
const loaded=new Module(path.resolve(import.meta.dirname,'daily-ui.cjs'));loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
const DailyReadings=loaded.exports.default;
const saved={category:'basic',day:'2026-10-29',title:'기본 운세',kind:'calculated',summary:'저장된 오늘의 원문',paragraphs:['계산한 이야기'],basis:[],limitations:[]};
const unlocked={day:'2026-10-29',balance:2,unlockCost:3,attended:true,unlocked:true};
async function mount(reply,loggedIn=true){const calls=[],errors=[],root=createRoot(document.getElementById('root'));const request=async(...args)=>{calls.push(args);return reply(...args);};
 await React.act(async()=>root.render(React.createElement(DailyReadings,{loggedIn,request,onLogin:()=>{},onError:error=>errors.push(error)})));
 return {calls,errors,close:()=>React.act(()=>root.unmount())};
}
async function click(text){const button=[...document.querySelectorAll('button')].find(item=>item.textContent===text);assert.ok(button,text);await React.act(async()=>button.click());}
test('guest can inspect categories without requesting account or result data',async()=>{const view=await mount(()=>assert.fail('guest API call'),false);try{assert.match(document.body.textContent,/토스 로그인하고 출석하기/);assert.equal(view.calls.length,0);}finally{await view.close();}});
test('locked daily uses server unlock cost and never requests a reading',async()=>{const view=await mount(()=>({...unlocked,unlocked:false,unlockCost:7}));try{const button=[...document.querySelectorAll('button')].find(item=>item.textContent.includes('7마리로'));assert.ok(button.disabled);assert.equal(view.calls.length,1);}finally{await view.close();}});
test('reread displays stored text using GET only, no purchase or regeneration',async()=>{const view=await mount(path=>path==='/daily/status'?unlocked:{result:saved});try{assert.match(document.body.textContent,/저장된 오늘의 원문/);assert.deepEqual(view.calls,[['/daily/status'],['/daily/reading?category=basic']]);}finally{await view.close();}});
test('late result from previous category cannot replace the newly selected story',async()=>{let resolvePrevious;const view=await mount(path=>path==='/daily/status'?unlocked:path.includes('basic')?new Promise(resolve=>{resolvePrevious=resolve;}):{result:{...saved,category:'vedic',title:'베다점',summary:'지금 선택한 베다 원문'}});try{await click('베다점');await React.act(async()=>resolvePrevious({result:saved}));assert.match(document.body.textContent,/지금 선택한 베다 원문/);assert.doesNotMatch(document.body.textContent,/저장된 오늘의 원문/);}finally{await view.close();}});
