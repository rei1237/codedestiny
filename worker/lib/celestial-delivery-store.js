import { createHash, randomUUID } from "node:crypto";
import { ServiceExecutionTransaction } from "./models.js";
import { connectDb } from "./db.js";
import { json } from "./http.js";
import { getAmbientAiLocale } from "./ai-locale-context.js";
import { isPaidResultRevoked } from "./paid-result-revocation.js";
import { celestialDeliveryComplete, celestialDeliveryExhausted, celestialReadingFromDelivery, generateCelestialWave } from "./celestial-report-delivery.js";
import { failServiceExecution } from "./service-execution-task.js";
import { STUCK_LIVE_LEASE_MS, logStuckSettled, logStuckUnsettled } from "./paid-delivery-stuck.js";

const FEATURE="tarot-celestial-harmony";
const SERVICE="celestial-harmony";
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const failure=id=>Object.assign(new Error("Result storage unavailable"),{code:"RESULT_STORAGE_UNAVAILABLE",resultId:id,status:503});
function originalBody(body) {
  return JSON.parse(JSON.stringify(body, (key,value)=>/^(?:premiumAccessToken|_premiumAccessToken|accessToken|token|authorization)$/i.test(key)?undefined:value));
}
export async function findCelestialDelivery(env,userId,id) {
  try {
    await connectDb(env);
    return await ServiceExecutionTransaction.findOne({userId,featureKey:FEATURE,executionKey:id}).lean();
  } catch { throw failure(id); }
}
async function save(filter,fields) {
  try {
    const written=await ServiceExecutionTransaction.findOneAndUpdate(filter,{$set:fields},{returnDocument:"after"}).lean();
    if(!written)throw failure(filter.executionKey);
    const confirmed=await ServiceExecutionTransaction.findOne({userId:filter.userId,executionKey:filter.executionKey}).lean();
    for(const[key,value]of Object.entries(fields))if(JSON.stringify(confirmed?.[key])!==JSON.stringify(value))throw failure(filter.executionKey);
    return confirmed;
  } catch { throw failure(filter.executionKey); }
}
export function celestialPending(doc) {
  const snapshot=doc.metadata.celestialDelivery;
  return json({ok:true,retryable:true,resultId:doc.executionKey,resumeBody:{resumeResultId:doc.executionKey},
    status:snapshot.delivery.parts && Object.keys(snapshot.delivery.parts).length?"partial":"generating",completedParts:Object.keys(snapshot.delivery.parts),totalParts:12,
    result:celestialReadingFromDelivery(snapshot),archiveSaved:false},{status:202});
}
// 2026-11-18 S3-K: 저장된 파트가 하나도 없이 시도를 다 쓴 요청의 종결. 같은 결제 실행 문서를 자동 환불로 닫는다.
// 정산기는 잠금이 풀린 실행만 환불하고, 쿠폰·월정석은 sourceTransactionId, 이용권은 (기능, idempotencyKey) 증빙,
// 카드는 paymentRef 로 원 결제를 찾는다. 정산이 실패하면 pending 으로 남아 다음 요청·복구 cron 이 다시 닫는다.
const celestialFailed=(doc,refunded)=>json({ok:false,retryable:false,code:"CELESTIAL_GENERATION_FAILED",resultId:doc.executionKey,refunded,
  message:"리딩을 완성하지 못했습니다. 결제한 금액·이용권·월정석은 자동으로 환불됩니다."},{status:503});
