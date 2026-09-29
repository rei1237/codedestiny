import type {ChapterSpec} from '../book-contracts';
import type {DomainContext} from '../shared/contracts';
import {TAROT_CONSULTATION_VERSION} from './consultation-contract';
import type {tarotConsultationEvidence} from './consultation-evidence';

type Evidence=ReturnType<typeof tarotConsultationEvidence>;
export function savedTarotConsultation(context:DomainContext):Evidence|undefined{
 const value=context.facts.find(f=>f.label==='tarotConsultation')?.value as Evidence|undefined;
 return value?.version===TAROT_CONSULTATION_VERSION?value:undefined;
}
export function tarotConsultationPrompt(context:DomainContext,chapter:ChapterSpec){
 const evidence=savedTarotConsultation(context);
 if(!evidence)return undefined;
 const cards=evidence.cards;
 const suits=['wands','cups','swords','pentacles'];
 const ranks=new Map<number,number>();
 for(const card of cards)if(suits.includes(card.suit)&&typeof card.rank==='number')ranks.set(card.rank,(ranks.get(card.rank)||0)+1);
 return {methodVersion:evidence.version,kind:evidence.kind,questionType:evidence.questionType,
  savedCardsOnly:cards,spreadAnalysis:{
   suitCounts:Object.fromEntries(suits.map(suit=>[suit,cards.filter(c=>c.suit===suit).length])),
   majorCount:cards.filter(c=>c.arcana==='major').length,
   reversedCount:cards.filter(c=>c.orientation==='reversed').length,
   repeatedNumbers:[...ranks.entries()].filter(([rank,count])=>rank<=10&&count>1).map(([rank,count])=>({rank,count})),
   courtCards:cards.filter(c=>suits.includes(c.suit)&&Number(c.rank)>=11).map(c=>c.cardId),
   gazeFlow:cards.filter(c=>c.gaze&&c.gaze!=='not-recorded').map(c=>({cardId:c.cardId,gaze:c.gaze})),
  },interpretationContract:[evidence.rules,evidence.limits,chapter.focus||'',`다른 장의 상세 논점: ${(chapter.excludes||[]).join(' / ')}. 이 장에 필요한 연결만 짧게 인용한다.`]};
}
