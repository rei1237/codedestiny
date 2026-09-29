import test from 'node:test';import assert from 'node:assert/strict';
import {summarizeGrowth,contribution,growthPipeline} from '../../lib/marketing/growth-metrics.mjs';
test('persisted payment and completion are deduplicated independently; missing cost is unknown',()=>{
 const a={_id:'a',productId:'saju_mackerel',completedChapters:5,completedAt:'2026-09-29T00:01:00Z',firstContentAt:'2026-09-29T00:00:20Z',payment:{_id:'p',status:'paid',paidAt:'2026-09-29T00:00:00Z',paymentAmount:1000}};
 const r=summarizeGrowth([a,a,{_id:'pending',state:'CREATED'},{_id:'family',accessMethod:'FAMILY',completedAt:a.completedAt}]);
 assert.equal(r.totals.payment_verified,1);assert.equal(r.totals.report_ready,2);assert.equal(r.totals.family_report_ready,1);assert.equal(r.deliveredPerPayment,1);
 assert.equal(r.latencyMs.firstContent.p50,20000);assert.equal(r.contribution.contributionKRW,null);assert.equal(JSON.stringify(r).includes('"p"'),false);
});
test('refunds remain separate; client success alone does not verify payment',()=>{
 const r=summarizeGrowth([{_id:'x',state:'COMPLETED'},{_id:'r',state:'REFUNDED',payment:{_id:'p',status:'refunded',paidAt:'2026-09-29T00:00:00Z',paymentAmount:1000}}]);
 assert.equal(r.totals.payment_verified,1);assert.equal(r.totals.report_ready,0);assert.equal(r.totals.refund,1);
 assert.equal(contribution({grossReceiptsKRW:1000,refundsKRW:100,taxKRW:90,pgFeesKRW:30,llmGenerationKRW:80,llmRetryKRW:20,notificationsKRW:0,variableInfraKRW:10,validVisitors:10}).perValidVisitorKRW,67);
 assert.equal(growthPipeline(new Date(),new Date()).some(stage=>stage.$out||stage.$merge),false);
});
