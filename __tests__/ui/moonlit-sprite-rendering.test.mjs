import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),root=process.cwd();
function setup(){
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
 const previous={};
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,Image:null,IS_REACT_ACT_ENVIRONMENT:true})){previous[key]=globalThis[key];globalThis[key]=value;}
 const requests=new Map(),draws=[];
 class Image{
  naturalWidth=1536;naturalHeight=1536;src='';
  decode(){return new Promise((resolve,reject)=>requests.set(this.src,{resolve:()=>resolve(),reject,image:this}));}
 }
 globalThis.Image=Image;
 dom.window.HTMLCanvasElement.prototype.getContext=function(){return {clearRect(){},drawImage(...args){draws.push({canvas:this.canvas,args});},canvas:this};};
 const modules=new Map();
 function load(filename){
  if(filename.endsWith('.css'))return {};
  if(modules.has(filename))return modules.get(filename).exports;
  if(filename.endsWith('.json'))return JSON.parse(readFileSync(filename,'utf8'));
  const loaded={exports:{}};modules.set(filename,loaded);
  const code=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const localRequire=id=>{
   if(!id.startsWith('.'))return require(id);
   let file=path.resolve(path.dirname(filename),id);
   if(!existsSync(file))file=['.ts','.tsx'].map(ext=>file+ext).find(existsSync);
   return load(file);
  };
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename})(localRequire,loaded,loaded.exports);
  return loaded.exports;
 }
 const Atlas=load(path.join(root,'app/moonlit-lotus/_components/AtlasSprite.tsx')).default;
 const Character=load(path.join(root,'app/moonlit-lotus/_components/Character.tsx')).default;
 const Transition=load(path.join(root,'app/moonlit-lotus/_components/ActivityTransition.tsx')).default;
 const host=dom.window.document.getElementById('root'),reactRoot=createRoot(host);
 const render=async props=>act(async()=>reactRoot.render(React.createElement(React.StrictMode,null,React.createElement(Atlas,{className:'sprite',identity:'one',label:'character',...props}))));
 const decode=async url=>{assert(requests.has(url),'requested '+url);await act(async()=>requests.get(url).resolve());};
 const cleanup=async()=>{await act(async()=>reactRoot.unmount());dom.window.close();for(const [key,value] of Object.entries(previous))globalThis[key]=value;};
 return {host,reactRoot,Atlas,Character,Transition,render,decode,requests,draws,cleanup};
}
test('decode latency and out-of-order activity/character changes hold the last painted surface',async()=>{
 const t=setup();try{
  await t.render({drawing:{url:'/a',frame:5}});await t.decode('/a');const canvas=t.host.querySelector('canvas');
  await t.render({identity:'two',drawing:{url:'/b',frame:8}});
  assert.equal(t.host.querySelector('canvas'),canvas);assert.equal(canvas.dataset.paintedUrl,'/a');
  await t.render({identity:'three',drawing:{url:'/c',frame:11}});await t.decode('/c');await t.decode('/b');
  assert.equal(canvas.dataset.paintedUrl,'/c');assert.equal(canvas.dataset.paintedFrame,'11');
  assert.equal(t.host.querySelectorAll('canvas').length,1);assert.equal(t.draws.at(-1).args[0].src,'/c');
 }finally{await t.cleanup();}
});
test('freeze preserves the current pose and strict replay paints cached frozen sprites',async()=>{
 const t=setup();try{
  await t.render({drawing:{url:'/a',frame:7}});await t.decode('/a');
  await t.render({drawing:{url:'/a',frame:9},frozen:true});assert.equal(t.host.querySelector('canvas').dataset.paintedFrame,'7');
  await t.render({drawing:{url:'/a',frame:10}});assert.equal(t.host.querySelector('canvas').dataset.paintedFrame,'10');
  await act(async()=>t.reactRoot.render(null));
  await t.render({drawing:{url:'/a',frame:4},frozen:true});assert.equal(t.host.querySelector('canvas').dataset.paintedFrame,'4');assert.equal(t.draws.at(-1).args[1],0);
 }finally{await t.cleanup();}
});
test('failed next image keeps current art and supports a fresh explicit retry',async()=>{
 const t=setup();try{
  let failures=0;await t.render({drawing:{url:'/a',frame:0}});await t.decode('/a');
  const props={identity:'next',drawing:{url:'/bad',frame:1},onFailure:()=>failures++};await t.render(props);
  await act(async()=>t.requests.get('/bad').reject(Error('decode failed')));assert.equal(failures,1);assert.equal(t.host.querySelector('canvas').dataset.paintedUrl,'/a');
  await t.render({...props,attempt:1});await t.decode('/bad');assert.equal(t.host.querySelector('canvas').dataset.paintedUrl,'/bad');
 }finally{await t.cleanup();}
});
test('front/rear, activity and walk drawing changes keep the actual Character canvas mounted',async()=>{
 const t=setup();try{
  const base={kind:'yeoni',activity:'prayer',elapsed:0,reduced:false,look:{},image:'',portrait:'',onFailure:()=>{}};
  const render=async props=>act(async()=>t.reactRoot.render(React.createElement(t.Transition,null,React.createElement(t.Character,{...base,...props}))));
  await render({});await t.decode('/assets/moonlit-lotus/yeoni/2d-v2/bow-down.webp');const canvas=t.host.querySelector('canvas');
  await render({rearId:'cat'});await t.decode('/assets/moonlit-lotus/companions-rear-v1/cat/down.webp');
  await render({activity:'meditation',walking:{url:'/walk',frame:3}});await t.decode('/walk');
  await render({activity:'affirmation',kind:'cat'});await t.decode('/assets/moonlit-lotus/companions-v2/cat-motion.webp');
  assert.equal(t.host.querySelector('canvas'),canvas);assert.equal(t.host.querySelectorAll('canvas').length,1);assert.equal(canvas.dataset.paintedFrame,'14');
 }finally{await t.cleanup();}
});
