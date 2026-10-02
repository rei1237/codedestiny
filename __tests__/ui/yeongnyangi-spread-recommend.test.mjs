import assert from 'node:assert/strict';
import test from 'node:test';
import {recommendTarotSpread,questionFeatures,tarotQuestionPresets} from '../../lib/tarot/yeongnyangi-spread-recommend.mjs';
import {getYeongnyangiSpread,tierAllowsSpread} from '../../lib/tarot/yeongnyangi-spread-catalog.mjs';

test('waiting for their contact and deciding to contact first get different spreads',()=>{
 const wait=recommendTarotSpread({question:'그 사람이 먼저 연락할까?'});
 const act=recommendTarotSpread({question:'내가 먼저 연락해도 될까?'});
 assert.notEqual(wait.primary,act.primary);
 assert.equal(act.primary,'yn_contact_first');
 assert.equal(recommendTarotSpread({question:'그 사람이 연락할까?'}).primary,'yn_crossed_six');
 assert.notEqual(wait.reason,act.reason);
});

test('job change compares stay and leave symmetrically; below flounder the A/B spread is preselected',()=>{
 const full=recommendTarotSpread({question:'지금 회사에 남을까, 이직할까?',tier:'tuna'});
 assert.equal(full.primary,'yn_stay_leave_nine');
 assert.equal(full.bestInTier,'yn_stay_leave_nine');
 const salmon=recommendTarotSpread({question:'지금 회사에 남을까, 이직할까?',tier:'salmon'});
 assert.equal(salmon.primary,'yn_stay_leave_nine');
 assert.equal(salmon.fitsTier,false);
 assert.equal(salmon.bestInTier,'yn_ab_seven');
 assert.match(salmon.tierNote,/9장이라 광어 이상/);
 for(const id of salmon.alternatives)assert.ok(tierAllowsSpread('salmon',getYeongnyangiSpread(id)),id);
});

test('a stated period leads to the month compass; explicit options lead to A/B',()=>{
 assert.equal(recommendTarotSpread({question:'앞으로 한 달 동안 뭘 조심해야 할까?'}).primary,'yn_month_compass_six');
 assert.equal(recommendTarotSpread({question:'요즘 뭘 조심해야 할까?',period:'month'}).primary,'yn_month_compass_six');
 assert.equal(recommendTarotSpread({question:'두 학원 중에 어디로 갈지',options:{a:'강남',b:'분당'}}).primary,'yn_ab_seven');
 assert.equal(questionFeatures({question:'A와 B 중에 뭘 고를까'}).hasOptions,true);
});

test('every preset maps to a catalog spread with a one-sentence reason and at most two alternatives',()=>{
 assert.equal(tarotQuestionPresets.length,9);
 const primaries=new Set();
 for(const p of tarotQuestionPresets){
  const r=recommendTarotSpread({presetId:p.id});
  assert.ok(getYeongnyangiSpread(r.primary),p.id);
  primaries.add(r.primary);
  assert.ok(r.alternatives.length<=2&&!r.alternatives.includes(r.primary),p.id);
  for(const id of r.alternatives)assert.ok(getYeongnyangiSpread(id),`${p.id}:${id}`);
  assert.ok(r.reason.length>10&&r.reason.length<120,p.id);
  assert.equal((r.reason.match(/[.!?]/g)||[]).length<=2,true,p.id);
 }
 assert.ok(primaries.size>=8,'presets should not collapse onto a few spreads');
 // Presets fit the cheapest tier or name an in-tier fallback.
 for(const p of tarotQuestionPresets){
  const r=recommendTarotSpread({presetId:p.id,tier:'mackerel'});
  assert.ok(tierAllowsSpread('mackerel',getYeongnyangiSpread(r.bestInTier)),p.id);
 }
});

test('the same input always gives the same recommendation',()=>{
 const input={question:'다시 만나면 또 같은 이유로 헤어질까 봐 걱정돼',tier:'flounder'};
 const first=JSON.stringify(recommendTarotSpread(input));
 for(let i=0;i<20;i++)assert.equal(JSON.stringify(recommendTarotSpread(input)),first);
 assert.equal(recommendTarotSpread(input).primary,'yn_reunion_seven');
});

test('an unclassified question falls back to the three-card knot',()=>{
 const r=recommendTarotSpread({question:'요즘 마음이 복잡해'});
 assert.equal(r.primary,'yn_knot_three');
 assert.equal(recommendTarotSpread({}).primary,'yn_knot_three');
});
