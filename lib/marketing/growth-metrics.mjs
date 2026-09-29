import {normalizeGrowthAttribution} from './growth-attribution.mjs';
export function growthPipeline(from,to) {
  return [{$match:{createdAt:{$gte:from,$lt:to}}},
    {$lookup:{from:'payments',localField:'paymentId',foreignField:'_id',as:'payment'}},
    {$project:{_id:1,productId:1,state:1,accessMethod:1,passEvidenceId:1,completedAt:1,firstContentAt:1,createdAt:1,
      completedChapters:1,errorCode:1,attempts:1,locale:'$snapshot.locale',attribution:'$growthAttribution',
      payment:{$arrayElemAt:['$payment',0]}}},
    {$project:{_id:1,productId:1,state:1,accessMethod:1,passEvidenceId:1,completedAt:1,firstContentAt:1,createdAt:1,
      completedChapters:1,errorCode:1,attempts:1,locale:1,attribution:1,
      'payment._id':1,'payment.status':1,'payment.paymentAmount':1,'payment.paidAt':1}}];
}
function percentile(values,p) {const sorted=values.filter(v=>Number.isFinite(v)&&v>=0).sort((a,b)=>a-b);return sorted.length?sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]:null;}
export function contribution(costs={}) {
  const keys=['grossReceiptsKRW','refundsKRW','taxKRW','pgFeesKRW','llmGenerationKRW','llmRetryKRW','notificationsKRW','variableInfraKRW'];
  const missing=keys.filter(key=>typeof costs[key]!=='number'||!Number.isFinite(costs[key])||costs[key]<0);
  const value=missing.length?null:costs.grossReceiptsKRW-keys.slice(1).reduce((sum,key)=>sum+costs[key],0);
  return {contributionKRW:value,perValidVisitorKRW:value!==null&&costs.validVisitors>0?value/costs.validVisitors:null,missing,
    basis:costs.basis==='settlement'?'settlement':'scenario_or_unverified'};
}
export function summarizeGrowth(rows,costs={}) {
 const groups=new Map(),seen=new Set(),payments=new Set();
 const first=[],complete=[];
 for(const row of rows){
  const id=String(row._id||'');if(!id||seen.has(id))continue;seen.add(id);
  const attribution=normalizeGrowthAttribution(row.attribution),family=row.accessMethod==='FAMILY'||!!row.passEvidenceId;
  const key=JSON.stringify([row.productId||'unknown',row.locale||'ko',attribution?.campaignId||'unattributed',attribution?.device||'unknown',family?'FAMILY':'DIRECT_KRW']);
  if(!groups.has(key))groups.set(key,{product:row.productId||'unknown',locale:row.locale||'ko',campaign:attribution?.campaignId||'unattributed',device:attribution?.device||'unknown',access:family?'FAMILY':'DIRECT_KRW',intents:0,payment_verified:0,report_ready:0,paid_report_ready:0,family_report_ready:0,partial:0,held:0,refund:0,grossVerifiedKRW:0});
  const g=groups.get(key);g.intents++;
  const payment=row.payment||{},paymentKey=String(payment._id||''),verified=!family&&paymentKey&&(!!payment.paidAt||['paid','success','fulfilled'].includes(payment.status));
  const newPayment=verified&&!payments.has(paymentKey);
  if(newPayment){payments.add(paymentKey);g.payment_verified++;g.grossVerifiedKRW+=Number(payment.paymentAmount)||0;}
  if(row.completedAt){g.report_ready++;if(newPayment)g.paid_report_ready++;if(family)g.family_report_ready++;}
  if(row.completedChapters>0&&!row.completedAt)g.partial++;
  if(['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED','ASK_LIMITED_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode))g.held++;
  if(payment.status==='refunded'||row.state==='REFUNDED')g.refund++;
  if(payment.paidAt){const paid=+new Date(payment.paidAt);if(row.firstContentAt)first.push(+new Date(row.firstContentAt)-paid);if(row.completedAt)complete.push(+new Date(row.completedAt)-paid);}
 }
 const result=[...groups.values()];const totals=result.reduce((sum,g)=>{for(const key of ['intents','payment_verified','report_ready','paid_report_ready','family_report_ready','partial','held','refund','grossVerifiedKRW'])sum[key]=(sum[key]||0)+g[key];return sum;},{});
 return {metricVersion:1,source:'server_persisted_order_state',cohort:'request_created_at',groups:result,totals,
   deliveredPerPayment:totals.payment_verified?totals.paid_report_ready/totals.payment_verified:null,
   paidAndDeliveredPerValidVisitor:costs.validVisitors>0?(totals.paid_report_ready||0)/costs.validVisitors:null,
   latencyMs:{firstContent:{n:first.length,p50:percentile(first,.5),p95:percentile(first,.95)},complete:{n:complete.length,p50:percentile(complete,.5),p95:percentile(complete,.95)}},
   contribution:contribution(costs),report_view:'Use browser fortune_result_view separately; server completion is not a view.',
   limitations:['Older rows lack firstContentAt; absent timings are not zero.','Attribution covers consented new intents only and is not proof of acquisition causality.','Family revenue allocation and actual cost reconciliation require settlement inputs.']};
}
