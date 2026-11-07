import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module'),repo=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({stdin:{contents:"export * from './worker/toss/maya-contract.js';export {assertNativeIntent} from './worker/toss/native-consultation.js';export {getBillingFeaturePricing} from './worker/lib/billing-feature-registry.js';",resolveDir:repo,loader:'js'},bundle:true,write:false,platform:'node',format:'cjs',alias:{'@':repo}});
const loaded=new Module(path.join(repo,'maya-contract-fixture.cjs'));loaded.paths=Module._nodeModulePaths(repo);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {mayaContract,normalizeMayaInput,buildMayaPrompt,assertNativeIntent,getBillingFeaturePricing}=loaded.exports;
const input={requestId:'eafba72c-d2fe-4b76-bbc5-17fc7101ccfe',year:2024,month:2,day:29,name:'연이',birthDate:'1990-01-02',topic:'연애운',question:'관계에서 무엇을 살펴볼까요?'};

test('Maya input and price come from the original calculator and server registry',async()=>{
 const {input:normalized,contract}=await mayaContract({...input,amountKRW:1,prompt:'client forged',longCount:'forged'});
 assert.deepEqual(normalized,input);assert.equal(contract.featureKey,'maya-prompt-generator');assert.equal(contract.pricing.amountKRW,getBillingFeaturePricing({featureKey:contract.featureKey}).pricing.amountKRW);
 assert.equal(contract.pricing.billingType,'per_use');assert.match(contract.inputHash,/^[a-f0-9]{64}$/);assert.match(contract.resultId,/^maya_[a-f0-9]{64}$/);
 const prompt=buildMayaPrompt(normalized);assert.match(prompt,/2024년 2월 29일/);assert.match(prompt,/관계에서 무엇을 살펴볼까요/);assert.doesNotMatch(prompt,/client forged|Long Count: forged/);
});

test('one purchase attempt cannot silently change the question or calendar date',async()=>{
 const first=await mayaContract(input),changed=await mayaContract({...input,question:'다른 질문'}),otherDate=await mayaContract({...input,day:28});
 assert.equal(first.contract.resultId,changed.contract.resultId);assert.notEqual(first.contract.inputHash,changed.contract.inputHash);assert.notEqual(first.contract.inputHash,otherDate.contract.inputHash);
 const auth={_id:'identity',ownerId:'owner',environment:'SANDBOX'},row={...first.contract,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,status:'prepared'};
 assert.doesNotThrow(()=>assertNativeIntent(row,auth,first.contract));assert.throws(()=>assertNativeIntent(row,auth,changed.contract),error=>error.code==='REQUEST_INPUT_MISMATCH'&&error.status===409);
 assert.throws(()=>assertNativeIntent(row,{...auth,ownerId:'another'},first.contract),error=>error.code==='RESULT_NOT_FOUND'&&error.status===404);
});

test('invalid dates, input length, topic and request identifiers fail before a price or result is prepared',()=>{
 for(const value of [{...input,day:30},{...input,year:10000},{...input,birthDate:'2023-02-29'},{...input,topic:'unsupported'},{...input,question:'x'.repeat(3001)},{...input,name:'bad\u0000name'},{...input,requestId:'not-a-uuid'}])
  assert.throws(()=>normalizeMayaInput(value),error=>error.code==='MAYA_INPUT_INVALID'&&error.status===400);
});
