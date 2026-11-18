import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {RUNTIME_LOCALES} from '../../lib/i18n/locale-normalize.js';
const built=await build({stdin:{contents:"export {chartCopy,chartTerm,chartLimitation} from './app/yeongnyangi/_lib/reading-chart-copy'; export {consultationInputCopy} from './app/yeongnyangi/_lib/consultation-input-copy'; export {resultStateCopy,autoRefundCopy,heldRefundHint} from './app/yeongnyangi/_lib/result-state-copy'; export {readingCopy} from './app/yeongnyangi/_lib/reading-copy'; export {askPhase5Copy} from './app/yeongnyangi/_lib/ask-phase5-copy'; export {experienceCopy} from './app/yeongnyangi/_lib/experience-copy';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {chartCopy,chartTerm,chartLimitation,consultationInputCopy,resultStateCopy,autoRefundCopy,heldRefundHint,readingCopy,askPhase5Copy,experienceCopy}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('chart display translates known evidence while retaining saved source values',()=>{
 assert.equal(chartTerm('오행 분포 · 월령 가중치 포함','en'),'Five elements · adjusted for birth month');
 assert.equal(chartTerm('오행 분포 · 보이는 글자 기준','ja'),'五行の分布・見える文字のみ');
 assert.equal(chartTerm('계산된 시기 · 태양','en'),'Calculated period · Sun');
 assert.equal(chartTerm('계산된 시기 · 을사 대운 · 2018년 5월 무렵부터 (만 21세, 대운수 1)','en'),'Calculated period · 乙巳 · 2018-05');
 assert.equal(chartTerm('계산된 시기 · 을사 대운 · 2018년 5월 무렵부터 (만 21세, 대운수 1)','ko'),'계산된 시기 · 을사 대운 · 2018년 5월 무렵부터 (만 21세, 대운수 1)');
 assert.equal(chartTerm('계산된 시기 · 대운 시작 전','ja'),'計算された時期 · 最初の大運が始まる前');
 assert.equal(chartTerm('연도','de'),'Jahr');
 assert.equal(chartTerm('1하우스','ja'),'1 ハウス');
 assert.equal(chartTerm('금성','ko'),'금성');
 assert.equal(chartTerm('unknown proper name','ja'),'unknown proper name');
 assert.equal(chartLimitation('상대: 한국 표준시 출생 기준입니다.','en'),'Partner: Based on birth time in Korea Standard Time.');
 assert.equal(chartLimitation('질문 당시의 카드 상징을 읽습니다. 천문 계산이나 미래의 확정 증거가 아닙니다.','ja'),'質問時に引いたカードの象徴を読みます。天文計算や未来の確定的な証拠ではありません。');
 assert.equal(chartTerm('금성','de'),'Venus');
 assert.equal(chartCopy('fr').heading,'Explorez les fondements de votre lecture');
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
 // The after-period review label follows the reading language like the other answer labels.
 assert.equal(askPhase5Copy('ko').answer.review,'이 기간이 지나면 돌아볼 질문');assert.match(askPhase5Copy('ja').answer.review,/振り返/);
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
test('a held paid reading preserves saved content and gives a review path without promising automatic completion',()=>{
 for(const locale of ['ko','en','ja']){
  for(const text of [resultStateCopy(locale).reviewRequired,readingCopy(locale).held]){
   assert.match(text,/저장된 내용|Saved chapters|保存済みの内容/);
   assert.match(text,/다시 결제하지|Do not pay again|再度支払わず/);
   assert.match(text,/주문번호|order ID|注文番号/);
   assert.doesNotMatch(text,/자동으로.*완성|automatically.*complete|自動.*完成/i);
  }
  assert.match(readingCopy(locale).recoveringItems(9,15),/9\/15/);
 }
});
test('past-experience survey is authored in every site language',()=>{
 const authored=RUNTIME_LOCALES.map(locale=>experienceCopy(locale));
 for(const copy of authored)for(const group of [copy,copy.outcomes,copy.domains,copy.intensities])for(const [key,value] of Object.entries(group))if(typeof value==='string')assert.ok(value.trim(),key);
 assert.equal(experienceCopy('ko').heading,'과거 경험을 바탕으로 운의 해석을 개인화합니다');
 assert.equal(new Set(authored.map(copy=>copy.heading)).size,RUNTIME_LOCALES.length);
 for(const copy of authored)assert.equal(Object.keys(copy.outcomes).length,6);
 // "아니오"를 "나빴음"으로 바꾸지 않도록 평범·불확실·건너뜀이 따로 있고, 정확도를 약속하지 않는다.
 assert.deepEqual(Object.values(experienceCopy('ko').outcomes),['특별히 좋았음','특별히 나빴음','좋고 나쁜 일이 함께 있었음','대체로 평범했음','기억이 불확실함','해당 없음·응답 건너뜀']);
 for(const copy of authored)assert.doesNotMatch(JSON.stringify(copy),/정확도|적중|검증되|accuracy|verified/i);
 assert.equal(experienceCopy('ko').year(2022),'2022년');
 assert.equal(experienceCopy('en').year(2022),'2022');
});
test('an automatic refund or restore after a failed delivery is announced in every site language (S9-Y)',async()=>{
 const refunds=new Set(),restores=new Set(),hints=new Set();
 for(const locale of RUNTIME_LOCALES){
  const refund=autoRefundCopy(locale,'DELIVERY_REFUNDED'),hint=heldRefundHint(locale);
  assert.ok(refund.length>20&&hint.length>20,locale);
  for(const code of ['PASS_QUOTA_RESTORED','MONTHLY_CREDIT_RESTORED','SERVICE_PACK_USE_RESTORED','FREE_TRIAL_RESTORED','COIN_RESTORED','HONEY_RESTORED']){
   const restore=autoRefundCopy(locale,code);assert.ok(restore.length>20&&restore!==refund,locale+code);restores.add(restore);
  }
  refunds.add(refund);hints.add(hint);
  // A refund the support team issues by hand keeps the generic refunded copy.
  assert.equal(autoRefundCopy(locale,''),'');
  assert.equal(autoRefundCopy(locale,'ORDER_REFUNDED'),'');
 }
 assert.equal(refunds.size,RUNTIME_LOCALES.length);
 assert.equal(hints.size,RUNTIME_LOCALES.length);
 assert.match(autoRefundCopy('ko','DELIVERY_REFUNDED'),/자동으로 환불/);
 assert.match(autoRefundCopy('ko','PASS_QUOTA_RESTORED'),/자동으로 돌려/);
 assert.match(heldRefundHint('ko'),/자동으로 돌려/);
 const {readFileSync}=await import('node:fs');
 const source=readFileSync('app/yeongnyangi/_components/Result.tsx','utf8');
 // Both the spirit and the chapter result screens show the automatic notice, and a held paid order names the refund
 // fallback outside the Toss surface (Toss in-app purchases are refunded by support, not automatically).
 const count=text=>source.split(text).length-1;
 assert.equal(count('autoRefundCopy(row.locale,row.errorCode)||stateCopy.refunded'),2);
 assert.equal(count('heldRefundHint(row.locale)'),2);
 assert.equal(count("paymentSurface!=='toss'&&heldRefundable(row)"),2);
});
