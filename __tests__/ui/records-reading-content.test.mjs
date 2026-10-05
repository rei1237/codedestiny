import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { READING_SOURCES, READING_FEATURES, readingView } from '../../lib/records/reading-registry.js';
import { RECORD_SERVICES, SAVED_FEATURES } from '../../lib/records/service-registry.js';
import { readingSections, savedReadingModel } from '../../lib/records/reading-content.js';
import { sharedFeatureFixtures, finalBody } from '../fixtures/records-reading-fixtures.mjs';
test('every storage adapter and product has a display route with a real origin',()=>{
 assert.deepEqual(Object.keys(READING_SOURCES).sort(),RECORD_SERVICES.map(s=>s.id).sort());
 assert.deepEqual(Object.keys(READING_FEATURES).sort(),Object.keys(SAVED_FEATURES).sort());
 assert.deepEqual(Object.keys(sharedFeatureFixtures).sort(),Object.keys(SAVED_FEATURES).sort());
 for(const view of [...Object.values(READING_SOURCES),...Object.values(READING_FEATURES)]) assert.ok(fs.existsSync(view.entry),view.entry);
});
test('legacy chapters, JSON messages and final sections survive without exposing metadata',()=>{
 const snapshot={id:'private-id',userId:'private-owner',provider:'secret-provider',metadata:{private:'never display'},chapters:[{title:'첫 장',body:'첫 본문'},{title:'마지막 장',body:'끝 본문'}],messages:[{role:'assistant',content:JSON.stringify({sections:{unknownSection:{title:'과거 챕터',body:'과거 본문'}}})}]};
 const result=readingSections(snapshot);
 assert.deepEqual(result.map(s=>s.body),['첫 본문','끝 본문','과거 본문']);
 assert.equal(result.at(-1).title,'과거 챕터');
 assert.ok(!JSON.stringify(result).includes('private'));
});
test('stored sections never truncate long chapters or invent an empty result',()=>{
 const body='저장된 본문 '.repeat(10000);
 assert.equal(readingSections({chapters:[{title:'긴 장',body}]})[0].body,body);
 assert.deepEqual(readingSections({status:'completed',userId:'owner',generationProgress:{percent:100}}),[]);
});
test('shared product prose remains available through old and current payloads',()=>{
 for(const [id,fixture] of Object.entries(sharedFeatureFixtures)){
  const value=id==='dream-psycho-analysis'?fixture.record.markdown:fixture;
  const sections=readingSections(value,{fields:readingView('executions',id).fields});
  assert.ok(sections.some(s=>s.body.includes(finalBody)),id);
 }
});
test('unknown machine part keys use display headings, not raw identifiers',()=>{
 const result=readingSections({parts:{saJu_part_v7:'저장된 본문'},sections:{group_0:{body:'마지막'}}});
 assert.deepEqual(result.map(s=>s.body),['저장된 본문','마지막']);
 assert.ok(result.every(s=>!/saJu_part_v7|group_0/.test(s.title)));
});


test('shared storage envelopes preserve product structure and adjacent cards',()=>{
 for(const fixture of Object.values(sharedFeatureFixtures)) {
  for(const key of ['report','result','sajuAi']) assert.deepEqual(savedReadingModel({[key]:fixture}),savedReadingModel(fixture));
 }
 assert.deepEqual(savedReadingModel({cards:['saved'],result:{report:{sections:[{title:'last',body:finalBody}]}}}),{cards:['saved'],sections:[{title:'last',body:finalBody}]});
 assert.equal(savedReadingModel('과거 작명 본문'),'과거 작명 본문');
});
