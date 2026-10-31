/** @jest-environment node */
import { jest } from '@jest/globals';
const UID='507f1f77bcf86cd799439011';
let user, receipts, payment, delivered, lotCalls;
const chain=value=>({select(){return this},sort(){return this},lean:async()=>typeof value==='function'?value():value});
const rewardModel={
 find:()=>chain(()=>[...receipts.values()]), findById:id=>chain(()=>receipts.get(id)),
 findOneAndUpdate:(filter,update)=>chain(()=>{if(!receipts.has(filter._id))receipts.set(filter._id,{...update.$setOnInsert,createdAt:new Date()});return receipts.get(filter._id)}),
 updateOne:jest.fn(async (filter,update)=>{const r=receipts.get(filter._id);if(r&&(!('grantStartedAt'in filter)||!r.grantStartedAt))Object.assign(r,update.$set);}),
};
const ledgerWrite=jest.fn(async()=>({})),ledgerRead=jest.fn(()=>chain(null));
const paymentFind=jest.fn(()=>chain(()=>payment)),requestFind=jest.fn(()=>chain(()=>delivered));
const grant=jest.fn(async({lotId,amount})=>{
 lotCalls++;let lot=user.profileSubscription.membershipCreditLots.find(x=>x.lotId===lotId),added=!lot;
 if(!lot){lot={lotId,amount,remaining:amount,grantedAt:new Date(),expiresAt:new Date(Date.now()+30*86400000)};user.profileSubscription.membershipCreditLots.push(lot);user.profileSubscription.membershipCreditBalance+=amount;}
 return {user,lot,added,beforeBalance:0,afterBalance:user.profileSubscription.membershipCreditBalance};
});
let api;
beforeAll(async()=>{
 class ObjectId{constructor(v){this.value=v}toString(){return this.value}}
 await jest.unstable_mockModule('../../worker/lib/db.js',()=>({mongoose:{Types:{ObjectId}}}));
 await jest.unstable_mockModule('../../worker/lib/models.js',()=>({User:{findById:()=>chain(()=>user)},ProfileCard:{findOne:filter=>chain(filter.profileId==='own'?{birth:{year:2000,month:1,day:1},profileId:'own'}:null)},Payment:{findOne:paymentFind},MonthlyCreditLedger:{findOne:ledgerRead,updateOne:ledgerWrite},PaidExecutionRecord:{findOne:()=>chain(null)},ServiceExecutionTransaction:{findOne:()=>chain(null)}}));
 await jest.unstable_mockModule('../../worker/lib/activation-reward-models.js',()=>({ActivationReward:rewardModel}));
 await jest.unstable_mockModule('../../worker/lib/monthly-credit-store.js',()=>({grantMonthlyCreditLotDetailed:grant}));
 await jest.unstable_mockModule('../../worker/lib/yeongnyangi-models.js',()=>({YeongnyangiRequest:{findOne:requestFind}}));
 await jest.unstable_mockModule('../../worker/lib/review-reward.js',()=>({REVIEW_REWARD_AMOUNT:3000}));
 api=await import('../../worker/lib/activation-rewards.js');
});
beforeEach(()=>{jest.clearAllMocks();receipts=new Map();payment=null;delivered=null;lotCalls=0;user={_id:UID,profileSubscription:{membershipCreditBalance:0,membershipCreditLots:[],activationRewardVersion:'activation-20261031-v1'}};ledgerRead.mockImplementation(()=>chain(null));ledgerWrite.mockResolvedValue({});});
test('signup and reading status alone do not grant',async()=>{const r=await api.readActivationRewards(UID);expect(r.tutorial.eligible).toBe(true);expect(r.policy.review.amount).toBe(3000);expect(grant).not.toHaveBeenCalled();});
test('tutorial needs own saved profile and a completion receipt',async()=>{
 await expect(api.startFreeSajuTutorial(UID,'other')).rejects.toMatchObject({payload:{code:'INVALID_PROFILE'}});
 await expect(api.settleActivationReward(UID,'tutorial',{profileId:'own'})).rejects.toMatchObject({payload:{code:'TUTORIAL_REQUIRED'}});
 expect(grant).not.toHaveBeenCalled();
});
test('tutorial grant is once even for concurrent claims and later lot pruning',async()=>{
 await api.startFreeSajuTutorial(UID,'own');await Promise.all([api.settleActivationReward(UID,'tutorial',{profileId:'own'}),api.settleActivationReward(UID,'tutorial',{profileId:'own'})]);
 expect(user.profileSubscription.membershipCreditLots).toHaveLength(1);expect(user.profileSubscription.membershipCreditBalance).toBe(500);
 user.profileSubscription.membershipCreditLots=[];user.profileSubscription.membershipCreditBalance=0;const before=lotCalls;
 expect((await api.settleActivationReward(UID,'tutorial',{profileId:'own'})).replayed).toBe(true);expect(lotCalls).toBe(before);
});
test('old signup receipt blocks another tutorial grant and preserves its expiry',async()=>{
 const expiry=new Date(Date.now()+86400000);user.profileSubscription.membershipCreditLots=[{lotId:'signup',amount:500,remaining:37,grantedAt:new Date(),expiresAt:expiry}];
 expect((await api.startFreeSajuTutorial(UID,'own')).alreadyReceived).toBe(true);
 expect((await api.settleActivationReward(UID,'tutorial',{profileId:'own'})).alreadyReceived).toBe(true);
 expect(user.profileSubscription.membershipCreditLots[0].expiresAt).toBe(expiry);expect(grant).not.toHaveBeenCalled();
});
test('legacy ledger also prevents a duplicate after old signup lot pruning',async()=>{ledgerRead.mockImplementation(()=>chain({_id:'old'}));expect((await api.readActivationRewards(UID)).tutorial.eligible).toBe(false);});
test('a cash receipt without delivered result earns nothing',async()=>{
 payment={_id:'paid-id',merchantUid:'merchant',paidAt:new Date(),createdAt:new Date()};expect(await api.findFirstDeliveredCashPurchase(UID)).toBeNull();
 expect((await api.settleActivationReward(UID,'first_paid')).eligible).toBe(false);expect(grant).not.toHaveBeenCalled();
 const filter=paymentFind.mock.calls[0][0];expect(filter.status.$in).not.toContain('refunded');expect(filter.purchaseType).toEqual({$ne:'GIFT'});expect(filter.paymentAmount).toEqual({$gt:0});expect(filter.featureKey.$in).toContain('yeongnyangi-saju-salmon');expect(filter.featureKey.$in).not.toContain('section_summary');
});
test('cash plus delivered report gives first paid reward once',async()=>{payment={_id:'paid-id',merchantUid:'merchant',paidAt:new Date(),createdAt:new Date()};delivered={_id:'result'};
 const r=await api.settleActivationReward(UID,'first_paid');expect(r.granted).toBe(true);expect(r.firstPaid.receipt.amount).toBe(500);
 expect(requestFind.mock.calls[0][0].userId.toString()).toBe(UID);expect(requestFind.mock.calls[0][0].state).toBe('COMPLETED');
 await api.settleActivationReward(UID,'first_paid');expect(user.profileSubscription.membershipCreditBalance).toBe(500);
});
test('pre-policy paid account is not a new first purchaser',async()=>{payment={_id:'old',paidAt:new Date('2026-10-01')};delivered={_id:'result'};expect(await api.findFirstDeliveredCashPurchase(UID)).toBeNull();});
test('ledger failure can retry the existing lot without another credit',async()=>{
 await api.startFreeSajuTutorial(UID,'own');ledgerWrite.mockRejectedValueOnce(new Error('offline'));
 await expect(api.settleActivationReward(UID,'tutorial',{profileId:'own'})).rejects.toThrow('offline');
 expect((await api.settleActivationReward(UID,'tutorial',{profileId:'own'})).granted).toBe(true);expect(user.profileSubscription.membershipCreditBalance).toBe(500);
});
test('a month-old ambiguous partial grant requires review instead of another lot',async()=>{
 await api.startFreeSajuTutorial(UID,'own');const r=[...receipts.values()][0];r.grantStartedAt=new Date(Date.now()-31*86400000);
 await expect(api.settleActivationReward(UID,'tutorial',{profileId:'own'})).rejects.toMatchObject({payload:{code:'REWARD_REVIEW_REQUIRED'}});expect(grant).not.toHaveBeenCalled();
});

test('missing server payment time cannot qualify for the new reward',async()=>{payment={_id:'undated'};delivered={_id:'result'};expect(await api.findFirstDeliveredCashPurchase(UID)).toBeNull();});
