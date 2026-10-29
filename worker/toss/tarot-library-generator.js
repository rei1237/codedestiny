import {buildCelestialMelodyReading} from '../../lib/tarot/celestial-melody-reading.mjs';
import {buildCrystalSoulV3Reading} from '../../lib/tarot/crystal-soul-reading.mjs';
import {buildMindscanDeliveryFacts} from '../../lib/tarot/mindscan-reading.mjs';
import {buildNumerologyContext,buildFallbackInterpretation} from '../../lib/tarot/numerology-tarot.mjs';
import {generateOracleConsultation} from '../../lib/tarot/oracle-consultation.mjs';
import {buildLegacyReadingPayload,interpretTarotReading} from '../../lib/tarot/tarot-interpretation-engine.mjs';
import {buildPremiumYearReading} from '../../lib/tarot/tarot-year-premium.mjs';
import {buildIjikReading} from '../lib/tarot-ijik-reading.js';
import {getTarotCardByAnyId} from '../../lib/tarot/tarot-cards.mjs';

const text=value=>String(value||'').replace(/\s+/g,' ').trim();
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

function relationship(input){
  const {reading}=interpreted(input,'relationship_six_card');
  return presentation('tarot-love-relationship','우리는 무슨 사이?',input.question,'relationship',reading,{opening:reading.opening||reading.storyFlow,
    summary:reading.oneLineMessage||reading.summary,sections:sections([
      {title:'두 사람 사이의 흐름',body:reading.storyFlow||reading.deepReading},
      {title:'지금 확인할 조건',body:reading.realityAndFuture||reading.caution},
    ]),actions:reading.actionPlan||[reading.finalAdvice]});
}

function reunion(input){
  const {reading}=interpreted(input,'reunion_lighthouse_five_card');
  return presentation('tarot-reunion','재회운 등대 타로',input.question,'reunion',reading,{opening:reading.opening,
    summary:reading.summary||reading.oneLineMessage,sections:sections([
      {title:'관계의 현재 거리',body:reading.currentDistance||reading.storyFlow},
      {title:'다시 닿기 전에 볼 신호',body:reading.reconnectionSignal||reading.realityAndFuture},
    ]),actions:reading.actionPlan||[reading.finalAdvice]});
}

function year(input){
  const {reading}=interpreted(input,'yearly_twelve_card');
  const premium=buildPremiumYearReading({reading,year:new Date().getFullYear()});
  return presentation('tarot-year-fortune','십이지신 천운 타로',input.question,'year',premium,{opening:premium.annualOverview?.summary,
    summary:premium.yearTheme?.summary||premium.annualSummary?.summary,sections:sections((premium.monthlyReadings||[]).map(month=>({
      title:`${month.month}월 · ${month.phase||month.zodiacAnimal||'월간 흐름'}`,body:month.reading||month.summary||month.action,
    }))),actions:premium.luckyActions||[]});
}

function celestial(input){
  const built=buildCelestialMelodyReading({cards:cardRows(input),payment:{requestId:'toss-library'}});
  const reading=built.reading;
  return presentation('tarot-celestial-harmony','천체의 선율',input.question,'celestial',reading,{opening:reading.summary?.opening||reading.summary?.flow,
    summary:reading.summary?.overall||reading.summary?.coreMessage,sections:sections((reading.cards||[]).map(card=>({
      title:card.planet?.title||card.title,body:card.integration||card.archetypeReading||card.consciousMessage,
    }))),actions:reading.summary?.actions||[]});
}

function crystal(input){
  const built=buildCrystalSoulV3Reading({gem:input.gem||'amethyst',cards:cardRows(input)});
  const reading=built.readingData;
  return presentation('tarot-crystal-soul','원석 소울 타로',input.question,'crystal',reading,{opening:reading.intro,
    summary:reading.synthesis?.body||reading.synthesis?.gem_message,sections:sections((reading.cards||[]).map(card=>({
      title:`${card.pos_name} · ${card.card_name}`,body:card.reading||card.gem_reading,
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

function mindscan(input){
  const cards=cardRows(input);
  const pairs=cards.map((card,index)=>({mainCardId:card.cardId,subCardId:cards[(index+1)%cards.length].cardId,orientation:card.orientation}));
  const facts=buildMindscanDeliveryFacts(pairs,input.question,'ko');
  if(!facts.ok)throw Object.assign(Error(facts.reason),{code:'TAROT_LIBRARY_GENERATION_FAILED'});
  const reading=facts.base;
  return presentation('tarot-mindscan','말과 행동 사이 타로',input.question,'mindscan',reading,{opening:reading.intro,
    summary:reading.oneLineConclusion||reading.innerHeartSummary?.finalFlow,sections:sections((reading.sections||[]).map(section=>({
      title:section.title||section.positionTitle,body:section.emotionalReading||section.interpretation||section.advice,
    }))),actions:[reading.masterAdvice,...(reading.suggestedMessages||[]).map(item=>item.text)]});
}

function numerology(input){
  const numerology=buildNumerologyContext({birthDate:input.birthDate,topic:'general'});
  const reading=buildFallbackInterpretation({numerology,cards:cardRows(input),topic:'general',question:input.question});
  return presentation('tarot-numerology','수비학 타로',input.question,'numerology',reading,{opening:reading.opening,
    summary:reading.directAnswer,sections:sections((reading.cards||[]).map(card=>({
      title:`${card.positionTitle} · ${card.cardName}`,body:card.contextualInterpretation,
    }))),actions:reading.nextActions||[]});
}

async function oracle(input,{env,oracleGenerator}){
  const generated=await oracleGenerator({spreadTitle:'타로 오라클 상담',category:'general',question:input.question,tone:'consult',
    cards:cardRows(input).map(card=>({cardId:card.cardId,orientation:card.orientation,positionLabel:card.positionLabel}))},{env});
  if(!generated?.ok)throw Object.assign(Error(generated?.reason||'oracle_generation_failed'),{code:'TAROT_LIBRARY_GENERATION_FAILED'});
  const reading=generated.consultation;
  return presentation('tarot-prompt-maker','타로 오라클 상담',input.question,'oracle',reading,{opening:reading.coreQuestion||reading.bigPicture,
    summary:reading.closingLine||reading.categoryFocus,sections:sections((reading.positionReadings||[]).map(item=>({
      title:item.headline,body:item.reading||item.positionAdvice,
    }))),actions:reading.actions||[]});
}

export async function generateTarotLibraryResult(flowId,input,{env={},oracleGenerator=generateOracleConsultation}={}){
  let result;
  switch(flowId){
    case 'tarot-celestial-harmony':result=celestial(input);break;
    case 'tarot-crystal-soul':result=crystal(input);break;
    case 'tarot-ijik':result=ijik(input);break;
    case 'tarot-love-relationship':result=relationship(input);break;
    case 'tarot-mindscan':result=mindscan(input);break;
    case 'tarot-numerology':result=numerology(input);break;
    case 'tarot-prompt-maker':result=await oracle(input,{env,oracleGenerator});break;
    case 'tarot-reunion':result=reunion(input);break;
    case 'tarot-year-fortune':result=year(input);break;
    default:throw Object.assign(Error('unsupported_paid_tarot_flow'),{code:'TAROT_LIBRARY_FLOW_INVALID'});
  }
  return {...result,cards:cardRows(input)};
}
