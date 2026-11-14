import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module} from 'node:module';
import path from 'node:path';
const state={epoch:0,saves:[],supported:true,change:false,file:{data:'SUQzBAAAAAAAAA==',fileName:'모의-음악-저장-검증.mp3',mimeType:'audio/mpeg'}};globalThis.__musicFile=state;
const file=path.resolve(import.meta.dirname,'../src/music-download-file.ts');
const result=await build({entryPoints:[file],bundle:true,format:'cjs',platform:'node',write:false,plugins:[{name:'mock-bridge',setup(b){b.onResolve({filter:/^(\.\/platform|@apps-in-toss\/web-framework)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path==='./platform'?`export const isToss=()=>true,getTossSessionRevision=()=>globalThis.__musicFile.epoch,api=async()=>{const s=globalThis.__musicFile;if(s.change)s.epoch++;return s.file;};`:`const saveBase64=async file=>globalThis.__musicFile.saves.push(file);saveBase64.isSupported=()=>globalThis.__musicFile.supported;export const File={saveBase64};`}));}}]});
const mod=new Module(file);mod._compile(result.outputFiles[0].text,file);const {saveMusicDownload}=mod.exports;
test('file adapter saves only through native bridge and rejects account change, unsupported bridge and unsafe filename',async()=>{
 await saveMusicDownload('a'.repeat(64));assert.equal(state.saves.length,1);assert.deepEqual(state.saves[0],state.file);
 state.change=true;await assert.rejects(saveMusicDownload('a'.repeat(64)),/SESSION_CHANGED/);state.change=false;
 state.supported=false;await assert.rejects(saveMusicDownload('a'.repeat(64)),/FILE_SAVE_NOT_SUPPORTED/);state.supported=true;
 state.file={...state.file,fileName:'../unsafe.mp3'};await assert.rejects(saveMusicDownload('a'.repeat(64)),/MUSIC_FILE_INVALID/);assert.equal(state.saves.length,1);
});
