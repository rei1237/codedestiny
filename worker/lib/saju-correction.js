/** Offline/dry-run first. Never mutate a purchase, charge a payment or call an LLM here. */
import {calculateNatalSaju,SAJU_ENGINE_VERSION,SAJU_POLICY_VERSION} from '../../lib/korean-calendar/index.js';
export const SAJU_CORRECTION_VERSION='saju-correction-v1';
export function inspectSajuCorrection({originalBirth,pillars,engineVersion}) {
  if(engineVersion===SAJU_ENGINE_VERSION)return {status:'current',engineVersion};
  if(!originalBirth)return {status:'needs-original-birth',engineVersion:engineVersion||'unversioned'};
  const revised=calculateNatalSaju(originalBirth);
  const changed=['year','month','day','hour'].filter(k=>(pillars?.[k]||null)!==revised.pillars[k]);
  return {status:changed.length?'correction-required':'unchanged',changed,before:pillars,after:revised.pillars,calculationMeta:revised.calculationMeta,
    interpretationStatus:changed.length?'requires-regeneration':'unchanged',requiresRepayment:false};
}
export async function sajuCorrectionKey(ownerId,orderId) {
  if(!ownerId||!orderId)throw new Error('CORRECTION_OWNER_REQUIRED');
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([String(ownerId),String(orderId),SAJU_ENGINE_VERSION,SAJU_POLICY_VERSION])));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
/** Store contract: insertOnce/claim/save/complete are atomic and owner scoped. A
 * claim is never automatically reissued after provider uncertainty; a reviewer
 * must reconcile a saved draft before authorizing another budget. */
export async function queueSajuCorrection(store,{ownerId,orderId,originalBirth,pillars,engineVersion},options={}) {
  const comparison=inspectSajuCorrection({originalBirth,pillars,engineVersion});
  if(options.dryRun!==false||comparison.status!=='correction-required')return comparison;
  const purchase=await store.readPurchase(ownerId,orderId);
  if(!purchase?.paid||purchase.refunded)throw new Error('CORRECTION_PURCHASE_REQUIRED');
  const id=await sajuCorrectionKey(ownerId,orderId);
  return store.insertOnce({id,ownerId,orderId,version:SAJU_CORRECTION_VERSION,comparison,status:'queued',attempts:0,chapters:[],requiresRepayment:false});
}
export async function runSajuCorrectionQueue(store,provider,{ownerId,maxJobs=0,maxProviderCalls=0,maxAttempts=1}={}) {
  if(!ownerId||!Number.isInteger(maxJobs)||maxJobs<0||maxJobs>20||!Number.isInteger(maxProviderCalls)||maxProviderCalls<0||maxProviderCalls>20||maxAttempts!==1)throw new Error('INVALID_CORRECTION_BUDGET');
  const result={claimed:0,calls:0,completed:0,held:0};
  while(result.claimed<maxJobs&&result.calls<maxProviderCalls) {
    const row=await store.claim(ownerId,{maxAttempts});
    if(!row)break;
    result.claimed++;
    try {
      const purchase=await store.readPurchase(ownerId,row.orderId);
      if(!purchase?.paid||purchase.refunded)throw new Error('CORRECTION_PURCHASE_REQUIRED');
      // One bounded call. Provider is injected; this module has no live provider fallback.
      result.calls++;
      const correction=await provider.generate({idempotencyKey:row.id,calculatedData:row.comparison,originalOrderId:row.orderId,maxProviderAttempts:1});
      if(!correction||correction.complete!==true||!correction.report)throw new Error('CORRECTION_REPORT_INCOMPLETE');
      assertSajuPillarClaims(correction.report,row.comparison.after);
      await store.saveDraft(ownerId,row.id,correction);
      // Reread durable draft before publishing. Originals remain owned by the purchase.
      const saved=await store.read(ownerId,row.id);
      if(!saved?.draft?.report)throw new Error('CORRECTION_SAVE_UNCONFIRMED');
      const current=await store.readPurchase(ownerId,row.orderId);
      if(!current?.paid||current.refunded)throw new Error('CORRECTION_PURCHASE_REQUIRED');
      await store.complete(ownerId,row.id);
      result.completed++;
    } catch {await store.hold(ownerId,row.id,'CORRECTION_REVIEW_REQUIRED');result.held++;}
  }
  return result;
}
/** Check explicit natal assertions. Period/partner comparisons are not this parser's scope. */
export function assertSajuPillarClaims(value,pillars) {
  const text=typeof value==='string'?value:JSON.stringify(value);
  const hanjaStems='甲乙丙丁戊己庚辛壬癸',koStems='갑을병정무기경신임계',hanjaBranches='子丑寅卯辰巳午未申酉戌亥',koBranches='자축인묘진사오미신유술해';
  const normalize=p=>[hanjaStems[koStems.indexOf(p[0])]||p[0],hanjaBranches[koBranches.indexOf(p[1])]||p[1]].join('');
  const pattern=/(?:당신|고객|본인|나)의?\s*(일주|시주)(?:는|은|가|이|:)?\s*([甲乙丙丁戊己庚辛壬癸갑을병정무기경신임계][子丑寅卯辰巳午未申酉戌亥자축인묘진사오미신유술해])/gu;
  for(const m of text.matchAll(pattern))if(normalize(m[2])!==pillars?.[m[1]==='일주'?'day':'hour'])throw new Error('SAJU_PILLAR_CONTRADICTION');
}
export function validateSajuNatalPayload(payload) {
  const meta=payload?.calculationMeta;
  if(meta?.engineVersion!==SAJU_ENGINE_VERSION||meta?.policyVersion!==SAJU_POLICY_VERSION||!meta.original)throw new Error('SAJU_RECALCULATION_REQUIRED');
  const r=calculateNatalSaju({...meta.original,isLeapMonth:meta.original.leapMonth,birthPlace:meta.location?.assumed?undefined:meta.location});
  for(const [short,key] of Object.entries({y:'year',m:'month',d:'day',h:'hour'})){
    const p=payload.pillars?.[short]||payload.pillars?.[key];
    const pair=typeof p==='string'?p:p?.ganji||`${p?.g||''}${p?.j||''}`;
    if((pair||null)!==r.pillars[key])throw new Error('SAJU_RECALCULATION_REQUIRED');
  }
  return r;
}
