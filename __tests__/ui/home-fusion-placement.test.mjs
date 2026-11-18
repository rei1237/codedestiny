import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {fileURLToPath} from 'node:url';
import {createAssetCacheKeys} from '../../scripts/lib/asset-cache-keys.mjs';
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
 const source=image.parentElement.querySelector('source');
 assert.equal(image.parentElement.tagName,'PICTURE');
 assert.equal(source.getAttribute('media'),'(min-width: 700px)');
 assert.equal(source.getAttribute('srcset'),'/images/service-introductions/fusion-fortune-masters-v3-640.webp 640w, /images/service-introductions/fusion-fortune-masters-v3-960.webp 960w');
 assert.equal(source.getAttribute('sizes'),'320px');
 assert.equal(image.hasAttribute('srcset'),false,'mobile keeps one compact asset even at high DPR');
 assert.equal(image.getAttribute('alt'),'');
 assert.equal(image.getAttribute('loading'),'lazy');
 assert.equal(image.getAttribute('decoding'),'async');
 assert.equal(image.getAttribute('width'),'320');
 assert.equal(image.getAttribute('height'),'213');
 const popup=d.querySelector('[data-signature-letter-slide][data-cd-service="fusion-fortune"] img');
 assert.ok(popup.getAttribute('srcset').includes(image.getAttribute('src')));
 assert.equal(popup.getAttribute('loading'),'lazy');
});

test('deployable shells version the picker stylesheet directly before its parent, never via a bare immutable import',()=>{
 const css=readFileSync(new URL('../../styles/home-consultation-picker.css',import.meta.url),'utf8');
 const parent=readFileSync(new URL('../../styles/concern-first-home.css',import.meta.url),'utf8');
 assert.ok(!/@import[^;]*home-consultation-picker/.test(parent));
 assert.match(css,/data-picker-fusion-featured/);
 for(const file of ['index.html','public/index.html','public/ggulggul/index.html','public/en/index.html','public/ja/index.html','public/zh/index.html','public/zh-tw/index.html']){
  const shell=readFileSync(new URL('../../'+file,import.meta.url),'utf8');
  const picker=shell.match(/<link[^>]+href="(\/styles\/home-consultation-picker\.css\?v=build-[a-f0-9]{12})"[^>]*>/);
  assert.ok(picker,file+': independently versioned picker link');
  assert.equal(picker[1],'/styles/home-consultation-picker.css?v='+createAssetCacheKeys(fileURLToPath(new URL('../../',import.meta.url))).resolve('/styles/home-consultation-picker.css','index.html').key,file+': actual content hash');
  assert.ok(shell.indexOf(picker[0])<shell.indexOf('<link rel="stylesheet" href="/styles/concern-first-home.css'),file+': preserve cascade order');
 }
 assert.equal(readFileSync(new URL('../../public/styles/home-consultation-picker.css',import.meta.url),'utf8'),css);
});
