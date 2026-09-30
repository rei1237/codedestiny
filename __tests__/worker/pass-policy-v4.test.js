/** @jest-environment node */
import { currentPassPlan, previousPassPlan, PREVIOUS_PASS_POLICY_VERSION, CURRENT_PASS_POLICY_VERSION } from '../../lib/payment/pass-policy.js';
import { resolvePassPolicy, buildPassCycleFields } from '../../worker/lib/profile-limits.js';
import { resolvePassPlan, createPassOrder, activatePassSubscription, evaluatePassCoverage } from '../../worker/payments/passes.js';
import { makeFakePaymentDb } from '../fixtures/fake-payment-db.mjs';
import { __paymentsContextTestUtils } from '../../worker/payments/index.js';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),verdict=require('../../js/core/pass-verdict.js');
const now=new Date('2026-09-30T00:00:00Z'),expiry='2026-10-30T00:00:00.000Z',userId='64b000000000000000000001';
const cases=[['standard',9900,200,400],['premium',29900,600,1000],['vvip',59900,1200,2000],['family',149000,3500,5000]];
test.each(cases)('%s v4 and v3 retain independent prices and budgets',async(tier,price,budget,oldBudget)=>{
 const next=currentPassPlan(tier),old=previousPassPlan(tier);
 expect(next).toMatchObject({wonPrice:price,monthlyLimitCoin:budget,planId:tier+'_1m_v4'});
 expect(resolvePassPlan(tier,1,PREVIOUS_PASS_POLICY_VERSION)).toEqual(old);
 expect(resolvePassPolicy(old).monthlyCoveredCoin).toBe(oldBudget);
 expect(buildPassCycleFields({tier,expiresAt:expiry,now,passPolicyVersion:CURRENT_PASS_POLICY_VERSION}).monthlyLimitCoin).toBe(budget);
 for(const [plan,limit] of [[next,budget],[old,oldBudget]]){
  const sub={...plan,isActive:true,expiresAt:expiry,premiumUseCycleKey:expiry,monthlySpendCoin:limit-50};
  expect(evaluatePassCoverage({user:{profileSubscription:sub},entitlement:sub,coinCost:50}).covered).toBe(true);
  expect(evaluatePassCoverage({user:{profileSubscription:sub},entitlement:sub,coinCost:51}).covered).toBe(false);
 }
 const db=makeFakePaymentDb(),user={_id:userId,profileSubscription:{tier:'free'}};db.rows.push(user);
 db.rows.push({userId,merchantUid:'pending-'+tier,idempotencyKey:'pending-'+tier,paymentType:'membership_pass',subscriptionTier:tier,paymentAmount:old.wonPrice,status:'pending',metadata:{durationMonths:1,passPolicyVersion:PREVIOUS_PASS_POLICY_VERSION}});
 const pending=await createPassOrder(db,{userId,plan:old,idempotencyKey:'pending-'+tier});
 expect(pending.paymentAmount).toBe(old.wonPrice);
 await activatePassSubscription(db,{userId,plan:old,orderId:pending.merchantUid,expiresAt:expiry,now,existing:user});
 expect(user.profileSubscription.monthlyLimitCoin).toBe(oldBudget);
 expect(user.profileSubscription.passPolicyVersion).toBe(PREVIOUS_PASS_POLICY_VERSION);
 await expect(activatePassSubscription(db,{userId,plan:next,orderId:'new-'+tier,expiresAt:expiry,now,existing:user})).rejects.toMatchObject({code:'PASS_POLICY_CONFLICT'});
});
test('plan IDs infer the original policy on prepare and never map v3 to v4',()=>{
 for(const tier of cases.map(row=>row[0]))for(const plan of [previousPassPlan(tier),currentPassPlan(tier)]){
  const resolved=__paymentsContextTestUtils.resolvePassRequest({}, {tier,planId:plan.planId,durationMonths:1,paymentMethod:'card_general'});
  expect(resolved.plan.passPolicyVersion).toBe(plan.passPolicyVersion);
 }
});
test('local snapshot knows both Family budgets',()=>{
 for(const [plan,limit] of [[currentPassPlan('family'),3500],[previousPassPlan('family'),5000]]) {
  const expiresAt=new Date(Date.now()+86400000).toISOString();
  const snapshot=verdict.buildSnapshotFromStatus(userId,{...plan,tier:'family',isActive:true,expiresAt,premiumUseCycleKey:expiresAt,monthlySpendCoin:100},'test');
  expect(snapshot.monthlySpendRemainingCoin).toBe(limit-100);
 }

});
