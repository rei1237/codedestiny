import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';

const bundle=await build({entryPoints:['app/yeongnyangi/_lib/summary-report.ts'],bundle:true,platform:'node',format:'cjs',write:false});
const cjsModule={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),cjsModule,cjsModule.exports);
const {buildSummaryReport,publicShareReport,publicReportDraft,visibleChartGroups}=cjsModule.exports;
import {buildExternalImagePrompt,reportGuideCopy,reportDomains} from '../../js/core/fortune-report-content.mjs';
const secret='010101-1234567';
function fixture(domain){return {paid:true,state:'COMPLETED',id:'private-result-id',createdAt:'2026-09-30',product:{domain,systems:[domain]},manifest:[{id:'a',title:'첫 결과',theme:'self'}],chapters:[{summary:`상담 비밀 ${secret}`,advice:'조언',persona:'개인적인 한마디',highlights:['비공개 키워드']}],charts:[{domain,title:`${domain} 차트`,source:'구매 당시 저장된 계산 근거',limitations:['비공개 한계'],groups:[{id:'main',label:'나의 상징',items:[{label:'값',value:'辛酉'}],chapterIds:['a']},{id:'partner',label:'상대 이름',items:[{label:'이름',value:'비밀상대'}],chapterIds:['a']}]}]};}
test('all five report domains reuse owned chart references and completed content',()=>{
 for(const domain of ['saju','vedic','astrology','ziwei','tarot']){
  const row=fixture(domain),report=buildSummaryReport(row);
  assert.equal(report.chart,row.charts[0]);
  assert.equal(report.serviceType,domain);
  assert.match(report.oneLineSummary,/상담 비밀/);
  assert.equal(report.sections[0].chapterId,'a');
 }
});
test('public projection cannot serialize private source, question, partner or paid content',()=>{
 const row=fixture('saju');row.consultation={question:'개인 질문'};
 const share=publicShareReport(buildSummaryReport(row));
 const report=publicReportDraft(share);
 const serialized=JSON.stringify(report);
 assert.ok(!JSON.stringify(share).includes('private-result-id'));
 for(const privateValue of [secret,'private-result-id','상담 비밀','비공개 키워드','비밀상대','개인 질문','개인적인 한마디'])assert.ok(!serialized.includes(privateValue),privateValue);
 assert.ok(serialized.includes('辛酉'));
});
test('unpaid and refunded results never produce a report; old chart gaps are explicit',()=>{
 const row=fixture('tarot');assert.equal(buildSummaryReport({...row,paid:false}),null);
 assert.equal(buildSummaryReport({...row,state:'REFUNDED'}),null);
 const old=buildSummaryReport({...row,charts:undefined});assert.ok(old.coverage.missing.length);assert.equal(old.chart,null);
});
test('saju pillars show hour, day, month and year in source-consistent order',()=>{
 const row=fixture('saju');
 row.charts[0].groups=['년주','월주','일주','시주'].map((label,index)=>({id:String(index),label,items:[{label:'천간·지지',value:['甲子','乙丑','丙寅','丁卯'][index]}],chapterIds:['a']}));
 const report=buildSummaryReport(row);
 assert.deepEqual(visibleChartGroups(report).map(group=>group.label),['시주','일주','월주','년주']);
 assert.deepEqual(publicShareReport(report).chart.groups.map(group=>group.label),['일주','월주','년주']);
});
test('relationship chart roles stay out of the public report',()=>{
 const row=fixture('sukuyo');
 row.charts[0].groups=[{id:'self',label:'나의 본명숙',items:[{label:'숙',value:'각숙'}],chapterIds:['a']},{id:'pair',label:'두 사람의 흐름',items:[{label:'상대의 역할',value:'비밀 관계자'}],chapterIds:['a']}];
 const publicData=publicReportDraft(publicShareReport(buildSummaryReport(row)));
 assert.equal(publicData.chart.groups.length,1);
 assert.ok(!JSON.stringify(publicData).includes('비밀 관계자'));
});
test('only bundled Yeongnyangi tarot art paths enter public data',()=>{
 const row=fixture('tarot');
 row.charts[0].groups=[{id:'card',label:'현재',items:[{label:'카드',value:'힘'}],image:'/assets/yeongnyangi/tarot/v1/M08-600.webp',chapterIds:['a']}];
 assert.equal(publicReportDraft(publicShareReport(buildSummaryReport(row))).chart.groups[0].image,'/assets/yeongnyangi/tarot/v1/M08-600.webp');
 row.charts[0].groups[0].image='https://third-party.example/card.png';
 assert.equal(publicReportDraft(publicShareReport(buildSummaryReport(row))).chart.groups[0].image,undefined);
});
test('all six systems preserve saved values without inventing charts or sharing private content',()=>{
 for(const domain of reportDomains){
  const report=buildSummaryReport(fixture(domain));
  const prompt=buildExternalImagePrompt({brand:'yeongnyangi',domain,locale:'ko',groups:report.chart.groups,passages:report.sections.map(section=>section.body)});
  assert.ok(prompt.includes('辛酉'));assert.ok(prompt.includes(secret));
  assert.match(prompt,/Do not calculate a new chart/);assert.match(prompt,/Do not make a public share image/);
  assert.match(prompt,/white fluffy cat/);assert.match(prompt,/image_gen/);assert.doesNotMatch(prompt,/HTML|SVG|CSS/);
 }
});
test('localized guides cover six separate systems in all twelve runtime locales',()=>{
 for(const locale of ['ko','en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms']){
  const guides=reportDomains.map(domain=>reportGuideCopy(locale,domain));
  assert.equal(new Set(guides.map(copy=>copy.guide)).size,6);
  for(const copy of guides){assert.equal(copy.locale,locale);assert.ok(copy.guide.length>50);assert.ok(copy.privacy);assert.ok(copy.recommend&&copy.open&&copy.copiedOpen);assert.equal(copy.steps.filter(Boolean).length,3);}
 }
});
test('wrong-system charts are omitted and saved passages are not cut mid-sentence',()=>{
 const row=fixture('saju');row.charts[0].domain='vedic';row.chapters[0].summary='원본 문장입니다. '.repeat(70);
 const report=buildSummaryReport(row);assert.equal(report.chart,null);
 assert.ok(report.sections[0].body.includes(row.chapters[0].summary.trim()));
});

