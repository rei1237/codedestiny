import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['app/yeongnyangi/_lib/result-share.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {shareChoices,shorten,shareMessage,consultationShareUrl}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const row={paid:true,state:'COMPLETED',id:'private-order',profileId:'private-profile',manifest:[{title:'첫 상담'}],chapters:[{summary:'나만의 해석',advice:'작은 시도',questionAnswers:[{questionId:'q1',answer:'구체적인 답변',timing:'2027년 3~5월',action:'선택지를 정리해요.'}]}],consultation:{questions:[{id:'q1',text:'개인적인 질문'}]}};
test('only completed paid results offer share excerpts',()=>{
 for(const state of ['CREATED','GENERATING','FORTUNE_FAILED','REFUNDED'])assert.deepEqual(shareChoices({...row,state}),[]);
 assert.deepEqual(shareChoices({...row,paid:false}),[]);
});
test('question answer, timing and action share from saved output without private identifiers',()=>{
 const choices=shareChoices(row);assert.equal(choices.length,2);assert.match(choices[0].text,/구체적인 답변/);assert.match(choices[0].text,/2027년 3~5월/);
 assert.doesNotMatch(choices[0].text,/개인적인 질문|private-order|private-profile/);assert.equal(choices[0].question,'개인적인 질문');
});
test('legacy and blank-question results share actual chapter summaries',()=>{
 const choices=shareChoices({...row,chapters:[{summary:'저장된 해석',advice:'저장된 조언'}],consultation:undefined});
 assert.equal(choices.length,1);assert.equal(choices[0].question,'');assert.match(choices[0].text,/저장된 해석/);
});
test('message carries reference date and public consultation entry, never result credentials',()=>{
 assert.match(shareMessage('보낼 이야기','2026-09-22'),/상담 기준: 2026-09-22/);
 const url=new URL(consultationShareUrl);assert.equal(url.pathname,'/yeongnyangi/fortune/');assert.deepEqual([...url.searchParams.keys()],['domain','fish']);
});
test('Kakao excerpt is bounded without splitting unicode characters',()=>{
 assert.equal(Array.from(shorten('고양이🐈'.repeat(50),95)).length,95);assert.ok(shorten('가'.repeat(120),95).endsWith('…'));assert.equal(shorten('짧은 글',95),'짧은 글');
});
