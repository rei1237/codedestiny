/** @jest-environment node */
import { reserveFortuneFunding, releaseFortuneFunding } from '../../worker/yeongnyangi/payment-funding.js';
import { consumePassForFeature } from '../../worker/lib/pass-consumption.js';
import { spendMoonstone } from '../../worker/payments/moonstone.js';
import { createPayableOrder } from '../../worker/payments/orders.js';
import { reconcileFortuneCheckout } from '../../worker/yeongnyangi/payment-intent.js';
import { MonthlyCreditLedger, User, Payment } from '../../worker/lib/models.js';
import { resolveProduct } from '../../worker/payments/catalog.js';
import { calculatePaidFeatureMembershipCreditCost, getPaidFeaturePaymentPolicy } from '../../worker/lib/paid-feature-registry.js';
import { CURRENT_PASS_POLICY_VERSION } from '../../lib/payment/pass-policy.js';
import { makeFakePaymentDb } from '../fixtures/fake-payment-db.mjs';
import { refundTerminalMoonstone } from '../../worker/yeongnyangi/moonstone-refund.js';
import { findMoonstoneSpendEvidence } from '../../worker/lib/moonstone-spend-proof.js';
import { YeongnyangiRequest } from '../../worker/lib/yeongnyangi-models.js';
import { toObjectId } from '../../worker/payments/db.js';
const USER='507f1f77bcf86cd799439011',ID='a'.repeat(64),RID='yn-'+ID;
const product=resolveProduct({featureKey:'yeongnyangi-saju-mackerel'});
function fixture(){
 const db=makeFakePaymentDb({uniqueKeys:[['userId','type','sourceId']]});
 const expiresAt=new Date('2099-10-30T00:00:00.000Z');
 const user={_id:USER,points:0,recentConsumeRequestIds:[],profileSubscription:{
  tier:'family',passTier:'family',isActive:true,expiresAt,passPolicyVersion:CURRENT_PASS_POLICY_VERSION,
  premiumUseCycleKey:expiresAt.toISOString(),monthlySpendCoin:0,
  membershipCreditBalance:500,membershipCreditGranted:500,membershipCreditUsed:0,membershipCreditLotsVersion:0,
  membershipCreditLots:[{lotId:'signup',amount:500,remaining:500,grantedAt:new Date(),expiresAt}]}};
 const row={_id:ID,userId:USER,featureKey:product.featureKey,amountKRW:1000,state:'CREATED',paymentId:null,accessMethod:null,paymentClaimOrderId:''};
 db.rows.push(user,row);
 return {db,get user(){return db.rows.find(r=>String(r._id)===USER)},get row(){return db.rows.find(r=>r._id===ID)}};
}
const pass=f=>consumePassForFeature({db:f.db,user:f.user,entitlement:f.user.profileSubscription,userId:USER,
 featureKey:product.featureKey,requestId:RID,coinCost:product.priceCoins});
const moon=f=>spendMoonstone(f.db,{userId:USER,product,purchaseId:RID});
test('pass and moonstone cannot reserve the same consultation concurrently',async()=>{
 const f=fixture(),base={userId:USER,requestId:RID,featureKey:product.featureKey,coinCost:10};
 const results=await Promise.allSettled(['PASS','MOONLIGHT_STONE'].map(method=>reserveFortuneFunding(f.db,{...base,method})));
 expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 expect(f.user.profileSubscription.monthlySpendCoin).toBe(0);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
});
test.each(['PASS','MOONLIGHT_STONE'])('%s succeeds once and blocks the other method without extra debit',async method=>{
 const f=fixture(),first=method==='PASS'?pass:moon,other=method==='PASS'?moon:pass;
 await first(f);await first(f);
 await expect(other(f)).rejects.toMatchObject({code:'FORTUNE_ALREADY_PAID'});
 const debit=10;
 expect(f.user.profileSubscription.monthlySpendCoin).toBe(method==='PASS'?debit:0);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(method==='PASS'?500:0);
 expect(f.row.state).toBe('PAID');
});
test('mixed-method race records exactly one successful debit',async()=>{
 const f=fixture(),results=await Promise.allSettled([pass(f),moon(f)]);
 expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 const sub=f.user.profileSubscription;
 expect(Number(sub.monthlySpendCoin>0)+Number(sub.membershipCreditBalance===0)).toBe(1);
 expect(f.row.state).toBe('PAID');
});
test('known insufficient moonstones release the claim and allow a pass',async()=>{
 const f=fixture();f.user.profileSubscription.membershipCreditBalance=499;
 f.user.profileSubscription.membershipCreditLots[0].remaining=499;
 await expect(moon(f)).rejects.toMatchObject({code:'INSUFFICIENT_MOONSTONE'});
 expect(f.row.paymentClaimOrderId).toBe('');
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(499);
 await pass(f);expect(f.row.accessMethod).toBe('FAMILY');
});
test('uncertain settlement retains its claim and same method recovers without another debit',async()=>{
 const f=fixture(),write=f.db.updateOne;let failed=false;
 f.db.updateOne=async(Model,filter,update,...rest)=>{
  if(!failed&&update.$set?.settledAt){failed=true;throw new Error('response lost');}
  return write(Model,filter,update,...rest);
 };
 await expect(moon(f)).rejects.toThrow('response lost');
 expect(f.row.paymentClaimOrderId).toContain('MOONLIGHT_STONE');
 await expect(pass(f)).rejects.toMatchObject({code:'MOONSTONE_IN_PROGRESS'});
 const ledger=f.db.rows.find(r=>r.type==='MONTHLY_CREDIT_SPEND');ledger.createdAt=new Date(0);
 await moon(f);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(0);
 expect(f.user.profileSubscription.membershipCreditUsed).toBe(500);
 expect(f.row.state).toBe('PAID');
});
test('release never removes another method claim',async()=>{
 const f=fixture(),base={userId:USER,requestId:RID,featureKey:product.featureKey,coinCost:10,method:'PASS'};
 const claim=await reserveFortuneFunding(f.db,base);
 await releaseFortuneFunding(f.db,{...claim,key:'other'});
 expect(f.row.paymentClaimOrderId).toBe(claim.key);
});

