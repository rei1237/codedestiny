/** @jest-environment node */
import { jest } from '@jest/globals';
const entitlement=jest.fn();
const noRevocation=()=>({findOne:()=>({lean:async()=>null})});
jest.unstable_mockModule('../../worker/lib/models.js',()=>({
  ContentEntitlement:{findOne:entitlement}, PaidExecutionRecord:noRevocation(),
  Payment:noRevocation(),PointHistory:noRevocation(),MonthlyCreditLedger:noRevocation(),
}));
let isStoredPaidResultRevoked;
beforeAll(async()=>{({isStoredPaidResultRevoked}=await import('../../worker/lib/paid-result-revocation.js'));});
beforeEach(()=>{entitlement.mockReset();entitlement.mockReturnValue({lean:async()=>null});});
test('birth archive checks original entitlement cancellation for its owner, not current expiry',async()=>{
 const record={executionKey:'sibyl:birth:2026',status:'success',metadata:{accessEntitlementId:'original-grant'}};
 expect(await isStoredPaidResultRevoked('owner','premium-sibyl-dominator',record)).toBe(false);
 expect(entitlement).toHaveBeenCalledWith({_id:'original-grant',userId:'owner',status:{$in:['REFUNDED','CANCELLED']}});
 entitlement.mockReturnValue({lean:async()=>({_id:'original-grant',status:'REFUNDED'})});
 expect(await isStoredPaidResultRevoked('owner','premium-sibyl-dominator',record)).toBe(true);
});
test('legacy completed originals do not acquire a new entitlement requirement',async()=>{
 expect(await isStoredPaidResultRevoked('owner','fpti-premium',{status:'success'})).toBe(false);
 expect(entitlement).not.toHaveBeenCalled();
});
