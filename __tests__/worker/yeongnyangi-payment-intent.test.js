import {createPayableOrder,markOrderPaid,markOrderFailed} from '../../worker/payments/orders.js';
import {makeFakePaymentDb,matches,applyUpdate} from '../fixtures/fake-payment-db.mjs';
import {reconcileFortuneCheckout,claimFortunePayment,advanceFortunePaymentGeneration} from '../../worker/yeongnyangi/payment-intent.js';
import {YeongnyangiRequest} from '../../worker/lib/yeongnyangi-models.js';
const userId='507f1f77bcf86cd799439011', id='a'.repeat(64),requestId=`yn-${id}`;
const product={productId:'yeongnyangi-saju-mackerel',featureKey:'yeongnyangi-saju-mackerel',priceKRW:1000,priceCoins:10,monthlyCost:0,billingType:'per-use'};
function setup(overrides={}) {
 const db=makeFakePaymentDb(),read=db.findOne,write=db.findOneAndUpdate;
 const fortune={_id:id,userId,profileId:'shared-profile',featureKey:product.featureKey,amountKRW:1000,state:'CREATED',paymentId:null,paymentGeneration:0,...overrides};
 db.findOne=async(Model,filter,options)=>Model===YeongnyangiRequest
  ? (String(filter.userId)===fortune.userId&&filter._id===fortune._id?fortune:null):read(Model,filter,options);
 db.findOneAndUpdate=async(Model,filter,update,options)=>{
  if(Model!==YeongnyangiRequest)return write(Model,filter,update,options);
  if(!matches(fortune,filter))return null;
  applyUpdate(fortune,update);return {...fortune};
 };
 return {db,fortune,input:{userId,requestId,product,env:{GEMINIF_API_KEY:'fixture-no-call',LLM_DRY_RUN:'false'}}};
}
test('browser keys cannot duplicate the same consultation order',async()=>{
 const {db,input}=setup();
 const [a,b]=await Promise.all([createPayableOrder(db,{...input,idempotencyKey:'first'}),createPayableOrder(db,{...input,idempotencyKey:'second'})]);
 expect(a.merchantUid).toBe(b.merchantUid);expect(db.rows).toHaveLength(1);
 expect(a.metadata).toMatchObject({productType:'YEONGNYANGI_FORTUNE',paymentType:'ONE_TIME',fortuneRequestId:id});
 expect(a.requestId).toBe(requestId);expect(a.pricingSnapshot.profileId).toBe('shared-profile');
});

test.each(['ready','pending','unknown'])('unresolved %s prevents a second PG window',async status=>{
 const {db,input}=setup();const a=await createPayableOrder(db,input);
 await expect(reconcileFortuneCheckout({...input,withDb:fn=>fn(db),fetchPayment:async()=>({paymentId:a.merchantUid,status})})).rejects.toMatchObject({code:'PG_PAYMENT_NOT_PAID'});
 expect(db.rows).toHaveLength(1);expect(a.status).toBe('pending');
});

test.each(['failed','cancelled'])('server-confirmed %s permits one new card attempt',async status=>{
 const {db,input}=setup();const a=await createPayableOrder(db,input);
 await reconcileFortuneCheckout({...input,withDb:fn=>fn(db),fetchPayment:async()=>({paymentId:a.merchantUid,status})});
 const [b,c]=await Promise.all([createPayableOrder(db,{...input,paymentMethod:'card_general'}),createPayableOrder(db,input)]);
 expect(b.merchantUid).not.toBe(a.merchantUid);expect(b.merchantUid).toBe(c.merchantUid);expect(b.requestId).toBe(a.requestId);
});

test('lookup timeout never permits a new attempt; later approval uses confirmation',async()=>{
 const {db,input}=setup();const a=await createPayableOrder(db,input);
 await expect(reconcileFortuneCheckout({...input,withDb:fn=>fn(db),fetchPayment:async()=>{throw new Error('timeout');}})).rejects.toMatchObject({code:'PG_UNAVAILABLE'});
 let confirmed='';
 await expect(reconcileFortuneCheckout({...input,withDb:fn=>fn(db),fetchPayment:async()=>({paymentId:a.merchantUid,status:'paid'}),confirmPaid:async orderId=>{confirmed=orderId;}})).rejects.toMatchObject({code:'FORTUNE_ALREADY_PAID'});
 expect(confirmed).toBe(a.merchantUid);expect(db.rows).toHaveLength(1);
});

