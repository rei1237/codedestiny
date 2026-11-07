import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.__tossScope={revision:0,listeners:new Set()};
const React=require('react'),{createRoot}=require('react-dom/client');
const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../src/ManseReading.tsx')],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'ui-boundaries',setup(b){
 b.onResolve({filter:/^(\.\/platform|@toss\/tds-mobile)$/},args=>({path:args.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='./platform'?'export const api=()=>{throw Error("unexpected real API")};export const getTossSessionRevision=()=>globalThis.__tossScope.revision,onTossSessionRevisionChanged=listener=>{globalThis.__tossScope.listeners.add(listener);return ()=>globalThis.__tossScope.listeners.delete(listener);};':`
 import React from 'react';
 export const Button=({children,display,variant,loading,...props})=>React.createElement('button',props,children);
 export const TextArea=({label,labelOption,variant,...props})=>React.createElement('textarea',{'aria-label':label,...props});
 export const TextField=({label,labelOption,variant,...props})=>React.createElement('input',{'aria-label':label,...props});
 `}));
}}]});
const loaded=new Module(path.resolve(import.meta.dirname,'manse-ui.cjs'));loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);

const ManseReading=loaded.exports.default,ManseResults=loaded.exports.ManseResults;
const sample={stored:false,engineVersion:'test',limitations:[],pillars:[{key:'year',ganji:'丁丑',tenGod:'정인'},{key:'hour',ganji:null,tenGod:null}],elements:{wood:2},elementBasis:'surface',cycles:[]};
test('manse guest cannot submit birth data and gets explicit storage disclosure',async()=>{
 const root=createRoot(document.getElementById('root'));let calls=0,logins=0;
 try{await React.act(async()=>root.render(React.createElement(ManseReading,{loggedIn:false,request:()=>{calls++;throw Error('guest request');},onLogin:()=>logins++,onError:()=>{}})));
 assert.equal(document.querySelector('form'),null);assert.match(document.body.textContent,/보관함에 저장되지/);
 await React.act(async()=>document.querySelector('button').click());assert.equal(logins,1);assert.equal(calls,0);
 }finally{await React.act(()=>root.unmount());}
});
test('manse renders unknown hour without inventing a pillar or luck boundary',async()=>{
 const root=createRoot(document.getElementById('root'));
 try{await React.act(async()=>root.render(React.createElement(ManseResults,{result:sample})));
 assert.match(document.body.textContent,/丁丑/);assert.match(document.body.textContent,/미상/);assert.match(document.body.textContent,/정확한 대운 시작 시점을 표시할 자료가 없어요/);
 assert.doesNotMatch(document.body.textContent,/undefined|NaN/);
 }finally{await React.act(()=>root.unmount());}
});


test('logout hides the previous manse result during the first commit and clears private input',async()=>{
 const root=createRoot(document.getElementById('root'));let snapshot='',errors=[];const request=async()=>sample,onLogin=()=>{},onError=error=>errors.push(error);
 function Observe({loggedIn}){React.useLayoutEffect(()=>{if(!loggedIn)snapshot=document.body.textContent;},[loggedIn]);return null;}
 const render=loggedIn=>root.render(React.createElement(React.Fragment,null,React.createElement(ManseReading,{loggedIn,request,onLogin,onError}),React.createElement(Observe,{loggedIn})));
 const set=(element,value)=>{Object.getOwnPropertyDescriptor(element.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new window.Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));};
 try{await React.act(async()=>render(true));await React.act(async()=>{set(document.querySelector('input[type=date]'),'1990-05-15');set(document.querySelector('input[type=time]'),'08:30');const choices=document.querySelectorAll('select');set(choices[1],'M');set(choices[2],choices[2].options[1].value);});await React.act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.match(document.body.textContent,/丁丑/);await React.act(async()=>render(false));assert.doesNotMatch(snapshot,/丁丑/);assert.doesNotMatch(document.body.textContent,/丁丑/);await React.act(async()=>render(true));assert.equal(document.querySelector('input[type=date]').value,'');assert.equal(errors.length,0);}finally{await React.act(()=>root.unmount());}
});

test('a late manse response from before logout never appears after relogin',async()=>{const root=createRoot(document.getElementById('root')),errors=[];let resolve,calls=0;const request=()=>{calls++;return new Promise(done=>{resolve=done})},onError=error=>errors.push(error),onLogin=()=>{},render=loggedIn=>root.render(React.createElement(ManseReading,{loggedIn,request,onLogin,onError}));const set=(element,value)=>{Object.getOwnPropertyDescriptor(element.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new window.Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));};try{await React.act(async()=>render(true));await React.act(async()=>{set(document.querySelector('input[type=date]'),'1990-05-15');set(document.querySelector('input[type=time]'),'08:30');const choices=document.querySelectorAll('select');set(choices[1],'M');set(choices[2],choices[2].options[1].value);});await React.act(async()=>{document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));});assert.equal(calls,1);assert.equal(typeof resolve,'function');await React.act(async()=>render(false));await React.act(async()=>render(true));await React.act(async()=>resolve(sample));assert.doesNotMatch(document.body.textContent,/丁丑/);assert.equal(document.querySelector('input[type=date]').value,'');assert.equal(errors.length,0);}finally{await React.act(()=>root.unmount());}});

test('a session replacement clears the manse result while loggedIn remains true',async()=>{const root=createRoot(document.getElementById('root')),errors=[],request=async()=>sample,onError=error=>errors.push(error);const set=(element,value)=>{Object.getOwnPropertyDescriptor(element.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new window.Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));};try{await React.act(async()=>root.render(React.createElement(ManseReading,{loggedIn:true,request,onLogin:()=>{},onError})));await React.act(async()=>{set(document.querySelector('input[type=date]'),'1990-05-15');set(document.querySelector('input[type=time]'),'08:30');const choices=document.querySelectorAll('select');set(choices[1],'M');set(choices[2],choices[2].options[1].value);});await React.act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.match(document.body.textContent,/丁丑/);await React.act(async()=>assert.equal(window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})),false));assert.equal(document.querySelector('input[type=date]').value,'1990-05-15');assert.doesNotMatch(document.body.textContent,/丁丑/);await React.act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.match(document.body.textContent,/丁丑/);await React.act(async()=>{globalThis.__tossScope.revision++;for(const listener of [...globalThis.__tossScope.listeners])listener();});assert.doesNotMatch(document.body.textContent,/丁丑/);assert.equal(document.querySelector('input[type=date]').value,'');assert.equal(errors.length,0);}finally{await React.act(()=>root.unmount());}assert.equal(globalThis.__tossScope.listeners.size,0);});
