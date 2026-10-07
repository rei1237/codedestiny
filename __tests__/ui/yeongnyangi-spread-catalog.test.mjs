import assert from 'node:assert/strict';
import test from 'node:test';
import {
 yeongnyangiSpreads,getYeongnyangiSpread,validateSpread,spreadSnapshot,minTierFor,tierAllowsSpread,TAROT_TIER_CARD_CAP,
} from '../../lib/tarot/yeongnyangi-spread-catalog.mjs';

test('every spread has exactly as many positions, slots and orders as cards',()=>{
 assert.equal(yeongnyangiSpreads.length,21);
 for(const s of yeongnyangiSpreads){
  assert.deepEqual(validateSpread(s),[],s.id);
  assert.equal(s.positions.length,s.cardCount,s.id);
  assert.equal(s.layout.slots.length,s.cardCount,s.id);
 }
});

test('maps keep their shape on every width: orbit centred, celtic staff upright',()=>{
 const at=(id,slotId)=>getYeongnyangiSpread(id).layout.slots.find(slot=>slot.id===slotId);
 for(const view of ['desktop','mobile']){
  assert.deepEqual(at('yn_whole_map_ten','now')[view],{col:2,row:2},'orbit centre');
  assert.deepEqual(['self','environment','hopes_fears','outcome'].map(id=>at('trad_celtic_cross_ten',id)[view]),
   [{col:4,row:4},{col:4,row:3},{col:4,row:2},{col:4,row:1}],'celtic staff reads bottom to top in one column');
 }
});

test('the requested card counts are kept exactly',()=>{
 const expected={yn_one_word:1,yn_knot_three:3,yn_contact_first:5,yn_crossed_six:6,yn_reunion_seven:7,yn_new_bond_five:5,yn_deepen_seven:7,
  yn_ab_seven:7,yn_stay_leave_nine:9,yn_work_block_six:6,yn_money_pattern_five:5,yn_offer_six:6,yn_repeat_pattern_six:6,yn_recovery_four:4,
  yn_month_compass_six:6,yn_whole_map_ten:10,trad_past_present_future:3,trad_horseshoe_seven:7,trad_celtic_cross_ten:10,yn_money_flow_seven:7,yn_money_map_ten:10};
 assert.deepEqual(Object.fromEntries(yeongnyangiSpreads.map(s=>[s.id,s.cardCount])),expected);
});

test('no two positions in a spread share a label or a question',()=>{
 for(const s of yeongnyangiSpreads){
  assert.equal(new Set(s.positions.map(p=>p.label)).size,s.cardCount,s.id);
  assert.equal(new Set(s.positions.map(p=>p.question)).size,s.cardCount,s.id);
 }
});

test('A/B comparisons are symmetric: same number of positions per side and a compare link for each pair',()=>{
 for(const id of ['yn_ab_seven','yn_stay_leave_nine']){
  const s=getYeongnyangiSpread(id),{a,b}=s.symmetry;
  assert.equal(a.length,b.length);
  a.forEach((left,i)=>{
   const right=b[i];
   assert.ok(s.links.some(l=>l.relation==='compare'&&l.ids.includes(left)&&l.ids.includes(right)),`${id} ${left}/${right}`);
   // Same role shape on both sides: opportunity/opportunity, burden/burden — never pros on one side only.
   assert.equal(left.replace(/^(a|stay)_/,''),right.replace(/^(b|leave)_/,''));
  });
 }
});

test('tier caps follow the product decision',()=>{
 assert.deepEqual(TAROT_TIER_CARD_CAP,{mackerel:5,salmon:7,flounder:9,tuna:10});
 assert.equal(minTierFor(5),'mackerel');assert.equal(minTierFor(6),'salmon');assert.equal(minTierFor(9),'flounder');assert.equal(minTierFor(10),'tuna');
 assert.equal(tierAllowsSpread('mackerel',getYeongnyangiSpread('yn_stay_leave_nine')),false);
 assert.equal(tierAllowsSpread('flounder',getYeongnyangiSpread('yn_stay_leave_nine')),true);
});

test('user-facing labels and questions never claim the other person’s mind, odds or dates',()=>{
 const forbidden=/속마음|진심|확률|몇 ?%|며칠|언제 연락|연애 의지/;
 for(const s of yeongnyangiSpreads)for(const p of s.positions)assert.doesNotMatch(`${p.label} ${p.question}`,forbidden,`${s.id}.${p.id}`);
});

test('the overview map is not called Celtic Cross; traditional spreads document the fixed variant',()=>{
 assert.doesNotMatch(getYeongnyangiSpread('yn_whole_map_ten').title,/켈틱|Celtic/i);
 for(const s of yeongnyangiSpreads.filter(s=>s.source.kind==='traditional'))assert.ok(s.source.note.length>20,s.id);
 assert.deepEqual(getYeongnyangiSpread('trad_celtic_cross_ten').positions.map(p=>p.id),
  ['present','crossing','crown','foundation','recent_past','near_future','self','environment','hopes_fears','outcome']);
});

test('catalog is frozen and snapshots are independent copies',()=>{
 const s=getYeongnyangiSpread('yn_knot_three');
 assert.throws(()=>{s.positions[0].label='x';});
 const copy=spreadSnapshot(s);copy.positions[0].label='changed';
 assert.equal(getYeongnyangiSpread('yn_knot_three').positions[0].label,'현재의 매듭');
 assert.equal(getYeongnyangiSpread('unknown'),undefined);
});
