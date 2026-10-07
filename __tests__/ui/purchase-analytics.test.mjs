import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../../js/core/analytics.js',import.meta.url),'utf8');
function boot(url='https://code-destiny.com/points/?token=private',{consent='',stored={}}={}){
  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url,runScripts:'outside-only'});
  if(consent)dom.window.document.cookie=`cd_cookie_consent=${consent}; path=/`;
  for(const [key,value] of Object.entries(stored))dom.window.localStorage.setItem(key,value);
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

test('Threads attribution survives internal navigation only with consent and within its TTL',()=>{
 const dom=boot('https://code-destiny.com/?utm_source=threads&utm_medium=social&utm_campaign=threads_20260929_saju&question=private'),w=dom.window;
 assert.equal(w.cdReadGrowthAttribution(),null);
 w.document.cookie='cd_cookie_consent=accepted; path=/';
 assert.equal(w.cdReadGrowthAttribution().campaignId,'threads_20260929_saju');
 w.history.replaceState({},'', '/checkout/');
 w.cdTrack('checkout_start',{service:'yeongnyangi'});
 assert.equal(w.dataLayer.at(-1)[2].growth_campaign,'threads_20260929_saju');
 assert.equal(JSON.stringify(w.cdReadGrowthAttribution()).includes('private'),false);
 w.sessionStorage.setItem('cd:growth:campaign',JSON.stringify({campaignId:'threads_20260929_saju',until:Date.now()-1}));
 assert.equal(w.cdReadGrowthAttribution(),null);
 w.history.replaceState({},'', '/?utm_source=threads&utm_medium=social&utm_campaign=private-user-data');
 assert.equal(w.cdReadGrowthAttribution(),null);
 w.sessionStorage.setItem('cd:growth:campaign',JSON.stringify({campaignId:'threads_20260929_saju',until:Date.now()+1000}));
 w.document.cookie='cd_cookie_consent=essential; path=/';
 assert.equal(w.cdReadGrowthAttribution(),null);assert.equal(w.sessionStorage.getItem('cd:growth:campaign'),null);
 dom.window.close();
});
test('server attribution accepts public campaign metadata and discards unknown fields',async()=>{
 const {normalizeGrowthAttribution:normalize}=await import('../../lib/marketing/growth-attribution.mjs');
 assert.equal(normalize({campaignId:'threads_20260929_saju'}),undefined);
 assert.equal(normalize({consent:true,version:'growth-20260929-v1',campaignId:'private'}),undefined);
 const clean=normalize({consent:true,version:'growth-20260929-v1',campaignId:'threads_queue_t02_v1',device:'mobile',question:'private',userId:'private'});
 assert.deepEqual(Object.keys(clean).sort(),['campaignId','consent','device','version']);
 assert.equal(JSON.stringify(clean).includes('private'),false);
});

test('purchase replay across documents persists only with analytics consent',()=>{
 const payload={payment:{merchantUid:'mock-order',paymentAmount:1000,status:'paid',featureKey:'yeongnyangi-saju-mackerel'}};
 for(const consent of ['accepted','essential','']){
  const first=boot(undefined,{consent}),w=first.window;
  w.cdTrackConfirmedPurchase(payload);w.cdTrackConfirmedPurchase(payload);
  assert.equal(w.dataLayer.filter(row=>row[1]==='purchase').length,1);
  const stored=Object.fromEntries(Object.keys(w.localStorage).map(key=>[key,w.localStorage.getItem(key)]));
  assert.equal(Boolean(stored['cd:purchase:mock-order']),consent==='accepted');
  first.window.close();
  const second=boot(undefined,{consent,stored});
  second.window.cdTrackConfirmedPurchase(payload);
  assert.equal(second.window.dataLayer.filter(row=>row[1]==='purchase').length,consent==='accepted'?0:1);
  second.window.close();
 }
});

test('pass or moonstone access without a positive server payment is not a new purchase',()=>{
 const dom=boot(),w=dom.window;
 for(const payload of [{passApplied:true},{paymentMode:'coin',accessGrant:{featureKey:'saju-deep'}},
  {payment:{merchantUid:'mock-zero',paymentAmount:0,status:'paid'}}]){
  assert.equal(w.cdTrackConfirmedPurchase(payload),false);
 }
 assert.equal(w.dataLayer.filter(row=>row[1]==='purchase').length,0);
 dom.window.close();
});

