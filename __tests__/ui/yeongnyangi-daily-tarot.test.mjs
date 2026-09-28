import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import '../../scripts/lib/mock-network-guard.cjs';

const built=await build({stdin:{contents:"export * from './lib/tarot/yeongnyangi-daily-card'; export {ganji} from './lib/korean-calendar/ganji.js';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
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

test('room component is local-only and keeps the existing free and paid destinations',async()=>{
 const source=await (await import('node:fs/promises')).readFile('app/yeongnyangi/_components/DailyTarotCard.tsx','utf8');
 assert(!/fortuneApi|fetch\(|axios|caretaro|DestinyCafe/.test(source));
 assert.match(source,/href="#daily"/);
 assert.match(source,/href="\/yeongnyangi\/fortune\/"/);
 assert.match(source,/crypto\.getRandomValues/);
});