test('a refunded consultation cannot re-open through retained pass retry markers',async()=>{
 const f=fixture();await pass(f);
 f.row.state='REFUNDED';
 const evidence=f.db.rows.find(r=>r.featureKey===product.featureKey&&r.kind==='deduct');
 evidence.metadata.refundedForServiceExecution=true;
 await expect(pass(f)).rejects.toMatchObject({code:'PAYMENT_NOT_ACTIVE'});
 expect(f.row.state).toBe('REFUNDED');
});

const direct=f=>createPayableOrder(f.db,{userId:USER,requestId:RID,product,env:{GEMINIF_API_KEY:'fixture-no-call',LLM_DRY_RUN:'false'}});
test.each(['PASS','MOONLIGHT_STONE'])('pending PG window blocks %s without debiting',async method=>{
 const f=fixture(),order=await direct(f);
 await expect((method==='PASS'?pass:moon)(f)).rejects.toMatchObject({code:'PG_PAYMENT_NOT_PAID'});
 expect(f.user.profileSubscription.monthlySpendCoin).toBe(0);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
 expect(f.row.paymentClaimOrderId).toBe(order.merchantUid);
});
test.each(['PASS','MOONLIGHT_STONE'])('PG prepare and %s compete on the same request CAS',async method=>{
 const f=fixture(),results=await Promise.allSettled([direct(f),(method==='PASS'?pass:moon)(f)]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 const pgOrders=f.db.rows.filter(r=>r.paymentType==='digital_content');
 expect(pgOrders.length+Number(f.user.profileSubscription.monthlySpendCoin>0)+Number(f.user.profileSubscription.membershipCreditBalance===0)).toBe(1);
});
test('PG order creation paused after its reservation still excludes noncash',async()=>{
 const f=fixture(),write=f.db.findOneAndUpdate;let resume,ready;
 const entered=new Promise(resolve=>{ready=resolve;});
 const pause=new Promise(resolve=>{resume=resolve;});
 f.db.findOneAndUpdate=async(Model,...args)=>{
  if(Model===Payment){ready();await pause;}
  return write(Model,...args);
 };
 const orderPromise=direct(f);await entered;
 await expect(moon(f)).rejects.toMatchObject({code:'MOONSTONE_IN_PROGRESS'});
 resume();await orderPromise;
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
});
test.each(['failed','cancelled'])('authoritative PG %s releases only its own reservation and allows moonstones',async status=>{
 const f=fixture(),order=await direct(f);
 await reconcileFortuneCheckout({env:{GEMINIF_API_KEY:'fixture-no-call',LLM_DRY_RUN:'false'},userId:USER,requestId:RID,product,
  withDb:fn=>fn(f.db),fetchPayment:async()=>({paymentId:order.merchantUid,status})});
 expect(f.row.paymentClaimOrderId).toBe('');
 await moon(f);expect(f.row.state).toBe('PAID');
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(0);
});
test.each(['pending','unknown','not-found'])('PG %s never releases its reservation',async status=>{
 const f=fixture(),order=await direct(f);
 const check=reconcileFortuneCheckout({env:{GEMINIF_API_KEY:'fixture-no-call',LLM_DRY_RUN:'false'},userId:USER,requestId:RID,product,
  withDb:fn=>fn(f.db),fetchPayment:async()=>{
   if(status==='not-found')throw Object.assign(new Error('not found'),{status:404,code:'PAYMENT_NOT_FOUND'});
   return {paymentId:order.merchantUid,status};
  }});
 if(status==='not-found')await check;else await expect(check).rejects.toMatchObject({code:'PG_PAYMENT_NOT_PAID'});
 await expect(moon(f)).rejects.toMatchObject({code:'PG_PAYMENT_NOT_PAID'});
 expect(f.row.paymentClaimOrderId).toBe(order.merchantUid);
});
test('local PG failure flag alone cannot authorize another funding method',async()=>{
 const f=fixture(),order=await direct(f);order.status='failed';order.failureCode='PG_PAYMENT_NOT_PAID';
 await expect(moon(f)).rejects.toMatchObject({code:'PG_PAYMENT_NOT_PAID'});
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
});

test.each(['standard','premium','vvip'])('%s remains excluded from Yeongnyangi',async tier=>{
 const f=fixture();f.user.profileSubscription.tier=tier;f.user.profileSubscription.passTier=tier;
 expect((await pass(f)).covered).toBe(false);
 expect(f.user.profileSubscription.monthlySpendCoin).toBe(0);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
});
test('registry authorizes exactly 500 stones for one 1000 KRW consultation',()=>{
 expect(product.monthlyCost).toBe(500);
 expect(calculatePaidFeatureMembershipCreditCost(product.featureKey)).toBe(500);
 expect(getPaidFeaturePaymentPolicy(product.featureKey)).toMatchObject({familyPassOnly:true,monthlyExcluded:false,membershipCreditMultiplier:5});
 expect(getPaidFeaturePaymentPolicy('fusion-fortune-consultation').monthlyExcluded).toBe(false);
});
test('a changed client amount cannot lower the server price',async()=>{
 const f=fixture();
 await expect(spendMoonstone(f.db,{userId:USER,product:{...product,monthlyCost:100},purchaseId:RID})).rejects.toMatchObject({code:'INVALID_REQUEST'});
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
});

const refund=f=>refundTerminalMoonstone(f.db,{userId:USER,requestId:ID});
async function terminalFixture() {
 const f=fixture();await moon(f);
 Object.assign(f.row,{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',completedChapters:0,chapters:[],leaseToken:'',leaseUntil:null});
 return f;
}
const readProof=f=>findMoonstoneSpendEvidence(null,{db:f.db,userId:toObjectId(USER),featureKeys:[product.featureKey],tokens:[RID],minimumAmount:500});
test('terminal refund restores exactly once and removes paid proof',async()=>{
 const f=await terminalFixture();
 const results=await Promise.all([refund(f),refund(f)]);
 expect(results.every(r=>r.refunded)).toBe(true);
 expect(results.filter(r=>!r.replayed)).toHaveLength(1);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
 expect(f.user.profileSubscription.membershipCreditUsed).toBe(0);
 expect(f.row.state).toBe('REFUNDED');
 expect(await readProof(f)).toBeNull();
 expect(f.db.rows.filter(r=>r.type==='MONTHLY_CREDIT_GRANT')).toHaveLength(1);
 await expect(moon(f)).rejects.toMatchObject({code:'FORTUNE_ALREADY_PAID'});
});
test.each(['lot','receipt','proof'])('failed %s write rolls back request, credit and proof before one retry',async stage=>{
 const f=await terminalFixture(),write=f.db.findOneAndUpdate;
 let failed=false;
 f.db.findOneAndUpdate=async(Model,filter,update,...rest)=>{
  const target=stage==='lot'?Model===User&&update.$inc?.['profileSubscription.membershipCreditUsed']===-500
    :stage==='receipt'?update.$setOnInsert?.type==='MONTHLY_CREDIT_GRANT'
    :update.$set?.['metadata.refundedForServiceExecution']===true;
  if(!failed&&target){failed=true;throw new Error('injected '+stage+' write loss');}
  return write(Model,filter,update,...rest);
 };
 await expect(refund(f)).rejects.toThrow('injected '+stage);
 expect(f.row.state).toBe('FORTUNE_FAILED');
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(0);
 expect(f.user.profileSubscription.membershipCreditUsed).toBe(500);
 expect(await readProof(f)).not.toBeNull();
 expect(f.db.rows.filter(r=>r.type==='MONTHLY_CREDIT_GRANT')).toHaveLength(0);
 await refund(f);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
 expect(f.user.profileSubscription.membershipCreditUsed).toBe(0);
});
test('null lot restore cannot commit a refunded state',async()=>{
 const f=await terminalFixture(),write=f.db.findOneAndUpdate;
 f.db.findOneAndUpdate=async(Model,filter,update,...rest)=>Model===User&&update.$inc?.['profileSubscription.membershipCreditUsed']===-500
  ?null:write(Model,filter,update,...rest);
 await expect(refund(f)).rejects.toMatchObject({code:'MONTHLY_CREDIT_REFUND_PENDING'});
 expect(f.row.state).toBe('FORTUNE_FAILED');
 expect(await readProof(f)).not.toBeNull();
});
test('refund response loss recovers from receipt without another lot credit',async()=>{
 const f=await terminalFixture(),transaction=f.db.transaction.bind(f.db);let lost=false;
 f.db.transaction=async run=>{
  const result=await transaction(run);
  if(!lost){lost=true;throw new Error('refund response lost');}
  return result;
 };
 await expect(refund(f)).rejects.toThrow('refund response lost');
 expect((await refund(f)).replayed).toBe(true);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
 expect(f.user.profileSubscription.membershipCreditUsed).toBe(0);
});
test('a consumed refund lot cannot permit a second restoration',async()=>{
 const f=await terminalFixture();await refund(f);
 f.user.profileSubscription.membershipCreditLots=[];
 f.user.profileSubscription.membershipCreditBalance=0;
 f.user.profileSubscription.membershipCreditUsed=500;
 expect((await refund(f)).replayed).toBe(true);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(0);
 expect(f.user.profileSubscription.membershipCreditUsed).toBe(500);
});
test.each(['saved chapter','stored draft','active lease','generating'])('%s prevents terminal refund',async condition=>{
 const f=await terminalFixture();
 if(condition==='saved chapter'){f.row.chapters=[{summary:'saved'}];f.row.completedChapters=1;}
 if(condition==='stored draft')f.row.generationCheckpoint={chapterDrafts:{0:{body:{summary:'saved'}}}};
 if(condition==='active lease')f.row.leaseUntil=new Date(Date.now()+180000);
 if(condition==='generating')f.row.state='GENERATING';
 expect((await refund(f)).refunded).toBe(false);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(0);
 expect(await readProof(f)).not.toBeNull();
});
test.each(['underpriced','unsettled','already refunded','other consultation'])('%s proof cannot refund and rolls back terminal reservation',async condition=>{
 const f=await terminalFixture(),spend=f.db.rows.find(r=>r.type==='MONTHLY_CREDIT_SPEND');
 if(condition==='underpriced')spend.amount=499;
 if(condition==='unsettled'){delete spend.settledAt;delete spend.afterBalance;f.user.recentConsumeRequestIds=[];}
 if(condition==='already refunded')spend.metadata={refundedForServiceExecution:true};
 if(condition==='other consultation')spend.metadata={yeongnyangiRequestId:'b'.repeat(64)};
 await expect(refund(f)).rejects.toMatchObject({code:'PAYMENT_NOT_ACTIVE'});
 expect(f.row.state).toBe('FORTUNE_FAILED');
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(0);
});

test('legacy bare-request receipt and zero afterBalance remain valid at the new minimum',async()=>{
 const f=fixture(),ledgerId=toObjectId('507f1f77bcf86cd799439033');
 f.db.rows.push({_id:ledgerId,userId:toObjectId(USER),type:'MONTHLY_CREDIT_SPEND',sourceId:'legacy-paid',
  amount:500,afterBalance:0,metadata:{featureKey:product.featureKey,requestId:ID}});
 const args={db:f.db,userId:toObjectId(USER),featureKeys:[product.featureKey],minimumAmount:500};
 expect((await findMoonstoneSpendEvidence(null,{...args,tokens:[ID]})).amount).toBe(500);
 expect((await findMoonstoneSpendEvidence(null,{...args,tokens:[String(ledgerId)]})).ledgerId).toBe(String(ledgerId));
 f.db.rows.at(-1).amount=100;
 expect(await findMoonstoneSpendEvidence(null,{...args,tokens:[ID]})).toBeNull();
});
test.each(['refundedForUnlockFailure','monthlyCreditRefundedForUnlockFailure','monthlyCreditRefundedForLedgerFailure',
 'refundedForServiceExecution','monthlyCreditRefundedForServiceExecution','refundedForLoveSecretAiFailure'])('historical %s excludes a receipt at every proof lookup',async marker=>{
 const f=await terminalFixture(),spend=f.db.rows.find(r=>r.type==='MONTHLY_CREDIT_SPEND');
 spend.metadata={...spend.metadata,[marker]:true};
 expect(await readProof(f)).toBeNull();
 await expect(refund(f)).rejects.toMatchObject({code:'PAYMENT_NOT_ACTIVE'});
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(0);
});
