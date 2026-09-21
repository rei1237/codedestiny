import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {DAILY_MEANINGS,kstDay,newDailyReading,restoreDailyReading,pickDailyCard,revealDailyCard,dailySharePath,sharedDailyCards} from '../../lib/tarot/daily-three.mjs';
import {TAROT_CARDS,buildImageCandidates} from '../../lib/tarot/tarot-cards.mjs';

test('KST boundary and saved incomplete reading keep the original day',()=>{
 assert.equal(kstDay(new Date('2026-09-21T14:59:59Z')),'2026-09-21');
 assert.equal(kstDay(new Date('2026-09-21T15:00:00Z')),'2026-09-22');
 let row=newDailyReading('2026-09-21',()=>.4);
 row=pickDailyCard(row,5);
 assert.deepEqual(restoreDailyReading(JSON.stringify(row)),row);
 assert.equal(restoreDailyReading(JSON.stringify(row)).date,'2026-09-21');
});
test('three unique choices; reveal only after selection; replay cannot add a fourth',()=>{
 let row=newDailyReading('2026-09-21',()=>.5);
 assert.equal(new Set(row.deck).size,22);
 assert.equal(revealDailyCard(row),row);
 row=pickDailyCard(row,1);assert.equal(pickDailyCard(row,1),row);
 row=pickDailyCard(pickDailyCard(row,2),3);
 assert.equal(pickDailyCard(row,4),row);
 for(let i=0;i<3;i++)row=revealDailyCard(row);
 assert.equal(row.revealed,3);assert.equal(revealDailyCard(row),row);
 const url=new URL(dailySharePath(row),'https://code-destiny.com');
 assert.deepEqual(sharedDailyCards(url.searchParams.get('daily_cards')),row.picks.map(slot=>row.deck[slot]));
 assert.deepEqual([...url.searchParams.keys()],['daily_cards','from']);
});
test('invalid storage and untrusted share values are rejected',()=>{
 for(const raw of ['',null,'{','{}',JSON.stringify({...newDailyReading('2026-09-21'),picks:[0,0]}),JSON.stringify({...newDailyReading('2026-09-21'),revealed:3})])assert.equal(restoreDailyReading(raw),null);
 for(const input of ['1.1.2','22.2.3','-1.2.3','1.2.3<script>','1.2'])assert.equal(sharedDailyCards(input),null);
});
test('22 existing major cards have images and three dedicated non-empty readings',()=>{
 const majors=TAROT_CARDS.filter(card=>card.arcana==='major');
 assert.equal(majors.length,22);assert.equal(DAILY_MEANINGS.length,22);
 for(const [index,card] of majors.entries()){
  assert.equal(card.code,'M'+String(index).padStart(2,'0'));
  assert.ok(existsSync(new URL('../../public'+buildImageCandidates(card.code)[0],import.meta.url)));
  assert.equal(DAILY_MEANINGS[index].length,3);
  assert.equal(new Set(DAILY_MEANINGS[index]).size,3);
  assert.ok(DAILY_MEANINGS[index].every(text=>text.length>=25));
 }
});
test('daily client does not import paid Mind Scan or generation transport',()=>{
 const source=readFileSync(new URL('../../app/today/DailyTarot.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(source,/useCoinGate|usePaidResume|continueOracleDelivery|fortuneApi|authFetch|fetch\(/);
 assert.match(source,/TarotCardBack/);
 assert.match(source,/catch\{setStorageOk\(false\)/);
});
