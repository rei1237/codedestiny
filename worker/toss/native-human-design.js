import {validateTossHumanDesignBirth} from './human-design.js';
import {normalizeBirthBody,computeInputHash} from '../lib/human-design-birth-input.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {handleHumanDesignReportRoutes,nativeHumanDesignStoredState} from '../routes/human-design-report.js';
import {TossNativeConsultation,TossIdentity} from './models.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {assertNativeIntent} from './native-consultation.js';
import {bindNativeTossRequest} from './native-context.js';
import {nativeFailureResponse} from './native-failure.js';
import {TossError} from './policy.js';
import {unseal} from './crypto.js';

const service='human-design',featureKey='human-design-report';
const denied=()=>{throw new TossError('RESULT_NOT_FOUND',404);};
const find=(auth,id)=>TossNativeConsultation.findOne({_id:id,...nativeOwnerFilter(auth,service)}).lean();
export async function prepareNativeHumanDesign(env,auth,body,orderId){
 if(!/^human-design-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body?.requestId||''))throw new TossError('INVALID_INPUT');
 const birth=normalizeBirthBody(body);
 validateTossHumanDesignBirth({birth});
 const inputHash=await computeInputHash(birth),input={birth,locale:'ko',requestId:body.requestId};
 return prepareNativeConsultation(env,auth,input,orderId,{requestId:body.requestId,resultId:body.requestId,inputHash,featureKey,pricing:getBillingFeaturePricing({featureKey}).pricing},service);
}
function contextFor(env,auth,row){
 async function check(doc){
  assertNativeIntent(row,auth);
  if(row.nativeService!==service||row.featureKey!==featureKey)denied();
  if(doc&&(String(doc.userId)!==String(auth.userId)||doc.accessSource!=='toss'||doc.billingRequestId!==row.requestId||doc.inputHash!==row.inputHash||doc.locale!=='ko'||doc.paymentId!==row.orderId))denied();
  return verifiedIntent(env,auth,row);
 }
 return {auth:{userId:auth.userId,tossNative:true},assertStored:check,
  async access(requestId,input){if(requestId!==row.requestId||input.inputHash!==row.inputHash||input.locale!=='ko')throw new TossError('REQUEST_INPUT_MISMATCH',409);await check();return {proven:true,source:'toss',transactionId:row.orderId};}};
}
export async function readNativeHumanDesign(env,auth,id,advance){
 const row=await find(auth,id);assertNativeIntent(row,auth);
 const context=contextFor(env,auth,row);await context.assertStored();
 const doc=await nativeHumanDesignStoredState(env,auth.userId,row.requestId);
 if(doc)await context.assertStored(doc);
 if(!doc&&!advance)return Response.json({ok:true,status:'generating',progress:{completed:0,total:18},sections:[],retryable:true},{status:202});
 const path=!doc?'/start':advance&&doc.status!=='completed'?'/generate':'/result';
 const url=new URL('https://internal.invalid/api/human-design-report'+path);
 if(path==='/result')url.searchParams.set('reportId',doc.id);
 const forwarded=new Request(url,{method:path==='/result'?'GET':'POST',headers:{'Content-Type':'application/json'},...(path==='/result'?{}:{body:JSON.stringify(path==='/start'?row.input:{reportId:doc.id})})});
 bindNativeTossRequest(forwarded,context);
 const response=await handleHumanDesignReportRoutes(forwarded,env);
 if(response.ok){const saved=await nativeHumanDesignStoredState(env,auth.userId,row.requestId);if(!saved)throw new TossError('RESULT_STORAGE_UNAVAILABLE',503);await context.assertStored(saved);}
 return nativeFailureResponse(response);
}
export async function nativeHumanDesignLibraryItem(env,auth,purchase){
 if(!purchase.requestId)return {state:'UNASSIGNED',href:'/human-design/report/?orderId='+encodeURIComponent(purchase._id)};
 const row=await find(auth,purchase.requestId);assertNativeIntent(row,auth);
 if(row.orderId!==purchase._id)denied();
 const doc=await nativeHumanDesignStoredState(env,auth.userId,row.requestId);await contextFor(env,auth,row).assertStored(doc);
 return {state:doc?.status==='completed'?'COMPLETED':doc?.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId:row._id,href:'/human-design/report/?intentId='+encodeURIComponent(row._id),question:'휴먼 디자인 프리미엄 리포트'};
}
export async function bindNativeHumanDesignRecovery(request,env,doc){
 if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
 const row=await TossNativeConsultation.findOne({nativeService:service,ownerId:doc.userId,requestId:doc.billingRequestId}).lean();
 if(!row)denied();
 const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
 if(!identity)throw new TossError('SESSION_EXPIRED',401);
 const auth={...identity,userId:String(row.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
 const context=contextFor(env,auth,row);await context.assertStored(doc);bindNativeTossRequest(request,context);
}
