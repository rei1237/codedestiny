import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {FEATURE_KEY_PRICE_TABLE,UNLOCK_PRODUCT_BY_FEATURE_KEY} from '../../worker/lib/paid-feature-registry.js';
const source=fs.readFileSync('scripts/verify-home-service-registry.mjs','utf8');
const start=source.indexOf('const TILE_OPEN ='),end=source.indexOf('if (tileCount === 0)',start);
assert.ok(start>0&&end>start);
function verify(shell){const errors=[];vm.runInNewContext(source.slice(start,end),{shell,isFreeFortuneFeatureKey,fail:s=>errors.push(s),resolveFeature:key=>{const p=FEATURE_KEY_PRICE_TABLE[key]||UNLOCK_PRODUCT_BY_FEATURE_KEY[key];return p?{key,cost:p.cost,krw:p.amountKRW??p.cost*100}:null;}});return errors;}
const tile=(key,cost,price,label,extra='')=>`<button data-feature-key="${key}" data-coin-cost="${cost}" ${extra}><span class="tarot-tile__coin-badge" data-price-krw="${price}">${label}</span></button>`;
for(const key of ['olympus-fc','flower-fc','animal-destiny-unlock','destiny-bias-analyze'])test(key+' exact free display passes; stale paid price, missing zero, and Play bindings fail',()=>{
 const good=tile(key,0,0,'무료');assert.deepEqual(verify(good),[]);
 for(const bad of [tile(key,50,5000,'5,000원'),tile(key,0,5000,'무료'),tile(key,0,0,'무료','data-cd-play-price'),tile(key,0,0,'무료','data-tile-lock-cost="50"'),good.replace('data-price-krw="0"',''),good.replace('무료','보기')])assert.ok(verify(bad).length,bad);
});
test('paid exceptions retain exact historical prices and reject zero or altered costs',()=>{
 for(const key of ['tarot-ijik','section_summary','section_daewun','ziwei-ai-consultation']){assert.equal(isFreeFortuneFeatureKey(key),false);const p=FEATURE_KEY_PRICE_TABLE[key]||UNLOCK_PRODUCT_BY_FEATURE_KEY[key];assert.ok(p,key);const amount=p.amountKRW??p.cost*100;assert.deepEqual(verify(tile(key,p.cost,amount,amount.toLocaleString('ko-KR')+'원')),[]);assert.ok(verify(tile(key,0,0,'무료')).length);assert.ok(verify(tile(key,p.cost+1,amount,'무료')).length);}
});
test('free policy is exact and badges cannot bleed from an adjacent card',()=>{
 assert.equal(isFreeFortuneFeatureKey('flower-fc-extra'),false);assert.ok(verify(tile('flower-fc-extra',0,0,'무료')).length);
 assert.ok(verify('<button data-feature-key="flower-fc" data-coin-cost="0"></button>'+tile('olympus-fc',0,0,'무료')).length);
});
