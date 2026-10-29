import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyMarketingPayment as classify} from '../scripts/lib/marketing-pg-reconciliation.mjs';
const order={merchantUid:'fixture-order',paymentAmount:5000};
const payment={id:'fixture-order',currency:'KRW',channel:{type:'LIVE'},status:'PAID',amount:{total:5000,cancelled:0}};
test('live paid and full/partial cancellations produce PG balance only',()=>{
  assert.deepEqual(classify(order,payment),{kind:'live',grossKRW:5000,cancelledKRW:0,netKRW:5000});
  assert.equal(classify(order,{...payment,status:'CANCELLED',amount:{total:5000,cancelled:5000}}).netKRW,0);
  assert.equal(classify(order,{...payment,status:'PARTIAL_CANCELLED',amount:{total:5000,cancelled:1000}}).netKRW,4000);
});
test('TEST excluded; missing channel and isTest=false do not prove live',()=>{
  assert.equal(classify(order,{...payment,channel:{type:'TEST'}}).kind,'test');
  assert.equal(classify(order,{...payment,channel:null,isTest:false}).kind,'unknown');
});
test('identity, currency and total must match before classifying',()=>{
  for(const raw of [{...payment,id:'other'},{...payment,currency:'USD'},
    {...payment,amount:{total:4000,cancelled:0}}, {...payment,amount:{total:null,cancelled:0}}]) {
    assert.equal(classify(order,raw).kind,'mismatch');
  }
});
test('invalid cancellation amounts and contradictory status fail closed',()=>{
  for(const cancelled of [null,undefined,'0',-1,5001,NaN]) {
    assert.equal(classify(order,{...payment,amount:{total:5000,cancelled}}).kind,'unknown');
  }
  for(const status of ['READY','FAILED','CANCELLED','PARTIAL_CANCELLED']) {
    assert.equal(classify(order,{...payment,status}).kind,'unknown');
  }
  assert.equal(classify(order,{...payment,amount:{total:5000,cancelled:1000}}).kind,'unknown');
});