const refundedDoc=doc=>doc?.status==="refunded";
async function refundCelestialFailure(env,userId,doc) {
  if(doc.status!=="pending")return refundedDoc(doc);
  const closed=await failServiceExecution(env,userId,{executionKey:doc.executionKey,reasonCode:"CELESTIAL_GENERATION_FAILED",
    reasonMessage:"천체의 선율 리딩을 완성하지 못했습니다.",failureStage:"generation",forceRefundOnClose:true}).catch(error=>{
    console.error("[celestial-harmony] generation failure refund failed",{message:String(error?.message||error).slice(0,300)});return null;});
  return closed?.execution?.status==="refunded"||closed?.settlement?.status==="refunded";
}
async function closeCelestialFailure(env,userId,doc) {
  return celestialFailed(doc,await refundCelestialFailure(env,userId,doc));
}
// 저장된 파트 없이 끝난 실행을 실패로 표시하고 정산기가 원 결제를 찾을 증빙을 남긴 뒤 잠금을 푼다(소진 종결·정체 확정 공용).
async function markCelestialFailed(filter,stored,snapshot,body,access,cost) {
  stored=await save(filter,{metadata:{...stored.metadata,celestialDelivery:{...snapshot,failed:true},
    billing:{requestId:body.requestId||"",purchaseId:body.purchaseId||"",sessionId:body.sessionId||"",reportId:body.reportId||""}},
    sourceTransactionId:String(access.matchedTransactionId||"").slice(0,120),cost,
    paymentRef:{paymentId:String(body.payment?.paymentId||body.paymentId||""),merchantUid:String(body.payment?.merchantUid||body.merchantUid||"")}});
  // 정산기는 잠긴 실행을 환불하지 않는다(settleExecutionById lockClauses).
  await ServiceExecutionTransaction.updateOne(filter,{$set:{"lock.token":"","lock.until":null}});
  return {...stored,lock:{token:"",until:null}};
}
async function revoked(userId,doc,body) {
  return ["refunded","cancelled"].includes(doc?.status) || await isPaidResultRevoked(userId,FEATURE,[doc?.executionKey,body.requestId,body.transactionId,body.paymentId,body.purchaseId,body.payment?.paymentId,body.payment?.requestId]);
}
export async function runCelestialDelivery(request,env,auth,supplied,{verify,legacy,buildReading,buildPrompt,cost=0}) {
  const id=supplied.resumeResultId || `celestial-checkpoint:${hash([String(auth.userId),supplied.requestId||supplied.reportId||supplied.transactionId||supplied.sessionId])}`;
  if(typeof id!=="string" || id.length>120)return json({ok:false,code:"INVALID_RESULT_ID"},{status:422});
  let stored=await findCelestialDelivery(env,auth.userId,id);
  if(supplied.resumeResultId&&!stored)return json({ok:false,code:"RESULT_NOT_FOUND"},{status:404});
  const body=stored?.metadata?.celestialDelivery?.body || supplied;
  if(![body.requestId,body.reportId,body.transactionId,body.sessionId].some(Boolean))return json({ok:false,code:"REQUEST_ID_REQUIRED"},{status:422});
  if(stored && supplied.cards && hash(supplied.cards)!==hash(body.cards))return json({ok:false,code:"INPUT_HASH_MISMATCH"},{status:409});
  if(stored?.metadata?.celestialDelivery?.failed)return closeCelestialFailure(env,auth.userId,stored);
  const access=await verify(body);
  if(!access?.ok)return json({ok:false,code:access?.code||"PAYMENT_REQUIRED"},{status:Number(access?.status)||402});
  if(await revoked(auth.userId,stored,body))return json({ok:false,code:"PAYMENT_REVOKED",retryable:false},{status:403});
  if(stored?.premiumStatus==="completed")return json({ok:true,archiveSaved:true,result:stored.metadata.result});
  if(!stored) {
    const old=await legacy(body);if(old)return json({ok:true,archiveSaved:true,source:"restored",result:old});
    if(!Array.isArray(body.cards)||body.cards.length!==11)return json({ok:false,code:"CARDS_REQUIRED"},{status:422});
  }
  const now=new Date(),token=randomUUID();
  if(!stored) {
    const reading=buildReading(body,access);
    const snapshot={body:originalBody(body),reading,locale:getAmbientAiLocale()||"ko",prompt:buildPrompt(reading,body.goldenCard),delivery:{version:1,parts:{},attempts:{},invalidAttempts:{}},limited:false};
    try {
      const inserted=await ServiceExecutionTransaction.findOneAndUpdate({userId:auth.userId,executionKey:id},{$setOnInsert:{userId:auth.userId,executionKey:id,featureKey:FEATURE,reportType:"celestialHarmony",reportId:body.reportId||"",sessionId:body.sessionId||"",idempotencyKey:body.requestId||"",status:"pending",premiumStatus:"generating",timeoutAt:new Date(now.getTime()+600000),retentionUntil:null,metadata:{celestialDelivery:snapshot},lock:{token,until:new Date(now.getTime()+120000)},createdAt:now}},{upsert:true,returnDocument:"after"}).lean();
      if(!inserted)throw failure(id);
      stored=await findCelestialDelivery(env,auth.userId,id);
      if(!stored)throw failure(id);
    } catch { throw failure(id); }
  } else {
    if(stored.lock?.token && new Date(stored.lock.until).getTime()>Date.now())return celestialPending(stored);
    try {
      const claim=await ServiceExecutionTransaction.findOneAndUpdate({userId:auth.userId,executionKey:id,status:"pending",updatedAt:stored.updatedAt,"lock.token":stored.lock?.token??null},{$set:{lock:{token,until:new Date(now.getTime()+120000)}}},{returnDocument:"after"}).lean();
      if(!claim)return celestialPending(stored);
      stored=claim;
    } catch { throw failure(id); }
  }
  if(stored.lock?.token!==token)return celestialPending(stored);
  const filter={userId:auth.userId,executionKey:id,status:"pending","lock.token":token};
  let snapshot=stored.metadata.celestialDelivery;
  try {
    if(!celestialDeliveryComplete(snapshot.delivery)) {
      const wave=await generateCelestialWave(env,snapshot,async delivery=>{
        snapshot={...snapshot,delivery};stored=await save(filter,{metadata:{...stored.metadata,celestialDelivery:snapshot}});
      });
      snapshot={...snapshot,delivery:wave.delivery,limited:wave.limited};
      stored=await save(filter,{metadata:{...stored.metadata,celestialDelivery:snapshot}});
    }
    if(!celestialDeliveryComplete(snapshot.delivery)) {
      if(!celestialDeliveryExhausted(snapshot.delivery))return celestialPending(stored);
      // 저장된 파트가 있으면 빈 파트를 건너뛰고(meta.skippedParts) 아래에서 전달한다.
      if(!Object.keys(snapshot.delivery.parts).length) {
        stored=await markCelestialFailed(filter,stored,snapshot,body,access,cost);
        return await closeCelestialFailure(env,auth.userId,stored);
      }
    }
    const result=celestialReadingFromDelivery(snapshot);
    result.meta.deliveryStatus="completed";
    stored=await save(filter,{metadata:{...stored.metadata,result},premiumStatus:"generating"});
    if(await revoked(auth.userId,stored,body))return json({ok:false,code:"PAYMENT_REVOKED",retryable:false},{status:403});
    stored=await save(filter,{status:"success",premiumStatus:"completed",deliveryStatus:"delivered",completedAt:new Date()});
    return json({ok:true,archiveSaved:true,result:stored.metadata.result});
  } finally {
    await ServiceExecutionTransaction.updateOne({userId:auth.userId,executionKey:id,"lock.token":token},{$set:{"lock.token":"","lock.until":null}}).catch(()=>{});
  }
}

