import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {calculateSajuCompatPremiumFacts,normalizeSajuCompatPremiumInput} from '../lib/saju-compat-premium-facts.js';
import {SAJU_COMPAT_PREMIUM_GROUPS,assembleSajuCompatPremiumResult,isSajuCompatPremiumGroupUsable} from '../lib/saju-compat-premium-prompt.js';
import {sajuAuthorityOn} from '../lib/saju-authority-consumer.js';
import {EDGE_RESPONSE_DEADLINE_MS} from '../lib/sync-llm-timeout.js';
import {generateSajuCompatPremiumGroup} from '../routes/saju-compat-premium.js';
import {hash} from './crypto.js';
import {TossNativeConsultation} from './models.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {TossError} from './policy.js';

const service='saju-compat-premium';
const page='/saju/compatibility/premium/';
const owned=(auth,id)=>({...nativeOwnerFilter(auth,service),featureKey:service,_id:id});

export async function preparePremiumCompat(env,auth,body,orderId){
  const requestId=body?.requestId;
  if(typeof requestId!=='string'||!/^scp-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(requestId))throw new TossError('INVALID_INPUT',400);
  const normalized=normalizeSajuCompatPremiumInput(body);
  if(!normalized.ok)throw new TossError('INVALID_INPUT',400);
  const inputHash=await hash(JSON.stringify(normalized.input));
  const pricing=getBillingFeaturePricing({featureKey:service}).pricing;
  const contract={requestId,resultId:requestId,inputHash,featureKey:service,pricing};
  // Keep the facts in the original paid input. A resumed report does not recalculate for a different year.
  let facts;
  try{facts=calculateSajuCompatPremiumFacts(normalized.input,{authorityEnabled:sajuAuthorityOn(env)});}
  catch{throw new TossError('CALCULATION_FAILED',422);}
  return prepareNativeConsultation(env,auth,{...normalized.input,requestId,facts},orderId,contract,service);
}

export function premiumCompatView(row){
  const saved=row.savedResult||{};
  const completed=SAJU_COMPAT_PREMIUM_GROUPS.filter(group=>isSajuCompatPremiumGroupUsable(saved.groups?.[group.key],group)).length;
  return {completed,retry:saved.retry===true,...(saved.result?{result:saved.result}:{})};
}

export async function readPremiumCompat(env,auth,id,advance){
  const filter=owned(auth,id);
  const row=await verifiedIntent(env,auth,await TossNativeConsultation.findOne(filter).lean());
  const current=premiumCompatView(row);
  if(!advance||current.result)return current;
  const started=new Date();
  const lock=await TossNativeConsultation.findOneAndUpdate({...filter,status:'paid',savedResult:row.savedResult??null,
    $or:[{generationStartedAt:null},{generationStartedAt:{$lt:new Date(+started-180000)}}]},
    {$set:{generationStartedAt:started}},{new:true}).lean();
  if(!lock)return current;

  const groups={...lock.savedResult?.groups};
  const next=SAJU_COMPAT_PREMIUM_GROUPS.find(group=>!isSajuCompatPremiumGroupUsable(groups[group.key],group));
  const savedResult={groups,retry:false};
  if(next){
    try{
      groups[next.key]=await generateSajuCompatPremiumGroup(env,lock.input.facts,next,{
        deadlineAt:+started+EDGE_RESPONSE_DEADLINE_MS-12000,finalAttempt:Boolean(groups[next.key]),previous:groups[next.key],
      });
    }catch{groups[next.key]={key:next.key,ok:false,reason:'GENERATION_INTERRUPTED'};}
    savedResult.retry=!isSajuCompatPremiumGroupUsable(groups[next.key],next);
  }
  const result=assembleSajuCompatPremiumResult(Object.values(groups),lock.input.facts);
  if(result)savedResult.result=result;
  await verifiedIntent(env,auth,lock);
  const updated=await TossNativeConsultation.findOneAndUpdate({...filter,status:'paid',generationStartedAt:started},
    {$set:{savedResult,generationStartedAt:null}},{new:true}).lean();
  return premiumCompatView(await verifiedIntent(env,auth,updated||await TossNativeConsultation.findOne(filter).lean()));
}

export async function premiumCompatLibraryItem(env,auth,purchase){
  if(purchase.nativeService!==service||purchase.featureKey!==service||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment)throw new TossError('RESULT_NOT_FOUND',404);
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!purchase.requestId)return {state:'UNASSIGNED',href:page+'?orderId='+encodeURIComponent(purchase._id)};
  const row=await verifiedIntent(env,auth,await TossNativeConsultation.findOne({...owned(auth,purchase.requestId),orderId:purchase._id}).lean());
  const view=premiumCompatView(row);
  return {state:view.result?'COMPLETED':view.retry?'GENERATION_FAILED':'PENDING',resultId:row._id,
    href:page+'result/?resultId='+encodeURIComponent(row._id),question:row.input.facts.relationLabel+' · 사주 고급 궁합'};
}
