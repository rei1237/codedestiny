import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const Module=createRequire(import.meta.url)('node:module');
const bundle=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/consultation'; export * from './worker/yeongnyangi/fortune/ask/period'; export * from './worker/yeongnyangi/fortune/ask/monthly'; export * from './worker/yeongnyangi/fortune/ask/packet'; export * from './worker/yeongnyangi/fortune/ask/prompt'; export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter'; export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest'; export {products} from './worker/yeongnyangi/payments/catalog';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const loaded=new Module(path.resolve('monthly-evidence.test.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const m=loaded.exports,asOf='2026-10-09';
const question='2027년 정미년의 재물운을 알고 싶습니다. 연간 흐름을 먼저 설명하고, 1월부터 12월까지 수입·지출·목돈 관리에서 살펴볼 점과 현실적인 행동 조언을 월별로 알려주세요.';
const manifest=m.readingManifest(m.products.find(p=>p.id==='saju_mackerel'));
const consultation=m.createConsultation(question,'money',m.consultationClock('Asia/Seoul',new Date('2026-10-09T00:00:00Z')),manifest,true);
const context={domain:'saju',engineVersion:'fixture',calculatedAt:asOf,limitations:[],facts:[
 {id:'saju.pillars',label:'pillars',value:{day:'辛酉'}},
 {id:'saju.monthlyLuck',label:'monthlyLuck',value:Array.from({length:12},(_,i)=>({year:2027,month:i+1,pillar:'fixture-pillar',start:{year:2027,month:i+1,day:6,hour:3,minute:20}}))},
 {id:'saju.yearlyLuck',label:'yearlyLuck',value:[{year:2027,pillar:'丁未'}]},
]};
const evidence=m.buildEvidencePacket({contexts:{saju:context},today:asOf,tier:'mackerel',birthTimeKnown:true});
const analysis={version:'ask-analysis-v1',questions:consultation.questions.map(q=>({questionId:q.id,category:'money',needsTiming:true}))};
const guide=m.buildAskFirstChapterPrompt(consultation,analysis,evidence);

test('a named year anchors Korean inclusive month ranges without mixing in the current year',()=>{
 for(const phrase of ['1월부터 12월까지','1~12월','1월~12월']){
  const ranges=m.resolveAskPeriods(`2027년 정미년 재물운. ${phrase} 월별로`,asOf,m.resolveQuestionYears);
  assert.ok(ranges.some(r=>r.scale==='month'&&r.start==='2027-01-01'&&r.end==='2027-12-31'));
  assert.ok(ranges.every(r=>r.start.startsWith('2027')&&r.end.startsWith('2027')));
 }
 assert.equal(m.resolveAskPeriods('내년 2월부터 4월까지',asOf,m.resolveQuestionYears)[0].end,'2027-04-30');
 assert.equal(m.resolveAskPeriods('3월 계획',asOf,m.resolveQuestionYears)[0].start,'2027-03-01');
});

test('all twelve civil months preserve source evidence and exact solar-term instants',()=>{
 const result=m.buildAskMonthlyEvidence(consultation,guide);
 assert.equal(result.months.length,12);
 assert.deepEqual(result.months.map(r=>r.month),Array.from({length:12},(_,i)=>`2027-${String(i+1).padStart(2,'0')}`));
 assert.equal(result.months[0].evidence[0].startsAt,'2027-01-06T03:20:00+09:00');
 assert.equal(result.months[0].evidence[0].endsBefore,'2027-02-06T03:20:00+09:00');
 assert.equal(result.months[1].evidence.length,2);
 assert.equal(result.months[11].evidence.at(-1).endsBefore,null);
 const missing=m.buildAskMonthlyEvidence(consultation,{...guide,evidence:{...guide.evidence,timing:[]}});
 assert.equal(missing.months.length,12);assert.ok(missing.months.every(r=>r.evidenceStatus==='limited'&&!r.evidence.length));
 assert.equal(m.buildAskMonthlyEvidence({...consultation,questions:[{text:'성격을 알려주세요.'}]},guide),undefined);
});

test('each chapter receives monthly evidence and accepts its source IDs without changing the first-answer schema',async()=>{
 for(const chapter of manifest){
  let request;
  const provider=new m.StructuredChapterProvider({generate:async value=>{request=value;return {result:{},provider:'mock',model:'fixture'};}});
  await provider.generateChapter({chapter,analysis:{contexts:{saju:context},signals:[],themes:[],topicId:'money',consultation},previous:[],ask:{analysis,evidence}});
  const rules=JSON.parse(request.domainRules);
  assert.equal(rules.monthlyEvidence.months.length,12);
  assert.match(rules.monthlyEvidenceContract,/양력 1일과 절기 월 시작은 다르/);
  assert.ok(request.outputSchema.properties.sources.items.enum.includes('saju.monthlyLuck'));
  assert.equal(Boolean(rules.askFirstChapter),chapter.ordinal===0);
 }
});