// 2026-11-24 복구 크론 정체 자동 확정(S16). 진전 없는 결제 건 중 저장된 파트가 하나도 없는 것만 소진 종결과 같은
// 증빙 저장 → 잠금 해제 → 즉시 자동 환불로 닫는다. 저장된 파트가 있거나(체크포인트 가드도 환불하지 않는다)
// 결제를 확인할 수 없거나 이미 회수된 건은 쓰지 않고 경보만 남겨 이어쓰기에 둔다. 환불이 실패한 실패 건은 다음 확정이 다시 닫는다.
export async function settleStuckCelestialDelivery(env,{doc,now=Date.now(),verify,cost=0}={}) {
  if(!doc?.userId||!doc?.executionKey)return {outcome:"unsupported"};
  const userId=String(doc.userId),id=String(doc.executionKey),stalls=Number(doc.deliveryWatch?.stalls||0);
  const settled=refunded=>{const refundStatus=refunded?"refunded":"pending";
    if(!refunded)logStuckUnsettled(SERVICE,doc);
    logStuckSettled({service:SERVICE,sessionId:id,outcome:"generation_failed",refundStatus,stalls});return {outcome:"generation_failed",refundStatus};};
  let fresh;
  try { fresh=await findCelestialDelivery(env,userId,id); } catch { return {outcome:"pending"}; }
  const snapshot=fresh?.metadata?.celestialDelivery;
  if(!fresh||fresh.status!=="pending"||fresh.premiumStatus==="completed"||!snapshot?.delivery)return {outcome:"progressed"};
  if(snapshot.failed)return settled(await refundCelestialFailure(env,userId,fresh));
  if(now-new Date(fresh.updatedAt||0).getTime()<STUCK_LIVE_LEASE_MS||(fresh.lock?.token&&new Date(fresh.lock.until||0).getTime()>now))return {outcome:"leased"};
  if(Object.keys(snapshot.delivery.parts||{}).length){logStuckUnsettled(SERVICE,doc);return {outcome:"unsettled"};}
  const body=snapshot.body||{};
  let access;
  try {
    access=await verify(body,{userId});
    if(access?.ok&&await revoked(userId,fresh,body))access=null;
  } catch { return {outcome:"pending"}; }
  if(!access?.ok){logStuckUnsettled(SERVICE,doc);return {outcome:"unsettled"};}
  const token=randomUUID();
  let stored;
  try {
    stored=await ServiceExecutionTransaction.findOneAndUpdate({userId,executionKey:id,status:"pending",updatedAt:fresh.updatedAt,"lock.token":fresh.lock?.token??null},
      {$set:{lock:{token,until:new Date(now+120000)}}},{returnDocument:"after"}).lean();
  } catch { return {outcome:"pending"}; }
  if(!stored||stored.lock?.token!==token)return {outcome:"progressed"};
  try {
    stored=await markCelestialFailed({userId,executionKey:id,status:"pending","lock.token":token},stored,snapshot,body,access,cost);
  } catch {
    await ServiceExecutionTransaction.updateOne({userId,executionKey:id,"lock.token":token},{$set:{"lock.token":"","lock.until":null}}).catch(()=>{});
    return {outcome:"pending"};
  }
  return settled(await refundCelestialFailure(env,userId,stored));
}

