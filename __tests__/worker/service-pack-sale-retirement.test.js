/** @jest-environment node */
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';
import {SERVICE_PACK_PLANS,listServicePackPlans,resolveServicePackProduct} from '../../worker/payments/service-pack-policy.js';
import {createServicePackOrder,grantServicePack,listOwnedServicePacks} from '../../worker/payments/service-packs.js';
import {createOrder} from '../../worker/payments/orders.js';
import {createServicePackRoutes} from '../../worker/payments/service-pack-routes.js';
import {paymentError,classify} from '../../worker/payments/errors.js';
const USER='507f1f77bcf86cd799439011',OTHER='507f1f77bcf86cd799439022';
const retired=Object.entries(SERVICE_PACK_PLANS).filter(([,plan])=>plan.totalUses!==5).map(([id])=>id);
const setup=()=>makeFakePaymentDb({uniqueKeys:[['merchantUid'],['userId','idempotencyKey','paymentType']]});
const input=(planId,key='original')=>({userId:USER,product:resolveServicePackProduct(planId),idempotencyKey:key,paymentMethod:'card_general',env:{}});
// Seed the old order through the underlying repository, as if it predated retirement.
const seed=(db,values)=>createOrder(db,{...values,idempotencyKey:'service-pack:'+values.idempotencyKey,requestId:'service-pack:'+values.idempotencyKey});

test('only four five-use offers are sold, while all historical definitions remain readable',()=>{
 expect(listServicePackPlans()).toHaveLength(4);
 expect(listServicePackPlans().map(plan=>plan.totalUses)).toEqual([5,5,5,5]);
 expect(retired).toHaveLength(8);
 for(const id of retired)expect(resolveServicePackProduct(id).packSnapshot.totalUses).toBe(SERVICE_PACK_PLANS[id].totalUses);
 expect(classify(paymentError('PRODUCT_SALE_ENDED')).status).toBe(409);
});
test.each(retired)('%s rejects new self and gift orders without a payment write',async id=>{
 const db=setup(),args=input(id);
 for(const purchaseType of ['SELF','GIFT']){
  await expect(createServicePackOrder(db,{...args,purchaseType})).rejects.toMatchObject({code:'PRODUCT_SALE_ENDED'});
 }
 expect(db.rows).toHaveLength(0);
});
test('retired prepare route rejects a new order even when the client knows its old plan ID',async()=>{
 const db=setup(),routes=createServicePackRoutes({prepareOrder:args=>createServicePackOrder(db,{
  userId:USER,product:args.preparedProduct,idempotencyKey:args.body.idempotencyKey,paymentMethod:args.body.paymentMethod
 })});
 await expect(routes['POST /service-packs/prepare'].handle({body:{planId:retired[0],idempotencyKey:'new'}}))
  .rejects.toMatchObject({code:'PRODUCT_SALE_ENDED'});
 expect(db.rows).toHaveLength(0);
});
test.each(['SELF','GIFT'])('existing %s pending order replays the original snapshot only',async purchaseType=>{
 const db=setup(),args={...input(retired[0]),purchaseType,
  ...(purchaseType==='GIFT'?{giftDraft:{senderName:'보내는 이',recipientName:'받는 이',giftMessage:'응원해요'}}:{})};
 const old=await seed(db,args),before=structuredClone(old.pricingSnapshot);
 const replay=await createServicePackOrder(db,{...args,expectedOrderId:old.merchantUid});
 expect(replay.merchantUid).toBe(old.merchantUid);expect(replay.pricingSnapshot).toEqual(before);
 await expect(createServicePackOrder(db,{...args,idempotencyKey:'replacement'})).rejects.toMatchObject({code:'PRODUCT_SALE_ENDED'});
 await expect(createServicePackOrder(db,{...args,userId:OTHER})).rejects.toMatchObject({code:'PRODUCT_SALE_ENDED'});
 expect(db.rows).toHaveLength(1);
});
test('paid retired order still grants once and remains in the owned wallet',async()=>{
 const db=setup(),args=input(retired[0]),old=await seed(db,args);
 Object.assign(old,{status:'paid',paidAt:new Date()});
 await grantServicePack(db,old);await grantServicePack(db,old);
 const replay=await createServicePackOrder(db,args);
 expect(replay.status).toBe('paid');
 const wallet=await listOwnedServicePacks(db,{userId:USER});
 expect(wallet.packs).toHaveLength(1);
 expect(wallet.packs[0]).toMatchObject({totalUses:10,remainingUses:10,available:true});
});
test.each(['cancelled','failed','refunded'])('retired %s order cannot be reopened',async status=>{
 const db=setup(),args=input(retired[0]),old=await seed(db,args);old.status=status;
 await expect(createServicePackOrder(db,args)).rejects.toMatchObject({code:'ORDER_NOT_CONFIRMABLE'});
 expect(db.rows).toHaveLength(1);
});
test('retired order cannot switch its snapshot or purchase type',async()=>{
 const db=setup(),args=input(retired[0]);await seed(db,args);
 await expect(createServicePackOrder(db,{...args,purchaseType:'GIFT'})).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
 await expect(createServicePackOrder(db,{...args,product:resolveServicePackProduct(retired[1])})).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
});
