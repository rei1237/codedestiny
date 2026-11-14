import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {Module} from 'node:module';
import {build} from 'esbuild';
import {vedicReadingModule} from '../canonical/vedic-reading.mjs';
import {buildOriginalVedicReading,vedicSourceBridge} from '../service/vedic-source-bridge.mjs';
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'worker/toss/vedic-reading.js')],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.wasm':'binary'}});
const compiled=new Module(path.join(root,'test-vedic-reader.cjs'));compiled.paths=Module._nodeModulePaths(root);compiled._compile(bundle.outputFiles[0].text,compiled.id);
const prepare=compiled.exports.tossVedicReading;
const {createVedicReader}=await import('data:text/javascript;base64,'+Buffer.from(vedicReadingModule({factory:true})+'\n//# sourceURL=vedic-reading-factory.js').toString('base64'));
const birth={gender:'F',date:{year:1990,month:2,day:3,hour:8,minute:35,timeUnknown:false,calType:'solar'},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}};
test('strict local Swiss samples feed the original full Vedic reader with no approximate fallback',async()=>{
 const payload=await prepare({birth},{VEDIC_API_BASE_URL:'https://invalid.example',VEDIC_API_FORCE_EXTERNAL:'1'});
 assert.equal(payload.stored,false);assert.equal(payload.samples.length,3);assert.ok(payload.natal.providerVersion);
 const reading=buildOriginalVedicReading(createVedicReader,payload);
 assert.equal(Object.keys(reading.sections).length,7);assert.ok(reading.deep.partner);assert.ok(reading.south.includes('grid-template-columns:repeat(4,1fr)'));assert.ok(reading.north.includes('<svg'));
 assert.equal(reading.chart.f.gender,'F');assert.ok(reading.chart.nak.pada>=1&&reading.chart.nak.pada<=4);
 assert.throws(()=>vedicSourceBridge(payload.samples.map(row=>({...row,fallbackUsed:true}))),/VEDIC_SOURCE_INVALID/);
 assert.throws(()=>buildOriginalVedicReading(createVedicReader,{...payload,samples:payload.samples.map(row=>({...row,jd:row.jd+3}))}),/VEDIC_SOURCE_DATE_MISSING/);
});
test('free policy and birth boundaries fail closed without payment or database access',async()=>{
 await assert.rejects(prepare({birth},{},{free:()=>false}),error=>error.code==='TOSS_PRODUCT_NOT_APPROVED');
 await assert.rejects(prepare({birth:{...birth,gender:'OTHER'}},{}),error=>error.code==='BIRTH_GENDER_REQUIRED');
 await assert.rejects(prepare({birth:{...birth,date:{...birth.date,timeUnknown:true}}},{}),error=>error.code==='BIRTH_TIME_REQUIRED');
 await assert.rejects(prepare({birth},{},{engine:async()=>({engineQuality:'fallback',fallbackUsed:true})}),error=>error.code==='CHART_UNAVAILABLE');
});
