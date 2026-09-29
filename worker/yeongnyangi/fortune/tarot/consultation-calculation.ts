import {TAROT_CARDS,buildImageCandidates} from '../../../../lib/tarot/tarot-cards.mjs';
import {getMeaningByQuestion} from '../../../../lib/tarot/tarot-interpretation-engine.mjs';
import {analyzeTarotCombinations} from '../../../../lib/tarot/tarot-combination-engine.mjs';
import {context} from '../shared/domain';
import {tarotConsultations,tarotConsultationSpread,type TarotConsultationId} from './consultation-contract';
import {attachTarotConsultationEvidence} from './consultation-evidence';

function randomIndex(size:number){
 const words=new Uint32Array(1),limit=0x100000000-(0x100000000%size);
 do{crypto.getRandomValues(words);}while(words[0]>=limit);
 return words[0]%size;
}
/** Called only for a new purchase intent, after a successful not-found lookup. */
export function calculateTarotConsultation(id:TarotConsultationId){
 const spec=tarotConsultations[id],spread=tarotConsultationSpread(id),deck=[...TAROT_CARDS];
 const entries=spread.positions.map((position:any)=>{
  const [card]=deck.splice(randomIndex(deck.length),1);
  const orientation=randomIndex(2)===0?'upright':'reversed';
  return {card,orientation,position,meaning:getMeaningByQuestion(card,orientation,spec.questionType)};
 });
 const cards=entries.map(({card,orientation,position,meaning}:any)=>{
  const images=buildImageCandidates(card.code);
  return {cardId:card.code,id:card.id,name:card.nameEn,nameEn:card.nameEn,nameKr:card.nameKo,nameKo:card.nameKo,
   position:position.key,positionKey:position.key,positionLabel:position.label,orientation,
   imageKey:card.imageKey||card.code.toLowerCase(),imageUrl:images[0],imageCandidates:images,proxyImageUrl:'',localImageUrl:images[0],
   keywords:meaning.keywords.slice(0,5),interpretation:meaning.line};
 });
 // The shared engine's generic storyFlow assumes a relationship even for money
 // or work. Keep its actual combination detections; the LLM narrates the spread
 // from the frozen positions and question, rather than inheriting that template.
 const combinations=analyzeTarotCombinations(entries,spec.questionType,spread)
  .filter((item:any)=>item.type!=='storyFlow')
  .map((item:any)=>({type:item.type,title:item.title,
   interpretationLimit:'조합 탐지 신호다. 정역방향·자리·질문을 함께 읽으며 탐지만으로 사건이나 감정을 결론내리지 않는다.'}));
 return attachTarotConsultationEvidence(context('tarot',{
  spreadId:spec.spreadId,cards,reading:{questionType:spec.questionType,combinations,
   interpretedCards:entries.map(({card,orientation,position,meaning}:any)=>({cardCode:card.code,cardNameKo:card.nameKo,orientation,positionLabel:position.label,positionRole:position.role,questionSpecificMeaning:meaning.line,advice:meaning.advice,caution:meaning.shadow}))},
 },['카드의 상징으로 선택의 조건을 살핀다. 실제 상대의 마음이나 미래 사건을 확인하는 자료가 아니다.']),id);
}
