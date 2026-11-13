import {buildPublicTarotReading,cardRows,presentation} from '../../lib/tarot/toss-public-readings.mjs';
import {tossTarotLibraryFlow} from '../../lib/tarot/toss-library-flows.mjs';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {resolveOracleConsultationTier} from '../../lib/tarot/oracle-consultation-pricing.mjs';
import {buildCelestialMelodyReading} from '../../lib/tarot/celestial-melody-reading.mjs';

function result(flow,input,reading,cards,chapters,summary=''){
  const view=presentation(flow.id,flow.name,input.question,flow.resultKind,reading,{summary,sections:chapters.filter(row=>row.body)});
  return {...view,cards,source:'llm'};
}

const chartFields=['cardMeaning','planetMeaning','archetypeReading','consciousMessage','unconsciousPattern','shadowWarning','soulLesson','integrationPractice'];
const chartSummary={strongestPlanetSignal:'가장 선명한 행성의 신호',deepestShadow:'내면의 그림자',soulLesson:'영혼의 과제',integrationPath:'통합의 길',planetHighlights:'행성의 메시지',practices:'오늘의 조율',ritualPlan:'일주일의 실천',insightMatrix:'분야별 흐름',finalOracle:'마지막 오라클',closingFortune:'오늘의 별빛 운세'};
const prose=value=>typeof value==='string'?value:Object.values(value||{}).map(prose).filter(Boolean).join('\n\n');

async function celestial(flow,input,{env,execution,checkpoint,celestialEngine}){
  const {advance,complete,render,prompt}=celestialEngine||await defaultCelestial();
  const reading=buildCelestialMelodyReading({cards:cardRows(input),payment:{requestId:execution.requestId,transactionId:execution.orderId,accessType:'toss'}}).reading;
  const snapshot=execution.tossTarotCheckpoint||{reading,locale:'ko',prompt:prompt(reading,null),delivery:{version:1,parts:{},attempts:{},invalidAttempts:{}}};
  if(!complete(snapshot.delivery)){
    const wave=await advance(env,snapshot,async delivery=>checkpoint({...snapshot,delivery}));
    snapshot.delivery=wave.delivery;
    if(!complete(wave.delivery))return {pending:true,retryable:!wave.limited};
  }
  const full=render(snapshot);
  full.meta.deliveryStatus='completed';
  const chapters=full.cards.map(card=>({title:card.planetKo+' · '+card.cardNameKo,body:chartFields.map(key=>card[key]).filter(Boolean).join('\n\n')}));
  for(const [key,title] of Object.entries(chartSummary))chapters.push({title,body:prose(full.summary[key])});
  return result(flow,input,full,cardRows(input),chapters,full.summary.overallTheme);
}
async function defaultCelestial(){
  const {generateCelestialWave:advance,celestialDeliveryComplete:complete,celestialReadingFromDelivery:render}=await import('../lib/celestial-report-delivery.js');
  const {buildCelestialHarmonyPrompt:prompt}=await import('../routes/celestial-harmony.js');
  return {advance,complete,render,prompt};
}

async function runNarrative(env,owner,featureKey,body,verify){
  const {runPaidNarrativeDelivery,paidNarrativeInputHash}=await import('../lib/paid-narrative-delivery.js');
  let adapter,seed;
  if(featureKey==='tarot-mindscan'){
    const {mindscanNarrativeAdapter,seedMindscanNarrative}=await import('../lib/mindscan-delivery.js');
    adapter=mindscanNarrativeAdapter(env);
    seed=original=>seedMindscanNarrative(env,owner,original);
  }else if(featureKey==='tarot-love-relationship'){
    const {loveTarotNarrativeAdapter,seedLoveTarot}=await import('../lib/love-tarot-delivery.js');
    const {buildLoveTarotBase}=await import('../routes/tarot.js');
    adapter=loveTarotNarrativeAdapter(env);
    seed=original=>seedLoveTarot(env,owner,original,buildLoveTarotBase);
  }else{
    const {tarotOracleNarrativeAdapter,seedTarotOracleNarrative}=await import('../lib/tarot-oracle-delivery.js');
    adapter=tarotOracleNarrativeAdapter(env);
    seed=original=>seedTarotOracleNarrative(original,env);
  }
  const response=await runPaidNarrativeDelivery(new Request('https://internal.invalid/toss-tarot',{method:'POST'}),env,{userId:owner},body,{
    ...adapter,seed,featureKey,generationOrigin:'toss',verify:async original=>{
      if(original.transactionId!==body.transactionId||paidNarrativeInputHash(original)!==paidNarrativeInputHash(body))throw Error('TAROT_INPUT_MISMATCH');
      await verify();
    },
  });
  return response.json();
}

export async function generateTarotLibraryResult(flowId,input,options={}){
  const flow=tossTarotLibraryFlow(flowId);
  if(flow?.featureKeys.some(isFreeFortuneFeatureKey))return buildPublicTarotReading(flowId,input);
  const {env={},execution,owner,verify,deal,narrate=runNarrative}=options;
  if(!execution||!flow?.featureKeys.includes(execution.featureId)||!owner||!verify)throw Error('TAROT_VERIFIED_ORDER_REQUIRED');
  if(flow.resultKind==='celestial')return celestial(flow,input,options);
  const body={requestId:execution.requestId,transactionId:execution.orderId,locale:'ko',question:input.question};
  let cards;
  if(flow.resultKind==='oracle'){
    if(resolveOracleConsultationTier(input.cards.length).featureKey!==execution.featureId)throw Error('TAROT_TIER_MISMATCH');
    Object.assign(body,{spreadTitle:input.spreadTitle,category:input.category,tone:'consult',cards:input.cards});
    cards=cardRows(input);
  }else if(['mindscan','relationship'].includes(flow.resultKind)){
    const serverDeal=deal||(await import('../lib/paid-tarot-draw.js')).createPaidTarotDraw;
    body.drawId=execution.requestId;
    const draw=await serverDeal(env,{featureKey:flow.id,drawId:body.drawId,picks:input.picks});
    cards=cardRows({cards:draw.cards.map((card,index)=>({...card,position:flow.positions[index][0],positionLabel:flow.positions[index][1]}))});
    if(flow.resultKind==='mindscan'){
      body.pairs=draw.cards.slice(0,5).map((card,index)=>({mainCardId:card.cardId,subCardId:draw.cards[index+5].cardId}));
    }else Object.assign(body,{cards:draw.cards,userQuestion:input.question});
  }else throw Error('TAROT_LIBRARY_FLOW_INVALID');
  const report=await narrate(env,owner,execution.featureId,body,verify);
  if(report.status!=='completed'||!report.saved){
    if(!report.ok&&!(report.reason==='DELIVERY_REVIEW_REQUIRED'&&report.resultId))throw Error(report.code||report.reason||'TAROT_LIBRARY_GENERATION_FAILED');
    return {pending:true,retryable:report.retryable!==false};
  }
  const chapters=report.deliverySections||report.sections;
  if(!Array.isArray(chapters)||!chapters.length)throw Error('TAROT_REPORT_INCOMPLETE');
  if(flow.resultKind==='mindscan')cards=cards.map((card,index)=>({...card,orientation:report.reading.sections[index%5].orientation||card.orientation}));
  return {...result(flow,input,report.reading||report.consultation,cards,chapters.map(({title,body})=>({title,body}))),...(flow.resultKind==='oracle'?{spreadId:input.spreadId,category:input.category}:{})};
}
