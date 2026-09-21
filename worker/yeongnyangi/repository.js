import { mongoose, mongoTransactionOptions, withMongoRetry } from '../lib/db.js';
import { Payment } from '../lib/models.js';
import { createHttpError } from '../lib/http.js';

import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
export { YeongnyangiRequest };

const paidStatuses = ['paid','success','fulfilled'];
const failure = (status, code) => createHttpError(status, code, {code});

export function ownerId(id) {
  if (!/^[a-f0-9]{24}$/i.test(String(id))) throw failure(401,'UNAUTHORIZED');
  return new mongoose.Types.ObjectId(String(id));
}

export async function readRequest(env, userId, requestId) {
  const row = await withMongoRetry(env, () => YeongnyangiRequest.findOne({_id:requestId,userId:ownerId(userId)}).lean());
  if (!row) throw failure(404,'FORTUNE_NOT_FOUND');
  if (row.paymentId && row.state !== 'REFUNDED') {
    const payment = await withMongoRetry(env, () => Payment.findOne({_id:row.paymentId,userId:ownerId(userId)}).select('status metadata refundLock').lean());
    const refunded = payment && ['refunded','cancelled'].includes(payment.status);
    if (refunded) {
      const patch={state:'REFUNDED',leaseToken:'',leaseUntil:null,errorCode:'PAYMENT_NOT_ACTIVE'};
      await withMongoRetry(env,()=>YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),paymentId:row.paymentId},{$set:patch}));
      return {...row,...patch};
    }
    if (!payment || !paidStatuses.includes(payment.status) || payment.refundLock || payment.metadata?.unlockRevoked || payment.metadata?.yeongnyangiRefundPending) {
      throw failure(409,'PAYMENT_NOT_ACTIVE');
    }
  }
  return row;
}

export async function createRequest(env, userId, id, values) {
  const filter = {_id:id,userId:ownerId(userId)};
  // Deterministic _id uses Mongo's built-in unique index, including before optional listing indexes exist.
  let row;
  try {
    row = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate(filter,
      {$setOnInsert:{...values,...filter,state:'CREATED',chapters:[]}}, {upsert:true,new:true,setDefaultsOnInsert:true}).lean());
  } catch (error) {
    // A concurrent upsert won the built-in unique _id index. Return that same intent.
    if(Number(error?.code)!==11000) throw error;
    row=await readRequest(env,userId,id);
  }
  if (row.fingerprint !== values.fingerprint) throw failure(409,'IDEMPOTENCY_CONFLICT');
  return row;
}

export async function attachPayment(env, userId, requestId, expectedCharge) {
  const owner = ownerId(userId);
  // Register the whole atomic operation with the shared connection guard. Otherwise
  // another request can detach its connection while this session is still active.
  return withMongoRetry(env, async () => {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const request = await YeongnyangiRequest.findOne({_id:requestId,userId:owner}).session(session).lean();
        if (!request) throw failure(404,'FORTUNE_NOT_FOUND');
        if (request.paymentId) { result=request; return; }
        const proof = await Payment.findOneAndUpdate({
          userId:owner,requestId:`yn-${requestId}`,featureKey:request.featureKey,paymentType:'digital_content',purchaseType:{$ne:'GIFT'},
          paymentAmount:expectedCharge,status:{$in:paidStatuses},
          $or:[{'metadata.consumedBy':{$exists:false}},{'metadata.consumedBy':null},{'metadata.consumedBy':''}],
        }, {$set:{'metadata.consumedBy':requestId,'metadata.consumedScope':'yeongnyangi-integrated','metadata.consumedAt':new Date()}},
        {new:true,session,sort:{createdAt:1}}).lean();
        if (!proof) throw failure(402,'PAYMENT_REQUIRED');
        result = await YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:owner,paymentId:null},
          {$set:{paymentId:proof._id,state:'PAID'}},{new:true,session}).lean();
        if (!result) throw failure(409,'PAYMENT_ATTACH_CONFLICT');
      }, mongoTransactionOptions());
      return result;
    } finally { await session.endSession(); }
  });
}

