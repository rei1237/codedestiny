import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root='app/yeongnyangi/_components/';
const read=path=>readFileSync(path,'utf8');
const component=read(root+'YeongnyangiSampleMenu.tsx');
const data=read(root+'yeongnyangi-examples.ts');
const catalog=JSON.parse(read('lib/marketing/result-samples.json'));

test('the menu reads six existing public samples and never relabels editorial structure as a result',()=>{
 const ids=[...data.matchAll(/\['(tarot|saju|ziwei|astrology|vedic|sukuyo)',/g)].map(m=>'yn-'+m[1]);
 assert.equal(new Set(ids).size,6);
 for (const id of ids) {
  const sample=catalog.find(item=>item.id===id);
  assert.ok(sample.visual && sample.visualAlt && sample.question);
  assert.match(sample.href,/^\/yeongnyangi\/fortune\/\?domain=/);
  if(id==='yn-sukuyo'||id==='yn-vedic'){
   assert.equal(sample.kind,'structure');assert.ok(sample.guide.outline.length>0);assert.ok(sample.guide.examples.some(item=>item.kind==='editorial'));
  } else {assert.equal(sample.kind,'result');assert.ok(sample.excerpts.length>=(id==='yn-tarot'?4:2));}
 }
 assert.match(component,/공개 결과 발췌.*상담 구성 예시/);
 assert.match(component,/YeongnyangiExampleToon/);
 assert.match(component,/tarot-salmon-question-v1/);
 assert.match(read(root+'YeongnyangiGuide.tsx'),/YeongnyangiSampleMenu samples=\{readingSamples\}/);
});
test('sample controls are an accessible six-way read-only selector',()=>{
 assert.match(component,/role="tablist"/); assert.match(component,/role="tabpanel"/);
 for(const key of ['ArrowLeft','ArrowRight','Home','End'])assert.ok(component.includes(key));
 assert.match(component,/aria-controls=/);assert.match(component,/aria-selected=/);
 assert.match(component,/hidden=\{i!==active\}/);
 assert.match(component,/생선 등급이나 구매를 고르는 곳은 아니에요/);
 assert.doesNotMatch(component,/buy|checkout|requestPayment|fetch\(/i);
});
