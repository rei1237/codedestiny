import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {calculateTossSukuyoBasic} from '../../../worker/toss/sukuyo-basic.js';
import {buildSukuyoFromMoonLongitude} from '../../../worker/lib/sukuyo-coordinate.js';
import {TossError} from '../../../worker/toss/policy.js';
const require=createRequire(import.meta.url),Module=require('node:module'),root=path.resolve(import.meta.dirname,'../../..');
process.chdir(root);
const bundled=await build({entryPoints:[path.join(root,'worker/yeongnyangi/fortune/index.ts')],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const loaded=new Module(path.join(root,'toss-sukuyo-basic-test.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundled.outputFiles[0].text,loaded.id);
const engine=loaded.exports.domains.sukuyo;
const birth={gender:'F',date:{year:1997,month:2,day:10,hour:14,minute:30,timeUnknown:false,calType:'solar'},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}};
const env={testMarker:'offline'};
test('free Sukuyo uses the real offline domain and returns no paid or birth fields',async()=>{
 let options;const observed={...engine,calculate:(input,received)=>{options=received;return engine.calculate(input,received);}};
 const result=await calculateTossSukuyoBasic({birth},env,observed);
 assert.equal(options.runtimeEnv,env);assert.equal(result.stored,false);assert.match(result.mansion,/\(.+\)/);
 assert.deepEqual(Object.keys(result.reading).sort(),['dailyPrescription','guardian','hero','relationMiniMap','summaryCards']);
 assert.deepEqual(Object.keys(result.canonical).sort(),['lunarPhase','natalSukuyo','sukuyoAttributes','validation']);
 assert.doesNotMatch(JSON.stringify(result),/1997|37\.5665|126\.978|offline|moonProfile|loveProfile|workMoney|emotionRhythm/);
});
test('all 27 canonical lunar sectors produce their matching free dashboard',async()=>{
 for(let i=0;i<27;i++){
  const moon=(i+.5)*360/27,index=buildSukuyoFromMoonLongitude(moon).index;
  const fake={validateInput:raw=>({...raw,personA:{...raw.personA,birthDate:'1997-02-10'}}),calculate:async()=>({engineVersion:'fixture',limitations:[],facts:[{label:'personA',value:{index,moonEclipticLongitude:moon}}]})};
  const result=await calculateTossSukuyoBasic({birth},env,fake);assert.equal(result.mansionIdx,index);assert.equal(result.canonical.natalSukuyo.index,index);assert.equal(result.reading.summaryCards.length,4);
 }
});
test('unknown time, mismatched chart and permission failures never produce a reading',async()=>{
 const unknown={...birth,date:{...birth.date,timeUnknown:true,hour:null,minute:null}};
 await assert.rejects(calculateTossSukuyoBasic({birth:unknown},env,engine),error=>error.code==='BIRTH_TIME_REQUIRED');
 const fake={validateInput:raw=>raw,calculate:async()=>({facts:[{label:'personA',value:{index:0,moonEclipticLongitude:15}}]})};
 await assert.rejects(calculateTossSukuyoBasic({birth},env,fake),error=>error.code==='SUKUYO_CHART_UNAVAILABLE');
 const denied={...engine,calculate:async()=>{throw new TossError('ACCESS_DENIED',403);}};
 await assert.rejects(calculateTossSukuyoBasic({birth},env,denied),error=>error.status===403&&error.code==='ACCESS_DENIED');
  const sdkDenied={...engine,calculate:async()=>{throw {code:'ACCESS_DENIED',status:403};}};
  await assert.rejects(calculateTossSukuyoBasic({birth},env,sdkDenied),error=>error instanceof TossError&&error.status===403&&error.code==='ACCESS_DENIED');
});
