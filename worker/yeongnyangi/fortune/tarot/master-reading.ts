import {TAROT_CARDS} from '../../../../lib/tarot/tarot-cards.mjs';
import {yeongnyangiCardMetadata} from '../../../../lib/tarot/yeongnyangi-deck';
import type {ChapterBody, ChapterSpec} from '../book-contracts';
import type {DomainContext} from '../shared/contracts';
import {FortuneError} from '../shared/contracts';
import type {ReadingLocale} from '../reading-locale';
import {savedTarotConsultation,tarotConsultationPrompt} from './consultation-prompt';
import {canonicalTarotProse} from './reading-vocabulary';
import {TAROT_CRISIS_INSTRUCTION,TAROT_SAFETY_NOTICE,findTarotProseViolation,isTarotCrisisQuestion} from '../../../../lib/tarot/paid-reading-contract.mjs';

type SavedCard={cardId?:string;code?:string;name?:string;nameKo?:string;nameKr?:string;position?:string;positionKey?:string;orientation?:string};

const SUIT_ELEMENT:Record<string,string>={wands:'fire/action',cups:'water/emotion',swords:'air/thought',pentacles:'earth/reality'};

const text=(value:unknown)=>typeof value==='string'?value:'';
const cardsFact=(context:DomainContext)=>context.facts.find(f=>f.label==='cards'||f.id==='tarot.cards');
export function savedTarotCards(context:DomainContext):SavedCard[]{
 const value=cardsFact(context)?.value;
 return Array.isArray(value)?value.filter(card=>card&&typeof card==='object') as SavedCard[]:[];
}

export function isCrisisQuestion(question:unknown){return isTarotCrisisQuestion(question);}
export function tarotSafetyNotice(question:unknown,locale:ReadingLocale){return isCrisisQuestion(question)?TAROT_SAFETY_NOTICE[locale]:undefined;}

export function buildTarotMasterContract(context:DomainContext,question:unknown,chapter:ChapterSpec){
 const v2=tarotConsultationPrompt(context,chapter);
 if(v2)return {...v2,crisisSafety:isCrisisQuestion(question)?TAROT_CRISIS_INSTRUCTION:undefined};
 const saved=savedTarotCards(context);
 if(!saved.length)return undefined;
 const cards=saved.map((card,index)=>{
  const code=text(card.cardId||card.code).toUpperCase();
  const model=TAROT_CARDS.find(item=>item.code===code);
  const meta=yeongnyangiCardMetadata(code);
  return {order:index+1,cardId:code,name:model?.nameKo||card.nameKo||card.nameKr||card.name||'',position:card.positionKey||card.position||`position_${index+1}`,orientation:card.orientation==='reversed'?'reversed':'upright',arcana:meta?.arcana||model?.arcana,suit:meta?.suit||model?.suit,rank:meta?.rank??model?.number,gaze:meta?.gaze||'not-recorded'};
 });
 const suitCounts=Object.fromEntries(Object.keys(SUIT_ELEMENT).map(suit=>[suit,cards.filter(card=>card.suit===suit).length]));
 const ranks=new Map<number,number>();
 for(const card of cards)if(card.suit&&typeof card.rank==='number')ranks.set(card.rank,(ranks.get(card.rank)||0)+1);
 return {
  methodVersion:'yeongnyangi-tarot-master-v1',
  savedCardsOnly:cards,
  spreadAnalysis:{
   elementBalance:Object.fromEntries(Object.entries(suitCounts).map(([suit,count])=>[SUIT_ELEMENT[suit],count])),
   majorArcana:{count:cards.filter(card=>card.arcana==='major').length,total:cards.length},
   repeatedNumbers:[...ranks.entries()].filter(([,count])=>count>1).map(([rank,count])=>({rank,count})),
   courtCards:cards.filter(card=>card.suit&&Number(card.rank)>=11).map(card=>card.cardId),
   gazeFlow:cards.map(card=>({cardId:card.cardId,gaze:card.gaze})),
  },
  interpretationContract:[
   '각 카드는 position × card × orientation × user question의 교차로 읽는다.',
   '역방향을 정방향의 단순 반대로 쓰지 말고 지연·내면화·과잉·막힘 중 제공된 맥락에 맞는 가능성으로 설명한다.',
   '원소 균형, 메이저 비율, 숫자 반복, 궁정 카드, 시선 흐름은 실제 배열에서 의미가 있을 때만 연결하고 없는 신호를 만들지 않는다.',
   '카드 이름을 나열하지 말고 앞뒤 자리의 지지·긴장·전환을 하나의 이야기로 연결한다.',
   '상대 마음과 미래를 확정하지 않고 다른 가능성, 현실에서 확인할 신호, 사용자가 바꿀 수 있는 행동을 구분한다.',
   'savedCardsOnly 밖의 카드는 이름이나 의미를 해석에 끌어오지 않는다. 카드 ID·정역·자리 정보를 바꾸지 않는다.',
   `이번 장(${chapter.title})의 고유 논점에 필요한 카드만 인용하고 다른 장의 결론을 반복하지 않는다.`,
  ],
  crisisSafety:isCrisisQuestion(question)?TAROT_CRISIS_INSTRUCTION:undefined,
 };
}

function prose(body:ChapterBody){return [body.title,body.summary,body.persona,...body.analysis,...body.highlights,...body.topics,...(body.blocks||[]).flatMap(block=>[block.title,...block.paragraphs]),...(body.questionAnswers||[]).flatMap(answer=>[answer.answer,answer.reason,answer.timing,answer.action])].filter(Boolean).join('\n');}
export function validateTarotChapter(body:ChapterBody,context:DomainContext,locale:ReadingLocale='ko'){
 const saved=savedTarotCards(context);
 if(!saved.length)return;
 const content=canonicalTarotProse(prose(body),context,locale);
 const drawn=saved.map(card=>{
  const code=text(card.cardId||card.code).toUpperCase();
  const model=TAROT_CARDS.find(item=>item.code===code);
  return {name:model?.nameKo||card.nameKo||card.nameKr||card.name||'',orientation:card.orientation==='reversed'?'reversed':'upright'};
 });
 const v2=savedTarotConsultation(context);
 const positions=v2?new Map((v2.cards as {positionLabel:string;name:string}[]).map(card=>[card.positionLabel,card.name] as [string,string])):undefined;
 const code=findTarotProseViolation(content,{drawn,positions});
 if(code)throw new FortuneError(code);
}

export function attachTarotSafetyNotice(body:ChapterBody,question:unknown,locale:ReadingLocale,ordinal:number){
 const notice=ordinal===0?tarotSafetyNotice(question,locale):undefined;
 return notice&&!body.summary.startsWith(notice)?{...body,summary:`${notice}\n\n${body.summary}`} : body;
}
