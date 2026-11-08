import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['app/yeongnyangi/_lib/image-report.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {buildReportModel,wrapText,clampLines,paginate,REPORT_TIERS,COMPACT_AFTER}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const measure=text=>Array.from(text).length*10;
const chapter=i=>({summary:`${i}장의 **저장된** 해석`,analysis:[],example:'',advice:`${i}장 행동`,highlights:[`하이라이트 ${i}`],sources:[],persona:i===2?'마지막 영냥이 한마디':'',topics:['관계','일']});
const row=(fishId,count,extra={})=>({id:'private-order',profileId:'private-profile',paid:true,state:'COMPLETED',locale:'ko',createdAt:'2026-11-08T00:00:00Z',
 product:{fishId,fishName:'참치',systems:['saju'],name:'사주'},manifest:Array.from({length:count},(_,i)=>({title:`목차 ${i+1}`,part:i<2?'1부':'2부'})),
 chapters:Array.from({length:count},(_,i)=>chapter(i+1)),consultation:{asOf:'2026-11-08',questions:[{id:'q1',text:'올해 이직해도 될까?'}]},...extra});

test('only completed paid readings produce a report',()=>{
 for(const state of ['CREATED','GENERATING','FORTUNE_FAILED'])assert.equal(buildReportModel(row('tuna',3,{state})),null);
 assert.equal(buildReportModel(row('tuna',3,{paid:false})),null);
});
test('report keeps every chapter from the saved result, cleaned and without private identifiers',()=>{
 const model=buildReportModel(row('tuna',15));
 assert.equal(model.chapters.length,15);assert.equal(model.chapters[0].title,'목차 1');assert.equal(model.chapters[0].summary,'1장의 저장된 해석');
 assert.equal(model.closing,'마지막 영냥이 한마디');assert.equal(model.asOf,'2026-11-08');assert.equal(model.density,'compact');
 assert.doesNotMatch(JSON.stringify(model),/private-order|private-profile/);
});
test('tier decides how many keywords, prescriptions and answers the report holds',()=>{
 const tuna=buildReportModel(row('tuna',15)),mackerel=buildReportModel(row('mackerel',5));
 assert.equal(tuna.advice.length,REPORT_TIERS.tuna.advice);assert.equal(mackerel.advice.length,REPORT_TIERS.mackerel.advice);
 assert.equal(mackerel.density,'full');assert.ok(5<=COMPACT_AFTER);
 assert.ok(tuna.keywords.length<=REPORT_TIERS.tuna.keywords&&mackerel.keywords.length<=REPORT_TIERS.mackerel.keywords);
 const answered=buildReportModel(row('salmon',8,{chapters:Array.from({length:8},(_,i)=>({...chapter(i+1),questionAnswers:[{questionId:'q1',answer:`답 ${i}`,reason:'',timing:'봄',action:''}]}))}));
 assert.equal(answered.answers.length,REPORT_TIERS.salmon.answers);assert.equal(answered.answers[0].question,'올해 이직해도 될까?');
});
test('omakase all-systems reading is titled as the six-system report',()=>{
 const model=buildReportModel(row('omakase',12,{product:{fishId:'omakase',fishName:'생선 오마카세',systems:['saju','ziwei','sukuyo','vedic','astrology','tarot'],name:'x'}}));
 assert.equal(model.title,'여섯 체계 종합 리포트');assert.equal(model.systems.length,6);assert.equal(model.advice.length,8);
});
test('Korean text wraps at word boundaries and only splits a word that overflows alone',()=>{
 assert.deepEqual(wrapText('오늘은 작은 선택이 흐름을 바꿔요',80,measure),['오늘은 작은','선택이 흐름을','바꿔요']);
 assert.deepEqual(wrapText('가나다라마바사아자차',40,measure),['가나다라','마바사아','자차']);
});
test('clamped text ends with an ellipsis that fits the width',()=>{
 const lines=clampLines(['가나다라','마바사아','자차'],2,40,measure);
 assert.equal(lines.length,2);assert.ok(lines[1].endsWith('…'));assert.ok(measure(lines[1])<=40);
});
test('pages respect the height budget and keep headings with the next block',()=>{
 const pages=paginate([{height:500},{height:300,keepWithNext:true},{height:400},{height:200}],1000,1100);
 assert.deepEqual(pages,[[0],[1,2,3]]);
 assert.deepEqual(paginate([{height:600},{height:600}],1000),[[0],[1]]);
});
