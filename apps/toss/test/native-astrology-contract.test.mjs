import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'../../..'),Module=createRequire(import.meta.url)('node:module');
const bundle=await build({stdin:{contents:"export {nativeAstrologyContract,__astrologyAiTestUtils} from './worker/routes/astrology-ai.js';export {getBillingFeaturePricing} from './worker/lib/billing-feature-registry.js';",resolveDir:root},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['*.wasm']});
const loaded=new Module(path.join(root,'astrology-contract-fixture.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {nativeAstrologyContract,__astrologyAiTestUtils,getBillingFeaturePricing}=loaded.exports;
const input={name:'검사',gender:'female',birthDate:'1993-07-21',birthTime:'09:00',birthPlace:{city:'서울',country:'KR',latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'},topic:'전체 차트 해석',userQuestion:'질문',idempotencyKey:'test-attempt-0001'};

test('Toss astrology intent freezes the original normalized input and registry price',()=>{
 const expected=__astrologyAiTestUtils.normalizeInput(input),contract=nativeAstrologyContract(input);
 assert.equal(expected.ok,true);assert.equal(contract.requestId,input.idempotencyKey);assert.equal(contract.resultId,input.idempotencyKey);
 assert.equal(contract.featureKey,'astrology-ai-consultation');assert.equal(contract.inputHash,expected.inputHash);
 assert.deepEqual(contract.pricing,getBillingFeaturePricing({featureKey:contract.featureKey}).pricing);
 assert.notEqual(nativeAstrologyContract({...input,userQuestion:'다른 질문'}).inputHash,contract.inputHash);
 assert.equal('birthInfo' in contract,false);assert.equal('userQuestion' in contract,false);
});

test('Toss astrology intent rejects invalid original input and short request identifiers',()=>{
 assert.throws(()=>nativeAstrologyContract({...input,birthDate:'not-a-date'}),e=>e.status===400);
 assert.throws(()=>nativeAstrologyContract({...input,idempotencyKey:'short'}),e=>e.status===400);
});

test('saved astrology lookup always scopes both identifiers to the verified owner',async()=>{
 const ts=createRequire(import.meta.url)('typescript'),file=path.join(root,'worker/routes/astrology-ai.js');
 const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const fn=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='nativeAstrologyStoredState');assert.ok(fn);
 let filter;const ctx=vm.createContext({String,withMongoRetry:async(_env,work)=>work(),AstrologyAiConsultation:{findOne:q=>{filter=q;return {lean:async()=>({id:'owned'})};}}});
 vm.runInContext(fn.getText(ast).replace(/^export /,''),ctx);
 assert.equal((await ctx.nativeAstrologyStoredState({},'owner','result')).id,'owned');
 assert.equal(filter.userId,'owner');assert.equal(filter.$or.length,2);assert.equal(filter.$or[0].id,'result');assert.equal(filter.$or[1].idempotencyKey,'result');
});