test('insight attribution uses public campaign codes, expires, and clears on consent withdrawal',async()=>{
 const {insightPath}=await import('../../lib/insight-card.mjs');
 for(const brand of ['yeongnyangi','tea']){
  const id='ic_'+'a'.repeat(40),campaign=brand==='yeongnyangi'?'insight_yeongnyangi':'insight_ggulggul';
  const dom=boot('https://code-destiny.com'+insightPath(id,brand,'copy'),{consent:'accepted'}),w=dom.window;
  w.cdTrack('insight_share_receive',{service:brand==='yeongnyangi'?'yeongnyangi':'ggulggul'});
  w.history.replaceState({},'','/yeongnyangi/fortune/');
  w.cdTrackConfirmedPurchase({payment:{merchantUid:'mock-insight',paymentAmount:1000,status:'paid'}});
  assert.equal(w.dataLayer.find(row=>row[1]==='purchase')[2].share_campaign,campaign);
  assert.equal(JSON.stringify(w.dataLayer).includes(id),false);
  w.sessionStorage.setItem('cd:insight:campaign',JSON.stringify({value:campaign,until:Date.now()-1}));
  w.cdTrack('view_item',{item_id:'yeongnyangi-saju-mackerel'});
  assert.equal(w.dataLayer.at(-1)[2].share_campaign,undefined);
  w.sessionStorage.setItem('cd:insight:campaign',JSON.stringify({value:campaign,until:Date.now()+10000}));
  w.document.cookie='cd_cookie_consent=essential; path=/';
  w.cdTrack('view_item',{item_id:'yeongnyangi-saju-mackerel'});
  assert.equal(w.dataLayer.at(-1)[2].share_campaign,undefined);
  assert.equal(w.sessionStorage.getItem('cd:insight:campaign'),null);
  dom.window.close();
 }
});

test('without consent insight attribution is URL-local and never follows internal navigation',()=>{
 const dom=boot('https://code-destiny.com/share/?utm_medium=share&utm_campaign=insight_yeongnyangi'),w=dom.window;
 w.cdTrack('insight_share_receive',{service:'yeongnyangi'});
 assert.equal(w.dataLayer.at(-1)[2].share_campaign,'insight_yeongnyangi');
 assert.equal(w.sessionStorage.getItem('cd:insight:campaign'),null);
 w.history.replaceState({},'','/yeongnyangi/fortune/');
 w.cdTrack('view_item',{item_id:'yeongnyangi-saju-mackerel'});
 assert.equal(w.dataLayer.at(-1)[2].share_campaign,undefined);
 dom.window.close();
});

// S00 characterization: these URLs keep UTM in page_location, but the generic
// receiver currently handles only public_share/ref. S06 must update this test
// together with its agreed receipt contract; absence is a recorded gap, not a goal.
test('S00 observes current receipt coverage of real paid, daily and insight share links',async()=>{
 const {build}=await import('esbuild');
 const {insightPath}=await import('../../lib/insight-card.mjs');
 const bundle=await build({entryPoints:['app/yeongnyangi/_lib/result-share.ts'],bundle:true,write:false,platform:'browser',format:'iife',globalName:'resultShare'});
 const builder=boot();builder.window.eval(bundle.outputFiles[0].text);
 const urls=[
  [builder.window.resultShare.resultShareUrl({product:{id:'saju_mackerel'}},'image'),'yeongnyangi_result'],
  [builder.window.resultShare.resultShareUrl(undefined,'copy'),'yeongnyangi_daily'],
  ['https://code-destiny.com'+insightPath('ic_'+'b'.repeat(40),'yeongnyangi','native'),'insight_yeongnyangi'],
 ];
 builder.window.close();
 for(const [url,campaign] of urls){
  const dom=boot(url),w=dom.window;
  assert.equal(new URL(w.dataLayer.find(row=>row[0]==='config')[2].page_location).searchParams.get('utm_campaign'),campaign);
  assert.equal(w.dataLayer.filter(row=>row[1]==='share_receive').length,0);
  // InsightCardClient emits its own receipt only after loading a valid card.
  assert.equal(w.dataLayer.filter(row=>row[1]==='insight_share_receive').length,0);
  dom.window.close();
 }
 const publicLink=boot('https://code-destiny.com/features/saju/?utm_medium=share&utm_campaign=public_share&utm_source=copy');
 publicLink.window.eval(source);
 assert.equal(publicLink.window.dataLayer.filter(row=>row[1]==='share_receive').length,1);
 publicLink.window.close();
});
