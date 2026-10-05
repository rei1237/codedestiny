import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const bundle=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/tarot/consultation-contract';export * from './worker/yeongnyangi/fortune/tarot/consultation-manifest';export * from './worker/yeongnyangi/fortune/tarot/consultation-evidence';export * from './worker/yeongnyangi/fortune/tarot/consultation-calculation';export * from './worker/yeongnyangi/fortune/tarot/consultation-prompt';export {products} from './worker/yeongnyangi/payments/catalog';export {TAROT_CARDS} from './lib/tarot/tarot-cards.mjs';export {getMeaningByQuestion} from './lib/tarot/tarot-interpretation-engine.mjs';export {getSpreadDefinition} from './lib/tarot/spreads.mjs';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const loaded=new Module(path.resolve('tarot-consultation-v2-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {calculateTarotConsultation,tarotConsultationPrompt,tarotConsultations,tarotConsultationSpread,tarotConsultationManifest,tarotConsultationEvidence,TAROT_CARDS,getMeaningByQuestion,products,getSpreadDefinition}=loaded.exports;
const ids=Object.keys(tarotConsultations);
const context=(id,offset=0,orientation='upright')=>({domain:'tarot',facts:[{label:'cards',value:tarotConsultationSpread(id).positions.map((p,i)=>({cardId:TAROT_CARDS[i+offset].code,orientation,positionKey:p.key}))}]});

test('nine categories keep fixed spreads across monotonically increasing tiers',()=>{
 assert.equal(ids.length,9);
 const expected={choice:3,love:6,feelings:5,contact:5,reunion:5,compatibility:6,career:7,money:5,healing:4};
 for(const id of ids){
  const spread=tarotConsultationSpread(id);assert.equal(spread.positions.length,expected[id]);
  for(const [tier,count] of [['mackerel',5],['salmon',8],['flounder',11],['tuna',15]]){
   const product=products.find(p=>p.id===`tarot_${tier}`),before=JSON.stringify(product);
   const manifest=tarotConsultationManifest(product,id);
   assert.equal(manifest.length,count);assert.equal(new Set(manifest.map(c=>c.title)).size,count);
   const cardChapter=manifest[1];
   for(const p of spread.positions)assert.ok(cardChapter.sections.some(s=>s.instruction.includes(p.key)));
   assert.ok(manifest.every(c=>c.factSelectors.tarot.includes('tarotConsultation')));
   assert.equal(JSON.stringify(product),before);
  }
 }
});
test('78 cards have both orientations and all consultation meaning types',()=>{
 assert.equal(TAROT_CARDS.length,78);
 for(const card of TAROT_CARDS)for(const direction of ['upright','reversed'])for(const type of new Set(Object.values(tarotConsultations).map(s=>s.questionType))){
  const meaning=getMeaningByQuestion(card,direction,type);
  assert.ok(meaning.line?.trim(),`${card.code}/${direction}/${type}`);
 }
});
test('position, question type, orientation and card changes affect frozen evidence',()=>{
 const base=tarotConsultationEvidence(context('feelings'),'feelings');
 assert.equal(base.questionType,'exMind');assert.equal(base.cards[1].positionLabel,'감정의 경향');
 assert.notDeepEqual(base.cards,tarotConsultationEvidence(context('feelings',0,'reversed'),'feelings').cards);
 assert.notDeepEqual(base.cards,tarotConsultationEvidence(context('feelings',1),'feelings').cards);
 assert.notDeepEqual(base.cards,tarotConsultationEvidence(context('money'),'money').cards);
 assert.deepEqual(JSON.parse(JSON.stringify(base)),base);
});
test('invalid saved card sets fail closed instead of redrawing',()=>{
 const bad=context('career');bad.facts[0].value[1].cardId=bad.facts[0].value[0].cardId;
 assert.throws(()=>tarotConsultationEvidence(bad,'career'),e=>e.code==='INVALID_TAROT_SPREAD');
 for(const field of ['orientation','positionKey','cardId']){
  const row=context('money');row.facts[0].value[0][field]='invalid';
  assert.throws(()=>tarotConsultationEvidence(row,'money'),e=>e.code==='INVALID_TAROT_SPREAD');
 }
});
test('Yeongnyangi wording does not mutate the legacy mindscan spread',()=>{
 const before=JSON.stringify(getSpreadDefinition('mindscan_five_card'));
 tarotConsultationSpread('feelings');
 assert.equal(JSON.stringify(getSpreadDefinition('mindscan_five_card')),before);
 assert.equal(tarotConsultations.choice.koOnly,false);assert.equal(tarotConsultations.love.koOnly,false);
 for(const id of ids.filter(id=>!['choice','love'].includes(id)))assert.equal(tarotConsultations[id].koOnly,false);
});
test('new draws preserve unique cards, exact positions and scoped meaning types',()=>{
 for(const id of ids){
  const calculated=calculateTarotConsultation(id);
  const facts=Object.fromEntries(calculated.facts.map(f=>[f.label,f.value]));
  assert.equal(facts.reading.questionType,tarotConsultations[id].questionType);
  assert.equal(new Set(facts.cards.map(c=>c.cardId)).size,tarotConsultationSpread(id).positions.length);
  assert.deepEqual(facts.cards.map(c=>c.positionKey),tarotConsultationSpread(id).positions.map(p=>p.key));
  assert.ok(facts.reading.combinations.every(c=>!c.description&&c.type!=='storyFlow'));
  const chapter=tarotConsultationManifest(products.find(p=>p.id==='tarot_salmon'),id)[1];
  const prompt=tarotConsultationPrompt(calculated,chapter);
  assert.equal(prompt.savedCardsOnly.length,facts.cards.length);
  assert.deepEqual(prompt.savedCardsOnly,facts.tarotConsultation.cards);
  const stored=JSON.parse(JSON.stringify(calculated));
  assert.deepEqual(tarotConsultationPrompt(stored,chapter),prompt);
 }
});
test('fixed mixed, reversed and court-card fixtures expose only observed signals',()=>{
 const chapter=tarotConsultationManifest(products.find(p=>p.id==='tarot_tuna'),'love')[2];
 for(const codes of [['M06','C02','M15','M16','S07','P10'],['C11','S12','P13','W14','C02','S02']]){
  const row=context('love');row.facts[0].value.forEach((card,i)=>{card.cardId=codes[i];card.orientation=i<4?'reversed':'upright';});
  const evidence=tarotConsultationEvidence(row,'love');
  row.facts.push({label:'tarotConsultation',value:evidence});
  const prompt=tarotConsultationPrompt(row,chapter);
  assert.equal(prompt.spreadAnalysis.reversedCount,4);
  assert.deepEqual(prompt.savedCardsOnly.map(c=>c.cardId),codes);
  assert.ok(prompt.spreadAnalysis.courtCards.every(code=>codes.includes(code)));
  if(codes[0]==='C11')assert.equal(prompt.spreadAnalysis.courtCards.length,4);
 }
});
