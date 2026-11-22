import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import ts from 'typescript';
import {JSDOM} from 'jsdom';

const require=createRequire(import.meta.url);
const root='app/yeongnyangi/_components';
const source=fs.readFileSync(root+'/PetMascot.tsx','utf8');
const css=fs.readFileSync(root+'/pet-mascot.module.css','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const mod={exports:{}};
// 깜빡임 부분 시트(MasterMotionPatch, .tsx)는 이 하네스에서 그리지 않는다 — 계약은 master-motion-assets.test.mjs, 화면은 실측(F7).
const stubs={'@/app/components/master-motion/MasterMotion':{MasterMotionPatch:()=>null}};
vm.runInThisContext('(function(require,module,exports){'+js+'\n})')((id)=>id.endsWith('.css')?new Proxy({},{get:(_,key)=>key==='__esModule'?false:key}):stubs[id]??require(id.startsWith('@/')?'../../'+id.slice(2):id),mod,mod.exports);
const PetMascot=mod.exports.default;
async function harness(run){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://test.invalid'});
 const saved=Object.fromEntries(['window','document','IS_REACT_ACT_ENVIRONMENT'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const host=document.getElementById('root'),root=createRoot(host);
 const calls=[];
 try{
  await act(async()=>root.render(React.createElement(PetMascot,{alt:'기다리는 영냥이',onReact:row=>calls.push(row)})));
  const btn=host.querySelector('button');
  const image=()=>btn.querySelector('[data-pet-sprite] img');
  const event=(type,w=0,h=0)=>act(async()=>{
   const el=image();Object.defineProperties(el,{naturalWidth:{value:w},naturalHeight:{value:h}});
   el.dispatchEvent(new dom.window.Event(type));
  });
  return await run({image,host,btn,calls,press:()=>act(async()=>btn.click()),load:(w,h)=>event('load',w,h),fail:()=>event('error')});
 }
 finally{
  await act(async()=>root.unmount());dom.window.close();
  for(const [k,v] of Object.entries(saved)){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}
 }
}

test('native mascot button renders original only until user activates and a correct atlas loads',()=>harness(async({image,host,btn,calls,press,load})=>{
 assert.equal(btn.type,'button');
 assert.equal(btn.getAttribute('aria-label'),'영냥이 쓰다듬기');
 assert.match(btn.textContent,/쓰다듬어 봐/);
 assert.equal(image(),null);
 assert.match(btn.querySelector('img').getAttribute('src'),/hero-800/);
 await press();
 assert.match(image().getAttribute('src'),/mascot-reactions\.webp$/);
 assert.equal(btn.querySelector('[data-pet-sprite]').dataset.petSprite,'idle');
 assert.ok(btn.querySelector('.fallbackReaction'));
 await load(1024,1024);
 assert.equal(btn.querySelector('[data-pet-sprite]').dataset.petSprite,'active');
 assert.equal(image().style.getPropertyValue('--pet-row'),'0%');
 assert.match(host.querySelector('[role=status]').textContent,/눈을 깜빡/);
 const rows=[0,1,2,3,0];
 for (const i of rows.slice(1)){
  const previous=image(),motion=image().dataset.motion;
  await press();
  assert.equal(btn.dataset.reaction,String(i));
  assert.equal(image(),previous);
  assert.notEqual(image().dataset.motion,motion);
 }
 assert.deepEqual(calls,rows);
 assert.equal(btn.querySelectorAll('[data-pet-sprite] img').length,1);
}));
test('missing and incorrect sprite metadata keep the original image with no retry loop',async()=>{
 for(const invalid of ['network','shape','grid']){
  await harness(async({image,btn,press,fail,load})=>{
   await press();
   if(invalid==='network')await fail();
   else if(invalid==='shape')await load(768,576);
   else await load(767,767);
   await press();
   assert.equal(image(),null);
   assert.ok(btn.querySelector('img:not(.inactive)'));
  });
 }
});
test('reduced motion renders a static existing face without relying on CSS motion',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*?animation:none!important/);
 assert.match(css,/width:400%; height:400%/);
 assert.match(css,/\.atlas \{ transform:translate\(-50%,var\(--pet-row\)\); \}/);
 assert.match(css,/focus-visible/);
});
