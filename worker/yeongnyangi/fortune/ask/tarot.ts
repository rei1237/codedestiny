import { TAROT_CARDS, buildImageCandidates } from '../../../../lib/tarot/tarot-cards.mjs';
import { getSpreadDefinition } from '../../../../lib/tarot/spreads.mjs';
import { getMeaningByQuestion, interpretTarotReading } from '../../../../lib/tarot/tarot-interpretation-engine.mjs';
import { context } from '../shared/domain';
import { FortuneError, type FortuneInput } from '../shared/contracts';

function randomIndex(size:number):number {
  const buffer=new Uint32Array(1), limit=0x100000000-(0x100000000%size);
  do {crypto.getRandomValues(buffer);} while(buffer[0]>=limit);
  return buffer[0]%size;
}
/** New draws only. Existing purchases retain the stored card identities and orientations. */
export function calculateAskTarot(input:FortuneInput,fusion=false) {
  const spreadId=fusion?'fusion_six_expert':input.spreadId||'three_card_cause_process_outcome';
  const spread=getSpreadDefinition(spreadId);
  if(!spread||spread.positions.length>TAROT_CARDS.length)throw new FortuneError('UNSUPPORTED_SPREAD');
  const deck=[...TAROT_CARDS];
  const cards=spread.positions.map((position:any)=>{
    const [card]=deck.splice(randomIndex(deck.length),1);
    const orientation=randomIndex(2)===0?'upright':'reversed';
    const images=buildImageCandidates(card.code);
    return {cardId:card.code,id:card.id,name:card.nameEn,nameEn:card.nameEn,nameKr:card.nameKo,nameKo:card.nameKo,
      position:position.key,positionKey:position.key,orientation,imageKey:card.imageKey||card.code.toLowerCase(),
      imageUrl:images[0],imageCandidates:images,proxyImageUrl:'',localImageUrl:images[0],
      keywords:card.keywords.slice(0,5),interpretation:getMeaningByQuestion(card,orientation,spread.questionType||'general').line};
  });
  const reading=interpretTarotReading({spreadId,drawnCards:cards,question:input.question,
    questionType:input.topicId==='love'?'love':'general'});
  return context('tarot',{spreadId,cards,reading},[]);
}
