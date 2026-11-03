import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

test('saved results keep card meaning engines out of the initial reader graph',async()=>{
 const {metafile}=await build({entryPoints:['app/yeongnyangi/_components/Result.tsx'],bundle:true,splitting:true,outdir:'.tmp/result-payload-test',platform:'browser',format:'esm',packages:'external',write:false,metafile:true,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},logLevel:'silent'});
 const outputs=metafile.outputs,visited=new Set(),inputs=new Set();
 function visit(file){
  if(visited.has(file))return;visited.add(file);
  const output=outputs[file];assert.ok(output,'static output exists: '+file);
  Object.keys(output.inputs).forEach(input=>inputs.add(input));
  for(const dependency of output.imports)if(!dependency.external&&dependency.kind!=='dynamic-import')visit(dependency.path);
 }
 visit(Object.keys(outputs).find(file=>outputs[file].entryPoint==='app/yeongnyangi/_components/Result.tsx'));
 // These two interpretation datasets previously added over 700KB of decoded
 // source to a saved result that did not even contain a card spread.
 for(const file of ['lib/tarot/rich-card-meanings.mjs','lib/tarot/sun-recovery-card-copy.mjs'])assert.equal(inputs.has(file),false,file+' is not required to read saved chapters');
 // The paid draw and saved spread tools remain available as separate modules.
 for(const component of ['TarotDrawRitual.tsx','tarot/TarotCardPick.tsx','tarot/TarotSpreadReveal.tsx']){
  const source='app/yeongnyangi/_components/'+component;
  assert.equal(inputs.has(source),false,component+' waits for its record type');
  assert.ok(Object.values(outputs).some(output=>output.entryPoint===source),component+' is still bundled on demand');
 }
 assert.ok(inputs.has('app/yeongnyangi/_lib/tarot-presentation-state.ts'),'progress markers and complete saved-card mapping stay available');
});

test('presentation progress keeps existing keys and survives unavailable or malformed storage',async t=>{
 const compiled=await build({entryPoints:['app/yeongnyangi/_lib/tarot-presentation-state.ts'],bundle:true,platform:'node',format:'cjs',write:false});
 const require=createRequire(import.meta.url),Module=require('node:module');
 const loaded=new Module(path.resolve('tarot-presentation-state-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(compiled.outputFiles[0].text,loaded.id);
 const {saveRitual,storedRitual,tarotRitualCompleted}=loaded.exports;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),storage=new Map();
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}});
 const key='cd:yn:tarot-ritual:v1:saved-request';
 for(const stage of ['focus','shuffle','choose','reveal','reading']){
  const progress={stage,selected:[2,0,1],revealed:2,completed:stage==='reading'};
  saveRitual('saved-request',progress);assert.deepEqual(JSON.parse(storage.get(key)),progress);assert.deepEqual(storedRitual('saved-request'),progress);assert.equal(tarotRitualCompleted('saved-request'),stage==='reading');
 }
 for(const value of ['{','null',JSON.stringify({stage:'unknown',selected:[],revealed:0,completed:true}),JSON.stringify({stage:'reading',selected:null,revealed:0,completed:true})]){storage.set(key,value);assert.equal(storedRitual('saved-request'),null);assert.equal(tarotRitualCompleted('saved-request'),false);}
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('storage disabled');}});
 assert.equal(storedRitual('saved-request'),null);assert.equal(tarotRitualCompleted('saved-request'),false);assert.doesNotThrow(()=>saveRitual('saved-request',{stage:'reading',selected:[],revealed:3,completed:true}));
});
