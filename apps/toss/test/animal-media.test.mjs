import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module} from 'node:module';
import path from 'node:path';
const file=path.resolve(import.meta.dirname,'../src/animal-media.ts');
const compiled=await build({entryPoints:[file],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'animal-native-fixture',setup(b){
 b.onResolve({filter:/^(@apps-in-toss\/web-framework|html-to-image|\.\/platform|\.\/release)$/},a=>({path:a.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path==='./platform'?"export class ApiError extends Error{};export const isToss=()=>globalThis.animalMedia.native,APP_NAME='ai-saju-studio';":path==='./release'?'export const SERVICE_AVAILABLE=true;':path==='html-to-image'?'export const toPng=(...args)=>globalThis.animalMedia.render(...args);':'export const File={saveBase64:Object.assign((args)=>globalThis.animalMedia.saved.push(args),{isSupported:()=>globalThis.animalMedia.supported})},Share={createLink:async args=>{globalThis.animalMedia.links.push(args);return "public-test-link";},sendMessage:async args=>globalThis.animalMedia.messages.push(args)};'}));
}}]});
const mod=new Module(file);mod._compile(compiled.outputFiles[0].text,file);const {saveAnimalCard,shareAnimalCard}=mod.exports;
test('animal original card renders exact dimensions and exports through native adapters only',async()=>{
 const state=globalThis.animalMedia={native:true,supported:true,saved:[],links:[],messages:[],render:async(element,options)=>{assert.equal(element,'card');assert.deepEqual(options,{pixelRatio:2,cacheBust:true,width:1080,height:1920,style:{transform:'scale(1)',transformOrigin:'top left'}});return 'data:image/png;base64,AAAA';}};
 try{
  await saveAnimalCard('card');assert.deepEqual(state.saved,[{data:'AAAA',fileName:'code-destiny-animal-card.png',mimeType:'image/png'}]);
  await shareAnimalCard('구름 토끼','원본 공개 동물 이야기');assert.deepEqual(state.links,[{path:'intoss://ai-saju-studio/saju/animal-destiny?source=share'}]);assert.match(state.messages[0].message,/구름 토끼\n원본 공개 동물 이야기/);
  state.supported=false;await assert.rejects(saveAnimalCard('card'),/FILE_SAVE_NOT_SUPPORTED/);state.native=false;await assert.rejects(shareAnimalCard('구름 토끼','공개 이야기'),/TOSS_APP_REQUIRED/);assert.equal(state.saved.length,1);assert.equal(state.messages.length,1);
 }finally{delete globalThis.animalMedia;}
});
