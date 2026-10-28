/** @jest-environment node */
import {setup,debit} from '../fixtures/monthly-refund-fixture.mjs';
test('legacy request alias and direct debit ID share one restoration',async()=>{const f=await setup(true);expect(await f.run()).toMatchObject({refunded:true,amount:3});expect(await f.run({sourceTransactionId:debit,executionId:'64b7f2a1c3d4e5f6012345ab'})).toMatchObject({refunded:true,idempotent:true});expect(f.state.balance).toBe(13);expect(f.grants()[0].metadata.refundForPointHistoryId).toBe(debit);});
test('legacy other feature debit cannot restore',async()=>{const f=await setup(true);f.state.PointHistory[0].featureKey='another-feature';expect(await f.run()).toMatchObject({refunded:false});expect(f.state.restores).toBe(0);});
