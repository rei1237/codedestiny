import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {renderLightSajuAndMasters} from '../../lib/marketing/yehwa-home.mjs';
import {hc} from '../../lib/marketing/home-card-copy.mjs';
import {SAJU_BUNDLE_DECISION_FACTS} from '../../lib/marketing/decision-facts.mjs';
import {FREE_PROMO_FEATURED,freePromoItemHref} from '../../lib/marketing/free-promo.mjs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('supplement uses canonical price and existing free basic destinations without paid actions',()=>{
 const d=JSDOM.fragment(renderLightSajuAndMasters());
 assert.equal(d.querySelector('[data-cd-play-price]').textContent,SAJU_BUNDLE_DECISION_FACTS.priceLabel);
 assert.match(d.querySelector('.yh-light-saju').textContent,/한 번 결제로 영구 소장/);
 assert.equal(d.querySelectorAll('a').length,5);
 const links=[...d.querySelectorAll('.yh-basic-masters a')];
 for(const [i,id] of ['ziwei','sukuyo','vedic','astro'].entries()){
  const item=FREE_PROMO_FEATURED.find(x=>x.id===id);
  assert.equal(links[i].getAttribute('href'),freePromoItemHref(item));
  assert.equal(links[i].dataset.action,item.action);
  assert.ok(links[i].textContent.includes(hc('homeCards.'+id+'.look'))&&links[i].textContent.includes(hc('homeCards.'+id+'.get')));
 }
 assert.equal(d.querySelectorAll('.yh-light-saju__facts li').length,3);
 assert.equal(d.querySelector('.yh-light-saju__price [data-cd-play-price]').textContent,SAJU_BUNDLE_DECISION_FACTS.priceLabel);
 assert.equal(d.querySelector('[data-cd-light-saju-details] [data-cd-play-price]'),null,'price lives in its own area, not the button');
 assert.ok(d.querySelector('.yh-basic-masters__note').textContent.includes('유료'));
 assert.equal(d.querySelector('[data-action="unlockPremiumFeature"]'),null);
 assert.equal(d.querySelector('[href*="checkout"]'),null);
});
for(const owned of [false,true]) test('home Light Saju '+(owned?'reopens original result':'opens details only')+' without payment/network',()=>{
 const dom=new JSDOM('<html lang="ko"><body>'+renderLightSajuAndMasters()+'</body></html>',{url:'https://code-destiny.com/ggulggul/',runScripts:'outside-only'});
 const w=dom.window; let entries=0; let calls=0;
 w.isTileKeyUnlocked=key=>owned&&key==='saju_lifetime_bundle';
 w.cdBirthScopeCurrentProfileId=()=> 'mock-profile';
 w.cdOneStepFreeSajuEntry=()=>{entries++};
 w.fetch=()=>{calls++;throw Error('network forbidden')}; w.unlockPremiumFeature=()=>{calls++;throw Error('checkout forbidden')};
 w.eval(read('js/core/saju/bundle-offer.js'));
 w.document.querySelector('[data-cd-light-saju-details] span').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
 assert.equal(entries,owned?1:0); assert.equal(calls,0);
 const panel=w.document.getElementById('cdBundleOffer');
 if(owned) assert.equal(panel,null); else {assert.equal(panel.hidden,false);assert.match(panel.textContent,/라이트 사주 풀이/);assert.equal(panel.dataset.source,'home-light-saju'); w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true})); assert.equal(panel.hidden,true); assert.equal(w.document.activeElement,w.document.querySelector('[data-cd-light-saju-details]'));}
 dom.window.close();
});
test('generated shell preserves original cards then adds supplement before promo',()=>{
 const s=read('index.html');assert.ok(s.indexOf('class="yh-situations"')<s.indexOf('class="yh-supplement"'));assert.ok(s.indexOf('class="yh-supplement"')<s.indexOf('class="cdh-promo"'));
});
