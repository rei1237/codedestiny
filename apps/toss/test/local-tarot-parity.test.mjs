import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLocalTarotReading} from '../src/local-tarot-reading.mjs';
import {interpretTarotReading,buildLegacyReadingPayload} from '../../../lib/tarot/tarot-interpretation-engine.mjs';
import {TAROT_CARDS} from '../../../lib/tarot/tarot-cards.mjs';
import {TOSS_TAROT_LIBRARY_FLOWS} from '../../../lib/tarot/toss-library-flows.mjs';
import {getSpreadDefinition} from '../../../lib/tarot/spreads.mjs';
const question='다른 사람의 반응 때문에 내 기준이 흔들릴 때 어떻게 해야 할까요?';
for(const [id,spreadId] of Object.entries({tarot:'one_card','tarot-healing':'healing_rising_four_card','tarot-self-esteem':'self_esteem_levelup_five_card'})){
 for(const orientation of ['upright','reversed'])test(`${id} retains canonical ${orientation} reading and every action`,()=>{
  const flow=TOSS_TAROT_LIBRARY_FLOWS.find(item=>item.id===id),spread=getSpreadDefinition(spreadId);
  const deck=TAROT_CARDS.map(card=>({...card,orientation})),picks=spread.positions.map((_,index)=>index+5);
  const expected=buildLegacyReadingPayload(interpretTarotReading({spreadId,userQuestion:question,drawnCards:picks.map((slot,index)=>({cardId:deck[slot].code,orientation,positionKey:spread.positions[index].key}))}),{spreadId});
  const result=buildLocalTarotReading(flow,question,picks,deck),text=result.presentation.sections.map(section=>section.body).join('\n');
  assert.equal(result.cards.length,spread.positions.length);assert.ok(result.cards.every(card=>card.orientation===orientation));
  if(id==='tarot-healing')for(const detail of expected.cardDeepDive)assert.ok(text.includes(detail));
  else if(id==='tarot-self-esteem')for(const item of expected.positionReadings){assert.ok(text.includes(item.selfEsteemImpact));assert.ok(text.includes(item.whyThisHappens||item.patternAnalysis));}
  else assert.equal(result.presentation.summary,expected.story);
  assert.deepEqual(result.presentation.actions,id==='tarot'?[expected.advice]:expected.actionPlan);
 });
}
test('different cards produce different interpretations and paid flows never fall back to local',()=>{
 const flow=TOSS_TAROT_LIBRARY_FLOWS.find(item=>item.id==='tarot'),deck=TAROT_CARDS.map(card=>({...card,orientation:'upright'}));
 assert.notDeepEqual(buildLocalTarotReading(flow,question,[0],deck).presentation,buildLocalTarotReading(flow,question,[1],deck).presentation);
 assert.throws(()=>buildLocalTarotReading({...flow,access:'iap'},question,[0],deck));
 for(const picks of [[],[0,0],[-1],[999]])assert.throws(()=>buildLocalTarotReading(flow,question,picks,deck));
});
