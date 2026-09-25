import {readRequest,attachPayment,resumeRequest} from './repository.js';
import {enqueueConsultation} from './queue.js';
import {resolveChargeAmountKRW} from '../lib/portone.js';
import {createHttpError} from '../lib/http.js';
const failure=code=>createHttpError(code==='GENERATION_QUEUE_UNAVAILABLE'?503:409,code,{code});
const hasRequestAccess=row=>Boolean(row?.paymentId||row?.accessMethod==='FAMILY'||row?.passEvidenceId);
export async function retryFortune(env, userId, requestId) {
  let row=await readRequest(env,userId,requestId);
  if(row.state==='COMPLETED')return row;
  if(row.state==='REFUNDED'||row.errorCode==='PAYMENT_NOT_ACTIVE')throw failure('PAYMENT_NOT_ACTIVE');
  if(['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED'].includes(row.errorCode))throw failure('GENERATION_REVIEW_REQUIRED');
  if(!env.YEONGNYANGI_QUEUE)throw failure('GENERATION_QUEUE_UNAVAILABLE');
  if(!hasRequestAccess(row))row=await attachPayment(env,userId,requestId,resolveChargeAmountKRW(env,row.amountKRW));
  row=await resumeRequest(env,userId,requestId);
  if(row.state==='COMPLETED')return row;
  if(row.state==='REFUNDED'||row.errorCode==='PAYMENT_NOT_ACTIVE')throw failure('PAYMENT_NOT_ACTIVE');
  if(['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED'].includes(row.errorCode))throw failure('GENERATION_REVIEW_REQUIRED');
  if(!await enqueueConsultation(env,row))throw failure('GENERATION_QUEUE_UNAVAILABLE');
  return row;
}
