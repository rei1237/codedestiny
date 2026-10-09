import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {getYeongnyangiSpread} from '../../lib/tarot/yeongnyangi-spread-catalog.mjs';
const require=createRequire(import.meta.url),Module=require('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/consultation-budget';export * from './worker/yeongnyangi/fortune/ask/question-policy';export * from './worker/yeongnyangi/fortune/consultation-layout';export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest';export {v6ReadingPolicies,READING_V5_VERSION,QUESTION_LAYOUT_VERSION,FUSION_LAYOUT_VERSION} from './worker/yeongnyangi/fortune/reading-policy';export {products} from './worker/yeongnyangi/payments/catalog';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const budgetModule=new Module('budget.cjs');budgetModule.paths=Module._nodeModulePaths(process.cwd());budgetModule._compile(built.outputFiles[0].text,'budget.cjs');const m=budgetModule.exports;
const decision={version:m.QUESTION_POLICY_VERSION,category:'money',target:'self',horizon:'current',period:'내년',situation:'수입을 늘리고 싶어요',options:'현재 일을 발전시키기',constraints:'시간',confirmed:true};

const QUESTION='내년 내 재물운은 어떨까?';
const sum=(rows,i)=>rows.reduce((total,row)=>total+row.targetChars[i],0);
const asked=category=>({...decision,category,...(category==='compatibility'?{target:'pair',relationshipType:'romantic_adults'}:{}),...(category==='timing'?{horizon:'transition'}:{})});
// D7-2 contract table (initial = chapters × per-chapter target).
const INITIAL={mackerel:[9000,10500],salmon:[22000,28600],flounder:[31500,39000],tuna:[50400,64800],assorted:[58800,75600],omakase:[75600,97200]};

test('D7 budget: initial is chapters × per-chapter target and every followup has its own fixed target',()=>{
 assert.deepEqual(m.CONSULTATION_FOLLOWUPS,{mackerel:0,salmon:1,flounder:2,tuna:4,assorted:5,omakase:7});
 assert.deepEqual(m.CONSULTATION_CHAPTERS,{mackerel:6,salmon:11,flounder:15,tuna:24,assorted:28,omakase:36});
 for(const tier of Object.keys(m.CONSULTATION_FOLLOWUPS)){
  const budget=m.consultationBudget(tier);
  assert.equal(budget.version,m.CONSULTATION_BUDGET_VERSION);
  assert.deepEqual(budget.initial,INITIAL[tier]);
  assert.deepEqual(budget.followup,tier==='mackerel'?[0,0]:['assorted','omakase'].includes(tier)?[2400,3000]:[2000,2600]);
  for(const i of [0,1])assert.equal(budget.total[i],budget.initial[i]+budget.followups*budget.followup[i]);
 }
});
test('legacy snapshots keep the historical total split 20% into followups',()=>{
 for(const tier of Object.keys(m.CONSULTATION_FOLLOWUPS)){
  const budget=m.legacyConsultationBudget(tier);
  assert.equal(budget.version,m.LEGACY_CONSULTATION_BUDGET_VERSION);
  assert.deepEqual(budget.total,[...m.v6ReadingPolicies[tier].target]);
  for(const i of [0,1])assert.equal(budget.initial[i]+budget.followups*budget.followup[i],budget.total[i]);
 }
});
test('every system opens with nature and current flow, then strengths, then the answer, within the tier budget',()=>{
 for(const domain of ['saju','ziwei','sukuyo','vedic','astrology','tarot'])for(const tier of ['mackerel','salmon','flounder','tuna']){
  const spread=domain==='tarot'?getYeongnyangiSpread('yn_money_flow_seven'):undefined;
  const rows=m.questionManifest(domain,tier,decision,spread,QUESTION);
  assert.equal(rows.length,m.CONSULTATION_CHAPTERS[tier],domain+' '+tier);
  assert.deepEqual(rows.slice(0,3).map(row=>row.layoutRole),['foundation','foundation','answer']);
  assert.match(rows[0].title,domain==='tarot'?/카드.*마음/:/바탕/);
  for(const id of ['nature','empathy','current-flow'])assert.ok(rows[0].sections.some(s=>s.id===id),id);
  assert.match(rows[1].title,/강점/);assert.ok(rows[2].title.includes('내년 내 재물운'));
  assert.equal(rows.at(-1).layoutRole,'synthesis');
  assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
  assert.ok(sum(rows,0)>=INITIAL[tier][0]&&sum(rows,1)<=INITIAL[tier][1],`${domain} ${tier} ${sum(rows,0)}~${sum(rows,1)}`);
  for(const row of rows){
   assert.equal(row.consultationLayout,m.QUESTION_LAYOUT_VERSION);
   assert.equal(row.minimumChars,Math.ceil(row.targetChars[0]*.55));
   assert.ok(row.outputTokens<=24576);assert.ok(row.factSelectors[domain].length);
  }
  if(spread)for(const position of spread.positions){const section=rows.flatMap(row=>row.sections).find(s=>s.title===position.label);assert.match(section.instruction,/카드 이름과 정역방향/);}
 }
});
test('question chapters follow the outline of the question topic',()=>{
 const topics={money:'money',job_change:'work',love:'love',compatibility:'relationship',timing:'luck'};
 const seen=[];
 for(const [category,topic] of Object.entries(topics)){
  assert.equal(m.questionTopic(category),topic);
  const ids=m.questionManifest('saju','flounder',asked(category),undefined,QUESTION).filter(row=>row.layoutRole==='question').flatMap(row=>row.sections.map(s=>s.id));
  for(const step of m.questionOutlines[topic].slice(0,5))assert.ok(ids.includes(step.sections[0].id),`${category}: ${step.key}`);
  seen.push(ids.join());
 }
 assert.equal(new Set(seen).size,seen.length);
});
test('bonus chapters cover areas outside the question topic; tuna adds twelve life chapters instead',()=>{
 for(const category of ['money','job_change','love','compatibility','timing','self'])for(const tier of ['mackerel','salmon','flounder','tuna']){
  const topic=m.questionTopic(category);
  const rows=m.questionManifest('saju',tier,asked(category),undefined,QUESTION);
  const bonus=rows.filter(row=>row.layoutRole==='bonus');
  assert.equal(bonus.length,{mackerel:0,salmon:2,flounder:4,tuna:0}[tier],category+' '+tier);
  assert.equal(rows.filter(row=>row.layoutRole==='life').length,tier==='tuna'?12:0);
  for(const row of bonus){
   assert.ok(row.title.startsWith(m.BONUS_TITLE));
   for(const section of row.sections){
    const area=m.bonusAreas.find(item=>section.id==='bonus-'+item.id+'-signal');
    if(area)assert.ok(!area.topics.includes(topic),`${category}: ${area.id}`);
    if(section.id==='bonus-pick-signal')for(const item of m.bonusAreas.filter(item=>item.topics.includes(topic)))assert.ok(!section.instruction.includes(item.title),`${category}: ${item.title}`);
   }
  }
 }
});
test('fusion books give every system its own foundation and expert chapter, then the question outline, life comparison and synthesis',()=>{
 for(const product of m.products.filter(p=>p.readingKind!=='single')){
  const rows=m.fusionConsultationManifest(product,'love');
  const n=product.systems.length,chapters=m.CONSULTATION_CHAPTERS[product.fishId];
  // Preparation appends the prevention chapter, which stands in for the life row '주의 시기'.
  assert.equal(rows.length,chapters-1,product.id);
  assert.deepEqual(rows.slice(0,n).map(row=>row.systems),product.systems.map(system=>[system]));
  assert.ok(rows.slice(0,n).every(row=>row.layoutRole==='foundation'&&['nature','current-flow'].every(id=>row.sections.some(s=>s.id===id))));
  assert.deepEqual(rows.slice(n,2*n).map(row=>row.layoutRole),Array(n).fill('expert'));
  const sectionIds=rows.flatMap(row=>row.sections.map(s=>s.id));
  for(const step of m.questionOutlines.love)assert.ok(sectionIds.includes(step.sections[0].id),step.key);
  assert.equal(rows.filter(row=>row.layoutRole==='life').length,product.fishId==='omakase'?9:11);
  assert.deepEqual(rows.slice(-2).map(row=>row.layoutRole),['synthesis','synthesis']);
  const prevention={...rows[0],id:product.fishId+'-prevention',key:'prevention',layoutRole:undefined,systems:product.systems};
  const full=m.allocateConsultationBudget([...rows,prevention],product.fishId);
  assert.equal(full.length,chapters);assert.equal(full.at(-3).key,'prevention');assert.equal(full.at(-3).layoutRole,'life');
  assert.deepEqual(full.map(row=>row.ordinal),full.map((_,i)=>i));
  assert.ok(sum(full,0)>=INITIAL[product.fishId][0]&&sum(full,1)<=INITIAL[product.fishId][1],`${product.id} ${sum(full,0)}~${sum(full,1)}`);
  for(const row of full){assert.ok(row.outputTokens<=24576);assert.equal(row.minimumChars,Math.ceil(row.targetChars[0]*.55));}
 }
});
test('legacy fusion and question manifests keep their chapter count and budget',()=>{
 for(const product of m.products.filter(p=>p.readingKind!=='single')){
  const rows=m.allocateConsultationBudget(m.readingManifest(product,'general','personal',m.READING_V5_VERSION),product.fishId);
  assert.equal(rows.length,product.fishId==='assorted'?18:28);
  assert.ok(rows.every(row=>!row.consultationLayout&&row.minimumChars===0));
  assert.ok(Math.abs(sum(rows,1)-m.legacyConsultationBudget(product.fishId).initial[1])<rows.length);
 }
 for(const tier of ['mackerel','salmon','flounder','tuna']){
  const rows=m.questionManifest('saju',tier,decision,undefined,QUESTION,false);
  assert.ok(rows.length&&rows.every(row=>!row.consultationLayout&&!row.layoutRole&&row.minimumChars===0),tier);
 }
});
