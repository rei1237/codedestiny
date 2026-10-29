// Optional analytics only. Never changes a payment status, balance or entitlement.
import { Payment } from '../lib/models.js';
import { fetchPortOnePayment } from '../lib/portone.js';

export const GA4_REFUND_MAX_AGE_MS = 72 * 60 * 60_000;
const CONTEXT_MAX_AGE_MS = 90 * 24 * 60 * 60_000;
const CLIENT_ID = /^\d{1,20}\.\d{1,20}$/;
const ORDER_ID = /^[a-zA-Z0-9_-]{1,160}$/;

export function ga4RefundConfig(env) {
  if (env?.GA4_SERVER_REFUNDS_ENABLED !== 'true'
      || !/^G-[A-Z0-9]{5,20}$/.test(env?.GA4_MEASUREMENT_ID || '')
      || typeof env?.GA4_API_SECRET !== 'string' || !env.GA4_API_SECRET.trim()) return null;
  return {measurementId:env.GA4_MEASUREMENT_ID,secret:env.GA4_API_SECRET};
}

// Use the existing consent cookie and existing GA identity; never manufacture an identity.
// Disabled until server credentials and the production release are explicitly configured.
export function readGa4PurchaseContext(request, env, now = new Date()) {
  if (!ga4RefundConfig(env)) return null;
  const cookie=String(request?.headers?.get('cookie') || '');
  const values=name=>cookie.split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'=')).map(v=>v.slice(name.length+1));
  const consent=values('cd_cookie_consent'), ga=values('_ga');
  if (consent.length!==1 || consent[0]!=='accepted' || ga.length!==1) return null;
  const match=/^GA\d+\.\d+\.(\d{1,20}\.\d{1,20})$/.exec(ga[0]);
  if (!match) return null;
  return {version:1,consent:true,clientId:match[1],capturedAt:new Date(now)};
}

// Return only validated, recent PG cancellation receipts. No customer/question/reason data.
export function buildGa4RefundReceipts(order, raw, now = new Date()) {
  const context=order?.metadata?.ga4PurchaseContext;
  const nowMs=+new Date(now),capturedMs=+new Date(context?.capturedAt || 0);
  if (context?.version!==1 || context.consent!==true || !CLIENT_ID.test(context.clientId || '')
      || !Number.isFinite(nowMs) || !Number.isFinite(capturedMs) || !capturedMs || capturedMs>nowMs || nowMs-capturedMs>CONTEXT_MAX_AGE_MS
      || !ORDER_ID.test(order?.merchantUid || '') || !order.paidAt
      || raw?.id!==order.merchantUid || raw.channel?.type!=='LIVE' || raw.currency!=='KRW'
      || !['CANCELLED','PARTIAL_CANCELLED'].includes(raw.status)
      || !Number.isSafeInteger(raw.amount?.total) || raw.amount.total<=0
      || raw.amount.total!==Number(order.paymentAmount)
      || !Number.isSafeInteger(raw.amount?.cancelled) || raw.amount.cancelled<=0
      || raw.amount.cancelled>raw.amount.total || !Array.isArray(raw.cancellations)
      || (raw.status==='CANCELLED' && raw.amount.cancelled!==raw.amount.total)
      || (raw.status==='PARTIAL_CANCELLED' && raw.amount.cancelled>=raw.amount.total)) return [];
  const cancelled=raw.cancellations.filter(c=>c.status==='SUCCEEDED');
  if (!cancelled.length || new Set(cancelled.map(c=>c.id)).size!==cancelled.length
      || cancelled.some(c=>typeof c.id!=='string' || !c.id || c.id.length>200
        || !Number.isSafeInteger(c.totalAmount) || c.totalAmount<=0)
      || cancelled.reduce((sum,c)=>sum+c.totalAmount,0)!==raw.amount.cancelled) return [];
  const paidMs=+new Date(order.paidAt);
  if (!Number.isFinite(paidMs) || paidMs<capturedMs-60_000) return [];
  return cancelled.flatMap(c=>{
    const at=+new Date(c.cancelledAt || 0);
    if (!Number.isFinite(at) || !at || at<paidMs || at>nowMs || nowMs-at>=GA4_REFUND_MAX_AGE_MS) return [];
    return [{cancellationId:c.id,body:{
      client_id:context.clientId,timestamp_micros:at*1000,
      validation_behavior:'ENFORCE_RECOMMENDATIONS',
      consent:{ad_user_data:'DENIED',ad_personalization:'DENIED'},
      events:[{name:'refund',params:{transaction_id:order.merchantUid,value:c.totalAmount,currency:'KRW'}}],
    }}];
  });
}

