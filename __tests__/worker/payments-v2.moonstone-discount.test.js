/** @jest-environment node */
import {calculateMoonstoneDiscount,quoteYeongnyangiMoonstoneDiscount,getPaidFeaturePaymentPolicy,FEATURE_KEY_PRICE_TABLE} from '../../worker/lib/paid-feature-registry.js';
import {reserveOrderMoonstones,releaseOrderMoonstones} from '../../worker/payments/moonstone.js';
import {markOrderPaid} from '../../worker/payments/orders.js';
import {User,Payment} from '../../worker/lib/models.js';
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';
const USER='507f1f77bcf86cd799439011';
const quote=calculateMoonstoneDiscount(9900,990,500);
async function setup(balance=700) {
  const db=makeFakePaymentDb();
  await db.insertOne(User,{_id:USER,recentConsumeRequestIds:[],profileSubscription:{
    membershipCreditBalance:balance,membershipCreditUsed:0,membershipCreditLotsVersion:0,
    membershipCreditLots:[{lotId:'signup',amount:balance,remaining:balance,
      grantedAt:new Date(Date.now()-1000),expiresAt:new Date(Date.now()+86400000)}],
  }});
  const order={_id:'507f1f77bcf86cd799439013',merchantUid:'discount-test',userId:USER,
    featureKey:'yeongnyangi-saju-mackerel',status:'pending',paymentAmount:4900,expectedChargedPoints:99,
    pricingSnapshot:{moonstoneDiscount:quote},metadata:{}};
  await db.insertOne(Payment,order);return {db,order};
}
const balance=db=>db.rows.find(row=>String(row._id)===USER).profileSubscription.membershipCreditBalance;
test('500 stones deduct exactly 5000 KRW and keep 4900 KRW payable',()=>{
  expect(quote).toEqual({quantity:500,unitKRW:10,discountKRW:5000,listPriceKRW:9900,payableKRW:4900});
  expect(calculateMoonstoneDiscount(9900,990,1).payableKRW).toBe(9890);
  expect(calculateMoonstoneDiscount(9900,990,890).payableKRW).toBe(1000);
});
test.each([-1,0,0.5,NaN,Infinity,891,990,1000,'500'])('invalid or PG-under-minimum quantity %p is rejected',q=>{
  expect(()=>calculateMoonstoneDiscount(9900,990,q)).toThrow();
});
test('discount activates only with the restored value; unrelated features remain excluded',()=>{
  expect(quoteYeongnyangiMoonstoneDiscount('yeongnyangi-saju-mackerel',0)).toBeNull();
  if(getPaidFeaturePaymentPolicy('yeongnyangi-saju-mackerel').membershipCreditMultiplier===1)
    expect(quoteYeongnyangiMoonstoneDiscount('yeongnyangi-saju-mackerel',500).payableKRW)
      .toBe(FEATURE_KEY_PRICE_TABLE['yeongnyangi-saju-mackerel'].amountKRW-5000);
  else expect(()=>quoteYeongnyangiMoonstoneDiscount('yeongnyangi-saju-mackerel',500)).toThrow();
  expect(()=>quoteYeongnyangiMoonstoneDiscount('fortune-chat-consultation',1)).toThrow();
});
test('reservation debits once, creates proof, and grants no access',async()=>{
  const {db,order}=await setup();
  await db.transaction(tx=>reserveOrderMoonstones(tx,order));
  await db.transaction(tx=>reserveOrderMoonstones(tx,order));
  expect(balance(db)).toBe(200);
  expect(db.rows.filter(row=>row.type==='MONTHLY_CREDIT_SPEND')).toHaveLength(1);
  expect(db.rows.find(row=>row.merchantUid===order.merchantUid).status).toBe('pending');
});
test('insufficient balance and interrupted reservation leave no debit or proof',async()=>{
  const {db,order}=await setup(200);
  await expect(db.transaction(tx=>reserveOrderMoonstones(tx,order))).rejects.toMatchObject({code:'INSUFFICIENT_MOONSTONE'});
  expect(balance(db)).toBe(200);
  expect(db.rows.some(row=>row.type==='MONTHLY_CREDIT_SPEND')).toBe(false);
  const second=await setup();
  await expect(second.db.transaction(async tx=>{await reserveOrderMoonstones(tx,second.order);throw Error('interrupt');})).rejects.toThrow('interrupt');
  expect(balance(second.db)).toBe(700);
  expect(second.db.rows.some(row=>row.type==='MONTHLY_CREDIT_SPEND')).toBe(false);
});
test('pending PG status cannot restore; definitive cancellation restores once and rejects late grant',async()=>{
  const {db,order}=await setup();
  await db.transaction(tx=>reserveOrderMoonstones(tx,order));
  expect(await releaseOrderMoonstones(db,order.merchantUid)).toBe(false);
  expect(balance(db)).toBe(200);
  await db.updateOne(Payment,{merchantUid:order.merchantUid},{$set:{status:'failed'}});
  await releaseOrderMoonstones(db,order.merchantUid);
  await releaseOrderMoonstones(db,order.merchantUid);
  expect(balance(db)).toBe(700);
  expect(db.rows.filter(row=>row.type==='MONTHLY_CREDIT_GRANT')).toHaveLength(1);
  expect(await markOrderPaid(db,{orderId:order.merchantUid,order,pg:{}})).toBeNull();
});
test('a failing restore transaction keeps the original reservation',async()=>{
  const {db,order}=await setup();await db.transaction(tx=>reserveOrderMoonstones(tx,order));
  await db.updateOne(Payment,{merchantUid:order.merchantUid},{$set:{status:'cancelled'}});
  const insert=db.insertOne;
  db.insertOne=async(Model,row)=>{if(row.type==='MONTHLY_CREDIT_GRANT')throw Error('write failure');return insert(Model,row);};
  await expect(releaseOrderMoonstones(db,order.merchantUid)).rejects.toThrow('write failure');
  expect(balance(db)).toBe(200);
  expect(db.rows.find(row=>row.type==='MONTHLY_CREDIT_SPEND').metadata.refundedAt).toBeUndefined();
});