test('SDK failure before PG registration permits same-ID recovery only for authoritative not-found',async()=>{
 const {db,input}=setup();const a=await createPayableOrder(db,input);
 await reconcileFortuneCheckout({...input,withDb:fn=>fn(db),fetchPayment:async()=>{throw Object.assign(new Error(),{status:404,code:'PAYMENT_NOT_FOUND'});}});
 expect((await createPayableOrder(db,input)).merchantUid).toBe(a.merchantUid);
});

test('late dual approvals claim one consultation and flag the extra payment without refund',async()=>{
 const {db,input,fortune}=setup();const a=await createPayableOrder(db,input);
 await reconcileFortuneCheckout({...input,withDb:fn=>fn(db),fetchPayment:async()=>({paymentId:a.merchantUid,status:'cancelled'})});
 const b=await createPayableOrder(db,input);
 for(const order of [a,b])await markOrderPaid(db,{orderId:order.merchantUid,order,pg:{summary:{}}});
 const claims=await Promise.all([claimFortunePayment(db,a),claimFortunePayment(db,b)]);
 expect(claims.filter(Boolean)).toHaveLength(1);expect(fortune.paymentClaimOrderId).toBe(b.merchantUid);
 expect(db.rows[0].metadata.duplicatePaymentReviewRequired).toBe(true);
 expect(db.rows.every(r=>r.status==='paid')).toBe(true);
 expect(await claimFortunePayment(db,b)).toBe(true);
});

test('generation zero cannot overwrite concurrently granted Family access',async()=>{
 const {db,fortune}=setup({accessMethod:'FAMILY'});
 expect(await advanceFortunePaymentGeneration(db,userId,requestId,0)).toBeNull();expect(fortune.paymentGeneration).toBe(0);
});
test('paid but not yet activated never opens a second payable order',async()=>{
 const {db,input}=setup();const order=await createPayableOrder(db,input);
 await markOrderPaid(db,{orderId:order.merchantUid,order,pg:{paidAt:new Date(),method:'card',summary:{}}});
 await expect(createPayableOrder(db,{...input,idempotencyKey:'new'})).rejects.toMatchObject({code:'FORTUNE_ALREADY_PAID'});
 expect(db.rows).toHaveLength(1);
});
test('terminal failure retries one shared next order',async()=>{
 const {db,input}=setup();const a=await createPayableOrder(db,input);
 await reconcileFortuneCheckout({...input,withDb:fn=>fn(db),fetchPayment:async()=>({paymentId:a.merchantUid,status:'failed'})});
 const [b,c]=await Promise.all([createPayableOrder(db,input),createPayableOrder(db,input)]);
 expect(b.merchantUid).not.toBe(a.merchantUid);expect(b.merchantUid).toBe(c.merchantUid);expect(db.rows).toHaveLength(2);
});
test('foreign request, altered feature and altered amount fail before any order exists',async()=>{
 const {db,input}=setup();
 for(const changed of [{userId:'507f1f77bcf86cd799439012'},{product:{...product,featureKey:'yeongnyangi-tarot-mackerel'}},{product:{...product,priceKRW:1}},{requestId:'made-up'}]) {
  await expect(createPayableOrder(db,{...input,...changed})).rejects.toMatchObject({code:'INVALID_REQUEST'});
 }
 expect(db.rows).toHaveLength(0);
});
test('disabled live provider cannot collect money',async()=>{
 const {db,input}=setup();
 await expect(createPayableOrder(db,{...input,env:{LLM_DRY_RUN:'true'}})).rejects.toMatchObject({code:'FORTUNE_UNAVAILABLE'});
 expect(db.rows).toHaveLength(0);
});

test('late PG response reuses the original payable order',async()=>{
 const {db,input}=setup();const a=await createPayableOrder(db,input);
 await markOrderFailed(db,{orderId:a.merchantUid,failureCode:'PG_PAYMENT_NOT_PAID'});
 const b=await createPayableOrder(db,input);
 expect(b.merchantUid).toBe(a.merchantUid);expect(b.status).toBe('pending');expect(db.rows).toHaveLength(1);
});
test('more than three cancelled attempts still have one deterministic next order',async()=>{
 const {db,input}=setup();
 for(let i=0;i<8;i++){
  const a=await createPayableOrder(db,input);
  await reconcileFortuneCheckout({...input,withDb:fn=>fn(db),fetchPayment:async()=>({paymentId:a.merchantUid,status:'failed'})});
 }
 const [a,b]=await Promise.all([createPayableOrder(db,input),createPayableOrder(db,input)]);
 expect(a.merchantUid).toBe(b.merchantUid);expect(db.rows).toHaveLength(9);
});
