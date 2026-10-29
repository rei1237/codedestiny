import {test} from 'node:test';
import assert from 'node:assert/strict';
import {grantVerifiedOrder} from '../../../worker/toss/grant.js';
const order={orderId:'01900000-1111-7111-8111-000000000001',sku:'approved-test-sku',status:'PAYMENT_COMPLETED'};
const product={sku:order.sku,productId:'saju_tuna',approvedPriceKRW:30000,priceEvidence:'mock-console-evidence'};
const auth={_id:'toss-identity',ownerId:'internal-owner',revision:0,environment:'SANDBOX'};
function fixture() {
  let data={purchases:{},requests:{original:{_id:'original',userId:auth.ownerId,productId:product.productId,amountKRW:30000,state:'CREATED',chapters:[]}}};
  let serial=Promise.resolve();
  const store={transaction(task){
    const run=serial.then(async()=>{
      const draft=structuredClone(data);
      const value=await task({
        assertIdentity:async identity=>assert.equal(identity._id,auth._id),
        purchase:async id=>draft.purchases[id],
        insertPurchase:async p=>{assert.equal(draft.purchases[p._id],undefined);draft.purchases[p._id]=p;},
        request:async(id,owner)=>draft.requests[id]?.userId===owner?draft.requests[id]:null,
        attachRequest:async(id,owner,orderId)=>Object.assign(draft.requests[id],{state:'PAID',accessMethod:'TOSS_IAP',paymentClaimOrderId:orderId}),
        assignPurchase:async(id,requestId)=>{draft.purchases[id].requestId=requestId;},
      });
      data=draft;return value;
    });
    serial=run.catch(()=>{});return run;
  }};
  return {store,get:()=>data};
}
test('duplicate callbacks grant once; queue failure does not lose paid right or library state',async()=>{
  const f=fixture();
  const args={store:f.store,auth,order,product,requestId:'original',enqueue:async()=>{throw Error('queue offline');}};
  const receipts=await Promise.all(Array.from({length:8},()=>grantVerifiedOrder(args)));
  assert.equal(Object.keys(f.get().purchases).length,1);
  assert.equal(f.get().requests.original.state,'PAID');
  assert.ok(receipts.every(r=>r.durable&&r.requestId==='original'));
});
test('missing callback restores an unassigned right, never guesses a draft',async()=>{
  const f=fixture();const args={store:f.store,auth,order,product,enqueue:async()=>assert.fail()};
  assert.equal((await grantVerifiedOrder(args)).requestId,null);
  assert.equal(f.get().requests.original.state,'CREATED');
  const receipt=await grantVerifiedOrder({...args,requestId:'original',enqueue:async()=>{}});
  assert.equal(receipt.requestId,'original');
  assert.equal(Object.keys(f.get().purchases).length,1);
});
test('other owners and other requests cannot steal an order',async()=>{
  const f=fixture();const args={store:f.store,auth,order,product,enqueue:async()=>{}};
  await grantVerifiedOrder({...args,requestId:'original'});
  await assert.rejects(grantVerifiedOrder({...args,auth:{...auth,_id:'other'}}));
  await assert.rejects(grantVerifiedOrder({...args,requestId:'different'}),/ALREADY_ASSIGNED/);
  assert.equal(f.get().purchases[order.orderId].requestId,'original');
});
test('failed attachment rolls back grant; SDK may not acknowledge a partial transaction',async()=>{
  const f=fixture();
  await assert.rejects(grantVerifiedOrder({store:f.store,auth,order,product,requestId:'not-owned',enqueue:async()=>assert.fail()}));
  assert.equal(Object.keys(f.get().purchases).length,0);
});
test('price drift is rejected before funding a prepared consultation',async()=>{
  const f=fixture();
  await assert.rejects(grantVerifiedOrder({store:f.store,auth,order,product:{...product,approvedPriceKRW:35000},requestId:'original',enqueue:async()=>assert.fail()}),/PRICE_CHANGED/);
  assert.equal(f.get().requests.original.state,'CREATED');
});
test('completed paid right cannot be moved to a new purchase input',async()=>{
  const f=fixture();const args={store:f.store,auth,order,product,requestId:'original',enqueue:async()=>{}};
  await grantVerifiedOrder(args);
  await assert.rejects(grantVerifiedOrder({...args,requestId:'replacement'}),/ALREADY_ASSIGNED/);
});

test('chat order cannot fund the other persona even with identical product and owner',async()=>{
 const f=fixture();
 const chat={...product,serviceId:'yeoni',productId:'chat_saju_mackerel'};
 Object.assign(f.get().requests.original,{productId:chat.productId,persona:'neo',snapshot:{persona:'neo'},featureKey:'fortune-chat-question-mackerel'});
 await assert.rejects(grantVerifiedOrder({store:f.store,auth,order,product:chat,requestId:'original',enqueue:async()=>assert.fail()}),/REQUEST_NOT_FOUND/);
 assert.equal(Object.keys(f.get().purchases).length,0);
 Object.assign(f.get().requests.original,{persona:'yeoni',snapshot:{persona:'yeoni'}});
 await grantVerifiedOrder({store:f.store,auth,order,product:chat,requestId:'original',enqueue:async()=>{}});
 assert.equal(f.get().purchases[order.orderId].serviceId,'yeoni');
 await assert.rejects(grantVerifiedOrder({store:f.store,auth,order,product:{...chat,serviceId:'neo'},requestId:'original',enqueue:async()=>assert.fail()}),/ORDER_PRODUCT_MISMATCH/);
});
