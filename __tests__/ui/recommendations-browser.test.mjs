import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsAllowed, observeRecommendation, recommendationQuery, recommendationReturnPath, trackRecommendation } from '../../js/recommendations-browser.mjs';

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
