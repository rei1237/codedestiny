import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module} from 'node:module';
import path from 'node:path';
import {TOSS_ASTRO_SECTIONS} from '../../../lib/fortune/toss-astro-sections.mjs';
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'worker/toss/astro-section.js')],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.wasm':'binary'}});
const compiled=new Module(path.join(root,'test-toss-astro-section.cjs'));compiled.paths=Module._nodeModulePaths(root);compiled._compile(bundle.outputFiles[0].text,compiled.id);
const read=compiled.exports.readTossAstroSection;
const birth={date:{year:2023,month:2,day:1,hour:8,minute:30,timeUnknown:false,calType:'lunar_leap'},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}};
test('ten original public astrology sections reuse web handlers and strip all account/payment hints',async()=>{
 for(const key of Object.keys(TOSS_ASTRO_SECTIONS)){let called='';const handle=name=>async(request)=>{called=name;assert.equal(request.headers.get('Authorization'),null);const input=await request.json();assert.equal(input.featureKey,key);assert.equal(input.date,'2023-03-22');assert.equal(input.time,'08:30');assert.equal(input.timeKnown,true);assert.equal(input.timezone,9);assert.equal(input.profileId,undefined);assert.equal(input.orderId,undefined);return new Response('original');};const response=await read({birth,featureKey:key,profileId:'other-account',orderId:'web-order'}, {},{basic:handle('basic'),section:handle('section')});assert.equal(await response.text(),'original');assert.equal(called,key==='astro_basic_deep_pack'?'basic':'section');}
});
test('unsupported products cannot enter a public handler; unknown times preserve the original limited reading',async()=>{
 await assert.rejects(read({birth,featureKey:'astrology-ai-consultation'},{}),error=>error.code==='SECTION_NOT_PUBLIC');
 await assert.rejects(read({birth,featureKey:'astro_basic_deep_pack'},{},{publicSection:()=>false}),error=>error.code==='SECTION_NOT_PUBLIC');
 await read({birth:{...birth,date:{...birth.date,timeUnknown:true,hour:null,minute:null}},featureKey:'astro_basic_deep_pack'},{},{basic:async(request)=>{const input=await request.json();assert.equal(input.timeKnown,false);assert.equal(input.time,'12:00');return new Response('limited');}});
});
