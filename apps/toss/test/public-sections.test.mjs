import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {handleSajuSection} from '../../../worker/routes/saju-section.js';
import {readTossPublicSection} from '../../../worker/toss/public-section.js';
import {TOSS_PUBLIC_SECTIONS} from '../../../lib/fortune/toss-public-sections.mjs';

const birth={date:'1990-05-15',calType:'solar',timeKnown:true,hour:14,minute:30};
const place={name:'서울',longitude:126.978,latitude:37.5665,timezone:'Asia/Seoul',baseTzOffset:9};
for(const featureKey of Object.keys(TOSS_PUBLIC_SECTIONS))test('guest section returns canonical web report '+featureKey,async t=>{
 const input={featureKey,birth,gender:'F',place,mode:'pig',lang:'ko',energy:{renderedAt:'2026-10-12T03:00:00.000Z',recent:[]}};
 t.mock.timers.enable({apis:['Date'],now:new Date(input.energy.renderedAt)});
 t.mock.method(Math,'random',()=>0.478);
 const direct=await handleSajuSection(new Request('https://example.invalid/api/saju/section',{method:'POST',body:JSON.stringify(input)}),{});
 const viaToss=await readTossPublicSection({...input,profileId:'foreign',requestId:'owned-by-another-account',userId:'ignored'},{});
 assert.equal(viaToss.status,200);
 const report=await viaToss.json();
 assert.equal(report.accessSource,'public');
 if(featureKey==='rpt_secretHouseEntryCard')assert.ok(report.house.scene.choices.length);
 else if(featureKey==='saju_natal_reading'){
   for(const name of ['ilju','ten','climate','strength','terms'])assert.match(report.parts[name],/data-natal-slot/);
   assert.match(report.parts.ten,/data-natal-god/);
 }else assert.ok(report.html.length>5000);
 assert.deepEqual(report,await direct.json());
});
test('the guest adapter cannot forward paid sections or request saved profiles',async()=>{
 for(const featureKey of ['section_summary','section_daewun','tarot-library','__proto__',undefined]){
   assert.throws(()=>readTossPublicSection({featureKey,profileId:'foreign'},{}),{code:'SECTION_NOT_PUBLIC'});
 }
 const invalid=await readTossPublicSection({featureKey:'rpt_quantumCard',profileId:'foreign'},{});
 assert.equal(invalid.ok,false);
});
