import { getEnv } from '../lib/env.js';
import { Payment } from '../lib/models.js';
import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
import { resolveChargeAmountKRW } from '../lib/portone.js';
import { toObjectId } from '../payments/db.js';
import { paymentError } from '../payments/errors.js';

export async function assertFortunePaymentIntent(db, {env, userId, requestId, product}) {
  if (!/^yn-[a-f0-9]{64}$/.test(String(requestId || ''))) {
    throw paymentError('INVALID_REQUEST','영냥이 방에서 상담 내용을 먼저 선택해 주세요.');
  }
  const id=requestId.slice(3);
  const fortune=await db.findOne(YeongnyangiRequest,{_id:id,userId:toObjectId(userId)});
  if (!fortune || fortune.featureKey!==product.featureKey || resolveChargeAmountKRW(env,fortune.amountKRW)!==product.priceKRW) {
    throw paymentError('INVALID_REQUEST','상담 주문과 상품을 확인하지 못했어요.');
  }
  const paid=fortune.paymentId || await db.findOne(Payment, {
    userId:toObjectId(userId),requestId,paymentType:'digital_content',status:{$in:['paid','success','fulfilled']},
  }, {projection:{_id:1}});
  if (paid) throw paymentError('FORTUNE_ALREADY_PAID','이미 결제한 상담이에요. 결과 화면에서 이어가 주세요.',{fortuneRequestId:id});
  if (fortune.state!=='CREATED') throw paymentError('INVALID_REQUEST','이 상담은 새 결제를 시작할 수 없어요.');
  if (!getEnv(env,'GEMINIF_API_KEY') || getEnv(env,'LLM_DRY_RUN')==='true') {
    throw paymentError('FORTUNE_UNAVAILABLE','지금은 상담을 준비하고 있어요. 잠시 후 다시 확인해 주세요.');
  }
  return fortune;
}

export async function advanceFortunePaymentGeneration(db,userId,requestId,generation) {
  // The consultation document serializes retries after definitive PG failures/cancellations.
  // Concurrent clients advance the same generation once and then share the next merchant UID.
  return db.findOneAndUpdate(YeongnyangiRequest,{
    _id:requestId.slice(3),userId:toObjectId(userId),state:'CREATED',paymentId:null,
    ...(generation===0?{$or:[{paymentGeneration:0},{paymentGeneration:{$exists:false}}]}:{paymentGeneration:generation}),
  },{$inc:{paymentGeneration:1}},{returnDocument:'after'});
}
