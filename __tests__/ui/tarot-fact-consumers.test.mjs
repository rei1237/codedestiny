import '../../tools/oracle/next-delivery/guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {execFileSync} from 'node:child_process';
import {pinTarotNarrativeSeed,assertTarotNarrativeSnapshot} from '../../worker/lib/tarot-fact-consumer.js';
import {readEngineFactSnapshot} from '../../worker/lib/engine-fact-snapshot.js';
import {appendAnswerVoice,selectAnswerVoice} from '../../worker/lib/consultation-answer-contract.js';
const clone=v=>JSON.parse(JSON.stringify(v));
const body={requestId:'same-request',locale:'ko',userQuestion:'question',question:'question',cards:[{cardId:'m00',orientation:'upright'}],pairs:[]};
const row={cardId:'m00',cardName:'fixture',positionTitle:'current',orientation:'upright'};
const base={spreadType:'relationship_six_card',questionType:'love',cards:body.cards,reading:{positionBreakdown:[row],relationshipMatrix:{}}};
const facts={ok:true,prompt:'fixed facts',base:{sections:[{}],summaryCard:{}},sectionInputs:[{positionLabel:'current',positionQuestion:'q',orientation:'upright',mainCard:{nameKo:'fixture'},subCard:{nameKo:'fixture2'}}]};
const input={cards:[{index:1,positionLabel:'current',orientation:'upright',card:{code:'m00',nameKo:'fixture'}}]};
const draw={featureKey:'tarot-love-relationship',version:'paid-tarot-draw-v1',deckVersion:'yn-committed-deck-v1',cards:body.cards};
function load(file,old=false){
 const source=old?execFileSync('git',['show','c7f46acf:worker/lib/'+file],{encoding:'utf8'}):fs.readFileSync('worker/lib/'+file,'utf8');
 let calls=0;const prompts=[];
 const ctx=vm.createContext({pinTarotNarrativeSeed,assertTarotNarrativeSnapshot,appendAnswerVoice,selectAnswerVoice,getAmbientAiLocale:()=> 'ko',bindPaidTarotDraw:async()=>clone(draw),getTarotCardByAnyId:()=>({nameKo:'fixture'}),buildTarotPositionPin:()=> 'position pin',buildOutputLanguageDirective:()=> 'ko',buildLoveReadingPrompt:()=> 'fixed love facts',TAROT_SHARED_RULE_BLOCK:'rules',buildMindscanDeliveryFacts:()=>clone(facts),validateOracleConsultationInput:()=>({ok:true,data:clone(input)}),buildOracleConsultationPrompt:()=>({userPrompt:'fixed oracle',systemPrompt:'system'}),FEATURE_KEY_PRICE_TABLE:{oracle:{cost:50}},resolveOracleConsultationTier:()=>({featureKey:'oracle'}),buildLoveConsultingHighlights:()=>[],narrativePriorDigest:()=>'',NARRATIVE_RESPONSE_SCHEMA:{},callGeminiText:async(_env,prompt)=>{calls++;prompts.push(prompt);return {ok:false}}});
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 for(const node of ast.statements){if(ts.isVariableStatement(node)||ts.isFunctionDeclaration(node))vm.runInContext(node.getText(ast).replace(/^export /,''),ctx)}
 return {ctx,calls:()=>calls,prompts};
}
for(const [file,seedName,adapterName,renderName] of [['love-tarot-delivery.js','seed','loveTarotNarrativeAdapter','render'],['mindscan-delivery.js','seed','mindscanNarrativeAdapter','render'],['tarot-oracle-delivery.js','seedOracle','tarotOracleNarrativeAdapter','renderOracle']]){
 test(file+': actual seeds OFF identical, ON survives partial JSON reload/OFF and reaches prompt/result without redrawing',async()=>{
  const current=load(file),old=load(file,true),env={TAROT_CONSUMER_FACTS_V1:'true'};
  const run=(api,e)=>seedName==='seedOracle'?api.ctx[seedName](clone(body),e):api.ctx[seedName](e,'owner',clone(body),()=>clone(base));
  assert.deepEqual(clone(await run(current,{})),clone(await run(old,{})));
  const seeded=await run(current,env),state=clone({...seeded,body,locale:'ko',parts:{},attempts:{},evidenceHash:'same'});
  const missing=clone(state);delete missing.engineFacts;assert.throws(()=>assertTarotNarrativeSnapshot(missing),/SNAPSHOT_REQUIRED/);
  const digest=state.engineFacts.digest;assert.equal(readEngineFactSnapshot(state.engineFacts).support,'candidate');assert.ok(state.prompt.includes(digest));
  const adapter=current.ctx[adapterName]({});await adapter.produce(state.tasks[0],state);assert.equal(current.calls(),1);assert.ok(current.prompts[0].includes(digest));
  const delivered=current.ctx[renderName](state);assert.equal(delivered.engineFacts.digest,digest);
  const savedText=JSON.stringify(delivered);assert.equal(JSON.stringify(current.ctx[renderName](clone(state))),savedText);
  if(state.base)state.base.changed='another card';else state.input.cards[0].orientation='reversed';
  await assert.rejects(()=>adapter.produce(state.tasks[0],state),/TAROT_FACTS_CONFLICT/);assert.equal(current.calls(),1);
 });
}
test('storage minimization does not lose null/candidate values or invalidate unchanged facts',()=>{
 const state=pinTarotNarrativeSeed({base:{empty:{},candidate:['pending'],final:null},prompt:'p'},{TAROT_CONSUMER_FACTS_V1:'true'},body);
 delete state.base.empty;delete state.engineFacts.facts.base.empty;assert.doesNotThrow(()=>assertTarotNarrativeSnapshot(state));
 state.base.final='confirmed';assert.throws(()=>assertTarotNarrativeSnapshot(state));
});