export async function restoreCelestialDelivery(env,auth,bindings,verify) {
  let doc;
  if(bindings.resumeResultId)doc=await findCelestialDelivery(env,auth.userId,bindings.resumeResultId);
  else {
    const clauses=Object.entries({reportId:bindings.reportId,idempotencyKey:bindings.requestId,sessionId:bindings.sessionId}).filter(([,value])=>value).map(([key,value])=>({[key]:value}));
    if(!clauses.length&&!bindings.pending)return null;
    try {
      await connectDb(env);
      doc=await ServiceExecutionTransaction.findOne({userId:auth.userId,featureKey:FEATURE,"metadata.celestialDelivery":{$exists:true},...(clauses.length?{$or:clauses}:{status:"pending"})}).sort({createdAt:-1}).lean();
    } catch { throw failure(bindings.resumeResultId||bindings.reportId||bindings.requestId||"pending"); }
  }
  if(!doc)return bindings.resumeResultId?json({ok:false,code:"RESULT_NOT_FOUND"},{status:404}):null;
  if(doc.metadata.celestialDelivery.failed)return closeCelestialFailure(env,auth.userId,doc);
  const body=doc.metadata.celestialDelivery.body;
  const access=await verify(body);
  if(!access?.ok)return json({ok:false,code:access?.code||"PAYMENT_REQUIRED"},{status:Number(access?.status)||402});
  if(await revoked(auth.userId,doc,body))return json({ok:false,code:"PAYMENT_REVOKED",retryable:false},{status:403});
  if(doc.premiumStatus==="completed")return json({ok:true,archiveSaved:true,result:doc.metadata.result});
  return celestialPending(doc);
}
