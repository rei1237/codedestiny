import {CHAPTER_DELIVERY_VERSION,chapterDeliveryFailure,deliveredCharacterCount} from './chapter-delivery-contract.js';
import {AUTOMATIC_CHAPTER_ATTEMPTS,MANUAL_CHAPTER_RECOVERY_LIMIT,SYSTEM_CHAPTER_RETRY_GRANT} from './chapter-retry-policy.js';
import {deliveryRefundPending} from './terminal-refund-policy.js';

// Pure diagnostics. The caller supplies hashes; this module neither queries nor writes.
export function chapterRecoveryPlan(row, payment, {allowPaymentCommitMarkers=false}={}) {
  const manifest=row?.snapshot?.manifest || [],saved=row?.chapters || [],blockers=[];
  const chapters=manifest.map((chapter,i)=>({id:chapter.id,title:chapter.title,ordinal:i,
    status:saved[i]?(chapterDeliveryFailure(saved[i],chapter,saved[i].deliveryVersion===CHAPTER_DELIVERY_VERSION)?'review':'preserve'):'missing',
    chars:saved[i]?deliveredCharacterCount(saved[i]):0,attempts:Number(row.chapterAttempts?.[i] || 0)}));
  if(!row || !manifest.length || new Set(manifest.map(c=>c.id)).size!==manifest.length)blockers.push('INVALID_MANIFEST');
  if(!payment || !['paid','success','fulfilled'].includes(payment.status) || String(payment.userId)!==String(row?.userId) ||
    payment.metadata?.consumedBy!==String(row?._id) || payment.refundLock || payment.metadata?.unlockRevoked || payment.metadata?.yeongnyangiRefundPending)blockers.push('PAYMENT_NOT_ACTIVE');
  if(!row?.snapshot?.analysis?.contexts || !Object.keys(row.snapshot.analysis.contexts).length ||
    (row?.productId?.startsWith('saju_')&&!row.snapshot.natalInput?.personA))blockers.push('ORIGINAL_INPUT_MISSING');
  if(row?.state==='REFUNDED'||deliveryRefundPending(row))blockers.push('PAYMENT_NOT_ACTIVE');
  if(new Date(row?.leaseUntil || 0).getTime()>Date.now())blockers.push('GENERATION_IN_PROGRESS');
  if(saved.length>manifest.length || chapters.some(c=>c.status==='review') || saved.some(c=>!c))blockers.push('SAVED_CHAPTER_REVIEW_REQUIRED');
  const missing=chapters.filter(c=>c.status==='missing');
  if(row?.state==='COMPLETED' && missing.length)blockers.push('COMPLETED_ORDER_REVIEW_REQUIRED');
  if(missing.length && !allowPaymentCommitMarkers)blockers.push('PAYMENT_COMMIT_MARKER_APPROVAL_REQUIRED');
  const ordinal=saved.length,manual=Number(row?.manualRecoveryGrants?.[ordinal]||0),attempts=Number(row?.chapterAttempts?.[ordinal]||0);
  // One newly reviewed call for the failed ordinal; a replay never resets history.
  const system=Number(row?.systemRecoveryGrants?.[ordinal]||0);
  const manualGrant=Math.max(manual,attempts-AUTOMATIC_CHAPTER_ATTEMPTS-system+1,0);
  if(manualGrant>MANUAL_CHAPTER_RECOVERY_LIMIT || Object.values(row?.systemRecoveryGrants || {}).some(n=>Number(n)>SYSTEM_CHAPTER_RETRY_GRANT) ||
    Object.values(row?.manualRecoveryGrants || {}).some(n=>Number(n)>MANUAL_CHAPTER_RECOVERY_LIMIT))blockers.push('RECOVERY_BUDGET_REVIEW_REQUIRED');
  return {requestId:String(row?._id || ''),state:row?.state,paymentStatus:payment?.status || null,
    deliveryContract:CHAPTER_DELIVERY_VERSION,total:manifest.length,saved:saved.length,chapters,
    generate:missing.map(c=>c.id),expectedFirstCalls:missing.length,
    automaticCallsUpperBound:missing.reduce((sum,c)=>sum+Math.max(0,AUTOMATIC_CHAPTER_ATTEMPTS+(c.ordinal===ordinal?manualGrant:Number(row.manualRecoveryGrants?.[c.ordinal]||0))+SYSTEM_CHAPTER_RETRY_GRANT-c.attempts),0),
    ordinal,manualGrant,blockers:[...new Set(blockers)],ready:blockers.length===0,
    paymentWrites:missing.length?['metadata.yeongnyangiChapterCommit','metadata.yeongnyangiCompletionCommit','updatedAt']:[]};
}
