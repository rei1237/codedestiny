import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {matchTossFlowers,flowerBirthInput} from '../../../worker/toss/flower.js';
import {matchDestinyFlower} from '../../../worker/lib/destiny-flower-engine.js';
const require=createRequire(import.meta.url),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..');
// The canonical Node ephemeris loader resolves bundled files from the repository root.
process.chdir(root);
const built=await build({entryPoints:[path.join(root,'worker/yeongnyangi/fortune/index.ts')],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const loaded=new Module(path.join(root,'toss-flower-test.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(built.outputFiles[0].text,loaded.id);
const {domains}=loaded.exports;
const birth={gender:'F',date:{year:1997,month:2,day:10,hour:14,minute:30,timeUnknown:false,calType:'solar'},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}};

test('flower uses the canonical saju chart and matcher, strips private profile',async()=>{
  const input=domains.saju.validateInput(flowerBirthInput(birth));
  const context=await domains.saju.calculate(input);
  const f=Object.fromEntries(context.facts.map(x=>[x.label,x.value]));
  const expected=matchDestinyFlower({birth:{year:1997,month:2,day:10,hour:14,minute:30},elementWeights:f.fiveElements.ratios,saju:{dayMaster:f.dayMaster}});
  const result=await matchTossFlowers({birth,sources:['saju']},{},domains);
  assert.equal(result.sources.saju.state,'ready');
  assert.deepEqual(result.sources.saju.flower,expected.flower);
  assert.equal(result.sources.saju.narrative,expected.narrative);
  assert.equal(result.sources.saju.profile,undefined);
  assert.equal(result.stored,false);
});
test('all four flower systems calculate with the existing offline engines',async()=>{
  const result=await matchTossFlowers({birth},{},domains);
  for(const [source,value] of Object.entries(result.sources))assert.equal(value.state,'ready',source+': '+value.code);
});
test('unknown birth time is not replaced with noon or a fabricated flower',async()=>{
  const unknown={...birth,date:{...birth.date,timeUnknown:true,hour:null,minute:null}};
  assert.equal(flowerBirthInput(unknown).personA.birthTime,undefined);
  const result=await matchTossFlowers({birth:unknown},{},domains);
  for(const value of Object.values(result.sources))assert.deepEqual(value,{state:'unavailable',code:'BIRTH_TIME_REQUIRED'});
});
test('one unavailable calculation does not hide completed flowers or leak error text',async()=>{
  const result=await matchTossFlowers({birth},{},{...domains,astrology:{validateInput:domains.astrology.validateInput,calculate:()=>{throw new Error('private upstream detail');}}});
  assert.equal(result.sources.saju.state,'ready');
  assert.deepEqual(result.sources.astrology,{state:'unavailable',code:'FLOWER_CHART_UNAVAILABLE'});
  assert.doesNotMatch(JSON.stringify(result),/private upstream detail/);
});
test('lunar input keeps leap selection for the canonical validator',()=>{
  const raw=flowerBirthInput({...birth,date:{...birth.date,calType:'lunar_leap'}});
  assert.equal(raw.personA.calendarType,'lunar');assert.equal(raw.personA.leapMonth,true);
});

// Manse shares the same canonical birth normalization and screen calculation.
test('manse projects canonical pillars and counts without private input or saved entitlement',async()=>{
 const {calculateTossManse}=await import('../../../worker/toss/manse.js');
 const context=await domains.saju.calculate(domains.saju.validateInput(flowerBirthInput(birth)));
 const facts=Object.fromEntries(context.facts.map(f=>[f.label,f.value]));
 const result=await calculateTossManse({birth},domains.saju);
 assert.equal(result.stored,false);
 assert.deepEqual(Object.fromEntries(result.pillars.map(p=>[p.key,p.ganji])),facts.pillars);
 assert.deepEqual(result.elements,facts.fiveElements.counts);
 assert.deepEqual(result.cycles,facts.majorLuck.cycles.filter(c=>typeof c.label==='string').map(c=>({label:c.label})));
 assert.ok(result.cycles.length>0);
 assert.equal(result.birth,undefined);assert.equal(result.profile,undefined);
 const unknown=await calculateTossManse({birth:{...birth,date:{...birth.date,timeUnknown:true,hour:null,minute:null}}},domains.saju);
 assert.equal(unknown.pillars.find(p=>p.key==='hour').ganji,null);assert.deepEqual(unknown.cycles,[]);
 await assert.rejects(calculateTossManse({birth:{...birth,date:{...birth.date,month:13}}},domains.saju));
});
