import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module} from 'node:module';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'worker/toss/astro-chart.js')],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.wasm':'binary'}});
const compiled=new Module(path.join(root,'test-toss-astro-chart.cjs'));compiled.paths=Module._nodeModulePaths(root);compiled._compile(bundle.outputFiles[0].text,compiled.id);
const read=compiled.exports.readTossAstroChart;
const birth={date:{year:1990,month:2,day:3,hour:8,minute:35,timeUnknown:false,calType:'solar'},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}};
test('public western wheel reuses full original calculation without authentication or payment',async()=>{
 const response=await read({birth,profileId:'other',orderId:'not-authority'},{});assert.equal(response.status,200);const result=await response.json();assert.equal(result.ok,true);assert.ok(result.planets.length>=10);assert.equal(result.houses.length,12);assert.ok(result.aspects.length>0);assert.equal(result.birth.time,'08:35');assert.ok(Number.isFinite(result.angles.ascendant.longitude));assert.equal(result.birth.profileId,undefined);
});
test('unknown birth time passes noon to original chart while malformed births fail closed',async()=>{
 await read({birth:{...birth,date:{...birth.date,timeUnknown:true,hour:null,minute:null}}},{},{handler:async request=>{assert.equal(request.headers.get('Authorization'),null);const input=await request.json();assert.equal(input.time,'12:00');assert.equal(input.date,'1990-02-03');return new Response('{}');}});
 await assert.rejects(read({birth:{...birth,date:{...birth.date,month:13}}},{}),e=>e.code==='BIRTH_INVALID');
});
