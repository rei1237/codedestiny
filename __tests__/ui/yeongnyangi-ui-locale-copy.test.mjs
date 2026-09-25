import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:"export {chartCopy,chartTerm,chartLimitation} from './app/yeongnyangi/_lib/reading-chart-copy'; export {consultationInputCopy} from './app/yeongnyangi/_lib/consultation-input-copy'; export {resultStateCopy} from './app/yeongnyangi/_lib/result-state-copy'; export {askPhase5Copy} from './app/yeongnyangi/_lib/ask-phase5-copy';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {chartCopy,chartTerm,chartLimitation,consultationInputCopy,resultStateCopy,askPhase5Copy}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('chart display translates known evidence while retaining saved source values',()=>{
 assert.equal(chartTerm('오행 분포 · 월령 가중치 포함','en'),'Five elements · adjusted for birth month');
 assert.equal(chartTerm('계산된 시기 · 태양','en'),'Calculated period · Sun');
 assert.equal(chartTerm('1하우스','ja'),'1 ハウス');
 assert.equal(chartTerm('금성','ko'),'금성');
 assert.equal(chartTerm('unknown proper name','ja'),'unknown proper name');
 assert.equal(chartLimitation('상대: 한국 표준시 출생 기준입니다.','en'),'Partner: Based on birth time in Korea Standard Time.');
 assert.equal(chartLimitation('질문 당시의 카드 상징을 읽습니다. 천문 계산이나 미래의 확정 증거가 아닙니다.','ja'),'質問時に引いたカードの象徴を読みます。天文計算や未来の確定的な証拠ではありません。');
 assert.equal(chartTerm('금성','de'),'Venus');
 assert.equal(chartCopy('fr').heading,'Explore the basis of your reading');
});

test('question input and answer modes have complete 12-language copy',()=>{
 const locales=['ko','en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms'];
 for(const locale of locales){
  const {input,answer}=askPhase5Copy(locale);
  assert.equal(Object.keys(input.topics).length,8);
  for(const value of Object.values(input))if(typeof value==='string')assert.ok(value.length>3,locale);
  for(const value of Object.values(answer))assert.ok(value.length>3,locale);
 }
 assert.match(askPhase5Copy('de').input.question,/Frage/);
 assert.match(askPhase5Copy('hi').answer.careHint,/विशेषज्ञ/);
});
test('input and recovery copy preserve payment and retry cautions for each purchase language',()=>{
 for(const locale of ['ko','en','ja']){
  const input=consultationInputCopy(locale),result=resultStateCopy(locale);
  assert.ok(input.placeRequired.length>10);
  assert.ok(input.questionRequired.length>5);
  assert.ok(result.reviewRequired.length>20);
  assert.ok(result.retryHint.length>15);
 }
 assert.match(resultStateCopy('en').reviewRequired,/Do not pay again/);
 assert.match(resultStateCopy('ja').reviewRequired,/再度支払わず/);
});
