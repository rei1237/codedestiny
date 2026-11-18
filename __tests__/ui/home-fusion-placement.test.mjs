import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {FEATURE_KEY_PRICE_TABLE} from '../../worker/lib/paid-feature-registry.js';
const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const d=new JSDOM(html).window.document;
test('fusion lives in both existing consultation section and popup without standalone duplicate',()=>{
 const section=d.querySelector('#cdSignatureConsult');
 const popup=section.querySelector('[data-signature-letter-slide][data-cd-service="fusion-fortune"]');
 const card=section.querySelector('[data-picker-fusion-featured] [data-picker-service-id="fusion-fortune"]');
 assert.ok(popup); assert.ok(card);
 assert.equal(card.closest('article').hidden,false);
 assert.equal(section.querySelectorAll('[data-picker-service-id="fusion-fortune"]').length,1);
 assert.equal(section.querySelector('#cdSigGrid [data-picker-service-id="fusion-fortune"]'),null);
 assert.equal(card.closest('article').nextElementSibling.hasAttribute('data-picker-more'),true);
 for(const link of [popup.querySelector('.cd-consult-letter__action a'),card]){
  assert.equal(link.getAttribute('href'),'/fusion-fortune/?from=home_signature');
  assert.equal(link.dataset.featureKey,'fusion-fortune-consultation');
  assert.equal(link.dataset.pvwPaid,'true');
  assert.equal(link.hasAttribute('data-action'),false);
 }
 const price=FEATURE_KEY_PRICE_TABLE['fusion-fortune-consultation'].amountKRW.toLocaleString('ko-KR')+'원';
 assert.equal(popup.querySelector('[data-cd-play-price]').textContent,price);
 assert.equal(card.querySelector('[data-cd-play-price]').textContent,price);
 assert.equal(d.querySelectorAll('.cdh-fusion-sig').length,0);
 assert.ok(d.querySelector('#cdhFusionSignature'),'old fragment remains');
 assert.equal(d.querySelector('#cdhFusionSignatureSlot').querySelectorAll('a').length,0);
 assert.equal(d.querySelectorAll('.yh-situation').length,3);
});

test('featured fusion keeps existing lightweight decorative art without changing popup artwork',()=>{
 const card=d.querySelector('[data-picker-fusion-featured] [data-picker-service-id="fusion-fortune"]');
 const image=card.querySelector('img');
 assert.ok(image, 'Fusion illustration must survive the home generator');
 assert.equal(image.getAttribute('src'),'/images/service-introductions/fusion-fortune-masters-v3-320.webp');
 assert.equal(image.getAttribute('alt'),'');
 assert.equal(image.getAttribute('loading'),'lazy');
 assert.equal(image.getAttribute('decoding'),'async');
 assert.equal(image.getAttribute('width'),'320');
 assert.equal(image.getAttribute('height'),'213');
 const popup=d.querySelector('[data-signature-letter-slide][data-cd-service="fusion-fortune"] img');
 assert.ok(popup.getAttribute('srcset').includes(image.getAttribute('src')));
 assert.equal(popup.getAttribute('loading'),'lazy');
});