async function receiptKey(id) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id));
  return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
}

// An uncertain HTTP outcome stays claimed for review, never automatically re-sent.
// HTTP 2xx means submitted, not proven visible in GA. Runtime receipt verification is separate.
export async function sendPendingGa4Refunds(env, withDb, deps = {}) {
  const config=ga4RefundConfig(env);
  const summary={enabled:!!config,scanned:0,submitted:0,review:0,skipped:0};
  if (!config) return summary;
  const now=deps.now || new Date(), nowMs=+new Date(now);
  const rows=await withDb(db=>db.find(Payment,{
    'metadata.ga4PurchaseContext.version':1,'metadata.ga4PurchaseContext.consent':true,
    'metadata.ga4PurchaseContext.capturedAt':{$gte:new Date(nowMs-CONTEXT_MAX_AGE_MS)},
    paidAt:{$exists:true},updatedAt:{$gte:new Date(nowMs-GA4_REFUND_MAX_AGE_MS)},
    $or:[{'metadata.ga4RefundCheckedAt':{$exists:false}},{'metadata.ga4RefundCheckedAt':{$lt:new Date(nowMs-10*60_000)}}],
  },{sort:{'metadata.ga4RefundCheckedAt':1},limit:5,projection:{merchantUid:1,paymentAmount:1,paidAt:1,'metadata.ga4PurchaseContext':1}}));
  for (const order of rows) {
    summary.scanned++;
    await withDb(db=>db.updateOne(Payment,{merchantUid:order.merchantUid},{$set:{'metadata.ga4RefundCheckedAt':now}}));
    let receipts;
    try { receipts=buildGa4RefundReceipts(order,(await (deps.fetchPayment || fetchPortOnePayment)(env,order.merchantUid)).rawV2,now); }
    catch { summary.review++; continue; }
    if (!receipts.length) { summary.skipped++; continue; }
    for (const receipt of receipts) {
      const path='metadata.ga4RefundDeliveries.'+await receiptKey(receipt.cancellationId);
      const claim=await withDb(db=>db.updateOne(Payment,{
        merchantUid:order.merchantUid,[path]:{$exists:false},'metadata.ga4PurchaseContext.consent':true,
      },{$set:{[path]:{state:'dispatching',attemptedAt:now,valueKRW:receipt.body.events[0].params.value}}}));
      if (claim?.modifiedCount!==1) { summary.skipped++; continue; }
      let state='review';
      try {
        const url=new URL('https://www.google-analytics.com/mp/collect');
        url.searchParams.set('measurement_id',config.measurementId);
        url.searchParams.set('api_secret',config.secret);
        const response=await (deps.fetchImpl || fetch)(url.toString(),{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(receipt.body),
          signal:AbortSignal.timeout(5000),redirect:'error',
        });
        if (response.ok) state='submitted';
      } catch { /* Do not log URLs, credentials, client IDs or payment IDs. */ }
      summary[state]++;
      await withDb(db=>db.updateOne(Payment,{merchantUid:order.merchantUid,[path+'.state']:'dispatching'},
        {$set:{[path+'.state']:state,[path+'.finishedAt']:new Date()}}));
    }
  }
  return summary;
}
