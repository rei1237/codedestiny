import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../../js/core/analytics.js',import.meta.url),'utf8');
function boot(){
  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://code-destiny.com/points/?token=private',runScripts:'outside-only'});
  dom.window.eval(source);return dom;
}
test('server approval is purchase; pending grant is not fulfillment; replay does not duplicate',()=>{
  const dom=boot(),w=dom.window;
  const payload={code:'GRANT_PENDING',activationPending:true,payment:{merchantUid:'order-1',paymentAmount:1000,status:'paid'},question:'private',birthDate:'private'};
  w.cdTrackConfirmedPurchase(payload);w.cdTrackConfirmedPurchase(payload);
  let events=w.dataLayer.filter(row=>row[0]==='event');
  assert.equal(events.filter(row=>row[1]==='purchase').length,1);
  assert.equal(events.filter(row=>row[1]==='entitlement_granted').length,0);
  w.cdTrackConfirmedPurchase({...payload,code:undefined,activationPending:false});
  w.cdTrackConfirmedPurchase({...payload,code:undefined,activationPending:false});
  events=w.dataLayer.filter(row=>row[0]==='event');
  assert.equal(events.filter(row=>row[1]==='entitlement_granted').length,1);
  const purchase=events.find(row=>row[1]==='purchase')[2];
  assert.equal(purchase.currency,'KRW');assert.equal(purchase.value,1000);
  assert.equal(JSON.stringify(purchase).includes('private'),false);
  const config=w.dataLayer.find(row=>row[0]==='config');
  assert.equal(config[2].page_location,'https://code-destiny.com/points/');
  dom.window.close();
});
test('PG callback alone, unpaid status and missing server amount are not purchases',()=>{
  const dom=boot(),w=dom.window;
  for(const payload of [{paymentId:'pg-callback'}, {payment:{merchantUid:'order-1',paymentAmount:1000,status:'pending'}}, {payment:{merchantUid:'order-1',status:'paid'}}])assert.equal(w.cdTrackConfirmedPurchase(payload),false);
  assert.equal(w.dataLayer.filter(row=>row[1]==='purchase').length,0);
  dom.window.close();
});
test('only completed paid reports emit anonymous delivery and first-open events once',()=>{
  const dom=boot(),w=dom.window;
  const row={id:'a'.repeat(64),productId:'saju_mackerel',paid:true,state:'GENERATING',chapters:[{text:'private'}]};
  w.cdTrackFortuneDelivery(row);
  w.cdTrackFortuneDelivery({...row,state:'REFUNDED'});
  assert.equal(w.dataLayer.filter(row=>row[1]==='fortune_completed').length,0);
  w.cdTrackFortuneDelivery({...row,state:'COMPLETED'});
  w.cdTrackFortuneDelivery({...row,state:'COMPLETED'});
  const events=w.dataLayer.filter(row=>row[0]==='event');
  assert.equal(events.filter(row=>row[1]==='fortune_completed').length,1);
  assert.equal(events.filter(row=>row[1]==='fortune_first_open').length,1);
  assert.equal(JSON.stringify(events).includes('private'),false);
  assert.equal(JSON.stringify(events).includes('a'.repeat(64)),false);
  w.cdTrack('page_view',{page_location:'https://code-destiny.com/result/?id=private'});
  assert.equal(w.dataLayer.at(-1)[2].page_location,'https://code-destiny.com/points/');
  dom.window.close();
});
