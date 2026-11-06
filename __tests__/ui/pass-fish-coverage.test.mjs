import test from 'node:test';
import assert from 'node:assert/strict';
import {passFishCoverage,passUpgradeNameForAmount} from '../../lib/payment/pass-fish-coverage.js';
const usable=tier=>passFishCoverage(tier).fish.filter(fish=>fish.usable).map(fish=>[fish.id,fish.count]);
test('each tier reaches the fish its per-item cap covers',()=>{
 assert.deepEqual(usable('standard'),[]);
 assert.deepEqual(usable('premium'),[['mackerel',6]]);
 assert.deepEqual(usable('vvip'),[['mackerel',12],['salmon',8],['flounder',6],['tuna',4]]);
 assert.deepEqual(usable('family'),[['mackerel',35],['salmon',23],['flounder',17],['tuna',11]]);
});
test('labels say how far a tier reaches, including the Family-only sets',()=>{
 assert.equal(passFishCoverage('standard').reachLabel,'영냥이 상담은 대상이 아니에요');
 assert.equal(passFishCoverage('premium').reachLabel,'영냥이 고등어까지');
 assert.equal(passFishCoverage('vvip').reachLabel,'영냥이 참치까지');
 assert.equal(passFishCoverage('family').reachLabel,'영냥이 모둠·오마카세까지');
 assert.equal(passFishCoverage('family').fusion,true);
 assert.equal(passFishCoverage('vvip').fusion,false);
 assert.equal(passFishCoverage('vvip').countsLine,'한 생선만 쓰면 고등어 12회 · 연어 8회 · 광어 6회 · 참치 4회');
 assert.equal(passFishCoverage('standard').countsLine,'');
});
test('over-cap guidance names the first tier that covers the amount',()=>{
 assert.equal(passUpgradeNameForAmount(10000),'중간 꿀단지');
 assert.equal(passUpgradeNameForAmount(15000),'큰 꿀단지');
 assert.equal(passUpgradeNameForAmount(30000),'큰 꿀단지');
 assert.equal(passUpgradeNameForAmount(50000),'패밀리 꿀단지');
});
test('unknown tiers do not imply coverage',()=>{
 assert.deepEqual(passFishCoverage('free').fish.filter(fish=>fish.usable),[]);
});