test('expired signup stones cannot fund a new discount',async()=>{
  const {db,order}=await setup();
  db.rows.find(row=>String(row._id)===USER).profileSubscription.membershipCreditLots[0].expiresAt=new Date(Date.now()-1);
  await expect(db.transaction(tx=>reserveOrderMoonstones(tx,order))).rejects.toMatchObject({code:'INSUFFICIENT_MOONSTONE'});
  expect(db.rows.some(row=>row.type==='MONTHLY_CREDIT_SPEND')).toBe(false);
});

test('two different orders cannot spend the same remaining balance',async()=>{
  const {db,order}=await setup();
  const second={...order,_id:'507f1f77bcf86cd799439014',merchantUid:'discount-second'};
  await db.insertOne(Payment,second);
  const results=await Promise.allSettled([order,second].map(item=>db.transaction(tx=>reserveOrderMoonstones(tx,item))));
  expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  expect(balance(db)).toBe(200);
  expect(db.rows.filter(row=>row.type==='MONTHLY_CREDIT_SPEND')).toHaveLength(1);
});

test('prepare uses the release registry and rejects client discount amounts; replay never deducts twice',async()=>{
  const {handlePaymentsContext}=await import('../../worker/payments/index.js');
  const {signAuthToken}=await import('../../worker/lib/auth.js');
  const {resolveProduct}=await import('../../worker/payments/catalog.js');
  const {YeongnyangiRequest}=await import('../../worker/lib/yeongnyangi-models.js');
  const {db}=await setup();
  const featureKey='yeongnyangi-saju-mackerel';
  const product=resolveProduct({featureKey});
  const id='b'.repeat(64);
  await db.insertOne(YeongnyangiRequest,{_id:id,userId:USER,featureKey,amountKRW:product.priceKRW,profileId:'sample',state:'CREATED',paymentId:null,paymentGeneration:0});
  const env={JWT_ACCESS_SECRET:'fixture-secret-not-real-0123456789',GEMINIF_API_KEY:'fixture-no-call',LLM_DRY_RUN:'false',PORTONE_STORE_ID:'fixture-store',PORTONE_CHANNEL_KEY:'fixture-channel',PORTONE_API_SECRET:'fixture-secret'};
  const token=await signAuthToken({_id:USER,email:'test@example.invalid',role:'user',name:'sample'},env);
  const prepare=async(extra={})=>{
    const req=new Request('https://example.com/api/payments/prepare',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({featureKey,productId:product.productId,requestId:`yn-${id}`,moonstoneQuantity:500,discountKRW:1,paymentAmount:product.priceKRW,...extra})});
    const response=await handlePaymentsContext(req,env,{prefix:'/api/payments',legacyEnvelope:'prepare',withDb:(_e,_c,fn)=>fn(db),pgDeps:{fetchPayment:async()=>{throw Object.assign(Error('unregistered'),{status:404,code:'PAYMENT_NOT_FOUND'});}}});
    return {status:response.status,body:await response.json()};
  };
  const first=await prepare();
  if(getPaidFeaturePaymentPolicy(featureKey).membershipCreditMultiplier!==1){
    expect(first.status).toBe(400);expect(balance(db)).toBe(700);return;
  }
  expect(first.status).toBe(201);
  expect(first.body.order.paymentAmount).toBe(product.priceKRW-5000);
  expect(balance(db)).toBe(200);
  const repeat=await prepare();
  expect(repeat.status).toBe(201);expect(repeat.body.order.merchantUid).toBe(first.body.order.merchantUid);expect(balance(db)).toBe(200);
  expect((await prepare({moonstoneQuantity:100})).status).toBe(409);
  expect(balance(db)).toBe(200);
});
