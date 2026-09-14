import { createHash, randomUUID } from "node:crypto";
import { ServiceExecutionTransaction } from "./models.js";
import { connectDb } from "./db.js";
import { json } from "./http.js";
import { getAmbientAiLocale } from "./ai-locale-context.js";
import { isPaidResultRevoked } from "./paid-result-revocation.js";
import { celestialDeliveryComplete, celestialReadingFromDelivery, generateCelestialWave } from "./celestial-report-delivery.js";

const FEATURE="tarot-celestial-harmony";
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
  return json({ok:true,retryable:!snapshot.limited,resultId:doc.executionKey,resumeBody:{resumeResultId:doc.executionKey},
    status:snapshot.delivery.parts && Object.keys(snapshot.delivery.parts).length?"partial":"generating",completedParts:Object.keys(snapshot.delivery.parts),totalParts:12,
    result:celestialReadingFromDelivery(snapshot),archiveSaved:false},{status:202});
}
async function revoked(userId,doc,body) {
  return ["refunded","cancelled"].includes(doc?.status) || await isPaidResultRevoked(userId,FEATURE,[doc?.executionKey,body.requestId,body.transactionId,body.paymentId,body.purchaseId,body.payment?.paymentId,body.payment?.requestId]);
}
export async function runCelestialDelivery(request,env,auth,supplied,{verify,legacy,buildReading,buildPrompt}) {
  const id=supplied.resumeResultId || `celestial-checkpoint:${hash([String(auth.userId),supplied.requestId||supplied.reportId||supplied.transactionId||supplied.sessionId])}`;
  if(typeof id!=="string" || id.length>120)return json({ok:false,code:"INVALID_RESULT_ID"},{status:422});
  let stored=await findCelestialDelivery(env,auth.userId,id);
  if(supplied.resumeResultId&&!stored)return json({ok:false,code:"RESULT_NOT_FOUND"},{status:404});
  const body=stored?.metadata?.celestialDelivery?.body || supplied;
  if(![body.requestId,body.reportId,body.transactionId,body.sessionId].some(Boolean))return json({ok:false,code:"REQUEST_ID_REQUIRED"},{status:422});
  if(stored && supplied.cards && hash(supplied.cards)!==hash(body.cards))return json({ok:false,code:"INPUT_HASH_MISMATCH"},{status:409});
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
      const inserted=await ServiceExecutionTransaction.findOneAndUpdate({userId:auth.userId,executionKey:id},{$setOnInsert:{userId:auth.userId,executionKey:id,featureKey:FEATURE,reportType:"celestialHarmony",reportId:body.reportId||"",sessionId:body.sessionId||"",idempotencyKey:body.requestId||"",status:"pending",premiumStatus:"generating",timeoutAt:new Date(now.getTime()+600000),retentionUntil:new Date(now.getTime()+90*86400000),metadata:{celestialDelivery:snapshot},lock:{token,until:new Date(now.getTime()+120000)},createdAt:now,updatedAt:now}},{upsert:true,returnDocument:"after"}).lean();
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
    if(!celestialDeliveryComplete(snapshot.delivery))return celestialPending(stored);
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
  const body=doc.metadata.celestialDelivery.body;
  const access=await verify(body);
  if(!access?.ok)return json({ok:false,code:access?.code||"PAYMENT_REQUIRED"},{status:Number(access?.status)||402});
  if(await revoked(auth.userId,doc,body))return json({ok:false,code:"PAYMENT_REVOKED",retryable:false},{status:403});
  if(doc.premiumStatus==="completed")return json({ok:true,archiveSaved:true,result:doc.metadata.result});
  return celestialPending(doc);
}
