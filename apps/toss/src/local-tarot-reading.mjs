import {interpretTarotReading,buildLegacyReadingPayload} from '../../../lib/tarot/tarot-interpretation-engine.mjs';
import {getSpreadDefinition} from '../../../lib/tarot/spreads.mjs';

const spreads={tarot:'one_card','tarot-healing':'healing_rising_four_card','tarot-self-esteem':'self_esteem_levelup_five_card'};
const paragraphs=(entries)=>entries.filter(([,text])=>typeof text==='string'&&text.trim()).map(([label,text])=>label?`${label}\n${text}`:text).join('\n\n');

/** Local-only readings reuse the website's authored engine, including reversed cards. */
export function buildLocalTarotReading(flow,question,picks,shuffledDeck){
  const spreadId=spreads[flow.id];
  if(flow.access!=='free-local'||!spreadId)throw new Error('로컬 리딩을 지원하지 않는 서비스예요.');
  const spread=getSpreadDefinition(spreadId);
  if(picks.length!==spread.positions.length||new Set(picks).size!==picks.length||picks.some(slot=>!Number.isInteger(slot)||slot<0||!shuffledDeck[slot]))throw new Error('카드를 다시 확인해 주세요.');
  const cards=picks.map((slot,index)=>({...shuffledDeck[slot],position:spread.positions[index].key,positionLabel:flow.positions[index][1]}));
  const reading=interpretTarotReading({spreadId,userQuestion:question.trim(),drawnCards:cards.map(card=>({cardId:card.code,orientation:card.orientation,positionKey:card.position}))});
  const source=buildLegacyReadingPayload(reading,{spreadId});
  let presentation;
  if(flow.id==='tarot-healing'){
    presentation={opening:source.opening,summary:source.summary,sections:[
      ...source.cardDeepDive.map((body,index)=>({title:cards[index].positionLabel,body})),
      {title:'네 장이 이어진 이야기',body:source.storyFlow},
      {title:'마지막 메시지',body:paragraphs([['',source.affirmation],['리딩 안내',source.notice]])},
    ],actions:source.actionPlan};
  }else if(flow.id==='tarot-self-esteem'){
    presentation={opening:source.opening,summary:source.topSummary.flowLine,sections:[
      {title:'지금의 마음 지도',body:paragraphs([['반복되는 패턴',source.topSummary.corePattern],['시작된 자리',source.topSummary.rootCause],['마음에 남은 영향',source.topSummary.mainDamage],['회복의 단서',source.topSummary.recoveryKey]])},
      ...source.positionReadings.map((item,index)=>({title:cards[index].positionLabel,body:paragraphs([
        ['카드가 건네는 답',item.easyAnswer||item.interpretation],['카드의 의미',item.cardMeaning],['이런 흐름이 생기는 이유',item.whyThisHappens||item.patternAnalysis],['일상에서 만나는 모습',item.realLifeExample],['마음에 남은 패턴',item.woundPattern],['내 기준에 미치는 영향',item.selfEsteemImpact],['다르게 바라보는 연습',item.recoveryReframe||item.recoveryAdvice],['오늘의 작은 실천',item.actionPractice||item.todayAction],['기억할 말',item.healingSentence],['살펴볼 점',item.caution],
      ])})),
      {title:'다시 세우는 나의 기준',body:paragraphs([['회복의 흐름',source.levelupGuide.flow],['경계 연습',source.levelupGuide.boundaryPractice],['오래 지킬 기준',source.levelupGuide.longTermStandard],['오늘의 문장',source.levelupGuide.practiceSentence]])},
    ],actions:source.actionPlan};
  }else{
    presentation={opening:'카드의 상징을 오늘의 상황과 나란히 놓고 읽어 보세요.',summary:source.story,sections:reading.cards.map(card=>({title:card.positionLabel,body:paragraphs([['카드의 의미',card.coreMeaning],['질문에 대한 해석',card.questionSpecificMeaning],['마음에 건네는 말',card.emotionalMessage],['살펴볼 점',card.caution]])})),actions:[source.advice]};
  }
  return {flowId:flow.id,title:flow.name,question:question.trim(),cards,renderer:flow.resultKind,presentation};
}
