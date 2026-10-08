import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
async function adapter({toss=true,supported=true,live=true}={}){
 const calls=[];
 const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../src/media.ts')],bundle:true,write:false,format:'cjs',platform:'node',plugins:[{name:'test-platform',setup(build){
  build.onResolve({filter:/^(@apps-in-toss\/web-framework|\.\/platform|\.\/release)$/},args=>({path:args.path,namespace:'test'}));
  build.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='./platform'?`export const APP_NAME='ai-saju-studio'; export const isToss=()=>${toss};export class ApiError extends Error{constructor(code){super(code);this.code=code;}}`:args.path==='./release'?`export const SERVICE_AVAILABLE=${live};`:`const record=(...args)=>globalThis.mediaCalls.push(args);export const File={saveBase64:Object.assign(async p=>record('save',p),{isSupported:()=>${supported}})};export const Share={createLink:async p=>{record('link',p);return 'https://toss.test/link';},sendMessage:async p=>record('share',p)};`,loader:'js'}));
 }}]});
 const loaded=new Module('media-check.cjs');loaded._compile(bundle.outputFiles[0].text,loaded.id);
 // Test-only SDK recording; the production source never accesses this global.
 globalThis.mediaCalls=calls;
 return {api:loaded.exports,calls};
}
test('image save uses supported native API with bare PNG base64 and fixed nonpersonal filename',async()=>{
 const {api,calls}=await adapter();await api.saveCardPng('data:image/png;base64,aGVsbG8=');
 assert.deepEqual(calls,[['save',{data:'aGVsbG8=',fileName:'code-destiny-bias-card.png',mimeType:'image/png'}]]);
 await assert.rejects(api.saveCardPng('data:image/svg+xml;base64,aGVsbG8='),/CARD_IMAGE_INVALID/);
});
test('unsupported version or browser cannot pretend a save succeeded',async()=>{
 for(const options of [{toss:false},{supported:false}]){const {api,calls}=await adapter(options);await assert.rejects(api.saveCardPng('data:image/png;base64,aGVsbG8='));assert.deepEqual(calls,[]);}
});
test('share points at the public miniapp feature and never puts a summary in its URL',async()=>{
 const {api,calls}=await adapter();await api.shareBiasSummary('선택한 요약');
 assert.deepEqual(calls[0],['link',{path:'intoss://ai-saju-studio/bias?source=share'}]);
 assert.ok(calls[1][1].message.includes('선택한 요약'));assert.ok(calls[1][1].message.includes('https://toss.test/link'));
});
test('preview build cannot publish a misleading operational link',async()=>{
 const {api,calls}=await adapter({live:false});await assert.rejects(api.shareBiasSummary('요약'),/TOSS_RELEASE_PENDING/);assert.deepEqual(calls,[]);
});
test('tarot save and share keep private result identifiers out of native paths',async()=>{
 const {api,calls}=await adapter();await api.saveTarotResultCardPng('data:image/png;base64,aGVsbG8=');
 assert.deepEqual(calls[0],['save',{data:'aGVsbG8=',fileName:'code-destiny-tarot-card.png',mimeType:'image/png'}]);
 await api.shareTarotResultSummary('타로 리딩','카드가 비춘 흐름');
 assert.deepEqual(calls[1],['link',{path:'intoss://ai-saju-studio/tarot-library?source=share'}]);
 assert.ok(calls[2][1].message.includes('카드가 비춘 흐름'));
 assert.ok(!calls[1][1].path.includes('orderId'));
 assert.ok(!calls[1][1].path.includes('resultId'));
});
