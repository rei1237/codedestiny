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

describe('fortune-chat consultation card prepare (fc-)',()=>{
 const chat={productId:'fortune-chat-consultation',featureKey:'fortune-chat-consultation',priceKRW:3000,priceCoins:30,monthlyCost:300,billingType:'per_use'};
 const chatSetup=overrides=>{
  const fixture=setup({featureKey:chat.featureKey,amountKRW:3000,...overrides});
  const models=[],read=fixture.db.findOne,write=fixture.db.findOneAndUpdate;
  fixture.db.findOne=async(Model,...rest)=>{models.push(Model.modelName);return read(Model,...rest);};
  fixture.db.findOneAndUpdate=async(Model,...rest)=>{models.push(Model.modelName);return write(Model,...rest);};
  return {...fixture,models,input:{...fixture.input,product:chat,requestId:`fc-${id}`,idempotencyKey:'chat-first'}};
 };
 test.each(['mackerel','salmon','flounder','tuna'])('tier %s requires the exact owner, feature and fc request before creating a card order',async fish=>{
  const featureKey='fortune-chat-question-'+fish;
  const {db,input,fortune}=chatSetup({featureKey});
  const tier={...input,product:{...chat,featureKey,productId:featureKey}};
  await expect(createPayableOrder(db,{...tier,requestId:'not-fc'})).rejects.toMatchObject({code:'INVALID_REQUEST'});
  await expect(createPayableOrder(db,{...tier,product:{...tier.product,priceKRW:1}})).rejects.toMatchObject({code:'INVALID_REQUEST'});
  await expect(createPayableOrder(db,{...tier,product:{...tier.product,featureKey:'fortune-chat-consultation'}})).rejects.toMatchObject({code:'INVALID_REQUEST'});
  expect(db.rows).toHaveLength(0);
  expect(await createPayableOrder(db,tier)).toMatchObject({featureKey,requestId:'fc-'+id,status:'pending'});
  expect(fortune.paymentClaimOrderId).toBe('card:fc-'+id);
 });
 test('an unopened consultation gets one card order and the guard reads no pass state',async()=>{
  const {db,input,models}=chatSetup();
  const order=await createPayableOrder(db,input);
  expect(order).toMatchObject({requestId:`fc-${id}`,status:'pending'});
  expect([...new Set(models)].sort()).toEqual(['Payment','YeongnyangiRequest']);
 });
 test.each([
  ['the free use',{accessMethod:'ACCOUNT_FREE_TRIAL',state:'PAID'}],
  ['a pass or stones',{accessMethod:'PER_USE',perUseSource:'point',state:'GENERATING'}],
  ['a finished consultation',{accessMethod:'PER_USE',perUseSource:'payment',state:'COMPLETED'}],
 ])('a consultation already opened by %s never opens another card window',async(_label,overrides)=>{
  const {db,input}=chatSetup(overrides);
  await expect(createPayableOrder(db,input)).rejects.toMatchObject({code:'FORTUNE_ALREADY_PAID'});
  expect(db.rows).toHaveLength(0);
 });
 test('a paid card order under another browser key blocks a second one',async()=>{
  const {db,input}=chatSetup();
  const first=await createPayableOrder(db,input);
  await markOrderPaid(db,{orderId:first.merchantUid,order:first,pg:{summary:{}}});
  await expect(createPayableOrder(db,{...input,idempotencyKey:'chat-second'})).rejects.toMatchObject({code:'FORTUNE_ALREADY_PAID'});
  expect(db.rows).toHaveLength(1);
 });
 test('the card window claims the consultation once for every order generation',async()=>{
  const {db,input,fortune}=chatSetup();
  const first=await createPayableOrder(db,input);
  expect(fortune.paymentClaimOrderId).toBe(`card:fc-${id}`);
  await markOrderFailed(db,{orderId:first.merchantUid,failureCode:'USER_CANCELLED',failureStage:'client'});
  const next=await createPayableOrder(db,input);
  expect(next.merchantUid).not.toBe(first.merchantUid);expect(next.status).toBe('pending');
  expect(fortune.paymentClaimOrderId).toBe(`card:fc-${id}`);
 });
 test('a pass activation holding the consultation opens no card window',async()=>{
  const {db,input,fortune}=chatSetup({paymentClaimOrderId:`access:pass:fc-${id}`});
  await expect(createPayableOrder(db,input)).rejects.toMatchObject({code:'MOONSTONE_IN_PROGRESS'});
  expect(db.rows).toHaveLength(0);expect(fortune.paymentClaimOrderId).toBe(`access:pass:fc-${id}`);
 });
 test.each([
  ['another owner',{userId:'507f1f77bcf86cd799439022'}],
  ['a malformed id',{requestId:'fc-not-a-consultation'}],
 ])('%s cannot prepare a consultation order',async(_label,change)=>{
  const {db,input}=chatSetup();
  await expect(createPayableOrder(db,{...input,...change})).rejects.toMatchObject({code:'INVALID_REQUEST'});
  expect(db.rows).toHaveLength(0);
 });
});
