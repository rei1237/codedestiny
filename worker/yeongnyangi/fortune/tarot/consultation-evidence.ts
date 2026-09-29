import {TAROT_CARDS} from '../../../../lib/tarot/tarot-cards.mjs';
import {getMeaningByQuestion} from '../../../../lib/tarot/tarot-interpretation-engine.mjs';
import {yeongnyangiCardMetadata} from '../../../../lib/tarot/yeongnyangi-deck';
import {FortuneError,type DomainContext} from '../shared/contracts';
import {TAROT_CONSULTATION_VERSION,tarotConsultations,tarotConsultationSpread,tarotInterpretationRules,type TarotConsultationId} from './consultation-contract';

// Materialize the semantic evidence once at purchase time. Resume must use this
// stored fact instead of rebuilding meanings against a newer card dictionary.
export function tarotConsultationEvidence(context:DomainContext,id:TarotConsultationId){
 const spec=tarotConsultations[id],spread=tarotConsultationSpread(id);
 const saved=context.facts.find(f=>f.label==='cards')?.value;
 if(!Array.isArray(saved)||saved.length!==spread.positions.length)throw new FortuneError('INVALID_TAROT_SPREAD');
 const seen=new Set<string>();
 const cards=saved.map((card:any,index:number)=>{
  const code=String(card.cardId||card.code||'').toUpperCase(),position=spread.positions[index];
  const model=TAROT_CARDS.find(c=>c.code===code);
  if(!model||seen.has(code)||!['upright','reversed'].includes(card.orientation)||position.key!==(card.positionKey||card.position))throw new FortuneError('INVALID_TAROT_SPREAD');
  seen.add(code);
  const metadata=yeongnyangiCardMetadata(code);
  const meaning=getMeaningByQuestion(model,card.orientation,spec.questionType);
  return {cardId:code,name:model.nameKo,orientation:card.orientation,positionKey:position.key,positionLabel:position.label,
   positionMeaning:position.role,meaning,arcana:model.arcana,suit:model.suit,rank:model.number,
   ...(metadata?.gaze?{gaze:metadata.gaze}:{}),
  };
 });
 return {version:TAROT_CONSULTATION_VERSION,kind:id,spreadId:spec.spreadId,questionType:spec.questionType,
  cards,rules:tarotInterpretationRules,limits:'카드는 실제 상대의 마음이나 미래 사건을 확인하는 자료가 아니다.'};
}
export function attachTarotConsultationEvidence(context:DomainContext,id:TarotConsultationId):DomainContext{
 const value=tarotConsultationEvidence(context,id);
 return {...context,facts:[...context.facts.filter(f=>f.label!=='tarotConsultation'),{id:'tarot.tarotConsultation',label:'tarotConsultation',value}]};
}
