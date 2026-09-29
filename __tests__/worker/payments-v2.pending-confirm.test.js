import {__paymentsContextTestUtils as core} from '../../worker/payments/index.js';
import {createPaymentContext} from '../../worker/payments/db.js';
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';
const env={PORTONE_API_SECRET:'fixture',PORTONE_STORE_ID:'store-fixture'};
function setup(){
 const db=makeFakePaymentDb();
 const order={merchantUid:'cd-pending-fixture',userId:'507f1f77bcf86cd799439011',requestId:'fixture-reading',status:'pending',
  productId:'openKemetModal',featureKey:'openKemetModal',paymentType:'digital_content',paymentAmount:3000,pricingSnapshot:{}};
 db.rows.push(order);
 const ctx=createPaymentContext({requestId:'fixture',route:'test'});
 const reply=status=>({paymentId:order.merchantUid,status,amount:3000,currency:'KRW',pay_method:'card'});
 const confirm=fetchPayment=>core.confirmOrder(env,ctx,{orderId:order.merchantUid},{withDb:async(_env,_ctx,fn)=>fn(db),deps:{fetchPayment}});
 return {db,order,reply,confirm};
}
test('ready lookup keeps PENDING; a later paid response grants exactly once',async()=>{
 const {db,order,reply,confirm}=setup();
 await expect(confirm(async()=>reply('ready'))).rejects.toMatchObject({code:'PG_PAYMENT_NOT_PAID'});
 expect(order.status).toBe('pending');expect(order.failureCode).toBeUndefined();
 await confirm(async()=>reply('paid'));expect(order.status).toBe('paid');
 const count=db.rows.length;
 await confirm(async()=>{throw Error('paid replay must not query PG');});expect(db.rows).toHaveLength(count);
});
test('approval followed by database failure remains recoverable on retry',async()=>{
 const {db,order,reply,confirm}=setup();const update=db.findOneAndUpdate;
 db.findOneAndUpdate=async()=>{throw Error('DB temporarily unavailable');};
 await expect(confirm(async()=>reply('paid'))).rejects.toThrow('DB temporarily unavailable');
 expect(order.status).toBe('pending');
 db.findOneAndUpdate=update;
 await confirm(async()=>reply('paid'));expect(order.status).toBe('paid');expect(order.entitlementGrantedAt).toBeTruthy();
});
test('PG timeout leaves the original order recoverable',async()=>{
 const {order,reply,confirm}=setup();
  await expect(confirm(async()=>{throw new Error('PortOne payment lookup failed: request timed out after 8000ms');})).rejects.toMatchObject({code:'PG_UNAVAILABLE'});
 expect(order.status).toBe('pending');await confirm(async()=>reply('paid'));expect(order.status).toBe('paid');
});
