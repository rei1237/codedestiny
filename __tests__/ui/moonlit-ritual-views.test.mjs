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
import sharp from 'sharp';
const require=createRequire(import.meta.url);
function modules(){
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  if(file.endsWith('.css'))return {};
  const loaded={exports:{}};cache.set(file,loaded);
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(id=>{
   if(!id.startsWith('.'))return require(id);
   const base=path.resolve(path.dirname(file),id),resolved=existsSync(base)?base:['.ts','.tsx'].map(ext=>base+ext).find(existsSync);
   return load(resolved);
  },loaded,loaded.exports);return loaded.exports;
 }return load;
}
const load=modules();
const views=load(path.resolve('app/moonlit-lotus/_ritual/ritual-views.ts'));
const {RITUAL_STEPS}=load(path.resolve('app/moonlit-lotus/_ritual/ritual-machine.ts'));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const KB=1024;

test('every ritual step has portrait/landscape art; new scenes stay within the handoff budget',async()=>{
 assert.deepEqual(Object.keys(views.RITUAL_VIEWS).sort(),[...RITUAL_STEPS].sort());
 for(const step of RITUAL_STEPS){
  const view=views.RITUAL_VIEWS[step],own=view.portrait.includes('/ritual-v1/');
  const files=[[view.portrait,true],[view.landscape,false],...(view.avif?[[view.avif.portrait,true],[view.avif.landscape,false]]:[])];
  for(const [url,portrait] of files){
   const file=readFileSync('public'+url),meta=await sharp(file).metadata();
   assert.equal(meta.width,portrait?768:1536,url);assert.equal(meta.height,portrait?1152:1024,url);
   // 새 장면(ritual-v1) 768 ≤220KB·1536 ≤350KB, 다시 쓰는 기존 장면은 views 예산(300/500KB).
   assert.ok(file.length<=(own?(portrait?220:350):(portrait?300:500))*KB,url+' '+Math.round(file.length/KB)+'KB');
  }
 }
 for(const url of Object.values(views.PROPS))assert.ok(readFileSync('public'+url).length<=80*KB,url);
 const manifest=JSON.parse(readFileSync('public/assets/moonlit-lotus/ritual-v1/manifest.json','utf8'));
 for(const asset of manifest.assets)assert.equal(readFileSync('public/assets/moonlit-lotus/ritual-v1/'+asset.file).length,asset.bytes,asset.file);
 assert.equal(views.chimeDelay(()=>0),14000);assert.ok(views.chimeDelay(()=>.9999)<24000);
});

test('backdrop crossfades two layers on a step change and preloads only the next step and its props',async()=>{
 const dom=new JSDOM('<div id="root"></div>'),previous={};
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){previous[key]=globalThis[key];globalThis[key]=value;}
 const Backdrop=load(path.resolve('app/moonlit-lotus/_ritual/RitualBackdrop.tsx')).default;
 const host=document.getElementById('root'),root=createRoot(host);
 const backdrop=()=>host.firstChild;
 const layers=()=>[...backdrop().querySelectorAll(':scope > picture')].map(p=>p.dataset.step+':'+p.dataset.phase);
 const warm=()=>{const box=backdrop().querySelector(':scope > div');return box?[...box.querySelectorAll('img')].map(img=>img.getAttribute('src')):[];};
 const settle=ms=>act(async()=>{await wait(ms);});
 try{
  await act(async()=>root.render(React.createElement(Backdrop,{step:'enter'})));
  assert.equal(backdrop().getAttribute('aria-hidden'),'true');assert.equal(backdrop().dataset.move,'none');
  assert.deepEqual(layers(),['enter:still']);assert.deepEqual(warm(),[],'nothing is preloaded right away');
  await settle(views.PRELOAD_DELAY_MS+60);
  assert.deepEqual(warm(),[views.RITUAL_VIEWS.breathe.portrait],'only the next scene');
  await act(async()=>root.render(React.createElement(Backdrop,{step:'breathe'})));
  assert.deepEqual(layers(),['enter:leave','breathe:enter']);assert.equal(backdrop().dataset.move,'walkIn');
  assert.deepEqual(warm(),[],'old preload is dropped on a step change');
  await settle(views.PRELOAD_DELAY_MS+60);
  assert.deepEqual(warm(),[views.RITUAL_VIEWS.incense.portrait,views.PROPS.incenseBurner]);
  await settle(views.MOVE_MS+50-views.PRELOAD_DELAY_MS);
  assert.deepEqual(layers(),['breathe:enter'],'the leaving layer is removed after the move');
  await act(async()=>root.render(React.createElement(Backdrop,{step:'dedication'})));
  await settle(views.PRELOAD_DELAY_MS+60);
  assert.deepEqual(warm(),[],'the last step preloads nothing');
  for(const img of host.querySelectorAll('img'))assert.equal(img.getAttribute('alt'),'');
 }finally{await act(async()=>root.unmount());dom.window.close();for(const [key,value] of Object.entries(previous))globalThis[key]=value;}
});

test('a scene that fails to load keeps the last good picture without a transition',async()=>{
 const dom=new JSDOM('<div id="root"></div>'),previous={};
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){previous[key]=globalThis[key];globalThis[key]=value;}
 const Backdrop=load(path.resolve('app/moonlit-lotus/_ritual/RitualBackdrop.tsx')).default;
 const host=document.getElementById('root'),root=createRoot(host);
 const layers=()=>[...host.firstChild.querySelectorAll(':scope > picture')].map(p=>p.dataset.step+':'+p.dataset.phase);
 const fail=step=>act(async()=>host.querySelector(`picture[data-step="${step}"] img`).dispatchEvent(new dom.window.Event('error')));
 try{
  await act(async()=>root.render(React.createElement(Backdrop,{step:'enter'})));
  await act(async()=>root.render(React.createElement(Backdrop,{step:'breathe'})));
  await fail('breathe');assert.deepEqual(layers(),['enter:still']);
  await act(async()=>root.render(React.createElement(Backdrop,{step:'incense'})));
  assert.deepEqual(layers(),['enter:leave','incense:enter'],'the next good scene moves on from the kept picture');
 }finally{await act(async()=>root.unmount());dom.window.close();for(const [key,value] of Object.entries(previous))globalThis[key]=value;}
});

test('ritual flow uses the stepped backdrop, the burner/lantern props and gesture-gated sound effects',()=>{
 const flow=readFileSync('app/moonlit-lotus/_ritual/RitualFlow.tsx','utf8'),lantern=readFileSync('app/moonlit-lotus/_ritual/WishLantern.tsx','utf8');
 assert.match(flow,/<RitualBackdrop step=\{state\.step\}\/>/);assert.doesNotMatch(flow,/space-v1\/hall-768/);
 assert.match(flow,/alt=\{t\('props\.incenseBurner'\)\}/);
 for(const name of ['fire','lantern','bell','windChime'])assert.match(flow,new RegExp(`sfx\\('${name}'\\)`),name);
 assert.match(flow,/document\.hidden/,'the wind chime stays quiet in a hidden tab');
 assert.match(lantern,/PROPS\.lanternDim/);assert.match(lantern,/PROPS\.lanternLit/);
 const css=readFileSync('app/moonlit-lotus/_ritual/ritual.module.css','utf8');
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)[\s\S]*\.flow \.backdrop img \{ transform:none !important; animation:none !important;/);
 assert.match(css,/\.stage\[data-fx-tier=low\] \.backdrop \.layer\[data-phase\] img \{ animation:none; \}/);
});
