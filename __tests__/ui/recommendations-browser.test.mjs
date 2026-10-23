import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsAllowed, observeRecommendationProducts, observeRecommendation, recommendationQuery, recommendationReturnPath, trackRecommendation } from '../../js/recommendations-browser.mjs';

function setGlobal(t, key, value) { const old = Object.getOwnPropertyDescriptor(globalThis, key); Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}); t.after(()=>{if(old)Object.defineProperty(globalThis,key,old);else delete globalThis[key];}); }

test('public release lock creates no analytics request even if called', () => {
  assert.doesNotThrow(() => trackRecommendation('click', { service:'legacy-saju' }, 'result', 'fixture'));
});
test('only existing affirmative cookie consent permits analytics', t => {
  setGlobal(t, 'window', { CodeDestinyCookiePolicy: { getConsent: () => 'accepted' } });
  assert.equal(analyticsAllowed(), true);
  window.CodeDestinyCookiePolicy.getConsent = () => 'rejected';
  assert.equal(analyticsAllowed(), false);
});
test('query projection drops counselling, identity and report data', () => {
  const query = recommendationQuery({service:'legacy-saju',interests:['journaling'],reportId:'private-report',question:'secret',name:'private-name',url:'https://evil.invalid'});
  assert.equal(query,'service=legacy-saju&source=result&currency=KRW&interest=journaling');
});
test('return state is same-origin, short-lived and never accepted as external navigation', t => {
  let saved;
  setGlobal(t, 'location', {origin:'https://code-destiny.com'});
  setGlobal(t, 'sessionStorage', {getItem:()=>JSON.stringify(saved)});
  for (const path of ['https://evil.invalid','//evil.invalid','/\\evil.invalid','/admin/login','/checkout','/api/billing','/recommendations/']) {
    saved={path,at:Date.now()}; assert.equal(recommendationReturnPath(),'/ggulggul/');
  }
  saved={path:'/yeongnyangi/',at:Date.now()-3600001}; assert.equal(recommendationReturnPath(),'/ggulggul/');
  saved={path:'/yeongnyangi/',at:Date.now()}; assert.equal(recommendationReturnPath(),'/yeongnyangi/');
});
test('impression waits for half-visible one second and counts once, without navigation', t => {
  let intersection, fire, cleared=0, count=0, visibility, disconnected=false;
  setGlobal(t,'document',{visibilityState:'visible',addEventListener:(_name,fn)=>{visibility=fn;},removeEventListener:()=>{}});
  setGlobal(t,'IntersectionObserver',class {constructor(fn){intersection=fn;}observe(){}disconnect(){disconnected=true;}});
  t.mock.method(globalThis,'setTimeout',(fn,ms)=>{assert.equal(ms,1000);fire=fn;return 1;});
  t.mock.method(globalThis,'clearTimeout',()=>{cleared++;fire=null;});
  const cleanup=observeRecommendation({},()=>count++);
  intersection([{intersectionRatio:0.49}]); assert.equal(fire,null);
  intersection([{intersectionRatio:0.5}]); assert.equal(typeof fire,'function');
  document.visibilityState='hidden';visibility();assert.equal(fire,null);
  document.visibilityState='visible';visibility();fire();
  intersection([{intersectionRatio:1}]);assert.equal(fire,null);assert.equal(count,1);
  cleanup();assert.equal(disconnected,true);assert.ok(cleared>0);
});

test('product observers count only visible cards and retain deduplication across refresh/filter remounts', t => {
  const watchers = [], timers = new Map(), events = [], seen = new Set();
  let sequence = 0;
  setGlobal(t, 'document', { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} });
  setGlobal(t, 'IntersectionObserver', class {
    constructor(fn) { this.fn = fn; watchers.push(this); }
    observe(node) { this.node = node; }
    disconnect() { this.disconnected = true; }
  });
  t.mock.method(globalThis, 'setTimeout', fn => { timers.set(++sequence, fn); return sequence; });
  t.mock.method(globalThis, 'clearTimeout', id => timers.delete(id));
  const card = id => ({ dataset: { recommendationProduct: id }, isConnected: true });
  let nodes = [card('book-a'), card('book-b')];
  const host = { querySelectorAll: selector => { assert.equal(selector, '[data-recommendation-product]'); return nodes; } };
  const tick = () => { const tasks = [...timers.values()]; timers.clear(); tasks.forEach(fn => fn()); };
  let cleanup = observeRecommendationProducts(host, seen, id => events.push(id));
  watchers[0].fn([{ intersectionRatio: 0.5 }]);
  watchers[1].fn([{ intersectionRatio: 0.49 }]);
  tick(); assert.deepEqual(events, ['book-a']);
  watchers[1].fn([{ intersectionRatio: 0.9 }]);
  cleanup(); tick(); assert.deepEqual(events, ['book-a']);
  assert.ok(watchers.every(w => w.disconnected));
  nodes = [card('book-a'), card('book-b'), card('book-c')];
  cleanup = observeRecommendationProducts(host, seen, id => events.push(id));
  assert.equal(watchers.length, 4); // Already-counted A has no new observer.
  watchers[2].fn([{ intersectionRatio: 1 }]);
  watchers[3].fn([{ intersectionRatio: 1 }]);
  nodes[2].isConnected = false;
  tick(); assert.deepEqual(events, ['book-a', 'book-b']);
  cleanup();
});

test('transport sends a product impression and keeps cookies and referer out', async t => {
  const sent = [];
  setGlobal(t, 'window', { CodeDestinyCookiePolicy: { getConsent: () => 'accepted' } });
  setGlobal(t, 'location', { hostname: 'code-destiny.com' });
  setGlobal(t, 'navigator', { webdriver: false });
  setGlobal(t, 'fetch', async (...args) => { sent.push(args); });
  trackRecommendation('impression', { service: 'legacy-saju' }, 'result', 'book-a');
  trackRecommendation('impression', { service: 'legacy-saju' }, 'result');
  assert.equal(sent.length, 1);
  assert.equal(JSON.parse(sent[0][1].body).productId, 'book-a');
  assert.equal(sent[0][1].credentials, 'omit');
  assert.equal(sent[0][1].referrerPolicy, 'no-referrer');
});
