import {buildPublicTarotReading,cardRows,interpreted,presentation,sections} from '../../lib/tarot/toss-public-readings.mjs';
import {tossTarotLibraryFlow} from '../../lib/tarot/toss-library-flows.mjs';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {buildCelestialMelodyReading} from '../../lib/tarot/celestial-melody-reading.mjs';
import {buildMindscanDeliveryFacts} from '../../lib/tarot/mindscan-reading.mjs';
import {generateOracleConsultation} from '../../lib/tarot/oracle-consultation.mjs';

function relationship(input){
  const {reading}=interpreted(input,'relationship_six_card');
  return presentation('tarot-love-relationship','우리는 무슨 사이?',input.question,'relationship',reading,{opening:reading.opening||reading.storyFlow,
    summary:reading.oneLineMessage||reading.summary,sections:sections([
      {title:'두 사람 사이의 흐름',body:reading.storyFlow||reading.deepReading},
      {title:'지금 확인할 조건',body:reading.realityAndFuture||reading.caution},
    ]),actions:reading.actionPlan||[reading.finalAdvice]});
}

function celestial(input){
  const built=buildCelestialMelodyReading({cards:cardRows(input),payment:{requestId:'toss-library'}});
  const reading=built.reading;
  return presentation('tarot-celestial-harmony','천체의 선율',input.question,'celestial',reading,{opening:reading.summary?.opening||reading.summary?.flow,
    summary:reading.summary?.overall||reading.summary?.coreMessage,sections:sections((reading.cards||[]).map(card=>({
      title:card.planet?.title||card.title,body:card.integration||card.archetypeReading||card.consciousMessage,
    }))),actions:reading.summary?.actions||[]});
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
  if(tossTarotLibraryFlow(flowId)?.featureKeys.some(isFreeFortuneFeatureKey))return buildPublicTarotReading(flowId,input);
  let result;
  switch(flowId){
    case 'tarot-celestial-harmony':result=celestial(input);break;
    case 'tarot-love-relationship':result=relationship(input);break;
    case 'tarot-mindscan':result=mindscan(input);break;
    case 'tarot-prompt-maker':result=await oracle(input,{env,oracleGenerator});break;
    default:throw Object.assign(Error('unsupported_paid_tarot_flow'),{code:'TAROT_LIBRARY_FLOW_INVALID'});
  }
  return {...result,cards:cardRows(input)};
}
