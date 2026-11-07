import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const React=require('react'),{createRoot}=require('react-dom/client'),root=path.resolve(import.meta.dirname,'../../..');
const src=fs.readFileSync(path.join(root,'app/fortune-chat/ConsultationIntake.tsx'),'utf8');
const mocks={
 'next/image':"import React from 'react';export default function Image(){return React.createElement('i')}",
 'lucide-react':"export const ArrowLeft=()=>null,ArrowRight=()=>null,Check=()=>null,PencilLine=()=>null;",
 '@/app/components/PriceBadge':"export const PriceBadge=()=>null;",
 './consultation-world':"export const TAROT_KINDS=[{id:'choice',label:'선택'}];",
 './consultation-access':"export const HONEY_COST=30;"
};
const built=await build({stdin:{contents:src,resolveDir:path.join(root,'app/fortune-chat'),loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'isolated',setup(b){
 b.onResolve({filter:/.*/},a=>/^react(?:\/jsx-runtime)?$/.test(a.path)?{path:a.path,external:true}:{path:a.path,namespace:'mock'});
 b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:mocks[p]||(p.endsWith('.css')?'export default {};':'export default ()=>null;')}));
}}]});
const m=new Module(path.join(root,'intake-test.cjs'));m.paths=Module._nodeModulePaths(path.join(root,'apps/toss'));m._compile(built.outputFiles[0].text,m.id);
test('Toss intake back preserves input and excludes web payment choices',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const app=createRoot(document.getElementById('root'));
 const props={question:'고민입니다',onQuestion:()=>{},domain:'tarot',onDomain:()=>{},tarotKind:'choice',onTarotKind:()=>{},profile:null,profileName:'',ready:true,busy:false,guest:false,enabled:true,onCreate:()=>{},paymentSurface:'toss',tossPrice:'₩5,000'};
 try{
  await React.act(async()=>app.render(React.createElement(m.exports.default,props)));
  const next=()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('계속하기'));
  await React.act(async()=>next().click());
  let event=new dom.window.Event('code-destiny:toss-overlay-back',{cancelable:true});await React.act(async()=>window.dispatchEvent(event));
  assert.equal(event.defaultPrevented,true);assert.match(document.body.textContent,/어떤 이야기를 나누고 싶나요/);
  await React.act(async()=>next().click());await React.act(async()=>next().click());
  assert.match(document.body.textContent,/₩5,000/);assert.doesNotMatch(document.body.textContent,/꿀방울|이용권/);
  event=new dom.window.Event('code-destiny:toss-overlay-back',{cancelable:true});await React.act(async()=>window.dispatchEvent(event));
  assert.equal(event.defaultPrevented,true);assert.match(document.body.textContent,/어떤 관점으로/);
 }finally{await React.act(async()=>app.unmount());dom.window.close();}
});
test('Toss intake does not leave during an in-flight request',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const app=createRoot(document.getElementById('root'));
 const props={question:'고민입니다',onQuestion:()=>{},domain:'tarot',onDomain:()=>{},tarotKind:'choice',onTarotKind:()=>{},profile:null,profileName:'',ready:true,busy:true,guest:false,enabled:true,onCreate:()=>{},paymentSurface:'toss'};
 try{await React.act(async()=>app.render(React.createElement(m.exports.default,props)));const event=new dom.window.Event('code-destiny:toss-overlay-back',{cancelable:true});await React.act(async()=>window.dispatchEvent(event));assert.equal(event.defaultPrevented,true);assert.match(document.body.textContent,/어떤 이야기를 나누고 싶나요/);}
 finally{await React.act(async()=>app.unmount());dom.window.close();}
});
test('web intake keeps its existing payment choices',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const app=createRoot(document.getElementById('root'));
 const props={question:'고민입니다',onQuestion:()=>{},domain:'tarot',onDomain:()=>{},tarotKind:'choice',onTarotKind:()=>{},profile:null,profileName:'',ready:true,busy:false,guest:false,enabled:true,onCreate:()=>{}};
 try{await React.act(async()=>app.render(React.createElement(m.exports.default,props)));const next=()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('계속하기'));await React.act(async()=>next().click());await React.act(async()=>next().click());assert.match(document.body.textContent,/이용권 또는 꿀방울/);}
 finally{await React.act(async()=>app.unmount());dom.window.close();}
});
test('a restored order limits input to the purchased reading system',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const app=createRoot(document.getElementById('root'));
 const props={question:'고민입니다',onQuestion:()=>{},domain:'tarot',onDomain:()=>{},tarotKind:'choice',onTarotKind:()=>{},profile:null,profileName:'',ready:true,busy:false,guest:false,enabled:true,onCreate:()=>{},paymentSurface:'toss',lockedDomain:'tarot',recoveredOrder:true};
 try{await React.act(async()=>app.render(React.createElement(m.exports.default,props)));const next=()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('계속하기'));await React.act(async()=>next().click());const saju=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('사주'));assert.equal(saju.disabled,true);await React.act(async()=>next().click());assert.match(document.body.textContent,/결제한 상담을 이어서 준비/);assert.doesNotMatch(document.body.textContent,/꿀방울|이용권/);}
 finally{await React.act(async()=>app.unmount());dom.window.close();}
});
