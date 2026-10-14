import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { getBillingFeaturePricing } from '../../worker/lib/billing-feature-registry.js';
const source=readFileSync(new URL('../../js/core/saju/reportDashboard.js',import.meta.url),'utf8');
test('relationship badge follows server price and self-gated products remain per-use',()=>{
 const pricing=getBillingFeaturePricing({featureKey:'relationship-boundary-test'}).pricing;
 assert.equal(pricing.amountKRW,10000);
 assert.equal(Number(source.match(/id:'relationshipTemptation'[^\n]+?coinCost:(\d+)/)[1]),pricing.cost);
 const statement=source.match(/var tilePriceText = [^\n]+/)[0];
 const badge=b=>vm.runInNewContext(statement+'; tilePriceText',{b,tileWonPrice:pricing.amountKRW.toLocaleString('ko-KR')+'원'});
 assert.equal(badge({coinCost:pricing.cost,selfGated:true}),'1회 10,000원');
 assert.equal(badge({coinCost:pricing.cost,mainLock:false}),'1회 10,000원');
 assert.equal(badge({coinCost:pricing.cost}),'🔒 10,000원 · 잠금 콘텐츠');
 assert.equal(badge({coinCost:0}),'무료');
});
