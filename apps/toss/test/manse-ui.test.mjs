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
const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../src/ManseReading.tsx')],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'ui-boundaries',setup(b){
 b.onResolve({filter:/^(\.\/platform|@toss\/tds-mobile)$/},args=>({path:args.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='./platform'?'export const api=()=>{throw Error("unexpected real API")};':`
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
