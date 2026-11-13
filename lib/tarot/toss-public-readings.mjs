import {isFreeFortuneFeatureKey} from '../payment/free-fortune-policy.mjs';
import {tossTarotLibraryFlow} from './toss-library-flows.mjs';
import {buildCrystalSoulV3Reading} from './crystal-soul-reading.mjs';
import {buildNumerologyContext,buildFallbackInterpretation,guardNumerologyWarningInterpretation,normalizeCardInput,normalizeTopic} from './numerology-tarot.mjs';
import {buildLegacyReadingPayload,interpretTarotReading} from './tarot-interpretation-engine.mjs';
import {buildPremiumYearReading} from './tarot-year-premium.mjs';
import {buildIjikReading} from './ijik-reading.mjs';
import {getTarotCardByAnyId} from './tarot-cards.mjs';

const text=value=>typeof value==='string'?value.trim():'';
const cardRows=input=>(input.cards||[]).map((item,index)=>{
  const card=getTarotCardByAnyId(item.cardId);
  return {cardId:card.code,code:card.code,nameKr:card.nameKo,nameKo:card.nameKo,nameEn:card.nameEn,
    orientation:item.orientation,position:item.position,positionKey:item.position,positionLabel:item.positionLabel||`${index+1}번째 카드`,keywords:card.keywords?.slice(0,5)||[]};
});
const presentation=(flowId,title,question,renderer,reading,{opening,summary,sections=[],actions=[]}={})=>{
  const openingText=text(opening),summaryText=text(summary),safeActions=actions.filter(Boolean);
  return {version:'toss-tarot-service-v1',flowId,title,question,renderer,cards:cardRows(reading?.input||{}),
    opening:openingText,summary:summaryText,advice:text(safeActions[0]),
    presentation:{opening:openingText,summary:summaryText,sections,actions:safeActions},reading,
  };
};
const sections=rows=>rows.filter(row=>text(row?.body)).map(row=>({title:text(row.title),body:text(row.body)}));

function interpreted(input,spreadId){
  const raw=interpretTarotReading({spreadId,userQuestion:input.question,drawnCards:cardRows(input)});
  return {raw,reading:buildLegacyReadingPayload(raw,{spreadId})};
}

function reunion(input){
  const {reading}=interpreted(input,'reunion_lighthouse_five_card');
  return presentation('tarot-reunion','재회운 등대 타로',input.question,'reunion',reading,{opening:reading.opening,
    summary:reading.summary.reunionChanceLabel,sections:sections([
      ...reading.positions.map(item=>({title:item.positionTitle+' · '+item.cardName,body:item.detailedReading})),
      {title:'등대가 비추는 길',body:reading.lighthouseGuidance},
      {title:'다가가기 전에',body:reading.finalGuide.shouldContactNow},
    ]),actions:reading.actionPlan});
}

function year(input){
  const {reading}=interpreted(input,'yearly_twelve_card');
  const premium=buildPremiumYearReading({reading,year:new Date().getFullYear()});
  return presentation('tarot-year-fortune','십이지신 천운 타로',input.question,'year',premium,{opening:premium.annualOverview?.summary,
    summary:premium.yearTheme?.summary||premium.annualSummary?.summary,sections:sections((premium.monthlyReadings||[]).map(month=>({
      title:`${month.month}월 · ${month.phase||month.zodiacAnimal||'월간 흐름'}`,body:[month.flow,month.money,month.work,month.relationship,month.health,month.caution,month.action].join('\n\n'),
    }))),actions:premium.luckyActions||[]});
}

function crystal(input){
  const built=buildCrystalSoulV3Reading({gem:input.gem||'amethyst',cards:cardRows(input)});
  const reading=built.readingData;
  return presentation('tarot-crystal-soul','원석 소울 타로',input.question,'crystal',reading,{opening:reading.intro,
    summary:reading.synthesis?.body||reading.synthesis?.gem_message,sections:sections((reading.cards||[]).map(card=>({
      title:`${card.pos_name} · ${card.card_name}`,body:[card.reading,card.gem_reading,card.gem_focus,card.gem_shadow,card.gem_alignment].join('\n\n'),
    }))),actions:(reading.cards||[]).map(card=>card.gem_alignment).filter(Boolean).slice(-2)});
}

function ijik(input){
  const reading=buildIjikReading(cardRows(input));
  return presentation('tarot-ijik','이직 운명의 카드',input.question,'career',reading,{opening:reading.assessment?.direction?.summary,
    summary:reading.assessment?.timing?.summary,sections:sections([
      {title:'현직과 다음 자리의 기준',body:reading.assessment?.currentCompany},
      {title:'이번 리딩',body:reading.reading},
    ]),actions:reading.assessment?.actions||[]});
}

function numerology(input){
  const topic=normalizeTopic(input.topic);
  const numerology=buildNumerologyContext({birthDate:input.birthDate,topic});
  const cards=normalizeCardInput(input.cards.map(item=>({id:Number(item.cardId.slice(1)),orientation:item.orientation})),topic);
  const reading=guardNumerologyWarningInterpretation(buildFallbackInterpretation({numerology,cards,topic,name:input.name,question:input.question}),cards);
  return presentation('tarot-numerology','수비학 타로',input.question,'numerology',reading,{opening:reading.opening,
    summary:reading.directAnswer,sections:sections((reading.cards||[]).map(card=>({
      title:`${card.positionTitle} · ${card.cardName}`,body:card.contextualInterpretation,
    }))),actions:reading.nextActions||[]});
}

const publicReaders={'tarot-reunion':reunion,'tarot-year-fortune':year,'tarot-crystal-soul':crystal,'tarot-ijik':ijik,'tarot-numerology':numerology};

export function buildPublicTarotReading(flowId,input){
  const flow=tossTarotLibraryFlow(flowId),reader=publicReaders[flowId];
  if(!reader||!flow?.featureKeys.some(isFreeFortuneFeatureKey))throw new Error('TAROT_LIBRARY_FLOW_INVALID');
  const result=reader(input);
  return {...result,cards:cardRows(input)};
}

export {cardRows,interpreted,presentation,sections};
