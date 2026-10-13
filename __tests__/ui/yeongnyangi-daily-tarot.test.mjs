import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import '../../scripts/lib/mock-network-guard.cjs';

const built=await build({stdin:{contents:"export * from './lib/tarot/yeongnyangi-daily-card'; export * from './lib/tarot/yeongnyangi-daily-synthesis'; export {ganji} from './lib/korean-calendar/ganji.js';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
const subject=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

test('same KST day and device keep one card while another day recalculates',()=>{
 const first=subject.dailyTarotReading('2026-09-28','device-a');
 assert.deepEqual(subject.dailyTarotReading('2026-09-28','device-a'),first);
 assert.notDeepEqual(subject.dailyTarotReading('2026-09-29','device-a'),first);
 assert.equal(subject.kstDateKey(new Date('2026-09-27T15:30:00Z')),'2026-09-28');
});

test('10,000 deterministic samples cover all 22 cards and both orientations without a missing bucket',()=>{
 const buckets=new Map();
 for(let index=0;index<10000;index++){
  const result=subject.dailyTarotReading('2026-09-28',`device-${index}`),key=`${result.cardCode}:${result.orientation}`;
  buckets.set(key,(buckets.get(key)||0)+1);
 }
 assert.equal(buckets.size,44);
 const counts=[...buckets.values()];
 assert(Math.max(...counts)/Math.min(...counts)<1.8);
});

test('day pillar and 22-card mapping stay complete and use the canonical ganji formula',()=>{
 assert.equal(subject.dailyTarotData.length,22);
 assert.equal(new Set(subject.dailyTarotData.map(row=>row.cardCode)).size,22);
 for(const dateKey of ['2024-02-29','2026-09-28','2030-01-01']){
  const [year,month,day]=dateKey.split('-').map(Number),canonical=subject.ganji({year,month,day,hour:12,minute:0});
  const result=subject.dailyTarotReading(dateKey,'fixture');
  assert.equal(result.dayPillar,['갑','을','병','정','무','기','경','신','임','계'][canonical.day.stemIndex]+'일');
  for(const field of ['cardCode','cardName','orientationLabel','message','reading','advice'])assert(result[field]);
  for(const field of ['color','number','direction','item','mission'])assert(result.luck[field]);
 }
});

test('room component reuses the attendance pass before revealing the local cards',async()=>{
 const source=await (await import('node:fs/promises')).readFile('app/yeongnyangi/_components/DailyTarotCard.tsx','utf8');
 assert.match(source,/fortuneApi<AttendanceState>\('attendance'\)/);
 assert.match(source,/cd:yeongnyangi-daily-pass/);
 assert.match(source,/pass\?\.unlocked/);
 assert(!/fetch\(|axios|caretaro|DestinyCafe/.test(source));
 assert.match(source,/href="#daily"/);
 assert.match(source,/href="\/yeongnyangi\/fortune\/"/);
 assert.match(source,/crypto\.getRandomValues/);
});

test('daily spread keeps three unique cards, order and orientations across reloads',()=>{
 for(let i=0;i<200;i++){
  const device='spread-'+i, cards=subject.dailyTarotSpread('2026-10-01',device);
  assert.equal(cards.length,3);
  assert.equal(new Set(cards.map(card=>card.cardCode)).size,3);
  assert.deepEqual(subject.dailyTarotSpread('2026-10-01',device),cards);
  assert.deepEqual(cards[0],subject.dailyTarotReading('2026-10-01',device));
 }
 assert.notDeepEqual(subject.dailyTarotSpread('2026-10-01','a'),subject.dailyTarotSpread('2026-10-02','a'));
});

test('tomorrow preserves the target-date draw through KST midnight, month and year boundaries',()=>{
 for(const [today,tomorrow] of [['2026-12-31','2027-01-01'],['2024-02-28','2024-02-29'],['2024-02-29','2024-03-01'],['2026-10-14','2026-10-15']]){
  assert.equal(subject.offsetTarotDate(today,1),tomorrow);
  assert.equal(subject.offsetTarotDate(tomorrow,-1),today);
  for(const device of ['stored-device',''])assert.deepEqual(subject.dailyTarotSpread(subject.offsetTarotDate(today,1),device),subject.dailyTarotSpread(tomorrow,device));
 }
 assert.equal(subject.kstDateKey(new Date('2026-10-14T14:59:59Z')),'2026-10-14');
 assert.equal(subject.kstDateKey(new Date('2026-10-14T15:00:00Z')),'2026-10-15');
});

test('all 22 cards and both orientations have complete, date-neutral master readings',()=>{
 const base=subject.dailyTarotSpread('2026-10-14','coverage');
 for(let index=0;index<22;index++)for(const orientation of ['upright','reversed']){
  const cards=[0,1,2].map((position)=>({...base[position],cardCode:`M${String((index+position)%22).padStart(2,'0')}`,orientation,orientationLabel:orientation==='upright'?'정방향':'역방향'}));
  const result=subject.synthesizeDailyTarot(cards);
  assert.equal(result.cards.length,3);
  assert.equal(result.story.length,4);
  for(const field of ['headline','relationship','work','mission','preparation','closing'])assert(result[field].length>15,field);
  assert(!/undefined|오늘은|내일은|십성|일간/.test(JSON.stringify(result)));
  for(const meaning of result.cards){assert(meaning.reading.length>50);assert(meaning.advice.length>10);}
 }
});

test('each card, position and orientation contributes to the synthesis',()=>{
 const cards=subject.dailyTarotSpread('2026-10-14','composition');
 const original=subject.synthesizeDailyTarot(cards);
 for(let i=0;i<3;i++){
  const changed=cards.map((card,index)=>index===i?{...card,orientation:card.orientation==='upright'?'reversed':'upright',orientationLabel:card.orientation==='upright'?'역방향':'정방향'}:card);
  assert.notDeepEqual(subject.synthesizeDailyTarot(changed).story,original.story);
 }
 assert.notDeepEqual(subject.synthesizeDailyTarot([...cards].reverse()).story,original.story);
 for(const card of cards)assert(original.story.join(' ').includes(`${card.cardName} ${card.orientationLabel}`));
 assert.throws(()=>subject.synthesizeDailyTarot(cards.slice(0,2)),/THREE_DISTINCT/);
 assert.throws(()=>subject.synthesizeDailyTarot([cards[0],cards[0],cards[1]]),/THREE_DISTINCT/);
});
