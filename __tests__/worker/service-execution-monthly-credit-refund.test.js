/** @jest-environment node */
import {setup,uid,debit,execId} from '../fixtures/monthly-refund-fixture.mjs';
test('V2 restores actual moonstones atomically and stamps the original debit',async()=>{
 const f=await setup();expect(await f.run()).toMatchObject({refunded:true,amount:3});
 expect(f.state.balance).toBe(13);expect(f.grants()).toHaveLength(1);
 expect(f.grants()[0].sourceId).toBe(`service-exec-refund:ledger:${debit}`);
 expect(f.state.MonthlyCreditLedger[0].metadata.refundedForUnlockFailure).toBe(true);
});
test('concurrent executions sharing a debit restore it only once',async()=>{
 const f=await setup();const results=await Promise.all([f.run(),f.run({executionId:'64b7f2a1c3d4e5f6012345ab'})]);
 expect(results.every(result=>result.refunded)).toBe(true);
 expect(f.state.balance).toBe(13);expect(f.grants()).toHaveLength(1);expect(f.state.restores).toBe(1);
});
test.each(['completed','partial','delivery_pending','generating'])('a linked %s paid record protects its funding',async(status)=>{
 const f=await setup();f.state.PaidExecutionRecord.push({userId:uid,requestId:'another-request',paymentId:'synthetic-request',status});
 expect(await f.run()).toMatchObject({refunded:false,adminReviewRequired:true});expect(f.state.restores).toBe(0);
});
test('a partial result on this execution is protected before any balance write',async()=>{
 const f=await setup();f.state.ServiceExecutionTransaction.push({_id:execId,userId:uid,executionKey:'synthetic-request',sourceTransactionId:'synthetic-request',status:'pending',metadata:{paidNarrative:{parts:{intro:'already delivered'}}}});
 expect(await f.run()).toMatchObject({refunded:false,adminReviewRequired:true});expect(f.state.restores).toBe(0);
});
test('shared proof protects another product through narrative metadata',async()=>{
 const f=await setup();f.state.ServiceExecutionTransaction.push({_id:'64b7f2a1c3d4e5f6012345ab',userId:uid,featureKey:'other-product',status:'pending',metadata:{paidNarrativeProof:{transactionId:'synthetic-request'}}});
 expect(await f.run()).toMatchObject({refunded:false,adminReviewRequired:true});expect(f.state.restores).toBe(0);
});
test('lost execution completion reuses committed receipt after proof is excluded',async()=>{
 const f=await setup();await f.run();expect(await f.run()).toMatchObject({refunded:true,idempotent:true});expect(f.state.restores).toBe(1);
});
test.each(['receipt','balance'])('%s failure rolls back debit marker, balance and receipt together',async(stage)=>{
 const f=await setup();f.fail(stage);await expect(f.run()).rejects.toThrow();
 expect(f.state.balance).toBe(10);expect(f.grants()).toHaveLength(0);expect(f.state.MonthlyCreditLedger[0].metadata.refundedForServiceExecution).toBeUndefined();
 f.fail('');expect(await f.run()).toMatchObject({refunded:true});expect(f.state.balance).toBe(13);
});
test.each(['pending','success'])('another %s execution protects the shared purchase',async(status)=>{
 const f=await setup();f.state.ServiceExecutionTransaction.push({_id:'64b7f2a1c3d4e5f6012345ab',userId:uid,featureKey:'test-feature',sourceTransactionId:'synthetic-request',status});
 expect(await f.run()).toMatchObject({refunded:false,adminReviewRequired:true});expect(f.state.balance).toBe(10);
});
test.each([{userId:'64b7f2a1c3d4e5f601234568'},{featureKey:'wrong-feature',execution:{}}])('mismatched purchase evidence cannot restore',async(overrides)=>{
 const f=await setup();expect(await f.run(overrides)).toMatchObject({refunded:false});expect(f.state.restores).toBe(0);
});
test('old unconfirmed receipt is held for review, never paid again',async()=>{
 const f=await setup();f.state.MonthlyCreditLedger.push({userId:uid,type:'MONTHLY_CREDIT_GRANT',serviceKey:'test-feature',metadata:{executionId:execId,source:'billing.service-execution'}});
 expect(await f.run()).toMatchObject({refunded:false,adminReviewRequired:true});expect(f.state.restores).toBe(0);
});
