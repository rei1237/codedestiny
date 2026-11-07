import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {build} from 'esbuild';import {createRequire} from 'node:module';import path from 'node:path';
import {buildSukuyoBasicFree} from '../../../worker/lib/saju-section/report.js';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/sukuyo/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.__tossScope={revision:0,listeners:new Set()};
const React=require('react'),{createRoot}=require('react-dom/client');
const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../src/SukuyoBasic.tsx')],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'ui-boundaries',setup(b){b.onResolve({filter:/^(\.\/platform|@toss\/tds-mobile)$/},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='./platform'?'export const api=()=>{throw Error("unexpected real API")};export const getTossSessionRevision=()=>globalThis.__tossScope.revision,onTossSessionRevisionChanged=listener=>{globalThis.__tossScope.listeners.add(listener);return ()=>globalThis.__tossScope.listeners.delete(listener);};':`import React from 'react';export const Button=({children,display,variant,loading,...props})=>React.createElement('button',props,children);export const TextField=({label,labelOption,variant,...props})=>React.createElement('input',{'aria-label':label,...props});`}));}}]});
const loaded=new Module(path.resolve(import.meta.dirname,'sukuyo-basic-ui.cjs'));loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);const Screen=loaded.exports.default;
const sample={stored:false,engineVersion:'offline',limitations:[],...buildSukuyoBasicFree({lunarObj:{moonEclipticLongitude:15,year:1989,month:12,day:5},now:new Date('2026-11-07T00:00:00Z')})};
function fill(){const set=(element,value)=>{Object.getOwnPropertyDescriptor(element.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new window.Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));};set(document.querySelector('input[type=date]'),'1990-01-01');set(document.querySelector('input[type=time]'),'08:30');const choices=document.querySelectorAll('select');set(choices[1],'M');set(choices[2],choices[2].options[1].value);}
const submit=()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
test('login boundary, free calculation and native back preserve the form',async()=>{
 let logins=0,calls=0;const root=createRoot(document.getElementById('root')),request=async(path,body)=>{calls++;assert.equal(path,'/sukuyo/basic');assert.equal(body.birth.date.year,1990);return sample;},props={onLogin:()=>{logins++;},onError:()=>assert.fail(),request};
 try{await React.act(async()=>root.render(React.createElement(Screen,{...props,loggedIn:false})));assert.equal(document.querySelector('form'),null);await React.act(async()=>document.querySelector('button').click());assert.equal(logins,1);
  await React.act(async()=>root.render(React.createElement(Screen,{...props,loggedIn:true})));await React.act(async()=>fill());await React.act(async()=>submit());assert.equal(calls,1);assert.match(document.body.textContent,/본명숙은 필/);assert.match(document.body.textContent,/보관함에 저장되지 않아요/);const art=document.querySelector('.sukuyo-master-art');assert.equal(art.getAttribute('src'),'/images/master-profiles/hanbi-sukuyo-reading.webp');assert.match(art.alt,/서한비/);
  const back=new window.Event('code-destiny:toss-back',{cancelable:true});await React.act(async()=>window.dispatchEvent(back));assert.equal(back.defaultPrevented,true);assert.doesNotMatch(document.body.textContent,/본명숙은 필/);assert.equal(document.querySelector('input[type=date]').value,'1990-01-01');
 }finally{await React.act(()=>root.unmount());}
});
test('permission denial stays distinct and a retryable failure keeps input',async()=>{
 const root=createRoot(document.getElementById('root')),errors=[];let failure='denied';const request=async()=>{if(failure==='denied')throw {status:403,code:'ACCESS_DENIED'};if(failure==='release')throw {status:503,code:'TOSS_RELEASE_PENDING'};throw Error('offline');};
 try{await React.act(async()=>root.render(React.createElement(Screen,{loggedIn:true,onLogin:()=>{},onError:e=>errors.push(e),request})));await React.act(async()=>fill());await React.act(async()=>submit());assert.equal(errors.length,0);assert.match(document.body.textContent,/토스 이용 권한을 확인할 수 없어요/);assert.doesNotMatch(document.body.textContent,/주문 내역/);failure='release';await React.act(async()=>submit());assert.match(document.body.textContent,/서비스를 준비하고 있어요/);failure='network';await React.act(async()=>submit());assert.match(document.body.textContent,/다시 시도해 주세요/);assert.equal(document.querySelector('input[type=date]').value,'1990-01-01');}
 finally{await React.act(()=>root.unmount());}
});
test('an expired login is passed to the shell instead of displayed as a calculation failure',async()=>{
 const root=createRoot(document.getElementById('root')),errors=[];const request=async()=>{throw {status:401,code:'SESSION_EXPIRED'};};
 try{await React.act(async()=>root.render(React.createElement(Screen,{loggedIn:true,onLogin:()=>{},onError:e=>errors.push(e),request})));await React.act(async()=>fill());await React.act(async()=>submit());assert.equal(errors[0].status,401);assert.doesNotMatch(document.body.textContent,/계산을 마치지 못했어요/);}
 finally{await React.act(()=>root.unmount());}
});
test('session replacement discards an old result and does not unlock a new request',async()=>{
 const root=createRoot(document.getElementById('root')),requests=[];const request=()=>new Promise((resolve,reject)=>requests.push({resolve,reject}));
 try{await React.act(async()=>root.render(React.createElement(Screen,{loggedIn:true,onLogin:()=>{},onError:()=>assert.fail(),request})));await React.act(async()=>fill());await React.act(async()=>{submit();submit();});assert.equal(requests.length,1);
  await React.act(async()=>{globalThis.__tossScope.revision++;for(const listener of [...globalThis.__tossScope.listeners])listener();});await React.act(async()=>fill());await React.act(async()=>submit());assert.equal(requests.length,2);
  await React.act(async()=>requests[0].resolve(sample));assert.doesNotMatch(document.body.textContent,/본명숙은 필/);await React.act(async()=>submit());assert.equal(requests.length,2);await React.act(async()=>requests[1].resolve(sample));assert.match(document.body.textContent,/본명숙은 필/);
 }finally{await React.act(()=>root.unmount());}assert.equal(globalThis.__tossScope.listeners.size,0);
});
test('malformed results and an unknown birth time do not display a result',async()=>{
 const root=createRoot(document.getElementById('root'));let calls=0;const request=async()=>{calls++;return {...sample,reading:{...sample.reading,summaryCards:[null]}};};
 try{await React.act(async()=>root.render(React.createElement(Screen,{loggedIn:true,onLogin:()=>{},onError:()=>assert.fail(),request})));await React.act(async()=>fill());await React.act(async()=>submit());assert.match(document.body.textContent,/다시 시도해 주세요/);assert.doesNotMatch(document.body.textContent,/본명숙은 필/);await React.act(async()=>document.querySelector('input[type=checkbox]').click());await React.act(async()=>submit());assert.equal(calls,1);assert.match(document.body.textContent,/태어난 시각이 필요해요/);}
 finally{await React.act(()=>root.unmount());}
});
test('an empty free dashboard is treated as an unavailable result',async()=>{
 const root=createRoot(document.getElementById('root'));const request=async()=>({...sample,reading:{...sample.reading,summaryCards:[]}});
 try{await React.act(async()=>root.render(React.createElement(Screen,{loggedIn:true,onLogin:()=>{},onError:()=>assert.fail(),request})));await React.act(async()=>fill());await React.act(async()=>submit());assert.match(document.body.textContent,/계산을 마치지 못했어요/);assert.doesNotMatch(document.body.textContent,/본명숙은 필/);}
 finally{await React.act(()=>root.unmount());}
});
