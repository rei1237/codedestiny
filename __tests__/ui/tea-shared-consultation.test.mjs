import '../../scripts/lib/mock-network-guard.cjs';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {buildFortuneTeaSajuSnapshot} from '../../lib/fortune-tea-house/saju-result-adapter.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { commitDeck, selectDeckSlots } from '../../lib/tarot/committed-deck.mjs';
import { prepareTeaDraw, confirmTeaDraw, readTeaDraw } from '../../worker/lib/tea-tarot-draw.js';
import { calculateNatalSaju } from '../../lib/korean-calendar/index.js';
import { teaSajuProfile, canonicalTeaSaju } from '../../worker/lib/tea-saju-facts.js';
import { relationFromForwardDistance } from '../../worker/lib/sukuyo-relation-core.js';
const require=createRequire(import.meta.url),Module=require('node:module');
const built=await build({stdin:{contents:"export {calculateScreenSaju} from './worker/yeongnyangi/fortune/saju/runtime';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const loaded=new Module(path.resolve('tea-parity-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,loaded.id);
const {calculateScreenSaju}=loaded.exports;
function collection() {
 const rows=new Map();
 return {async findOne(q){const v=rows.get(q._id);return v&&v.owner===q.owner?structuredClone(v):null;},
 async updateOne(q,u){let v=rows.get(q._id);if(!v&&u.$setOnInsert){rows.set(q._id,structuredClone(u.$setOnInsert));return;}
 if(v&&(!q.status||v.status===q.status))Object.assign(v,structuredClone(u.$set));}};
}
const input={attemptId:'attempt-test-123',question:'지금 무엇을 먼저 할까요?',tarotSpreadId:'yn_knot_three',tarotSpread:'three',selectedTeaCupId:'lotus-moon',concernTopic:'연애 · 재회'};
test('the shared deck contains 78 unique cards; directions and selected slots are immutable data',()=>{
 const d=commitDeck();assert.equal(d.order.length,78);assert.equal(new Set(d.order).size,78);assert.equal(d.reversed.length,78);
 for(let i=0;i<30;i++){const p=selectDeckSlots({auto:true},5);assert.equal(new Set(p.picks).size,5);}
 assert.throws(()=>selectDeckSlots({picks:[0,0,1]},3));
 assert.throws(()=>selectDeckSlots({picks:[0,1,78]},3));
});
test('prepare/reload, concurrent draw and payment resume preserve the first saved draw',async()=>{
 const c=collection();const a=await prepareTeaDraw(c,'owner',input);assert.equal(a.status,'awaiting_draw');assert.equal(a.deck,undefined);
 const again=await prepareTeaDraw(c,'owner',input);assert.equal(again.attemptId,a.attemptId);
 const [one,two]=await Promise.all([confirmTeaDraw(c,'owner',{...input,picks:[0,1,2]}),confirmTeaDraw(c,'owner',{...input,picks:[5,6,7]})]);
 assert.deepEqual(one.cards,two.cards);assert.equal(new Set(one.cards.map(c=>c.cardId)).size,3);
 const restored=await readTeaDraw(c,'owner',input);assert.deepEqual(restored.cards,one.cards);
 const reload=await prepareTeaDraw(c,'owner',input);assert.deepEqual(reload.cards,one.cards);assert.equal(reload.deck,undefined);
 await assert.rejects(()=>readTeaDraw(c,'other',input),/TAROT_DRAW_REQUIRED/);
 await assert.rejects(()=>prepareTeaDraw(c,'owner',{...input,question:'다른 질문입니다'}),/TAROT_DRAFT_CHANGED/);
 await assert.rejects(()=>readTeaDraw(c,'owner',{...input,tarotSpread:'five'}),/TAROT_PRODUCT_MISMATCH/);
});
for(const row of [
 {birthDate:'1988-01-07',birthTime:'23:26'},
 {birthDate:'1990-02-04',birthTime:'10:00'},
 {birthDate:'1990-02-04',birthTime:'23:59'},
 {birthDate:'1990-02-05',birthTime:'00:00'},
 {birthDate:'1990-05-15',birthTimeUnknown:true},
 {birthDate:'2023-02-01',calendarType:'lunar',isLeapMonth:true,birthTime:'12:00'},
 {birthDate:'1988-07-15',birthTime:'12:00'},
 {birthDate:'2000-01-01',birthTime:'12:00',timezone:'America/New_York',longitude:-74.006},
]) test('Tea House agrees with Yeongnyangi canonical natal policy: '+JSON.stringify(row),()=>{
 const input={gender:'female',calendarType:'solar',timezone:'Asia/Seoul',longitude:126.978,...row};
 const canonical=calculateNatalSaju({...input,birthPlace:{timezone:input.timezone,longitude:input.longitude}});
 const tea=teaSajuProfile(input);
 const yeongnyangi=calculateScreenSaju({...input,birthPlace:{timezone:input.timezone,longitude:input.longitude}},new Date('2026-10-04T00:00:00Z'));
 const browser=buildFortuneTeaSajuSnapshot(input);
 for(const key of ['year','month','day','hour']){
 assert.equal(browser.pillars[key]||null,canonical.pillars[key]);
 assert.equal(yeongnyangi.pillarDetails[key]?.pillar||null,canonical.pillars[key]);
 }
 assert.ok(tea.calculationMeta.policyVersion);
 for(const key of ['engineVersion','policyVersion','tableFingerprint','civil','instant','termClock','corrected','correction','nightZiPolicy','timeUnknown','dayPillarCivilDate']) assert.deepEqual(tea.calculationMeta[key],yeongnyangi.calculationMeta[key],key);
 assert.equal(tea.calculationMeta.location.longitude,yeongnyangi.calculationMeta.location.longitude);
 assert.equal(tea.calculationMeta.location.timezone,yeongnyangi.calculationMeta.location.timezone);
 for(const key of ['year','month','day','hour'])assert.equal(key==='hour'&&!tea.calendar.includeHour?null:tea.pillars[key]?.ganji,canonical.pillars[key]);
 const rendered=canonicalTeaSaju(input,{pillars:[{ganji:'위조'}]});assert.equal(rendered.pillars[2].ganji,canonical.pillars.day);
 assert.ok(rendered.daewoon.every(r=>r.endYear>=r.startYear));
});
test('all 27 directional relations swap roles when the people are reversed',()=>{
 for(let d=0;d<27;d++){const a=relationFromForwardDistance(d),b=relationFromForwardDistance((27-d)%27);assert.equal(a.relationType,b.relationType);assert.equal(a.aRole,b.bRole);assert.equal(a.bRole,b.aRole);}
});

// 宿曜經 T1299, 三九祕宿品 (CBETA T21n1299_p0391b12; p0397c07-c10).
// This verifies the relative-position vocabulary, not astronomical/lunar-calendar equivalence.
test('Sukuyo three-nine primary-source roles at fixed forward distances',()=>{
 const expected=['명','영','쇠','안','위','성','괴','우','친','업','영','쇠','안','위','성','괴','우','친','태','영','쇠','안','위','성','괴','우','친'];
 expected.forEach((role,d)=>assert.equal(relationFromForwardDistance(d).bRole,role));
});
