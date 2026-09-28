import {enqueueConsultation} from './queue.js';
import * as repository from './repository.js';
import {providerReady} from './service.ts';

// Reading the result is also a bounded delivery heartbeat. It never calls the
// provider in the HTTP request: it only repairs a missing queue hand-off. When
// the ordinary three attempts are already spent, the existing bounded server
// recovery grant is used immediately instead of waiting for the next cron tick
// or making the buyer press a recovery button.
export async function readAndContinueFortune(env,userId,requestId) {
  let row=await repository.readRequest(env,userId,requestId);
  const total=row.snapshot?.manifest?.length || 0;
  if(!providerReady(env)||!env.YEONGNYANGI_QUEUE||!repository.hasRequestAccess(row)||!total||row.chapters.length>=total||
    ['COMPLETED','REFUNDED'].includes(row.state)||['PAYMENT_NOT_ACTIVE','GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED'].includes(row.errorCode))return row;
  try{
    if(row.errorCode==='AUTOMATIC_RECOVERY_STOPPED')row=await repository.escalateStopped(env,row);
    if(row.state!=='COMPLETED'&&!['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode))
      await enqueueConsultation(env,row);
  }catch(error){
    // Saved paid content must stay readable even if the delivery heartbeat is
    // temporarily unavailable. Polling and the scheduled recovery will retry.
    console.warn('[yeongnyangi-delivery]',JSON.stringify({requestId,outcome:String(error?.code || 'CONTINUE_FAILED').slice(0,80)}));
  }
  return row;
}
