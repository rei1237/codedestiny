import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {Module} from 'node:module';
import {build} from 'esbuild';

const repo=path.resolve(import.meta.dirname,'../../..');process.chdir(repo);
const bundle=await build({entryPoints:[path.join(repo,'worker/toss/basic-sky-chart.js')],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.wasm':'binary'}});
const m=new Module(path.join(repo,'test-basic-sky.cjs'));m.paths=Module._nodeModulePaths(repo);m._compile(bundle.outputFiles[0].text,m.id);
const calculate=m.exports.basicSkyChart;
const born=(month,day,calType,hour=8)=>({date:{year:2023,month,day,hour,minute:30,timeUnknown:false,calType},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}});
test('local Swiss birth charts distinguish tropical from sidereal and convert the same leap-month birth to the same sky',async()=>{
  const env={VEDIC_API_BASE_URL:'https://invalid.example',VEDIC_API_FORCE_EXTERNAL:'1',VEDIC_API_KEY:'fixture'};
  for(const system of ['astrology','vedic']){
    const solar=await calculate(system,{birth:born(3,22,'solar')},env);
    assert.deepEqual(solar,await calculate(system,{birth:born(2,1,'lunar_leap')},env));
    assert.equal(solar.positions.length,system==='vedic'?9:10);
    assert.ok(solar.positions.every(p=>p.house>=1&&p.house<=12));
    assert.equal(solar.positions.find(p=>p.name==='태양').sign,system==='vedic'?'물고기자리':'양자리');
    assert.equal(Boolean(solar.mansion),system==='vedic');
    assert.doesNotMatch(JSON.stringify(solar),/2023|서울|126\.978/);
  }
});
test('unknown times, nonexistent leap months and imprecise results cannot produce a public chart',async()=>{
  const missing=born(3,22,'solar');missing.date.timeUnknown=true;
  await assert.rejects(calculate('vedic',{birth:missing},{}),e=>e.code==='BIRTH_TIME_REQUIRED');
  await assert.rejects(calculate('astrology',{birth:born(3,1,'lunar_leap')},{}),e=>e.code==='BIRTH_INVALID');
  await assert.rejects(calculate('astrology',{birth:born(3,22,'solar')},{},{engines:{astrology:async()=>({fallbackUsed:true})}}),e=>e.code==='CHART_UNAVAILABLE');
});
