/** @jest-environment node */
import {handlePaymentsContext} from '../../worker/payments/index.js';
import {signAuthToken} from '../../worker/lib/auth.js';
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';

const env={JWT_ACCESS_SECRET:'web-archive-offline-testing-only-1234'};
const owner='64b000000000000000000001',other='64b000000000000000000002';
const orderId='cd7f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f';

test('original web order detail checks its web principal and never takes a new payment',async()=>{
 const db=makeFakePaymentDb();
 db.rows.push({userId:owner,merchantUid:orderId,status:'paid',paymentAmount:3000,paymentType:'digital_content'});
 const before=structuredClone(db.rows);
 async function read(account){
   const token=account?await signAuthToken({_id:account,email:'test@example.invalid',role:'user',name:'테스트'},env):'toss-fixture-session';
   const response=await handlePaymentsContext(new Request('https://local.invalid/api/payments/orders/'+orderId,{headers:{Authorization:'Bearer '+token}}),env,{prefix:'/api/payments',legacyEnvelope:'detail',withDb:(_env,_ctx,run)=>run(db)});
   return {status:response.status,value:await response.json()};
 }
 const allowed=await read(owner);expect(allowed.status).toBe(200);
 expect(JSON.stringify(allowed.value)).toContain(orderId);
 expect((await read(other)).status).toBe(403);
 expect((await read(null)).status).toBe(401);
 expect(db.rows).toEqual(before);
});
