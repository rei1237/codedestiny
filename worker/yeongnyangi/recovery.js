import { connectDb, withMongoRetry } from '../lib/db.js';
import { Payment } from '../lib/models.js';
import { YeongnyangiRequest } from './repository.js';
import { activateFortune, generateNextChapter, providerReady } from './service';
import { enqueueConsultation } from './queue.js';

const ABANDONED_MS = 5 * 60 * 1000;
const BUDGET_MS = 4 * 60 * 1000;
const CHAPTER_RESERVE_MS = 105000; // existing 90s provider deadline + DB commit
const MAX_REQUESTS = 3;

export function abandonedRequestFilter(now) {
  return {state:{$in:['PAID','GENERATING','FORTUNE_FAILED']},$or:[{paymentId:{$ne:null}},{accessMethod:'FAMILY',passEvidenceId:{$ne:null}}],
    updatedAt:{$lt:new Date(now-ABANDONED_MS)},
    errorCode:{$nin:['GENERATION_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE','AUTOMATIC_RECOVERY_STOPPED']},
    $and:[{$or:[{leaseUntil:null},{leaseUntil:{$lte:new Date(now)}}]}]};
}

// Existing ten-minute recovery tick. Original immutable input, chapter lease and
// total attempt budget are shared with the browser; no new charge or LLM retry layer.
export async function runYeongnyangiRecovery(env, options = {}) {
  if (!(options.providerReady || providerReady)(env)) return {ok:true,skipped:'disabled'};
  const clock=options.clock || Date.now, now=clock(), deadline=now+BUDGET_MS;
  await (options.connectDb || connectDb)(env);
  const activate=options.activate || activateFortune, generate=options.generate || generateNextChapter;
  const orders=await withMongoRetry(env,()=>Payment.find({
    requestId:/^yn-[a-f0-9]{64}$/,
    paymentType:'digital_content',purchaseType:{$ne:'GIFT'},status:{$in:['paid','success','fulfilled']},
    'metadata.unlockRevoked':{$ne:true},'metadata.yeongnyangiRefundPending':{$ne:true},
    'metadata.consumedBy':null,createdAt:{$lt:new Date(now-ABANDONED_MS)},
    $or:[{'metadata.yeongnyangiRecoveryAfter':null},{'metadata.yeongnyangiRecoveryAfter':{$lte:new Date(now)}}],
  }).sort({createdAt:1}).limit(MAX_REQUESTS).lean());
  const outcomes=[];
  for(const order of orders){
    if(clock()+CHAPTER_RESERVE_MS>deadline)break;
    try{await activate(env,String(order.userId),order.requestId.slice(3));}
    catch(error){
      // A malformed historical order must not starve later paid orders each tick.
      await withMongoRetry(env,()=>Payment.updateOne({_id:order._id},{$set:{
        'metadata.yeongnyangiRecoveryAfter':new Date(now+24*60*60*1000),
        'metadata.yeongnyangiRecoveryCode':String(error?.code || 'ACTIVATION_PENDING').slice(0,80),
      }}));
      outcomes.push({outcome:'activation_pending'});
    }
  }
  const candidates=await withMongoRetry(env,()=>YeongnyangiRequest.find(abandonedRequestFilter(now))
    .sort({updatedAt:1}).limit(MAX_REQUESTS).lean());
  const pending=[...candidates];
  while(pending.length && clock()+CHAPTER_RESERVE_MS<=deadline){
    const candidate=pending.shift();
    try{
      if(env.YEONGNYANGI_QUEUE){await (options.enqueue || enqueueConsultation)(env,candidate);outcomes.push({outcome:'queued'});continue;}
      const row=await generate(env,String(candidate.userId),String(candidate._id));
      outcomes.push({outcome:row.state});
      // A held lease or failed attempt waits for a future tick; never spin on it.
      if(row.state==='PAID' && row.chapters.length>candidate.chapters.length)pending.push(row);
    }catch(error){outcomes.push({outcome:String(error?.code || 'GENERATION_FAILED').slice(0,80)});}
  }
  console.log('[yeongnyangi-recovery]',JSON.stringify({scanned:candidates.length,outcomes}));
  return {ok:true,scanned:candidates.length,outcomes};
}
