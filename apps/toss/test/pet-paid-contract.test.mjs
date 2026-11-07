import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module'),repo=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({stdin:{contents:"export * from './worker/toss/pet-paid-contract.js';export {getBillingFeaturePricing} from './worker/lib/billing-feature-registry.js';export {assertNativeIntent} from './worker/toss/native-consultation.js';",resolveDir:repo,loader:'js'},bundle:true,write:false,platform:'node',format:'cjs',alias:{'@':repo}});
const loaded=new Module(path.join(repo,'pet-paid-contract-fixture.cjs'));loaded.paths=Module._nodeModulePaths(repo);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {tossPetPaidContract,getBillingFeaturePricing,assertNativeIntent}=loaded.exports;
const pet={name:'나비',species:'cat',breed:'generic',birthDate:'2020-01-01',birthTimeUnknown:true},other={...pet,name:'달이',birthDate:'2021-02-02'};
const requestId='eafba72c-d2fe-4b76-bbc5-17fc7101ccfe';
const input=kind=>kind==='report'?{requestId,kind,pet}:{requestId,kind,petA:pet,petB:other};
const date='2026-11-07';

test('both paid pet products use the existing registry and a server-selected calculation date',async()=>{
 for(const [kind,featureKey] of [['report','pet-saju-ai-consultation'],['compat','pet-compatibility-ai']]){
  const value=await tossPetPaidContract(input(kind),{today:date});
  assert.equal(value.input.date,date);assert.equal(value.contract.featureKey,featureKey);
  assert.equal(value.contract.pricing.amountKRW,getBillingFeaturePricing({featureKey}).pricing.amountKRW);
  assert.equal(value.contract.pricing.billingType,'per_use');assert.match(value.contract.inputHash,/^[a-f0-9]{64}$/);assert.match(value.contract.resultId,/^pet_[a-f0-9]{64}$/);
 }
});

test('a saved paid request retains its date across midnight and rejects changed profiles',async()=>{
 for(const kind of ['report','compat']){
  const first=await tossPetPaidContract(input(kind),{today:date});
  const later=await tossPetPaidContract(first.input,{today:'2026-11-08',stored:true});
  assert.deepEqual(later,first);
  const altered=kind==='report'?{...first.input,pet:{...first.input.pet,name:'다른 이름'}}:{...first.input,petB:{...first.input.petB,name:'다른 이름'}};
  const changed=await tossPetPaidContract(altered,{stored:true});
  assert.equal(changed.contract.resultId,first.contract.resultId);assert.notEqual(changed.contract.inputHash,first.contract.inputHash);
  const auth={_id:'identity',ownerId:'owner',environment:'SANDBOX'},row={...first.contract,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,status:'prepared'};
  assert.doesNotThrow(()=>assertNativeIntent(row,auth,first.contract));
  assert.throws(()=>assertNativeIntent(row,auth,changed.contract),error=>error.code==='REQUEST_INPUT_MISMATCH'&&error.status===409);
  assert.throws(()=>assertNativeIntent(row,{...auth,ownerId:'other'},first.contract),error=>error.code==='RESULT_NOT_FOUND'&&error.status===404);
 }
});

test('untrusted date, price, extra fields and malformed profiles are rejected before preparing an order',async()=>{
 for(const value of [{...input('report'),date}, {...input('report'),amountKRW:1}, {...input('report'),kind:'unknown'}, {...input('report'),kind:['report']}, {...input('report'),kind:{toString:'invalid'}}, {...input('report'),requestId:'not-an-id'}, {...input('report'),pet:{...pet,token:'forged'}}, {...input('report'),pet:{...pet,birthDate:'2023-02-29'}}, {...input('compat'),petB:null}]){
  await assert.rejects(tossPetPaidContract(value,{today:date}),error=>error.code==='PET_INPUT_INVALID'&&error.status===400);
 }
 const first=await tossPetPaidContract(input('report'),{today:date});
 for(const invalidDate of ['', '2026-02-30', ' 2026-11-07 '])await assert.rejects(tossPetPaidContract({...first.input,date:invalidDate},{stored:true}),error=>error.code==='PET_INPUT_INVALID'&&error.status===400);
});
