/** @jest-environment node */
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';
import {resolveServicePackProduct,SERVICE_PACK_PLANS,servicePackCoverage} from '../../worker/payments/service-pack-policy.js';
import {grantServicePack,consumeServicePack,restoreFailedServicePackUse,findServicePackUseEvidence,
 listOwnedServicePacks,quoteServicePack,createServicePackOrder} from '../../worker/payments/service-packs.js';
import {createServicePackRoutes} from '../../worker/payments/service-pack-routes.js';
import {__paymentsContextTestUtils} from '../../worker/payments/index.js';
import {spendMoonstone} from '../../worker/payments/moonstone.js';
import {resolveProduct} from '../../worker/payments/catalog.js';
import {reserveFortuneFunding} from '../../worker/yeongnyangi/payment-funding.js';
import {Payment,PointHistory} from '../../worker/lib/models.js';
import {PurchaseEntitlement} from '../../worker/payments/purchase-entitlement-model.js';
const USER='507f1f77bcf86cd799439011',OTHER='507f1f77bcf86cd799439022',ID='e'.repeat(64),RID='yn-'+ID;
const PLAN='yeongnyangi-service-pack-mackerel-fixture';
// Fixture values are not a public offer. They remain independent of the approved public offer.
const fixturePlans={[PLAN]:{name:'모의 고등어 이용권',fishId:'mackerel',priceKRW:9900,totalUses:13,validityDays:90,policyVersion:'fixture-only'}};
const product=resolveServicePackProduct(PLAN,fixturePlans),consultation=resolveProduct({featureKey:'yeongnyangi-saju-mackerel'});
const subscription={tier:'family',isActive:true,expiresAt:new Date('2099-10-30'),monthlySpendCoin:123,
 membershipCreditBalance:500,membershipCreditUsed:0,membershipCreditLotsVersion:0,
 membershipCreditLots:[{lotId:'signup',amount:500,remaining:500,grantedAt:new Date(),expiresAt:new Date('2099-10-30')}]};
