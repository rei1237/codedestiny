import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module} from 'node:module';
import path from 'node:path';
const file=path.resolve(import.meta.dirname,'../private-simulation/sdk.mjs');
const out=await build({entryPoints:[file],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'isolated-catalog',setup(b){
 b.onResolve({filter:/^(\.\/api\.mjs|\.\/storage\.mjs|virtual:toss-music-shelf)$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='./api.mjs'?'export const sdkProducts=[];':path==='./storage.mjs'?"export const person='A';":'export default [];'}));
}}]});
const mod=new Module(file);mod._compile(out.outputFiles[0].text,file);const {File}=mod.exports;
test('private file SDK records exact synthetic MP3 locally and rejects all real exports',async()=>{
 const values=new Map(),writes=[];globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>{writes.push(key);values.set(key,value);}};
 const synthetic={data:'SUQzBAAAAAAAAA==',mimeType:'audio/mpeg',fileName:'모의-음악-저장-검증.mp3'};
 assert.equal(File.saveBase64.isSupported(),true);assert.deepEqual(Object.keys(File),['saveBase64']);
 await File.saveBase64(synthetic);
 assert.deepEqual(JSON.parse(values.get('private-file-saves')),[{...synthetic,simulated:true}]);
 for(const invalid of [undefined,{...synthetic,data:'//uQxAAA'},{...synthetic,mimeType:'application/pdf'},{...synthetic,fileName:'실제음악.mp3'},{...synthetic,fileName:'../모의-음악-저장-검증.mp3'}])await assert.rejects(File.saveBase64(invalid),/PRIVATE_SIMULATION_UNAVAILABLE/);
 assert.deepEqual(writes,['private-file-saves']);assert.equal(values.size,1);assert.equal(JSON.parse(values.get('private-file-saves')).length,1);
 delete globalThis.localStorage;
});
