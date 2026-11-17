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
const config=modules()(path.resolve('app/moonlit-lotus/_lib/scene-views.ts'));
test('view URLs retain locale and activity; missing/invalid views select the front',()=>{
 assert.equal(config.parseSceneView(null),'front');assert.equal(config.parseSceneView('constructor'),'front');
 const query=new URLSearchParams(config.sceneUrl('hall','bow','left','?lang=ja&scene=pond'));
 assert.equal(query.get('lang'),'ja');assert.equal(query.get('activity'),'bow');assert.equal(query.get('view'),'left');
 assert(!new URLSearchParams(config.sceneUrl('hall',null,'front',query.toString())).has('view'));
 assert.equal(config.nextSceneView('left-wide',-1),'left-wide');assert.equal(config.nextSceneView('right-wide',1),'right-wide');
 assert.equal(config.viewImage('hall','front',false),'/assets/moonlit-lotus/space-v1/hall-1536.webp');
});
test('swipe rejects vertical scrolling, small movement and system back edges',()=>{
 assert.equal(config.swipeDirection(-80,5,180,390),1);assert.equal(config.swipeDirection(80,5,180,390),-1);
 for(const args of [[-47,0,180,390],[-70,100,180,390],[-80,0,10,390],[-80,0,380,390]])assert.equal(config.swipeDirection(...args),0);
});
test('all 15 views provide complete portrait/landscape art within mobile budgets',async()=>{
 const base='public/assets/moonlit-lotus/views-v1/',manifest=JSON.parse(readFileSync(base+'manifest.json','utf8'));
 assert.equal(manifest.assets.length,27);assert.equal(new Set(manifest.assets.map(a=>a.sha256)).size,27);
 assert(manifest.assets.reduce((n,a)=>n+a.bytes,0)<=12*1024*1024);
 for(const scene of Object.keys(config.SCENES))for(const view of config.VIEWS)for(const portrait of [false,true]){
  const file=readFileSync('public'+config.viewImage(scene,view,portrait)),meta=await sharp(file).metadata();
  assert.equal(meta.width,portrait?768:1536);assert.equal(meta.height,portrait?1152:1024);
  assert(file.length<=(portrait?300:500)*1024);
 }
});
test('decoding failure and stale responses preserve current view and mounted character',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'}),previous={};
 const requests=new Map();
 class MockImage{naturalWidth=1536;src='';decode(){return new Promise((resolve,reject)=>requests.set(this.src,{resolve,reject}));}}
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,Image:MockImage,matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),IS_REACT_ACT_ENVIRONMENT:true})){previous[key]=globalThis[key];globalThis[key]=value;}
 const load=modules(),{useSceneView}=load(path.resolve('app/moonlit-lotus/_lib/use-scene-view.ts')),Viewport=load(path.resolve('app/moonlit-lotus/_components/SceneViewport.tsx')).default;
 let state,mounts=0;const changes=[];
 function Character(){React.useEffect(()=>{mounts++;},[]);return React.createElement('canvas');}
 function Harness({scene='hall'}){const [view,setView]=React.useState('front');state=useSceneView(scene,view,next=>{changes.push(next);setView(next);},true);return React.createElement(Viewport,{scene,view,portrait:false,reduced:true,onView:state.request,viewportRef:React.useRef(null)},React.createElement(Character));}
 const host=dom.window.document.getElementById('root'),root=createRoot(host);
 try{
  await act(async()=>root.render(React.createElement(Harness)));const canvas=host.querySelector('canvas');
  await act(async()=>{void state.request('left');});assert.equal(host.querySelector('[data-view]').dataset.view,'front');
  await act(async()=>requests.get(config.viewImage('hall','left',false)).reject(Error('offline')));
  assert(state.error);assert.equal(host.querySelector('canvas'),canvas);assert.equal(changes.length,0);
  await act(async()=>{void state.request('left');void state.request('right');});
  await act(async()=>requests.get(config.viewImage('hall','right',false)).resolve());
  await act(async()=>requests.get(config.viewImage('hall','left',false)).resolve());
  assert.deepEqual(changes,['right']);assert.equal(host.querySelector('canvas'),canvas);assert.equal(mounts,1);
  await act(async()=>{void state.request('right-wide');});
  await act(async()=>root.render(React.createElement(Harness,{scene:'pond'})));
  await act(async()=>requests.get(config.viewImage('hall','right-wide',false)).resolve());assert.deepEqual(changes,['right']);
 }finally{await act(async()=>root.unmount());dom.window.close();for(const [key,value] of Object.entries(previous))globalThis[key]=value;}
});
