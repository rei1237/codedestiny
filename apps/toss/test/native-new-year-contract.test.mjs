import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..'),Module=createRequire(import.meta.url)('node:module');
const bundle=await build({stdin:{contents:"export {nativeNewYearContract,__newYearAiTestUtils} from './worker/routes/new-year-ai.js';export {getBillingFeaturePricing} from './worker/lib/billing-feature-registry.js';",resolveDir:root},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['*.wasm']});
const loaded=new Module(path.join(root,'new-year-contract-fixture.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {nativeNewYearContract,__newYearAiTestUtils,getBillingFeaturePricing}=loaded.exports;
const input={targetYear:2026,name:'검사',gender:'female',birthDate:'1993-07-21',birthTime:'09:00',calendarType:'solar',focusArea:'overall',question:'지금의 흐름',idempotencyKey:'test-attempt-0001'};

test('Toss new year contract retains the original normalized input hash and price registry',()=>{
 const original=__newYearAiTestUtils.normalizeConsultationInput(input),contract=nativeNewYearContract(input),price=getBillingFeaturePricing({featureKey:contract.featureKey}).pricing;
 assert.equal(original.ok,true);assert.equal(contract.featureKey,'new-year-ai-consultation');assert.equal(contract.inputHash,original.inputHash);assert.equal(contract.pricing.amountKRW||contract.pricing.paymentAmount,price.amountKRW||price.paymentAmount);assert.notEqual(nativeNewYearContract({...input,targetYear:2027}).inputHash,contract.inputHash);assert.equal('birthInfo' in contract,false);assert.equal('question' in contract,false);
});
test('Toss new year contract preserves unknown time and valid lunar input',()=>{
 for(const variant of [{birthTime:'',birthTimeUnknown:true},{calendarType:'lunar',isLeapMonth:false}]){const source={...input,...variant};assert.equal(__newYearAiTestUtils.normalizeConsultationInput(source).ok,true);assert.equal(nativeNewYearContract(source).inputHash,__newYearAiTestUtils.normalizeConsultationInput(source).inputHash);}
});
test('Toss new year contract rejects invalid inputs and short request keys',()=>{
 for(const changes of [{birthDate:'not-a-date'},{targetYear:''},{idempotencyKey:'short'},{focusArea:'custom',question:''}])assert.throws(()=>nativeNewYearContract({...input,...changes}),e=>e.status===400);
});