test('external prompt preserves saved chart limitations and correction notices',()=>{
 const note='출생시간 미상: 시주와 정확한 대운 시작 시점은 해석하지 않습니다.';
 const prompt=buildExternalImagePrompt({brand:'yeongnyangi',domain:'saju',locale:'ko',notes:[note]});
 assert.ok(prompt.includes(note));assert.match(prompt,/Keep every supplied limitation/);
});

test('normal structured messages retain short Korean and English passages and dates',async()=>{
 const compiled=await build({entryPoints:['lib/fortune/report-passages.ts'],bundle:true,platform:'node',format:'cjs',write:false});
 const loaded={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),loaded,loaded.exports);
 const messages=[JSON.stringify({sections:{summary:'Take your time.',advice:['Ask before deciding.','Wait until Friday.'],period:'2027',value:0}}),JSON.stringify({sections:{summary:'천천히 가세요.',advice:'먼저 물어보세요.'}})];
 const passages=loaded.exports.savedReportPassages(messages).join('\n');
 for(const value of ['Take your time.','Ask before deciding.','Wait until Friday.','2027','value: 0','천천히 가세요.','먼저 물어보세요.'])assert.ok(passages.includes(value),value);
});
test('each system gets its own chart design from supplied values only',()=>{
 const keys={saju:/Four Pillars/,ziwei:/12 palaces/,sukuyo:/27 lunar mansions/,astrology:/natal chart wheel/,vedic:/Rashi chart/,tarot:/tarot spread/};
 for(const domain of reportDomains){
  const prompt=buildExternalImagePrompt({brand:'yeongnyangi',domain,locale:'ko',groups:[],passages:[]});
  assert.match(prompt,keys[domain]);assert.match(prompt,/instead of inventing numbers/);
 }
});
test('yeongnyangi offers four webp character choices',async()=>{
 const {reportGuideChoices}=await import('../../js/core/fortune-report-content.mjs');
 assert.equal(reportGuideChoices.yeongnyangi.length,4);
 for(const item of reportGuideChoices.yeongnyangi)assert.match(item.src,/.webp$/);
});