function fixture() {
 const db=makeFakePaymentDb({uniqueKeys:[['merchantUid'],['userId','idempotencyKey','paymentType']]});
 db.rows.push({_id:USER,points:0,recentConsumeRequestIds:[],profileSubscription:structuredClone(subscription)},
  {_id:ID,userId:USER,featureKey:consultation.featureKey,amountKRW:consultation.priceKRW,state:'CREATED',paymentId:null,accessMethod:null,
   paymentClaimOrderId:'',chapters:[],completedChapters:0,leaseUntil:null});
 return {db,get user(){return db.rows.find(r=>String(r._id)===USER)},get row(){return db.rows.find(r=>r._id===ID)}};
}
async function purchase(f,key='purchase-one'){
 const order=await createServicePackOrder(f.db,{userId:USER,product,idempotencyKey:key,env:{}});
 const result=await __paymentsContextTestUtils.settleVerifiedOrder(f.db,{},{
  order,pg:{pgTransactionId:'fixture-'+key,paidAt:new Date(),summary:{mock:true}}});
 expect(result.granted).toBe(true);
 return f.db.rows.find(r=>r.type==='service_pack'&&r.orderId===order.merchantUid);
}
const consume=(f,right,requestId=RID)=>consumeServicePack(f.db,{userId:USER,requestId,entitlementId:String(right._id)});
const terminal=f=>Object.assign(f.row,{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',leaseUntil:null,leaseToken:''});
const restore=f=>restoreFailedServicePackUse(f.db,{userId:USER,requestId:RID});
test('production catalog exposes approved offers and refuses unknown sales before DB work',async()=>{
 expect(Object.keys(SERVICE_PACK_PLANS)).toHaveLength(12);
 expect(()=>resolveServicePackProduct(PLAN)).toThrow();
 const routes=createServicePackRoutes({prepareOrder:()=>{throw Error('must not reach purchase')}});
 const catalog=await (await routes['GET /service-packs/catalog'].handle()).json();
 expect(catalog).toMatchObject({ok:true,giftEnabled:false});expect(catalog.plans).toHaveLength(4);
 expect(catalog.plans.every(plan=>plan.totalUses===5)).toBe(true);
 await expect(routes['POST /service-packs/prepare'].handle({body:{planId:PLAN,idempotencyKey:'x'}})).rejects.toMatchObject({code:'PRODUCT_NOT_FOUND'});
});
test('same-fish entitlement has exactly six server-registry systems and immutable price/count',()=>{
 expect(product.packSnapshot.eligibleFeatureKeys).toHaveLength(6);
 expect(product.packSnapshot.eligibleFeatureKeys).toEqual(['saju','ziwei','sukuyo','vedic','astrology','tarot'].map(s=>'yeongnyangi-'+s+'-mackerel'));
 expect(product.priceKRW).toBe(9900);expect(product.packSnapshot.totalUses).toBe(13);
});
test('verified fulfillment grants once independently of existing Family and moonstones',async()=>{
 const f=fixture(),before=structuredClone(f.user.profileSubscription),right=await purchase(f);
 const order=f.db.rows.find(r=>r.merchantUid===right.orderId);
 await Promise.all([grantServicePack(f.db,order),grantServicePack(f.db,order)]);
 expect(f.db.rows.filter(r=>r.type==='service_pack')).toHaveLength(1);
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(13);
 expect(f.user.profileSubscription).toEqual(before);
 expect(f.user.unlockedFeatures).toBeUndefined();
});
test('paid purchase response loss reuses the same order and does not reset consumed uses',async()=>{
 const f=fixture(),right=await purchase(f);await consume(f,right);
 const order=await createServicePackOrder(f.db,{userId:USER,product,idempotencyKey:'purchase-one',env:{}});
 expect(order.status).toBe('paid');expect(order.merchantUid).toBe(right.orderId);
 await grantServicePack(f.db,order);
 expect(f.db.rows.filter(r=>r.merchantUid)).toHaveLength(1);
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(12);
});
test('each allowed system consumes one use and replay consumes none',async()=>{
 const f=fixture(),right=await purchase(f);
 for(const [index,featureKey] of product.packSnapshot.eligibleFeatureKeys.entries()){
  const id=String(index+1).repeat(64),requestId='yn-'+id;
  f.db.rows.push({_id:id,userId:USER,featureKey,amountKRW:product.packSnapshot.unitPriceKRW,state:'CREATED',paymentId:null,accessMethod:null,paymentClaimOrderId:''});
  await consume(f,right,requestId);expect((await consume(f,right,requestId)).replayed).toBe(true);
 }
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(7);
 expect(f.user.profileSubscription).toEqual(subscription);
});
test.each(['yeongnyangi-saju-salmon','yeongnyangi-fusion-all'])('%s is not covered by mackerel entitlement',async key=>{
 const f=fixture(),right=await purchase(f);f.row.featureKey=key;f.row.amountKRW=resolveProduct({featureKey:key}).priceKRW;
 await expect(consume(f,right)).rejects.toMatchObject({code:'SERVICE_PACK_NOT_COVERED'});
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(13);
 expect(f.row.paymentClaimOrderId).toBe('');
});
test('concurrent use of one consultation produces one receipt and one decrement',async()=>{
 const f=fixture(),right=await purchase(f),out=await Promise.all([consume(f,right),consume(f,right)]);
 expect(out.filter(x=>!x.replayed)).toHaveLength(1);
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(12);
 expect(f.row.accessMethod).toBe('SERVICE_PACK');
 expect(f.db.rows.filter(r=>r.reason==='service_pack_use')).toHaveLength(1);
});
test.each(['PASS','MOONLIGHT_STONE'])('reserved %s excludes pack consumption and keeps its count',async method=>{
 const f=fixture(),right=await purchase(f);
 await reserveFortuneFunding(f.db,{userId:USER,requestId:RID,featureKey:consultation.featureKey,coinCost:consultation.priceKRW/100,method});
 await expect(consume(f,right)).rejects.toMatchObject({code:'MOONSTONE_IN_PROGRESS'});
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(13);
});
test('pack and moonstone race allows exactly one successful funding method',async()=>{
 const f=fixture(),right=await purchase(f);
 const out=await Promise.allSettled([consume(f,right),spendMoonstone(f.db,{userId:USER,product:consultation,purchaseId:RID})]);
 expect(out.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 const remaining=f.db.rows.find(r=>r.type==='service_pack').remainingUses;
 expect(Number(remaining===12)+Number(f.user.profileSubscription.membershipCreditBalance===0)).toBe(1);
});
test('wallet and quote show exact purchase expiry and do not consume',async()=>{
 const f=fixture(),right=await purchase(f),wallet=await listOwnedServicePacks(f.db,{userId:USER}),quote=await quoteServicePack(f.db,{userId:USER,requestId:RID});
 expect(wallet.packs).toHaveLength(1);expect(wallet.packs[0].expiresAt).toEqual(right.expiresAt);
 expect(quote.candidates[0].entitlementId).toBe(String(right._id));
 expect(quote.candidates[0].remainingUses).toBe(13);
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(13);
});
test.each(['expired','empty','other-owner'])('%s entitlement fails without a reservation or debit',async state=>{
 const f=fixture(),right=await purchase(f),current=f.db.rows.find(r=>r.type==='service_pack');
 if(state==='expired')current.expiresAt=new Date(0);
 if(state==='empty')current.remainingUses=0;
 if(state==='other-owner')current.userId=OTHER;
 await expect(consume(f,right)).rejects.toMatchObject({code:state==='expired'?'SERVICE_PACK_EXPIRED':state==='empty'?'SERVICE_PACK_EXHAUSTED':'SERVICE_PACK_NOT_COVERED'});
 expect(f.row.state).toBe('CREATED');expect(f.row.paymentClaimOrderId).toBe('');
});
test('zero-result restoration is atomic, permanent and does not change expiry or subscription',async()=>{
 const f=fixture(),right=await purchase(f);await consume(f,right);terminal(f);
 const before=structuredClone(f.user.profileSubscription),expiry=right.expiresAt;
 const out=await Promise.all([restore(f),restore(f)]);
 expect(out.filter(r=>!r.replayed)).toHaveLength(1);
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(13);
 expect(f.db.rows.find(r=>r.type==='service_pack').expiresAt).toEqual(expiry);
 expect(f.row.state).toBe('REFUNDED');expect(f.user.profileSubscription).toEqual(before);
 expect(await findServicePackUseEvidence(f.db,{userId:USER,requestId:RID,featureKey:consultation.featureKey})).toBeNull();
 await expect(consume(f,right)).rejects.toMatchObject({code:'FORTUNE_ALREADY_PAID'});
});
test('failed restoration proof write rolls back the count and terminal state',async()=>{
 const f=fixture(),right=await purchase(f);await consume(f,right);terminal(f);
 const write=f.db.findOneAndUpdate;let fail=true;
 f.db.findOneAndUpdate=async(Model,filter,update,...rest)=>{
  if(fail&&Model===PointHistory&&update.$set?.['metadata.refundedForServiceExecution']){fail=false;throw Error('write lost');}
  return write(Model,filter,update,...rest);
 };
 await expect(restore(f)).rejects.toThrow('write lost');
 expect(f.row.state).toBe('FORTUNE_FAILED');expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(12);
 await restore(f);expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(13);
});
test.each(['chapter','draft','lease'])('%s prevents a zero-result restoration',async kind=>{
 const f=fixture(),right=await purchase(f);await consume(f,right);terminal(f);
 if(kind==='chapter'){f.row.chapters=[{summary:'saved'}];f.row.completedChapters=1;}
 if(kind==='draft')f.row.generationCheckpoint={chapterDrafts:{0:{body:{summary:'saved'}}}};
 if(kind==='lease')f.row.leaseUntil=new Date(Date.now()+60000);
 expect((await restore(f)).restored).toBe(false);
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(12);
});
test('HTTP prepare drops client price/count and returns the existing SDK envelope plus pack status',async()=>{
 const f=fixture(),routes=createServicePackRoutes({
  resolvePlan:id=>resolveServicePackProduct(id,fixturePlans),
  prepareOrder:args=>__paymentsContextTestUtils.ROUTES['POST /prepare'].handle(args)
 });
 const args={request:new Request('https://example.test/api/payments/service-packs/prepare',{method:'POST'}),
  env:{},ctx:{},userId:USER,withDb:(_env,_ctx,fn)=>fn(f.db),
  body:{planId:PLAN,idempotencyKey:'http-fixture',priceKRW:1,totalUses:999,paymentMethod:'card_general'}};
 const prepared=await (await routes['POST /service-packs/prepare'].handle(args)).json();
 expect(prepared.order.paymentAmount).toBe(9900);expect(prepared.order.packSnapshot.totalUses).toBe(13);
 expect(prepared.order.status).toBe('PENDING');expect(prepared.order.orderId).toBe(prepared.order.merchantUid);
 const again=await (await routes['POST /service-packs/prepare'].handle(args)).json();
 expect(again.order.orderId).toBe(prepared.order.orderId);
});

test('pack consume and direct PG prepare compete for one consultation reservation',async()=>{
 const f=fixture(),right=await purchase(f),{createPayableOrder}=await import('../../worker/payments/orders.js');
 const out=await Promise.allSettled([consume(f,right),createPayableOrder(f.db,{
  userId:USER,requestId:RID,product:consultation,env:{GEMINIF_API_KEY:'fixture-no-call',LLM_DRY_RUN:'false'}})]);
 expect(out.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 const rightNow=f.db.rows.find(r=>r.type==='service_pack');
 expect(Number(rightNow.remainingUses===12)+f.db.rows.filter(r=>r.requestId===RID&&r.paymentType==='digital_content').length).toBe(1);
});
test('restoration response loss replays the permanent receipt without another use',async()=>{
 const f=fixture(),right=await purchase(f);await consume(f,right);terminal(f);
 const tx=f.db.transaction.bind(f.db);let lost=false;
 f.db.transaction=async run=>{const result=await tx(run);if(!lost){lost=true;throw Error('reply lost')}return result;};
 await expect(restore(f)).rejects.toThrow('reply lost');
 expect((await restore(f)).replayed).toBe(true);
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(13);
});
test('paid pack revocation prevents new use and existing result proof',async()=>{
 const f=fixture(),right=await purchase(f);await consume(f,right);
 const order=f.db.rows.find(r=>r.merchantUid===right.orderId);order.status='refunded';
 expect(await findServicePackUseEvidence(f.db,{userId:USER,requestId:RID,featureKey:consultation.featureKey})).toBeNull();
 const otherId='f'.repeat(64);f.db.rows.push({...f.row,_id:otherId,state:'CREATED',paymentId:null,accessMethod:null,paymentClaimOrderId:''});
 await expect(consume(f,right,'yn-'+otherId)).rejects.toMatchObject({code:'INVALID_REQUEST'});
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(12);
});

test('HTTP wallet, quote and consume derive access and amount from the owned server request',async()=>{
 const f=fixture(),right=await purchase(f),routes=createServicePackRoutes(),args={
  env:{},ctx:{},userId:USER,withDb:(_env,_ctx,fn)=>fn(f.db),
  request:new Request('https://example.test/api/payments/service-packs/wallet'),
  body:{requestId:RID,entitlementId:String(right._id),featureKey:'yeongnyangi-fusion-all',amountKRW:1,consumeUses:0}};
 const wallet=await (await routes['GET /service-packs/wallet'].handle(args)).json();
 const quote=await (await routes['POST /service-packs/quote'].handle(args)).json();
 expect(wallet.packs[0].remainingUses).toBe(13);expect(quote.featureKey).toBe(consultation.featureKey);
 expect(quote.candidates[0].entitlementId).toBe(String(right._id));
 const first=await (await routes['POST /service-packs/consume'].handle(args)).json();
 const again=await (await routes['POST /service-packs/consume'].handle(args)).json();
 expect(first).toMatchObject({ok:true,requestId:RID,accessMethod:'SERVICE_PACK',remainingUses:12,replayed:false});
 expect(again).toMatchObject({remainingUses:12,replayed:true});
 expect(f.row.state).toBe('PAID');
});
test('missing use receipt rolls back both one-use debit and payment attachment',async()=>{
 const f=fixture(),right=await purchase(f),write=f.db.findOneAndUpdate;
 f.db.findOneAndUpdate=async(Model,filter,update,...rest)=>Model===PointHistory&&update.$setOnInsert?.reason==='service_pack_use'
  ?null:write(Model,filter,update,...rest);
 await expect(consume(f,right)).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
 expect(f.row.state).toBe('CREATED');expect(f.row.paymentClaimOrderId).toBe('');
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(13);
});
test('missing restoration receipt rolls back restored count and proof markers',async()=>{
 const f=fixture(),right=await purchase(f);await consume(f,right);terminal(f);
 const write=f.db.findOneAndUpdate;
 f.db.findOneAndUpdate=async(Model,filter,update,...rest)=>Model===PointHistory&&update.$setOnInsert?.reason==='service_pack_restore'
  ?null:write(Model,filter,update,...rest);
 await expect(restore(f)).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
 expect(f.row.state).toBe('FORTUNE_FAILED');
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(12);
 expect(await findServicePackUseEvidence(f.db,{userId:USER,requestId:RID,featureKey:consultation.featureKey})).not.toBeNull();
});

test('ambiguous PG refund blocks existing proof, wallet availability and another consultation use',async()=>{
 const f=fixture(),right=await purchase(f);await consume(f,right);
 const order=f.db.rows.find(r=>r.merchantUid===right.orderId);order.metadata.yeongnyangiRefundPending=true;
 expect(await findServicePackUseEvidence(f.db,{userId:USER,requestId:RID,featureKey:consultation.featureKey})).toBeNull();
 expect((await listOwnedServicePacks(f.db,{userId:USER})).packs[0].available).toBe(false);
 const otherId='f'.repeat(64);f.db.rows.push({...f.row,_id:otherId,state:'CREATED',paymentId:null,accessMethod:null,paymentClaimOrderId:''});
 expect((await quoteServicePack(f.db,{userId:USER,requestId:'yn-'+otherId})).candidates).toHaveLength(0);
 await expect(consume(f,right,'yn-'+otherId)).rejects.toMatchObject({code:'INVALID_REQUEST'});
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(12);
});

test('existing partial-cancellation marker blocks pack proof and remaining uses without guessing a refund quantity',async()=>{
 const f=fixture(),right=await purchase(f);await consume(f,right);
 const {recordPgCancellationMarkers}=await import('../../worker/payments/orders.js');
 await recordPgCancellationMarkers(f.db,{orderId:right.orderId,partial:true,reviewRequired:true});
 expect(await findServicePackUseEvidence(f.db,{userId:USER,requestId:RID,featureKey:consultation.featureKey})).toBeNull();
 expect((await listOwnedServicePacks(f.db,{userId:USER})).packs[0].available).toBe(false);
 const otherId='f'.repeat(64);f.db.rows.push({...f.row,_id:otherId,state:'CREATED',paymentId:null,accessMethod:null,paymentClaimOrderId:''});
 expect((await quoteServicePack(f.db,{userId:USER,requestId:'yn-'+otherId})).status).toBe('unavailable');
 await expect(consume(f,right,'yn-'+otherId)).rejects.toMatchObject({code:'INVALID_REQUEST'});
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(12);
});

test('pack-specific HTTP order aliases reuse verified confirm and status handlers',async()=>{
 const f=fixture(),right=await purchase(f),routes=__paymentsContextTestUtils.ROUTES;
 const args={request:new Request('https://example.test/api/payments/service-packs/orders/'+right.orderId+'/status'),
  env:{},ctx:{},userId:USER,params:{id:right.orderId},withDb:(_env,_ctx,fn)=>fn(f.db)};
 const status=await (await routes['GET /service-packs/orders/:id/status'].handle(args)).json();
 expect(status).toMatchObject({ok:true,verified:true,serviceReady:true,entitlementGranted:true});
 const confirmed=await (await routes['POST /service-packs/orders/:id/confirm'].handle(args)).json();
 expect(confirmed).toMatchObject({ok:true,entitlementStatus:'granted'});
 f.db.rows.find(r=>r.merchantUid===right.orderId).metadata.cancellationReviewRequired=true;
 const suspended=await (await routes['GET /service-packs/orders/:id/status'].handle(args)).json();
 expect(suspended.serviceReady).toBe(false);
});

test.each(['mackerel','salmon','flounder','tuna'])('%s plan covers exactly its six native systems at their server price',fishId=>{
 const id='yeongnyangi-service-pack-'+fishId+'-fixture';
 const candidate=resolveServicePackProduct(id,{[id]:{...fixturePlans[PLAN],fishId}});
 const keys=candidate.packSnapshot.eligibleFeatureKeys;
 expect(keys).toHaveLength(6);
 for(const key of keys){
  const native=resolveProduct({featureKey:key});
  expect(servicePackCoverage({type:'service_pack',status:'granted',remainingUses:1,
   expiresAt:new Date('2099-01-01'),packSnapshot:candidate.packSnapshot},key,native.priceKRW).covered).toBe(true);
 }
 expect(keys.some(key=>key.includes('fusion'))).toBe(false);
});

test.each(['cancellationReviewRequired','yeongnyangiRefundPending','right-revoked'])('cached paid confirm rejects %s without declaring active access',async marker=>{
 const f=fixture(),right=await purchase(f),routes=__paymentsContextTestUtils.ROUTES;
 if(marker==='right-revoked')f.db.rows.find(r=>r.type==='service_pack').status='refunded';
 else f.db.rows.find(r=>r.merchantUid===right.orderId).metadata[marker]=true;
 const args={request:new Request('https://example.test/api/payments/service-packs/orders/'+right.orderId+'/confirm'),
  env:{},ctx:{},userId:USER,params:{id:right.orderId},withDb:(_env,_ctx,fn)=>fn(f.db)};
 await expect(routes['POST /service-packs/orders/:id/confirm'].handle(args)).rejects.toMatchObject({code:'ORDER_NOT_CONFIRMABLE'});
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(13);
});

const approvedFish=[['mackerel',3000,[12000,21000,36000]],['salmon',9000,[36000,63000,108000]],['flounder',15000,[60000,105000,180000]],['tuna',30000,[120000,210000,360000]]];
const counts=[5,10,20];
test.each(approvedFish)('%s catalog fixes approved 2026-10-05 prices, counts and 30-day duration',(fish,unit,prices)=>{
 ['small','medium','large'].forEach((size,i)=>{
  const offer=resolveServicePackProduct('yeongnyangi-pack-'+fish+'-'+size+'-v3');
  expect(offer.packSnapshot).toMatchObject({fishId:fish,unitPriceKRW:unit,totalUses:counts[i],priceKRW:prices[i],validityDays:30,policyVersion:'yeongnyangi-pack-20261005-ratio-corrected'});
  // Approved discount ladder: 20/30/40% off the same-fish single price.
  expect(prices[i]).toBe(unit*counts[i]*[80,70,60][i]/100);
  expect(offer.allowedPaymentMethods).toEqual(['DIRECT_KRW']);
  const right={type:'service_pack',status:'granted',packSnapshot:offer.packSnapshot,remainingUses:counts[i],expiresAt:new Date('2099-01-01')};
  for(const [otherFish,otherPrice] of approvedFish)for(const system of ['saju','ziwei','sukuyo','vedic','astrology','tarot']){
   expect(servicePackCoverage(right,'yeongnyangi-'+system+'-'+otherFish,otherPrice).covered).toBe(otherFish===fish);
  }
  for(const suffix of ['saju-ziwei','sukuyo-vedic','astrology-tarot','all'])expect(servicePackCoverage(right,'yeongnyangi-fusion-'+suffix,suffix==='all'?80000:50000).covered).toBe(false);
 });
});
test.each(approvedFish.flatMap(([fish])=>approvedFish.map(([target,price])=>[fish,target,price])))('%s pack quote/consume only serves %s when identical',async(fish,target,amount)=>{
 const f=fixture(),offer=resolveServicePackProduct('yeongnyangi-pack-'+fish+'-small-v3');
 const order=await createServicePackOrder(f.db,{userId:USER,product:offer,idempotencyKey:'approved',env:{}});
 await __paymentsContextTestUtils.settleVerifiedOrder(f.db,{},{order,pg:{pgTransactionId:'mock-approved',paidAt:new Date(),summary:{mock:true}}});
 const right=f.db.rows.find(r=>r.type==='service_pack');
 expect(Math.round((new Date(right.expiresAt)-new Date(right.grantedAt))/86400000)).toBe(30);
 Object.assign(f.row,{featureKey:'yeongnyangi-saju-'+target,amountKRW:amount});
 const quote=await quoteServicePack(f.db,{userId:USER,requestId:RID});
 expect(quote.candidates).toHaveLength(fish===target?1:0);
 if(fish===target){await consume(f,right);expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(offer.packSnapshot.totalUses-1);}
 else{await expect(consume(f,right)).rejects.toMatchObject({code:'SERVICE_PACK_NOT_COVERED'});expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(offer.packSnapshot.totalUses);expect(f.row.paymentClaimOrderId).toBe('');}
});

test.each(approvedFish)('%s moonstones deduct the restored 10 KRW per stone amount',async(fish,amount)=>{
 const f=fixture(),item=resolveProduct({featureKey:'yeongnyangi-saju-'+fish}),expected=amount/10;
 Object.assign(f.row,{featureKey:item.featureKey,amountKRW:amount});
 f.user.profileSubscription.membershipCreditBalance=expected;
 f.user.profileSubscription.membershipCreditLots[0].amount=expected;
 f.user.profileSubscription.membershipCreditLots[0].remaining=expected;
 expect(item.monthlyCost).toBe(expected);
 await spendMoonstone(f.db,{userId:USER,product:item,purchaseId:RID});
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(0);
 await spendMoonstone(f.db,{userId:USER,product:item,purchaseId:RID});
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(0);
});
test('a pack bought before the 2026-10-05 price rise keeps covering its own fish at the new price',()=>{
 const legacy={...resolveServicePackProduct('yeongnyangi-pack-mackerel-small-v3').packSnapshot,
  planId:'yeongnyangi-pack-mackerel-small-v2',policyVersion:'yeongnyangi-pack-20261001',priceKRW:4500,unitPriceKRW:1000};
 const right={type:'service_pack',status:'granted',packSnapshot:legacy,remainingUses:5,expiresAt:new Date('2099-01-01')};
 expect(servicePackCoverage(right,'yeongnyangi-saju-mackerel',3000).covered).toBe(true);
 expect(servicePackCoverage(right,'yeongnyangi-saju-salmon',9000).covered).toBe(false);
 // A snapshot priced above the current consultation is never honoured blindly.
 expect(servicePackCoverage({...right,packSnapshot:{...legacy,unitPriceKRW:12000}},'yeongnyangi-saju-mackerel',3000).covered).toBe(false);
});
