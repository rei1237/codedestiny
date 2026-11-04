import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const React=require('react'),{createRoot}=require('react-dom/client');

test('tea dialogue keeps the web link on web and removes it on Toss',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
 const entry=path.resolve(import.meta.dirname,'../../../src/features/fortune-tea-house/components/HoneyDropRewardOverlay.tsx');
 const bundle=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'tea-dialogue-boundaries',setup(b){
  b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?null:/^react(?:\/jsx-runtime)?$/.test(a.path)?{path:a.path,external:true}:{path:a.path,namespace:'mock'});
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p.endsWith('.css')?'export default {};':p==='../data/assets'?`export const fortuneTeaHouseAssets={rewards:{flowerPigHoneyHug:''}};`:p==='../lib/teaHouseCopy'?`export const useTeaHouseCopy=(_key,copy)=>({...copy,greeting:'안녕 code-destiny.com'});`:p==='lucide-react'?`import React from 'react';export const BookOpen=()=>React.createElement('span'),Send=()=>React.createElement('span');`:'export default {};'}));
 }}]});
 const loaded=new Module(entry+'.cjs');loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
 let root;
 try{
  for(const surface of ['web','toss']){
   root=createRoot(document.getElementById('root'));
   await React.act(async()=>root.render(React.createElement(loaded.exports.default,{paymentSurface:surface,honeyDrops:{currentHoneyDrops:10},burstKey:0,message:'',onOpenTarotAlbum:()=>{}})));
   const toggle=[...document.querySelectorAll('button')].find(button=>button.textContent.includes('꿀 모드 활성화'));assert.ok(toggle);
   await React.act(async()=>toggle.click());
   const link=document.querySelector('a[href="https://code-destiny.com"]');
   if(surface==='web'){assert.ok(link);assert.match(document.body.textContent,/code-destiny\.com/);}
   else{assert.equal(link,null);assert.match(document.body.textContent,/코드데스티니/);assert.doesNotMatch(document.body.textContent,/code-destiny\.com/);}
   await React.act(async()=>root.unmount());root=null;
  }
 }finally{if(root)await React.act(async()=>root.unmount());dom.window.close();}
});
