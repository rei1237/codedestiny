import {ProfileCard,ServiceExecutionTransaction} from '../lib/models.js';
import {computeBirthKey} from '../lib/birth-key.js';
import {profileCardSolarBirth} from '../lib/paid-content-read-access.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {validateSibylYear} from '../lib/sibyl-annual.js';
import {readOrGenerateSibyl} from '../lib/sibyl-report-store.js';
import {guardianPromptForBirth} from '../routes/guardian-image.js';
import {calculateNatalSaju} from '../../lib/korean-calendar/natal.js';
import {toKrStem,toKrBranch} from '../lib/saju-snapshot-from-birth.js';
import {guardianReading} from '../../app/saju-guardian/guardian-reading.ts';
import {TossNativeConsultation} from './models.js';
import {assertNativeIntent} from './native-consultation.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {TossError} from './policy.js';

const services={guardian:{featureKey:'saju-guardian-unlock',page:'/saju-guardian/'},sibyl:{featureKey:'premium-sibyl-dominator',page:'/saju/sibyl/'}};
const missing=()=>{throw new TossError('RESULT_NOT_FOUND',404);};
function contractFor(service,card){
  const key=computeBirthKey(card);
  if(!key||!profileCardSolarBirth(card))throw new TossError('INVALID_PROFILE_BIRTH',400);
  const {featureKey}=services[service];
  return {requestId:key,resultId:key,inputHash:key,featureKey,pricing:getBillingFeaturePricing({featureKey}).pricing};
}
export async function prepareBirthReading(env,auth,service,body,orderId){
  if(typeof body?.profileId!=='string'||!body.profileId||body.profileId.length>150)throw new TossError('PROFILE_REQUIRED',400);
  const profile=await ProfileCard.findOne({userId:auth.ownerId,profileId:body.profileId}).lean();
  if(!profile)throw new TossError('PROFILE_REQUIRED',400);
  const card={profileId:profile.profileId,gender:profile.gender,birth:profile.birth};
  let year;
  try{if(service==='sibyl')year=validateSibylYear(body.year);}catch{throw new TossError('INVALID_YEAR',400);}
  return prepareNativeConsultation(env,auth,{card,year},orderId,contractFor(service,card),service);
}
async function owned(env,auth,service,id){
  const row=await TossNativeConsultation.findOne({...nativeOwnerFilter(auth,service),_id:id,featureKey:services[service].featureKey}).lean();
  if(!row)missing();
  assertNativeIntent(row,auth,contractFor(service,row.input.card));
  await verifiedIntent(env,auth,row);
  return row;
}
// The original form uses the selected hour, minute zero, and the canonical Seoul default.
export function buildGuardianArchive(birth){
  const natal=calculateNatalSaju({birthDate:birth.date,birthTime:birth.timeKnown?String(birth.hour).padStart(2,'0')+':00':undefined,calendarType:'solar'});
  const pillars=Object.fromEntries(Object.entries(natal.pillars).map(([key,value])=>{
    if(!value)return [key,null];
    const stem=toKrStem(value[0]),branch=toKrBranch(value[1]);
    return [key,{ganji:stem+branch,stem,branch}];
  }));
  const reading=guardianReading(pillars,birth.timeKnown),prompt=guardianPromptForBirth(birth);
  if(!reading||!prompt)throw new TossError('INVALID_PROFILE_BIRTH',400);
  return {reading,prompt};
}
export async function readBirthReading(env,auth,service,id,requestedYear,advance){
  const row=await owned(env,auth,service,id),birth=profileCardSolarBirth(row.input.card);
  if(service==='guardian'){
    if(row.savedResult)return {status:200,body:{ok:true,archive:row.savedResult}};
    if(!advance)return {status:202,body:{ok:true,status:'pending'}};
    const filter={...nativeOwnerFilter(auth,service),_id:id,orderId:row.orderId,status:'paid'};
    await TossNativeConsultation.updateOne({...filter,savedResult:null},{$set:{savedResult:buildGuardianArchive(birth)}});
    const saved=await owned(env,auth,service,id);
    if(!saved.savedResult)throw new TossError('SAVE_UNCONFIRMED',503);
    return {status:200,body:{ok:true,archive:saved.savedResult}};
  }
  const year=Number(requestedYear||row.input.year);
  if(!Number.isInteger(year)||year<1000||year>9999)throw new TossError('INVALID_YEAR',400);
  const prefix='toss-sibyl:'+id+':';
  const filter={userId:auth.ownerId,featureKey:row.featureKey,reportType:'sibylAnnual',orderId:row.orderId};
  const records=await ServiceExecutionTransaction.find({...filter,executionKey:{$regex:'^'+prefix+'[0-9]{4}$'}}).select('executionKey status').lean();
  const years=records.map(r=>Number(r.executionKey.slice(prefix.length))).sort((a,b)=>a-b);
  const doc=await ServiceExecutionTransaction.findOne({...filter,executionKey:prefix+year}).lean();
  if(doc?.status==='success'&&doc.metadata?.archive?.chapters?.length){
    const {recordsHref,...archive}=doc.metadata.archive;
    return {status:200,body:{ok:true,archive,year,years}};
  }
  // An unfinished report and the year chosen at purchase survive the calendar rollover.
  const resumeYear=!!doc||year===row.input.year;
  if(!resumeYear){try{validateSibylYear(year);}catch{throw new TossError('INVALID_YEAR',400);}}
  if(!advance)return {status:200,body:{ok:true,status:doc?'generating':'unopened',year,years}};
  const result=await readOrGenerateSibyl(env,auth.ownerId,{card:row.input.card,birth,tossIntentId:id,tossResumeYear:resumeYear?year:null,purchaseEvidence:{paymentId:row.orderId,orderId:row.orderId,evidenceId:prefix+year}},year);
  await owned(env,auth,service,id);
  const {recordsHref,...body}=result.body;
  if(result.status!==200)return {status:result.status,body:{...body,year,years}};
  return {status:200,body:{ok:true,archive:body,year,years:[...new Set([...years,year])].sort()}};
}
export async function birthLibraryItem(env,auth,purchase){
  const service=purchase.nativeService,definition=services[service];
  if(!definition||purchase.featureKey!==definition.featureKey||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment)missing();
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!purchase.requestId)return {state:'UNASSIGNED',href:definition.page+'?orderId='+encodeURIComponent(purchase._id)};
  const row=await owned(env,auth,service,purchase.requestId);
  if(row.orderId!==purchase._id)missing();
  const complete=row.savedResult||service==='sibyl'&&await ServiceExecutionTransaction.exists({userId:auth.ownerId,featureKey:row.featureKey,orderId:row.orderId,executionKey:{$regex:'^toss-sibyl:'+row._id+':[0-9]{4}$'},status:'success'});
  return {state:complete?'COMPLETED':'PENDING',href:definition.page+'?intentId='+row._id,resultId:row._id,question:service==='guardian'?'나의 사주 가디언':'시빌라 연간 대비 리포트'};
}
