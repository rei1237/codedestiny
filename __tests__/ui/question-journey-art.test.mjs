import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const read=file=>fs.readFileSync(file,'utf8');
const markup=read('app/components/QuestionJourney.tsx');
const domains=['saju','ziwei','sukuyo','vedic','astrology','tarot'];
test('illustrated home selector reuses the six original WebPs and seven native radios',()=>{
 const original=read('app/yeongnyangi/_home/home-data.ts');
 for(const id of domains) {
  assert.ok(original.includes('image: "'+id+'"'));
  const asset=fs.readFileSync('public/assets/yeongnyangi/original/'+id+'.webp');
  assert.equal(asset.toString('ascii',8,12),'WEBP');
  assert.ok(asset.length<50000);
 }
 assert.match(markup,/src=\{'\/assets\/yeongnyangi\/original\/'\+id\+'\.webp'\}[^\n]+alt="" loading="lazy"/);
 assert.match(markup,/name=\{domainGroup\} value="" checked=\{!domain\}/);
 assert.match(markup,/name=\{domainGroup\} value=\{id\} checked=\{domain===id\}/);
 assert.match(markup,/onChange=\{\(\)=>setDomain\(id\)\}/);
 assert.match(markup,/saveQuestionEntry\(question,domain\)/);
 assert.match(markup,/questionCheckoutHref\(q,domain\)/);
});
