import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readGa4PurchaseContext,buildGa4RefundReceipts,sendPendingGa4Refunds,withdrawGa4Consent} from '../../worker/payments/ga4-refunds.js';
const now=new Date('2026-10-29T10:00:00Z');
const env={GA4_SERVER_REFUNDS_ENABLED:'true',GA4_MEASUREMENT_ID:'G-FIXTURE123',GA4_API_SECRET:'fixture-only-secret'};
const token='a'.repeat(64);
const receiptHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),v=>v.toString(16).padStart(2,'0')).join('');
const context={version:1,consent:true,clientId:'123.456',receiptHash,capturedAt:new Date('2026-10-29T08:00:00Z')};
const order={merchantUid:'fixture-order',paymentAmount:5000,paidAt:new Date('2026-10-29T09:00:00Z'),metadata:{ga4PurchaseContext:context}};
const cancellation={id:'cancel-fixture',status:'SUCCEEDED',totalAmount:5000,cancelledAt:'2026-10-29T09:50:00Z',reason:'PRIVATE QUESTION'};
const pg={id:order.merchantUid,status:'CANCELLED',channel:{type:'LIVE'},currency:'KRW',amount:{total:5000,cancelled:5000},cancellations:[cancellation],customer:{email:'private@example.invalid'}};
const request=cookie=>new Request('https://code-destiny.com/api/payments/prepare',{headers:{cookie:cookie+'; cd_analytics_receipt='+token}});
test('requires opt-in configuration, accepted consent and a real GA cookie format',async()=>{
  assert.deepEqual(await readGa4PurchaseContext(request('cd_cookie_consent=accepted; _ga=GA1.1.123.456'),env,context.capturedAt),context);
  for(const cookie of ['_ga=GA1.1.123.456','cd_cookie_consent=essential; _ga=GA1.1.123.456','cd_cookie_consent=accepted; _ga=email@example.invalid',
    'cd_cookie_consent=accepted; cd_cookie_consent=essential; _ga=GA1.1.123.456']) assert.equal(await readGa4PurchaseContext(request(cookie),env,now),null);
  assert.equal(await readGa4PurchaseContext(request('cd_cookie_consent=accepted; _ga=GA1.1.123.456'),{},now),null);
});
test('actual PG timestamp and original transaction; no sensitive fields or advertising consent',()=>{
  const [receipt]=buildGa4RefundReceipts(order,pg,now);
  assert.equal(receipt.body.timestamp_micros,Date.parse(cancellation.cancelledAt)*1000);
  assert.deepEqual(receipt.body.events,[{name:'refund',params:{transaction_id:order.merchantUid,value:5000,currency:'KRW'}}]);
  assert.equal(receipt.body.consent.ad_user_data,'DENIED');
  assert.doesNotMatch(JSON.stringify(receipt),/PRIVATE|private@example|customer|reason/);
});
test('partial cancellations are separate receipts and totals must reconcile',()=>{
  const partial={...pg,status:'PARTIAL_CANCELLED',amount:{total:5000,cancelled:3000},cancellations:[{...cancellation,totalAmount:1000},{...cancellation,id:'second',totalAmount:2000}]};
  assert.deepEqual(buildGa4RefundReceipts(order,partial,now).map(r=>r.body.events[0].params.value),[1000,2000]);
  assert.deepEqual(buildGa4RefundReceipts(order,{...partial,amount:{total:5000,cancelled:4000}},now),[]);
  assert.deepEqual(buildGa4RefundReceipts(order,{...partial,cancellations:[cancellation,cancellation]},now),[]);
});
test('unknown/test, mismatched totals, unconfirmed and stale cancellations are excluded',()=>{
  for(const raw of [{...pg,channel:{type:'TEST'}},{...pg,channel:{}},{...pg,id:'other'},
    {...pg,currency:'USD'},{...pg,amount:{total:5001,cancelled:5000}},
    {...pg,cancellations:[{...cancellation,status:'REQUESTED'}]},
    {...pg,cancellations:[{...cancellation,cancelledAt:null}]},
    {...pg,cancellations:[{...cancellation,cancelledAt:'2026-10-29T10:01:00Z'}]}]) assert.deepEqual(buildGa4RefundReceipts(order,raw,now),[]);
  assert.deepEqual(buildGa4RefundReceipts(order,pg,new Date('2026-11-02T10:00:00Z')),[]);
  assert.deepEqual(buildGa4RefundReceipts({...order,metadata:{}},pg,now),[]);
  assert.deepEqual(buildGa4RefundReceipts({...order,metadata:{ga4PurchaseContext:{...context,consent:false}}},pg,now),[]);
});
test('invalid dates and contradictory full/partial cancellation states fail closed',()=>{
  assert.deepEqual(buildGa4RefundReceipts(order,pg,new Date('invalid')),[]);
  assert.deepEqual(buildGa4RefundReceipts({...order,metadata:{ga4PurchaseContext:{...context,capturedAt:'invalid'}}},pg,now),[]);
  assert.deepEqual(buildGa4RefundReceipts(order,{...pg,cancellations:[{...cancellation,cancelledAt:'invalid'}]},now),[]);
  assert.deepEqual(buildGa4RefundReceipts(order,{...pg,status:'PARTIAL_CANCELLED'},now),[]);
  assert.deepEqual(buildGa4RefundReceipts(order,{...pg,amount:{total:5000,cancelled:1000},cancellations:[{...cancellation,totalAmount:1000}]},now),[]);
});
function fixture(){
  const marks=new Map();let inDb=false;
  const db={findOne:async()=>null,find:async()=>[order],updateOne:async(_model,filter,update)=>{
    const key=Object.keys(filter).find(k=>k.startsWith('metadata.ga4RefundDeliveries.')&&!k.endsWith('.state'));
    if(key){if(marks.has(key))return {modifiedCount:0};marks.set(key,update.$set[key]);}
    for(const [path,value] of Object.entries(update.$set))if(path.endsWith('.state')){const key=path.slice(0,-6);marks.set(key,{...marks.get(key),state:value});}
    return {modifiedCount:1};
  }};
  return {marks,withDb:async fn=>{inDb=true;try{return await fn(db);}finally{inDb=false;}},outside:()=>assert.equal(inDb,false)};
}
test('disabled configuration does not read/write DB or send network requests',async()=>{
  const result=await sendPendingGa4Refunds({},()=>assert.fail('DB used'));
  assert.equal(result.enabled,false);
});
test('withdrawal works without login, stores only a hash, scrubs matching analytics and rejects cross-origin',async()=>{
  const writes=[];
  const db={updateOne:async(...args)=>writes.push(args),updateMany:async(...args)=>writes.push(args)};
  const make=origin=>new Request('https://code-destiny.com/api/payments/analytics-withdrawal',{method:'POST',headers:{origin,'content-type':'application/json',cookie:'cd_analytics_receipt='+token}});
  assert.equal((await withdrawGa4Consent(make('https://attacker.invalid'),db,now)).status,403);
  assert.equal(writes.length,0);
  assert.equal((await withdrawGa4Consent(make('https://code-destiny.com'),db,now)).status,204);
  assert.deepEqual(writes[0][1],{_id:receiptHash});
  assert.deepEqual(writes[1][1],{'metadata.ga4PurchaseContext.receiptHash':receiptHash});
  assert.deepEqual(writes[1][2].$unset,{'metadata.ga4PurchaseContext.clientId':''});
  assert.equal(writes[1][2].$set['metadata.ga4PurchaseContext.consent'],false);
  assert.ok(!JSON.stringify(writes.map(row=>row.slice(1))).includes(token));
});
test('missing receipt and pending withdrawal cannot capture new analytics context',async()=>{
  assert.equal(await readGa4PurchaseContext(new Request('https://code-destiny.com',{headers:{cookie:'cd_cookie_consent=accepted; _ga=GA1.1.123.456'}}),env),null);
  assert.equal(await readGa4PurchaseContext(request('cd_cookie_consent=accepted; _ga=GA1.1.123.456; cd_analytics_revoke_pending=1'),env),null);
});
test('withdrawal before scan or during PG lookup blocks sending, even with stale order context',async()=>{
  for(const revokeDuringPg of [false,true]) {
    const f=fixture();let revoked=!revokeDuringPg;
    const withDb=fn=>f.withDb(db=>fn({...db,findOne:async()=>revoked?{revokedAt:now}:null}));
    const result=await sendPendingGa4Refunds(env,withDb,{now,
      fetchPayment:async()=>{revoked=true;return {rawV2:pg};},
      fetchImpl:async()=>assert.fail('withdrawn analytics sent'),
    });
    assert.equal(result.submitted,0);assert.equal(result.skipped,1);
  }
});
test('persistent claim prevents repeat submission and network is outside DB slot',async()=>{
  const f=fixture();let sends=0;
  const deps={now,fetchPayment:async()=>{f.outside();return {rawV2:pg};},fetchImpl:async(url,options)=>{
    f.outside();sends++;assert.equal(new URL(url).hostname,'www.google-analytics.com');assert.equal(options.redirect,'error');
    assert.equal(JSON.parse(options.body).events[0].name,'refund');return {ok:true};
  }};
  assert.equal((await sendPendingGa4Refunds(env,f.withDb,deps)).submitted,1);
  assert.equal((await sendPendingGa4Refunds(env,f.withDb,deps)).submitted,0);
  assert.equal(sends,1);assert.equal([...f.marks.values()][0].state,'submitted');
});
test('uncertain network result is marked for review, never blindly retried',async()=>{
  const f=fixture();let sends=0;
  const deps={now,fetchPayment:async()=>({rawV2:pg}),fetchImpl:async()=>{sends++;throw new Error('timeout');}};
  assert.equal((await sendPendingGa4Refunds(env,f.withDb,deps)).review,1);
  await sendPendingGa4Refunds(env,f.withDb,deps);
  assert.equal(sends,1);assert.equal([...f.marks.values()][0].state,'review');
});
