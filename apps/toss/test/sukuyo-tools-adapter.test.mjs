import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {Module} from 'node:module';
import {build} from 'esbuild';
import {TOSS_SUKUYO_TOOLS} from '../../../lib/fortune/toss-sukuyo-tools.mjs';
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'worker/toss/sukuyo-tools.js')],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.wasm':'binary'}});
const compiled=new Module(path.join(root,'test-toss-sukuyo-tools.cjs'));compiled.paths=Module._nodeModulePaths(root);compiled._compile(bundle.outputFiles[0].text,compiled.id);
const read=compiled.exports.readTossSukuyoTool;
const input={birth:{date:'1990-02-03',calType:'solar',timeKnown:true,hour:8,minute:35},gender:'F',place:{name:'서울',longitude:126.978,latitude:37.5665,timezone:'Asia/Seoul'},partner:{date:'1991-04-05',calType:'solar',hour:12,minute:30,gender:'M'},encyclopedia:{userMansionIdx:7,userName:'모의',userMansion:'귀수'}};
test('five public Sukuyo tools forward original typed birth/pair/mansion data without account or purchase hints',async()=>{
 for(const featureKey of Object.keys(TOSS_SUKUYO_TOOLS)){const response=await read({...input,featureKey,profileId:'other',requestId:'paid-order',accessMethod:'pass'}, {},{handler:async req=>{const body=await req.json();assert.equal(req.headers.get('Authorization'),null);assert.equal(body.profileId,undefined);assert.equal(body.requestId,undefined);assert.equal(body.accessMethod,undefined);assert.deepEqual(body.partner,input.partner);assert.deepEqual(body.encyclopedia,input.encyclopedia);return new Response('original');}});assert.equal(await response.text(),'original');}
 await assert.rejects(()=>read({...input,featureKey:'sukuyo-past-life-reading'},{}),e=>e.code==='SECTION_NOT_PUBLIC');
 await assert.rejects(()=>read({...input,featureKey:'sukuyo-nature-deep-dive'},{},{publicTool:()=>false}),e=>e.code==='SECTION_NOT_PUBLIC');
});
test('original five deterministic Sukuyo builders return full body including precision and extreme-T adjuncts without network/DB',async()=>{
 for(const featureKey of Object.keys(TOSS_SUKUYO_TOOLS)){const response=await read({...input,featureKey},{});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.ok,true);assert.equal(result.featureKey,featureKey);assert.ok((result.html||result.precisionHtml)?.length>100);if(featureKey==='sukuyo-extreme-t-relationship'){assert.ok(result.sajuBaseHtml.length>100);assert.ok(result.prescriptionHtml.length>100);}}
});
test('encyclopedia derives the original natal mansion when the guest supplies birth instead of a saved profile',async()=>{
 const response=await read({...input,encyclopedia:undefined,featureKey:'sukuyo-relationship-encyclopedia'},{});const result=await response.json();assert.equal(response.status,200);assert.equal((result.html.match(/class="sy-dogam-entry(?: |")/g)||[]).length,27);assert.match(result.html,/data-sy-dogam-filter/);
});
