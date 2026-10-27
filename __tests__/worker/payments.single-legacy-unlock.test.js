/** @jest-environment node */
import { jest } from '@jest/globals';
import { testCard, TEST_USER_ID } from '../fixtures/profile-card-model.mjs';
import { matches } from '../fixtures/fake-payment-db.mjs';
import { computeBirthKey, toBirthEntitlementProfileId } from '../../worker/lib/birth-key.js';
import { ContentEntitlement, Payment, ProfileCard } from '../../worker/lib/models.js';
import { __paymentsTestUtils } from '../../worker/routes/payments.js';

const card = testCard('p1');
const baseRow = { userId: TEST_USER_ID, profileId: toBirthEntitlementProfileId(computeBirthKey(card)),
  scope: 'BIRTH', featureKey: 'rpt_specialCharmCard', contentKey: 'rpt_specialCharmCard',
  serviceKey: 'rpt_specialCharmCard', status: 'ACTIVE', expiresAt: null };
const query = value => ({ select(){ return this; }, sort(){ return this; }, session(){ return this; }, lean:async()=>value });
let paymentRead, row;
beforeEach(()=>{
 row = { ...baseRow };
 jest.spyOn(ProfileCard,'findOne').mockImplementation(filter=>query(filter.userId===TEST_USER_ID&&filter.profileId==='p1'?card:null));
 jest.spyOn(ContentEntitlement,'findOne').mockImplementation(filter=>query(matches(row,filter)?row:null));
 paymentRead=jest.spyOn(Payment,'findOne').mockImplementation(()=>query(null));
 jest.spyOn(Payment,'create').mockImplementation(()=>{throw Error('unexpected order creation');});
});
afterEach(()=>jest.restoreAllMocks());

test.each(['rpt_specialCharmCard','paid_content'])("single checkout recognizes historical %s grant before creating an order",async serviceKey=>{
 row.serviceKey=serviceKey;
 const request=new Request('https://example.test/api/payments/single/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profileId:'p1',featureKey:'rpt_specialCharmCard'})});
 const response=await __paymentsTestUtils.handleSinglePaymentStart(request,{}, {userId:TEST_USER_ID});
 expect(response.status).toBe(200);
 expect(await response.json()).toMatchObject({ok:true,alreadyUnlocked:true,unlockSource:'content_entitlement'});
 expect(paymentRead).not.toHaveBeenCalled();
 expect(Payment.create).not.toHaveBeenCalled();
});


test.each([
 { status:'REFUNDED' },
 { expiresAt:new Date('2000-01-01') },
 { profileId:`birth:${'b'.repeat(64)}` },
 { userId:'64b0000000000000000000b2' },
 { contentKey:'rpt_skillTreeCard' },
])('single checkout never accepts unrelated or inactive grant %j',async changes=>{
 Object.assign(row,changes);
 const request=new Request('https://example.test/api/payments/single/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profileId:'p1',featureKey:'rpt_specialCharmCard'})});
 const response=await __paymentsTestUtils.handleSinglePaymentStart(request,{}, {userId:TEST_USER_ID});
 expect(response.status).toBe(503);
 expect(paymentRead).toHaveBeenCalled();
 expect(Payment.create).not.toHaveBeenCalled();
});


test.each([['2026',200],['2027',503]])('yearly unlock only matches its purchased year: %s',async(year,status)=>{
 Object.assign(row,{featureKey:'sukyo_yearly_fortune_unlock',contentKey:'sukyo_yearly_fortune_unlock:2026',serviceKey:'sukuyo'});
 const request=new Request('https://example.test/api/payments/single/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profileId:'p1',featureKey:'sukyo_yearly_fortune_unlock',contentKey:`sukyo_yearly_fortune_unlock:${year}`,targetYear:Number(year)})});
 const response=await __paymentsTestUtils.handleSinglePaymentStart(request,{}, {userId:TEST_USER_ID});
 expect(response.status).toBe(status);
 if(status===200) expect(await response.json()).toMatchObject({ok:true,alreadyUnlocked:true});
 expect(Payment.create).not.toHaveBeenCalled();
});
