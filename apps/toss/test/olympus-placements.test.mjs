import '../../../scripts/lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import {Module} from 'node:module';
import {build} from 'esbuild';

const repo=path.resolve(import.meta.dirname,'../../..');
process.chdir(repo);
const bundled=await build({entryPoints:[path.join(repo,'worker/toss/olympus.js')],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.wasm':'binary'}});
const compiled=new Module(path.join(repo,'test-olympus.cjs'));compiled.paths=Module._nodeModulePaths(repo);compiled._compile(bundled.outputFiles[0].text,compiled.id);
const calculate=compiled.exports.olympusPlacements;
const clock={year:1990,month:5,day:15,hour:8,minute:30,lat:37.5665,lon:126.978,timezone:9};
test('Swiss seven planets and the ascendant match the Olympus sign and degree contract',async()=>{
 const result=await calculate(clock,{VEDIC_API_FORCE_EXTERNAL:'1',VEDIC_API_BASE_URL:'https://invalid.example'});
 assert.deepEqual(Object.keys(result.placements).sort(),['asc','jupiter','mars','mercury','moon','saturn','sun','venus']);
 assert.equal(result.placements.sun.key,'taurus');
 for(const point of Object.values(result.placements))assert.ok(Number.isFinite(point.deg)&&point.deg>=0&&point.deg<=30);
 const bridge=fs.readFileSync(path.join(repo,'js/olympus-oracle.js'),'utf8');
 const source=bridge.slice(bridge.indexOf('  var SIGN_KEYS'),bridge.indexOf('  function ensureSwissBridgeLoaded'));
 const normalize=vm.runInNewContext(source+'; lonToPlacement');
 for(const sign of [0,5,11]){
  const degree=12.24;
  const point={sign,degree};
  const mock=async()=>({engineQuality:'swiss',fallbackUsed:false,ascendant:point,planets:Object.fromEntries(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].map(key=>[key,point]))});
  const output=await calculate(clock,{},mock);
  assert.deepEqual(output.placements.asc,{...normalize(sign*30+degree)});
 }
 const newYork=await calculate({...clock,timeZone:'America/New_York'},{});const summerOffset=await calculate({...clock,timezone:-4},{});
 assert.deepEqual(newYork,summerOffset);
 const later=await calculate({...clock,hour:20},{});assert.notEqual(later.placements.asc.key,result.placements.asc.key);
 await assert.rejects(calculate({...clock,day:32},{}),error=>error.code==='BIRTH_INVALID');
 await assert.rejects(calculate(clock,{},async()=>({fallbackUsed:true})),error=>error.code==='CHART_UNAVAILABLE');
});
