import '../../scripts/lib/mock-network-guard.cjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const report = (...args) => JSON.parse(execFileSync(process.execPath, ['scripts/report-yeongnyangi-pass-economics.mjs', ...args], { cwd: root, encoding: 'utf8' }));

test('dedicated-pack scenarios include the reported server bill and each redeemed signup benefit',()=>{
 const result=report();
 assert.equal(result.assumptions['fixed-monthly-usd'],70);
 assert.equal(result.assumptions['fixed-monthly-krw'],98000);
 assert.equal(result.assumptions['target-operating-margin'],.3);
 const proposal=result.dedicatedPackEvaluation;
 assert.equal(proposal.mode,'proposal_not_runtime');
 const pack=proposal.packs.find(pack=>pack.priceKRW===5000&&pack.consultations===7);
 assert.equal(pack.contributionBeforeFixedKRW,326.05);
 assert.equal(pack.breakEvenMonthlyPacksWithoutSignup,301);
 const hundred=pack.monthlyScenarios.find(row=>row.monthlyPaidPacks===100&&row.signupRedemptions===0);
 assert.ok(hundred.operatingProfitScenarioKRW<0);
 assert.ok(hundred.maximumConsultationCostForTargetMarginKRW<result.signup.acquisitionCostCapScenarioKRW);
 const withSignup=pack.monthlyScenarios.find(row=>row.monthlyPaidPacks===100&&row.signupRedemptions===100);
 assert.equal(withSignup.signupAcquisitionCostKRW,Math.round(result.signup.acquisitionCostCapScenarioKRW*100));
 assert.equal(Math.round(hundred.operatingProfitScenarioKRW-withSignup.operatingProfitScenarioKRW),Math.round(withSignup.signupAcquisitionCostKRW));
 assert.ok(pack.noVariableReserveSensitivity.contributionBeforeFixedKRW>pack.contributionBeforeFixedKRW);
 assert.equal(proposal.termAndExpiry,'Not defined or implemented');
});

test('monthly fifty-pack review exposes mackerel margin limits independently of a profitable mix',()=>{
 const result=report(),review=result.fishPackEvaluation;
 assert.equal(review.mode,'proposal_not_runtime');assert.equal(review.monthlyPaidPacks,50);
 assert.equal(review.packs.length,4);
 for(const pack of review.packs){
  assert.ok(pack.discountToDirect>=.2-1e-9);
  assert.equal(pack.regimes.twoAttemptsPerChapterKRW.allocatedMonthlyFixedPerPackKRW,1960);
  assert.equal(pack.regimes.twoAttemptsPerChapterKRW.targetMetWithoutSignup,pack.fishId!=='mackerel');
 }
 const mackerel=review.packs.find(pack=>pack.fishId==='mackerel');
 // 2026-10-05: at 3,000 the mackerel direct price leaves room for a 30% margin (at 1,000 it did not).
 assert.equal(mackerel.thirtyPercentMarginPossibleBelowDirectPriceEvenAtInfiniteVolume,true);
 assert.ok(review.costs.every(row=>row.firstAttemptSuccessKRW<row.hypotheticalOneBookRetryKRW&&row.hypotheticalOneBookRetryKRW<row.twoAttemptsPerChapterKRW));
 const allMackerel=review.monthlyFiftyPackMixes.find(mix=>mix.name==='all_mackerel');
 assert.ok(allMackerel.scenarios.find(row=>row.signupRedemptions===100).operatingProfitScenarioKRW<0);
 const introductory=result.dedicatedPackEvaluation.packs.find(pack=>pack.priceKRW===5000&&pack.consultations===7);
 assert.equal(introductory.monthlyScenarios.find(row=>row.monthlyPaidPacks===50&&row.signupRedemptions===0).maximumConsultationCostForTargetMarginKRW,126.49);
});


test('stress assumptions increase explicit costs without relabeling the result as measured profit',()=>{
 const base=report(),stress=report('--krw-per-usd=1600','--pg-rate=0.05','--operations-per-consultation-krw=100');
 assert.equal(stress.assumptions['fixed-monthly-krw'],112000);
 assert.equal(base.policyEvaluation.mode,'dedicated_pack_proposal_not_runtime');
 assert.equal(base.policyEvaluation.approvedSaleTerms,false);
 assert.equal(base.products.length,28);
 assert.ok(base.fishPackEvaluation.costs.every(cost=>cost.evaluatedManifestVariants>300));
 for(const original of base.fishPackEvaluation.costs){
  const stressed=stress.fishPackEvaluation.costs.find(cost=>cost.fishId===original.fishId);
  assert.ok(stressed.twoAttemptsPerChapterKRW>original.twoAttemptsPerChapterKRW);
 }
 const allMackerel=stress.fishPackEvaluation.monthlyFiftyPackMixes.find(mix=>mix.name==='all_mackerel');
 assert.ok(allMackerel.scenarios[0].operatingProfitScenarioKRW<0);
});
