import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {getYeongnyangiSpread} from '../../lib/tarot/yeongnyangi-spread-catalog.mjs';
const require=createRequire(import.meta.url),Module=require('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/consultation-budget';export * from './worker/yeongnyangi/fortune/ask/question-policy';export {v6ReadingPolicies} from './worker/yeongnyangi/fortune/reading-policy';export {products} from './worker/yeongnyangi/payments/catalog';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const module=new Module('budget.cjs');module.paths=Module._nodeModulePaths(process.cwd());module._compile(built.outputFiles[0].text,'budget.cjs');const m=module.exports;
const decision={version:m.QUESTION_POLICY_VERSION,category:'money',target:'self',horizon:'current',period:'내년',situation:'수입을 늘리고 싶어요',options:'현재 일을 발전시키기',constraints:'시간',confirmed:true};

test('initial plus all followups exactly equals historical tier targets',()=>{
 assert.deepEqual(m.CONSULTATION_FOLLOWUPS,{mackerel:0,salmon:1,flounder:2,tuna:4,assorted:5,omakase:7});
 for(const tier of Object.keys(m.CONSULTATION_FOLLOWUPS)){
  const budget=m.consultationBudget(tier);
  assert.deepEqual(budget.total,[...m.v6ReadingPolicies[tier].target]);
  for(const i of [0,1])assert.equal(budget.initial[i]+budget.followups*budget.followup[i],budget.total[i]);
 }
});
test('every system restores empathy and patterns before question-specific chapters with bounded output',()=>{
 for(const domain of ['saju','ziwei','sukuyo','vedic','astrology','tarot'])for(const tier of ['mackerel','salmon','flounder','tuna']){
  const spread=domain==='tarot'?getYeongnyangiSpread('yn_money_flow_seven'):undefined;
  const rows=m.questionManifest(domain,tier,decision,spread,'내년 내 재물운은 어떨까?');
  assert.match(rows[0].title,domain==='tarot'?/현재|태도/:/타고난 성향/);
  assert.match(rows[1].title,/강점/);assert.match(rows[2].title,/반복/);
  assert.ok(rows.some(row=>row.title.includes('내년 내 재물운')));
  assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
  for(const row of rows){assert.ok(row.outputTokens<=24576);assert.ok(row.factSelectors[domain].length);}
  if(spread)for(const position of spread.positions){const section=rows.flatMap(row=>row.sections).find(s=>s.title===position.label);assert.match(section.instruction,/카드 이름과 정역방향/);}
 }
});
test('fusion restores full outlines and keeps budgeted multi-system evidence',()=>{
 for(const product of m.products.filter(p=>p.readingKind!=='single')){
  const rows=m.fusionConsultationManifest(product);
  assert.equal(rows.length,product.fishId==='assorted'?18:28);
  assert.ok(rows.some(row=>/기질|성향|정서/.test(row.title)));
  for(const row of rows)assert.ok(row.outputTokens<=24576);
  const budget=m.consultationBudget(product.fishId);
  assert.ok(Math.abs(rows.reduce((sum,row)=>sum+row.targetChars[1],0)-budget.initial[1])<rows.length);
 }
});
