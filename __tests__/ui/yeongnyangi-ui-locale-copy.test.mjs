import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:"export {chartTerm,chartLimitation} from './app/yeongnyangi/_lib/reading-chart-copy'; export {consultationInputCopy} from './app/yeongnyangi/_lib/consultation-input-copy'; export {resultStateCopy} from './app/yeongnyangi/_lib/result-state-copy';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {chartTerm,chartLimitation,consultationInputCopy,resultStateCopy}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('chart display translates known evidence while retaining saved source values',()=>{
 assert.equal(chartTerm('오행 분포 · 월령 가중치 포함','en'),'Five elements · adjusted for birth month');
 assert.equal(chartTerm('계산된 시기 · 태양','en'),'Calculated period · Sun');
 assert.equal(chartTerm('1하우스','ja'),'1 ハウス');
 assert.equal(chartTerm('금성','ko'),'금성');
 assert.equal(chartTerm('unknown proper name','ja'),'unknown proper name');
 assert.equal(chartLimitation('상대: 한국 표준시 출생 기준입니다.','en'),'Partner: Based on birth time in Korea Standard Time.');
 assert.equal(chartLimitation('질문 당시의 카드 상징을 읽습니다. 천문 계산이나 미래의 확정 증거가 아닙니다.','ja'),'質問時に引いたカードの象徴を読みます。天文計算や未来の確定的な証拠ではありません。');
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
