import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';
const compiled=await build({entryPoints:['app/yeongnyangi/_lib/intake-chat.ts'],bundle:true,format:'cjs',platform:'node',write:false});
const testModule={exports:{}};runInNewContext(compiled.outputFiles[0].text,{module:testModule,exports:testModule.exports});
const {typedScopeSuggestion}=testModule.exports;
const paired=q=>{const suggestion=typedScopeSuggestion(q);return suggestion&&[suggestion.category,suggestion.target];};
test('typed scope advice is narrow and covers both exact shipped guide questions',()=>{
 for(const q of ['내가 어떻게 하면 돈을 많이 벌 수 있을까?','돈을 더 많이 벌 수 있을까요?','수입을 더 늘릴 수 있을까?']) assert.deepEqual(paired(q),['money','self']);
 for(const q of ['그 사람과 나는 결혼할 궁합일까?','지금 만나는 사람과 결혼해도 잘 맞을까?']) assert.deepEqual(paired(q),['compatibility','pair']);
 for(const q of ['돈을 더 모으려면?','지출을 줄이려면?','친구가 돈을 많이 벌 수 있을까?','나는 언제쯤 결혼할까?','친구는 언제 결혼할까?','헤어진 그 사람은 다시 연락해올까?','그 사람과 나는 결혼할 궁합일까? 내 커리어도 궁금해요.']) assert.equal(paired(q),undefined,q);
});
test('only direct web preparation offers an explicit click, without replacing selected fish or the manual controls',()=>{
 const ui=fs.readFileSync('app/yeongnyangi/_components/QuestionCheckout.tsx','utf8');
 assert.match(ui,/allowTypedScope&&!new URLSearchParams\(window.location.search\).has\('questionId'\)/);
 assert.match(ui,/direct&&value.decision.category==='self'&&value.decision.target==='self'\?typedScopeSuggestion/);
 assert.match(ui,/type="button" disabled=\{busy\} onClick=\{\(\)=>\{update\(\{category:suggestion.category,target:suggestion.target\}\)/);
 assert.match(ui,/onChange\(\{\.\.\.value,decision:\{\.\.\.value.decision,\.\.\.patch\}\}\)/);
 assert.match(ui,/주제<select/);assert.match(ui,/상담 대상<select/);
 assert.match(fs.readFileSync('app/yeongnyangi/_components/Consultation.tsx','utf8'),/allowTypedScope=\{paymentSurface==='web'&&!sajuOnly\}/);
});
