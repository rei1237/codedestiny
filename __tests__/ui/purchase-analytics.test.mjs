import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../../js/core/analytics.js',import.meta.url),'utf8');
function boot(url='https://code-destiny.com/points/?token=private'){
  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url,runScripts:'outside-only'});
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
test('one mock web payment through the real confirm envelopes is one purchase named by its feature',async()=>{
  const {legacyConfirmEnvelope}=await import('../../worker/payments/compat.js');
  const order={merchantUid:'cd'+'1'.repeat(38),featureKey:'saju-deep',paymentAmount:5000,impUid:'imp-1'};
  const dom=boot(),w=dom.window;
  w.cdTrackConfirmedPurchase(legacyConfirmEnvelope(order));
  w.cdTrackConfirmedPurchase(legacyConfirmEnvelope(order,{granted:true}));
  w.cdTrackConfirmedPurchase(legacyConfirmEnvelope(order,{granted:true,replayed:true}));
  const sent=Array.from(w.dataLayer.filter(row=>row[0]==='event'&&/^(purchase|entitlement_granted)$/.test(row[1])),row=>[row[1],row[2].transaction_id,row[2].items?row[2].items[0].item_id:row[2].item_id]);
  assert.deepEqual(sent,[['purchase',order.merchantUid,'saju-deep'],['entitlement_granted',order.merchantUid,'saju-deep']]);
  dom.window.close();
  const direct=boot(),d=direct.window;
  d.cdTrackConfirmedPurchase(legacyConfirmEnvelope(order,{granted:true}));
  assert.equal(d.dataLayer.find(row=>row[1]==='purchase')[2].items[0].item_id,'saju-deep');
  direct.window.close();
});
test('page_location keeps campaign parameters and drops every other query value',()=>{
  const dom=boot('https://code-destiny.com/landing/?utm_source=threads&token=private&utm_medium=social&utm_campaign=s1_launch'),w=dom.window;
  const expected='https://code-destiny.com/landing/?utm_source=threads&utm_medium=social&utm_campaign=s1_launch';
  assert.equal(w.dataLayer.find(row=>row[0]==='config')[2].page_location,expected);
  w.cdTrack('page_view',{page_location:'https://code-destiny.com/result/?id=private'});
  assert.equal(w.dataLayer.at(-1)[2].page_location,expected);
  assert.equal(JSON.stringify(w.dataLayer).includes('private'),false);
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

test('partial render, completion and library entry remain separate observations',()=>{
  const dom=boot(),w=dom.window;
  const row={id:'b'.repeat(64),productId:'saju_mackerel',paid:true,state:'GENERATING',chapters:[{text:'private'}]};
  w.cdTrackFortuneView({...row,chapters:[]},'library');
  w.cdTrackFortuneView({...row,state:'REFUNDED'},'library');
  w.cdTrackFortuneView(row,'library');w.cdTrackFortuneView(row,'library');
  w.cdTrackFortuneView({...row,state:'COMPLETED'},'library');
  const views=w.dataLayer.filter(event=>event[1]==='fortune_result_view').map(event=>event[2]);
  assert.equal(views.length,2);
  assert.deepEqual(Array.from(views,view=>view.result_state),['partial','complete']);
  assert.equal(views[0].item_id,'yeongnyangi-saju-mackerel');
  assert.equal(views[0].entry_source,'library');
  assert.equal(JSON.stringify(views).includes('private'),false);
  assert.equal(JSON.stringify(views).includes(row.id),false);
  assert.equal(w.dataLayer.filter(event=>event[1]==='fortune_completed').length,0);
  dom.window.close();
});


test('React initial events wait for the existing analytics installation', async()=>{
 const {transform}=await import('esbuild');
 const wrapper=await transform(readFileSync(new URL('../../lib/analytics.ts',import.meta.url),'utf8'),{loader:'ts',format:'iife',globalName:'reactAnalytics'});
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://code-destiny.com/today/',runScripts:'outside-only'});
 const w=dom.window;w.eval(wrapper.code);
 w.reactAnalytics.trackEvent('view_item',{item_id:'yeongnyangi-saju-mackerel'});
 w.reactAnalytics.trackEvent('daily_tarot_reopen',{complete:true});
 assert.equal(w.dataLayer,undefined);
 w.eval(source);w.cdAnalyticsReady();
 const events=w.dataLayer.filter(row=>row[0]==='event');
 assert.equal(events.filter(row=>row[1]==='view_item').length,1);
 assert.equal(events.filter(row=>row[1]==='daily_tarot_reopen').length,1);
 dom.window.close();
});
