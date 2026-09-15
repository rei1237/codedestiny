import { connectDb, mongoose, mongoTransactionOptions, withMongoRetry } from '../lib/db.js';
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
  await connectDb(env);
  const row = await withMongoRetry(env, () => YeongnyangiRequest.findOne({_id:requestId,userId:ownerId(userId)}).lean());
  if (!row) throw failure(404,'FORTUNE_NOT_FOUND');
  return row;
}

export async function createRequest(env, userId, id, values) {
  await connectDb(env);
  const filter = {_id:id,userId:ownerId(userId)};
  // Deterministic _id uses Mongo's built-in unique index, including before optional listing indexes exist.
  const row = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate(filter,
    {$setOnInsert:{...values,...filter,state:'CREATED',chapters:[]}}, {upsert:true,new:true,setDefaultsOnInsert:true}).lean());
  if (row.fingerprint !== values.fingerprint) throw failure(409,'IDEMPOTENCY_CONFLICT');
  return row;
}

export async function attachPayment(env, userId, requestId, expectedCharge) {
  await connectDb(env);
  const owner = ownerId(userId);
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
}

export async function claimChapter(env, userId, requestId) {
  const current = await readRequest(env,userId,requestId);
  if (!current.paymentId) throw failure(402,'PAYMENT_REQUIRED');
  const proof = await withMongoRetry(env, () => Payment.findOne({_id:current.paymentId,userId:ownerId(userId),status:{$in:paidStatuses},'metadata.consumedBy':requestId}).select('_id').lean());
  if (!proof) throw failure(409,'PAYMENT_NOT_ACTIVE');
  if (current.state === 'COMPLETED') return {row:current,token:null};
  const token=crypto.randomUUID(), now=new Date();
  const row = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate({
    _id:requestId,userId:ownerId(userId),state:{$in:['PAID','FORTUNE_FAILED','GENERATING']},
    $or:[{leaseUntil:null},{leaseUntil:{$lte:now}}],
  },{$set:{state:'GENERATING',leaseToken:token,leaseUntil:new Date(now.getTime()+180000),errorCode:''},$inc:{attempts:1}}, {new:true}).lean());
  return row ? {row,token} : {row:current,token:null};
}

export async function finishChapter(env, userId, requestId, token, ordinal, body, total) {
  return withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate({
    _id:requestId,userId:ownerId(userId),leaseToken:token,state:'GENERATING', [`chapters.${ordinal}`]:{$exists:false},
  }, {$push:{chapters:body},$set:{completedChapters:ordinal+1,state:ordinal+1===total?'COMPLETED':'PAID',leaseToken:'',leaseUntil:null,
    ...(ordinal+1===total?{completedAt:new Date()}:{}),errorCode:''}}, {new:true}).lean());
}

export async function failChapter(env, userId, requestId, token, code) {
  return withMongoRetry(env, () => YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),leaseToken:token},
    {$set:{state:'FORTUNE_FAILED',leaseToken:'',leaseUntil:null,errorCode:String(code).slice(0,80)}}));
}
