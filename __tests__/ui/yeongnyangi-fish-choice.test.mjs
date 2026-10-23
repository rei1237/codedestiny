import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const bundle=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/ask/question-policy';export * from './worker/yeongnyangi/fortune/consultation-budget';export * from './worker/yeongnyangi/fortune/consultation-expansion';export {products} from './worker/yeongnyangi/payments/catalog';export * from './app/yeongnyangi/_lib/intake-chat';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const Module=createRequire(import.meta.url)('node:module'),filename=path.resolve('fish-choice-test.cjs'),mod=new Module(filename);
mod.filename=filename;mod.paths=Module._nodeModulePaths(process.cwd());mod._compile(bundle.outputFiles[0].text,filename);const m=mod.exports;
const decision={version:m.QUESTION_POLICY_VERSION,category:'job_change',target:'self',horizon:'current',situation:'업무를 바꾸려고 해요',options:'남기 / 옮기기',period:'내년',constraints:'없음',confirmed:true};

test('six systems accept all four user-selected tiers, keeping price, budget and followups',()=>{
 for(const product of m.products.filter(p=>p.readingKind==='single')){
  assert.doesNotThrow(()=>m.assertQuestionOrder(product,decision,'이직할까?'));
  const rows=m.questionManifest(product.domain,product.fishId,decision,undefined,'이직할까?');
  const budget=m.consultationBudget(product.fishId);
  assert.equal(rows.length,m.EXPANDED_CHAPTERS[product.fishId]);
  for(const i of [0,1])assert.ok(Math.abs(rows.reduce((n,r)=>n+r.targetChars[i],0)-budget.initial[i])<=rows.length);
  assert.equal(budget.followups,m.FOLLOWUP_LIMITS[product.fishId]);
  const pair={...decision,category:'compatibility',target:'pair',relationshipType:'family'};
  assert.doesNotThrow(()=>m.assertQuestionOrder(product,pair));
 }
 for(const fish of Object.keys(m.FOLLOWUP_LIMITS)){
  const product=m.products.find(p=>p.id==='saju_'+fish);
  assert.throws(()=>m.assertQuestionOrder(product,{...decision,options:''}),/QUESTION_SCOPE_REQUIRED/);
  assert.doesNotThrow(()=>m.assertQuestionOrder(product,{...decision,category:'timing',horizon:'transition'}));
  assert.throws(()=>m.assertQuestionOrder({...product,domain:'astrology'},{...decision,horizon:'transition'}),/QUESTION_SCOPE_UNSUPPORTED/);
 }
});

test('edited questions and domain changes preserve the chosen fish',()=>{
 const v={domain:'saju',question:'이직할까?',decision,fish:'tuna'};
 assert.equal(m.intakeFish(v),'tuna');
 assert.equal(m.intakeFish({...v,domain:'tarot',question:'마음을 표현할까?',decision:{...decision,category:'love'}}),'tuna');
 assert.equal(m.intakeFish({...v,fish:undefined}),'salmon');
});

