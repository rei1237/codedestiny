import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {calculateTossHumanDesign} from '../../../worker/toss/human-design.js';
import {calculateHumanDesignChart} from '../../../worker/lib/human-design-ephemeris.js';

const env={CD_MOCK_TESTS:'true'},birth={birthDate:'1990-05-15',birthTime:'08:30',timezone:'Asia/Seoul',calendar:'solar'};
test('free Toss chart uses the original calculation and omits birth details',async()=>{
  const expected=await calculateHumanDesignChart(env,birth,{}),actual=await calculateTossHumanDesign({birth},env);
  assert.equal(actual.stored,false);assert.deepEqual(actual.chart,{...expected,birthInput:null,moments:null});
  assert.equal(actual.chart.activations.length,26);assert.doesNotMatch(JSON.stringify(actual),/1990-05-15|08:30|Asia\/Seoul/);
  assert.equal(actual.interpretation,undefined);assert.equal(actual.report,undefined);
});
test('lunar and leap-lunar dates use the original conversion',async()=>{
  for(const [calendar,solarDate] of [['lunar','2020-04-23'],['lunar-leap','2020-05-23']]){
    const lunar=await calculateTossHumanDesign({birth:{...birth,birthDate:'2020-04-01',calendar}},env);
    const solar=await calculateTossHumanDesign({birth:{...birth,birthDate:solarDate}},env);
    assert.deepEqual(lunar.chart.activations,solar.chart.activations);
  }
});
test('invalid dates, times, zones and nonexistent leap months never reach the engine',async()=>{
  for(const invalid of [{birthDate:'2021-02-29'},{birthTime:'24:00'},{timezone:'Invalid/Zone'},{birthDate:'2021-04-01',calendar:'lunar-leap'},{calendar:'unknown'}]){
    let calls=0;await assert.rejects(calculateTossHumanDesign({birth:{...birth,...invalid}},env,()=>{calls++;}),error=>error.code==='BIRTH_INVALID');assert.equal(calls,0);
  }
});
test('engine permissions stay distinct and broken output is rejected',async()=>{
  await assert.rejects(calculateTossHumanDesign({birth},env,async()=>{throw {status:403,code:'ACCESS_DENIED'};}),error=>error.status===403&&error.code==='ACCESS_DENIED');
  await assert.rejects(calculateTossHumanDesign({birth},env,async()=>({})),error=>error.status===503&&error.code==='HUMAN_DESIGN_UNAVAILABLE');
});
test('real local ephemeris matches an independently recorded chart without external access',async()=>{
  const root=path.resolve(import.meta.dirname,'../../..');process.chdir(root);
  const fixture=JSON.parse(await readFile(path.join(root,'__tests__/fixtures/human-design/cases.json'),'utf8')).cases[0];
  const server=http.createServer(async(req,res)=>{try{const name=path.basename(new URL(req.url,'http://localhost').pathname);const bytes=await readFile(path.join(root,'public/ephe',name));res.writeHead(200,{'content-type':'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404).end();}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  try{
    const input={...fixture.birth};delete input.latitude;delete input.longitude;
    const result=await calculateTossHumanDesign({birth:input},{CD_MOCK_TESTS:'false',SWISS_EPHE_BASE_URL:`http://127.0.0.1:${server.address().port}/ephe/`});
    assert.equal(result.chart.profile,fixture.expected.profile);assert.equal(result.chart.type,'TYPE_MANIFESTING_GENERATOR');assert.equal(result.chart.authority,'AUTHORITY_SACRAL');
    for(const layer of ['personality','design'])for(const activation of result.chart.layers[layer]){const expected=fixture.expected[layer][activation.planet];assert.ok(expected,`${layer} ${activation.planet}`);assert.equal(activation.gate,expected.gate,`${layer} ${activation.planet} gate`);assert.equal(activation.line,expected.line,`${layer} ${activation.planet} line`);}
    assert.equal(result.chart.birthInput,null);assert.equal(result.chart.moments,null);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
