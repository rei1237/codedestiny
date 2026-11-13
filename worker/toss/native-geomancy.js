import chartEngine from '../../js/services/geomancy-chart.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {geomancyNarrativeAdapter,seedGeomancyNarrative} from '../routes/oracle.js';
import {hash} from './crypto.js';
import {TossError} from './policy.js';
import {ownedNarrative} from './owned-narrative.js';

const featureKey='geomancy';
async function contractFor(body){
  const counts=body?.counts;
  if(!Array.isArray(counts)||counts.length!==16||!counts.every(n=>Number.isInteger(n)&&n>=8&&n<=29)||
    !['alchemist','sultan'].includes(body.theme)||typeof body.question!=='string'||body.question.trim().length<2||
    body.question.length>500||!/^geomancy-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body.requestId)||
    Object.keys(body).some(key=>!['requestId','question','theme','counts'].includes(key)))throw new TossError('INVALID_INPUT',400);
  const input={requestId:body.requestId,question:body.question.trim(),theme:body.theme,counts};
  const {pricing}=getBillingFeaturePricing({featureKey});
  return {input,contract:{requestId:input.requestId,resultId:input.requestId,inputHash:await hash(JSON.stringify(input)),featureKey,pricing}};
}
function seed(input){
  const chart=chartEngine.fromCounts(input.counts);
  const card=(figure,role)=>chartEngine.toOracleCardPayload(chartEngine.findFig(figure),input.theme,role);
  return seedGeomancyNarrative({...input,chart,cards:{
    cause:card(chart.witnesses[0],'원인'),flow:card(chart.witnesses[1],'흐름'),judge:card(chart.judge,'신탁'),
  }});
}
export const {prepare:prepareGeomancy,read:readGeomancy,libraryItem:geomancyLibraryItem,verifyRecovery:verifyGeomancyRecovery}=ownedNarrative({
  service:'geomancy',featureKey,reportType:'geomancyOracle',route:'/geomancy/',contractFor,adapter:geomancyNarrativeAdapter,seed,question:input=>input.question,
});