export async function claimChapter(env, userId, requestId) {
  const current = await readRequest(env,userId,requestId);
  if (!current.paymentId) throw failure(402,'PAYMENT_REQUIRED');
  const proof = await withMongoRetry(env, () => Payment.findOne({_id:current.paymentId,userId:ownerId(userId),'metadata.consumedBy':requestId}).select('_id status metadata refundLock').lean());
  if (!proof || !paidStatuses.includes(proof.status) || proof.refundLock || proof.metadata?.unlockRevoked || proof.metadata?.yeongnyangiRefundPending) {
    if(proof && ['refunded','cancelled'].includes(proof.status)) await withMongoRetry(env,()=>YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),paymentId:current.paymentId},{$set:{state:'REFUNDED',leaseToken:'',leaseUntil:null}}));
    throw failure(409,'PAYMENT_NOT_ACTIVE');
  }
  if (current.state === 'COMPLETED') return {row:current,token:null};
  // A response can be lost after the last checkpoint is durable but before its
  // completion marker is committed. Re-read that stored result instead of
  // calling the provider for a non-existent next chapter.
  const total=current.snapshot?.manifest?.length || 0;
  if (total && current.chapters.length >= total) {
    const completed=await completeStoredRequest(env,userId,requestId,total);
    return {row:completed || current,token:null};
  }
  const token=crypto.randomUUID(), now=new Date();
  const row = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate({
    _id:requestId,userId:ownerId(userId),state:{$in:['PAID','FORTUNE_FAILED','GENERATING']},
    $or:[{leaseUntil:null},{leaseUntil:{$lte:now}}],
  },{$set:{state:'GENERATING',leaseToken:token,leaseUntil:new Date(now.getTime()+180000),errorCode:''},$inc:{attempts:1}}, {new:true}).lean());
  return row ? {row,token} : {row:current,token:null};
}

async function completeStoredRequest(env, userId, requestId, total, token = '') {
  const owner=ownerId(userId);
  // Completion is deliberately a second write: a durable checkpoint must be
  // read back and checked before it is exposed as a completed paid result.
  const stored=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({
    _id:requestId,userId:owner,state:{$in:['PAID','GENERATING','FORTUNE_FAILED']},completedChapters:total,
    [`chapters.${total-1}`]:{$exists:true},
  }).lean());
  if (!stored || !Array.isArray(stored.chapters) || stored.chapters.length !== total) return null;
  const filter={_id:requestId,userId:owner,state:token?'GENERATING':{$in:['PAID','FORTUNE_FAILED']},completedChapters:total,
    [`chapters.${total-1}`]:{$exists:true},...(token?{leaseToken:token}:{})};
  return withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate(filter,
    {$set:{state:'COMPLETED',leaseToken:'',leaseUntil:null,completedAt:new Date(),errorCode:''}},{new:true}).lean());
}

export async function finishChapter(env, userId, requestId, token, ordinal, body, total) {
  const result=await withMongoRetry(env, async () => {
    const session = await mongoose.startSession();
    try {
      let result = null;
      await session.withTransaction(async () => {
        const filter = {_id:requestId,userId:ownerId(userId),leaseToken:token,state:'GENERATING', [`chapters.${ordinal}`]:{$exists:false}};
        const request = await YeongnyangiRequest.findOne(filter).session(session).lean();
        if (!request) return;
        // Write the payment in the same transaction: a read alone allows a refund to
        // commit between validation and chapter storage (snapshot write skew).
        const proof = await Payment.findOneAndUpdate({
          _id:request.paymentId,userId:ownerId(userId),'metadata.consumedBy':requestId,
          status:{$in:paidStatuses},refundLock:null,'metadata.unlockRevoked':{$ne:true},
          'metadata.yeongnyangiRefundPending':{$ne:true},
        }, {$set:{'metadata.yeongnyangiChapterCommit':`${token}:${ordinal}`}}, {new:true,session}).lean();
        if (!proof) {
          const payment = await Payment.findOne({_id:request.paymentId,userId:ownerId(userId)}).session(session).lean();
          const refunded = payment && ['refunded','cancelled'].includes(payment.status);
          await YeongnyangiRequest.updateOne(filter, {$set:{state:refunded?'REFUNDED':'FORTUNE_FAILED',
            leaseToken:'',leaseUntil:null,errorCode:'PAYMENT_NOT_ACTIVE'}}, {session});
          return;
        }
        const isLast=ordinal+1===total;
        result = await YeongnyangiRequest.findOneAndUpdate(filter,
          {$push:{chapters:body},$set:{completedChapters:ordinal+1,
            // Keep the last chapter's lease until the saved document has been
            // read back. A late writer must not race the completion marker.
            ...(isLast?{}:{state:'PAID',leaseToken:'',leaseUntil:null}),errorCode:''}}, {new:true,session}).lean();
      }, mongoTransactionOptions());
      return result;
    } finally { await session.endSession(); }
  });
  if (!result || ordinal+1!==total) return result;
  const stored=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({
    _id:requestId,userId:ownerId(userId),state:'GENERATING',leaseToken:token,completedChapters:total,
    [`chapters.${ordinal}`]:{$exists:true},
  }).lean());
  if (!stored || JSON.stringify(stored.chapters[ordinal])!==JSON.stringify(body)) return null;
  return completeStoredRequest(env,userId,requestId,total,token);
}

export async function failChapter(env, userId, requestId, token, code) {
  return withMongoRetry(env, () => YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),leaseToken:token,state:'GENERATING'},
    {$set:{state:'FORTUNE_FAILED',leaseToken:'',leaseUntil:null,errorCode:String(code).slice(0,80)}}));
}
