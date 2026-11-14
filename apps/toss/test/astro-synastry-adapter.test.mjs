import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module} from 'node:module';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'worker/toss/astro-synastry.js')],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.wasm':'binary'}});
const compiled=new Module(path.join(root,'test-toss-astro-synastry.cjs'));compiled.paths=Module._nodeModulePaths(root);compiled._compile(bundle.outputFiles[0].text,compiled.id);
const read=compiled.exports.tossAstroSynastry;
const birth={date:{year:2023,month:2,day:1,hour:8,minute:30,timeUnknown:false,calType:'lunar_leap'},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'},gender:'F'};
test('public original synastry normalizes both calendars and never forwards purchase or account hints',async()=>{
 for(const featureKey of ['compat-astro-synastry','compat-astro-direct-synastry']){
  const response=await read({birth,featureKey,profileId:'other',orderId:'paid',celeb:{name:'원본 목록',birth:'1990-01-01',chart:{}},partner:{name:'상대',birth:{...birth,date:{...birth.date,timeUnknown:true,hour:null,minute:null}}}},{},{handler:async request=>{
   const body=await request.json();assert.equal(body.date,'2023-03-22');assert.equal(body.time,'08:30');assert.equal(body.timezone,9);assert.equal(body.profileId,undefined);assert.equal(body.orderId,undefined);assert.equal(request.headers.get('Authorization'),null);
   if(body.partner){assert.equal(body.partner.date,'2023-03-22');assert.equal(body.partner.time,'12:00');assert.equal(body.partner.gender,'F');assert.equal(body.partner.tzOffsetHours,9);}else assert.deepEqual(body.celeb,{name:'원본 목록',birth:'1990-01-01'});
   return new Response('original');
  }});assert.equal(await response.text(),'original');
 }
});
test('private or disabled products cannot fall through to the original paid branch',async()=>{
 await assert.rejects(read({birth,featureKey:'astrology-ai-consultation'},{}),error=>error.code==='SECTION_NOT_PUBLIC');
 await assert.rejects(read({birth,featureKey:'compat-astro-synastry'},{},{free:()=>false}),error=>error.code==='SECTION_NOT_PUBLIC');
 await assert.rejects(read({birth:null,featureKey:'compat-astro-synastry'},{}),error=>error.code==='BIRTH_INVALID');
});
