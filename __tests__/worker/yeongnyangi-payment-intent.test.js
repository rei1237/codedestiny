import {createPayableOrder,markOrderPaid,markOrderFailed} from '../../worker/payments/orders.js';
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';
import {YeongnyangiRequest} from '../../worker/lib/yeongnyangi-models.js';
const userId='507f1f77bcf86cd799439011', id='a'.repeat(64),requestId=`yn-${id}`;
const product={productId:'yeongnyangi-saju-mackerel',featureKey:'yeongnyangi-saju-mackerel',priceKRW:1000,priceCoins:10,monthlyCost:0,billingType:'per-use'};
function setup(overrides={}) {
 const db=makeFakePaymentDb(),read=db.findOne,write=db.findOneAndUpdate;
 const fortune={_id:id,userId,profileId:'shared-profile',featureKey:product.featureKey,amountKRW:1000,state:'CREATED',paymentGeneration:0,...overrides};
 db.findOne=async(Model,filter,options)=>Model===YeongnyangiRequest
  ? (String(filter.userId)===fortune.userId&&filter._id===fortune._id?fortune:null):read(Model,filter,options);
 db.findOneAndUpdate=async(Model,filter,update,options)=>{
  if(Model!==YeongnyangiRequest)return write(Model,filter,update,options);
  const expected=filter.paymentGeneration??0;
  if(fortune.paymentGeneration!==expected)return null;
  fortune.paymentGeneration+=update.$inc.paymentGeneration;return {...fortune};
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
test('paid but not yet activated never opens a second payable order',async()=>{
 const {db,input}=setup();const order=await createPayableOrder(db,input);
 await markOrderPaid(db,{orderId:order.merchantUid,order,pg:{paidAt:new Date(),method:'card',summary:{}}});
 await expect(createPayableOrder(db,{...input,idempotencyKey:'new'})).rejects.toMatchObject({code:'FORTUNE_ALREADY_PAID'});
 expect(db.rows).toHaveLength(1);
});
test('terminal failure retries one shared next order',async()=>{
 const {db,input}=setup();const a=await createPayableOrder(db,input);
 await markOrderFailed(db,{orderId:a.merchantUid,failureCode:'PG_FAILED'});
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
  await markOrderFailed(db,{orderId:a.merchantUid,failureCode:'PG_DECLINED'});
 }
 const [a,b]=await Promise.all([createPayableOrder(db,input),createPayableOrder(db,input)]);
 expect(a.merchantUid).toBe(b.merchantUid);expect(db.rows).toHaveLength(9);
});
