import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..'),Module=createRequire(import.meta.url)('node:module');
const bundle=await build({stdin:{contents:"export {nativeKarmaContract,__karmaDestinyAiTestUtils} from './worker/routes/karma-destiny-ai.js';export {getBillingFeaturePricing} from './worker/lib/billing-feature-registry.js';",resolveDir:root},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['*.wasm']});
const loaded=new Module(path.join(root,'karma-contract-fixture.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {nativeKarmaContract,__karmaDestinyAiTestUtils,getBillingFeaturePricing}=loaded.exports;
const input={name:'검사',gender:'female',birthDate:'1993-07-21',birthTime:'09:00',calendarType:'solar',focusArea:'overall',question:'지금의 흐름',idempotencyKey:'test-attempt-0001'};

test('Toss karma contract retains the original normalized input and registry price',()=>{
 const original=__karmaDestinyAiTestUtils.normalizeConsultationInput(input),contract=nativeKarmaContract(input),price=getBillingFeaturePricing({featureKey:contract.featureKey}).pricing;
 assert.equal(original.ok,true);assert.equal(contract.featureKey,'karma-destiny-ai-consultation');assert.equal(contract.inputHash,original.inputHash);assert.equal(contract.pricing.amountKRW||contract.pricing.paymentAmount,price.amountKRW||price.paymentAmount);
 assert.notEqual(nativeKarmaContract({...input,question:'다른 질문'}).inputHash,contract.inputHash);assert.equal('birthInfo' in contract,false);assert.equal('question' in contract,false);
});
test('Toss karma contract retains unknown time and leap-month semantics',()=>{
 for(const variant of [{birthTime:'',birthTimeUnknown:true},{calendarType:'lunar',isLeapMonth:true}]){const source={...input,...variant};assert.equal(__karmaDestinyAiTestUtils.normalizeConsultationInput(source).ok,true);assert.equal(nativeKarmaContract(source).inputHash,__karmaDestinyAiTestUtils.normalizeConsultationInput(source).inputHash);}
 assert.notEqual(nativeKarmaContract({...input,calendarType:'lunar',isLeapMonth:true}).inputHash,nativeKarmaContract({...input,calendarType:'lunar',isLeapMonth:false}).inputHash);
});
test('Toss karma contract rejects invalid inputs and short request keys',()=>{
 for(const changes of [{birthDate:'not-a-date'},{idempotencyKey:'short'},{focusArea:'custom',question:''},{gender:''}])assert.throws(()=>nativeKarmaContract({...input,...changes}),e=>e.status===400);
});
