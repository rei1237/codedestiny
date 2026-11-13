import {ownedNarrative} from './owned-narrative.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {dreamPsychoNarrativeAdapter,seedDreamPsychoNarrative} from '../routes/dream.js';
import {normalizeDreamText} from '../../lib/tarot/dream-prompt.mjs';
import {TossError} from './policy.js';
import {hash} from './crypto.js';
const featureKey='dream-psycho-analysis';
async function dreamContract(body){
  const dream=normalizeDreamText(body);
  if(!dream.ok||typeof body?.dreamText!=='string'||!/^dream-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body?.requestId)||Object.keys(body).some(k=>!['requestId','dreamText'].includes(k)))throw new TossError('INVALID_INPUT',400);
  const input={requestId:body.requestId,dreamText:dream.text};
  const {pricing}=getBillingFeaturePricing({featureKey});
  return {input,contract:{requestId:input.requestId,resultId:input.requestId,inputHash:await hash(JSON.stringify(input)),featureKey,pricing}};
}
export const {prepare:prepareDream,read:readDream,libraryItem:dreamLibraryItem,verifyRecovery:verifyDreamRecovery}=ownedNarrative({service:'dream',featureKey,reportType:'dreamPsychoAnalysis',route:'/dream/psycho/',contractFor:dreamContract,adapter:dreamPsychoNarrativeAdapter,seed:seedDreamPsychoNarrative,question:input=>input.dreamText});
