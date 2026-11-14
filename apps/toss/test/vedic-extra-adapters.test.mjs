import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {Module} from 'node:module';
import {build} from 'esbuild';
const root=path.resolve(import.meta.dirname,'../../..');process.chdir(root);
const bundle=await build({stdin:{contents:"export * from './worker/toss/vedic-compatibility.js';export * from './worker/toss/vedic-prashna.js';export * from './worker/lib/vedic-prashna-prompt.js';",resolveDir:root},bundle:true,write:false,platform:'node',format:'cjs',loader:{'.wasm':'binary'}});
const compiled=new Module(path.join(root,'test-vedic-extra.cjs'));compiled.paths=Module._nodeModulePaths(root);compiled._compile(bundle.outputFiles[0].text,compiled.id);
const {tossVedicCompatibility:pair,tossVedicPrashna:prashna,createPrashnaSnapshot,generatePrashnaPromptResult}=compiled.exports;
const auth={ownerId:'owner-a'},birth={gender:'F',date:{year:1990,month:2,day:3,hour:8,minute:35,timeUnknown:false,calType:'solar'},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}};
test('free Vedic pair and standalone question both retain mandatory login and disabled-policy boundaries',async()=>{
 for(const read of [pair,prashna]){await assert.rejects(read({},null,{}),error=>error.code==='LOGIN_REQUIRED');await assert.rejects(read({},auth,{}, {free:()=>false}),error=>error.code==='TOSS_PRODUCT_NOT_APPROVED');}
});
test('Vedic pair prepares both original strict calculations without forwarding any account or purchase fields',async()=>{
 const bodies=[];const result=await pair({},auth,{birth,name:'나',profileId:'foreign',orderId:'old',partner:{birth,name:'상대',profileId:'foreign'}},{reading:async body=>{bodies.push(body);return {input:body};}});
 assert.deepEqual(bodies,[{birth,name:'나'},{birth,name:'상대'}]);assert.equal(result.featureKey,'vedic-compatibility-per-use');assert.equal(result.stored,false);assert.equal(result.accessSource,'public');
 const actual=await pair({},auth,{birth,partner:{birth}},{requestUrl:''});assert.equal(actual.mine.samples.length,3);assert.equal(actual.partner.samples.length,3);assert.ok(actual.mine.samples.every(sample=>sample.engineQuality==='swiss'&&!sample.fallbackUsed));
});
test('standalone Prashna retains original single-question validation and captures only server time',async()=>{
 for(const [question,code] of [['짧음','AMBIGUOUS_QUESTION'],['계약을 해야 하나요? 이직을 해야 하나요?','MULTIPLE_QUESTIONS'],['x'.repeat(601),'QUESTION_TOO_LONG']])await assert.rejects(prashna({},auth,{question,latitude:37.5665,longitude:126.978}),error=>error.code===code);
 let captured;const response=await prashna({},auth,{question:'이 계약을 이번 달 안에 진행하는 것이 유리할까?',latitude:37.5665,longitude:126.978,now:'1900-01-01',orderId:'foreign',snapshotHash:'forged'},{requestUrl:'',snapshot:async input=>{assert.deepEqual(Object.keys(input),['question','latitude','longitude']);captured=await createPrashnaSnapshot({...input,now:new Date('2026-11-14T00:00:00.000Z')});return captured;}});
 const expected=await generatePrashnaPromptResult({},captured,{requestUrl:''});assert.equal(response.promptText,expected.promptText);assert.ok(Number.isFinite(Date.parse(response.chart.calculatedAt)));assert.deepEqual({...response.chart,calculatedAt:null},{...expected.chart,calculatedAt:null});assert.equal(response.snapshot.timezone,'Asia/Seoul');assert.equal(response.snapshot.capturedAtUtc,'2026-11-14T00:00:00.000Z');assert.equal(response.accessSource,'public');assert.equal(response.featureKey,'vedic_prashna_prompt');assert.notEqual(response.snapshot.orderId,'foreign');
});
