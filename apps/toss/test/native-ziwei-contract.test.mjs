import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..'),Module=createRequire(import.meta.url)('node:module');
const bundle=await build({stdin:{contents:"export {nativeZiweiContract,__ziweiAiTestUtils} from './worker/routes/ziwei-ai.js';export {getBillingFeaturePricing} from './worker/lib/billing-feature-registry.js';",resolveDir:root},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['*.wasm']});
const loaded=new Module(path.join(root,'ziwei-contract-fixture.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {nativeZiweiContract,__ziweiAiTestUtils,getBillingFeaturePricing}=loaded.exports;
const input={name:'검사',gender:'female',birthDate:'1993-07-21',birthTime:'09:00',calendarType:'solar',focusArea:'overall',question:'지금의 흐름',idempotencyKey:'test-attempt-0001'};
test('Toss Ziwei intent retains the original input hash and price registry',()=>{
 const original=__ziweiAiTestUtils.normalizeConsultationInput(input),contract=nativeZiweiContract(input),price=getBillingFeaturePricing({featureKey:contract.featureKey}).pricing;
 assert.equal(original.ok,true);assert.equal(contract.featureKey,'ziwei-ai-consultation');assert.equal(contract.inputHash,original.inputHash);assert.equal(contract.pricing.amountKRW,price.amountKRW||price.paymentAmount);assert.equal(contract.pricing.paymentAmount,contract.pricing.amountKRW);assert.notEqual(nativeZiweiContract({...input,question:'다른 질문'}).inputHash,contract.inputHash);assert.equal('birthInfo' in contract,false);assert.equal('question' in contract,false);
});
test('Toss Ziwei intent preserves original unknown-time and lunar leap input',()=>{
 for(const variant of [{birthTime:'',birthTimeUnknown:true},{calendarType:'lunar',isLeapMonth:true}]){const source={...input,...variant};assert.equal(__ziweiAiTestUtils.normalizeConsultationInput(source).ok,true);assert.equal(nativeZiweiContract(source).inputHash,__ziweiAiTestUtils.normalizeConsultationInput(source).inputHash);}
});
test('Toss Ziwei intent rejects invalid inputs and short request keys',()=>{
 assert.throws(()=>nativeZiweiContract({...input,birthDate:'not-a-date'}),e=>e.status===400);assert.throws(()=>nativeZiweiContract({...input,idempotencyKey:'short'}),e=>e.status===400);
});
