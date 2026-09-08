import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadTsModule } from './lib/load-ts-module.mjs';

const fixtures = [
  { name:'서윤', birthYear:1990, birthMonth:5, birthDay:15, birthHour:10, birthMinute:0, gender:'F', calendarType:'solar', isLeapMonth:false, unknownHour:false, timezone:'Asia/Seoul' },
  { name:'민준', birthYear:1985, birthMonth:11, birthDay:3, birthHour:23, birthMinute:30, gender:'M', calendarType:'solar', isLeapMonth:false, unknownHour:false, timezone:'Asia/Seoul' },
  { name:'윤달', birthYear:1995, birthMonth:8, birthDay:10, birthHour:6, birthMinute:5, gender:'F', calendarType:'lunar', isLeapMonth:true, unknownHour:false, timezone:'Asia/Seoul' },
  { name:'음력', birthYear:2001, birthMonth:4, birthDay:20, birthHour:14, birthMinute:0, gender:'M', calendarType:'lunar', isLeapMonth:false, unknownHour:false, timezone:'Asia/Seoul' },
  { name:'시각미상', birthYear:1978, birthMonth:2, birthDay:14, birthHour:12, birthMinute:0, gender:'F', calendarType:'solar', isLeapMonth:false, unknownHour:true, timezone:'Asia/Seoul' },
];
// SHA 90b36b7d009b0d88deeaa8bd61a2383f9f696da2의 해석 정본으로 계산한 비문장 필드 SHA256.
// shallow CI checkout에서도 기준 계산을 검증한다. 문구 5필드는 facts()에서 제외한다.
const BASELINE_FACT_HASHES = [
  "418eced96240dd18ab8067a94b16f1fa0125484fefaac8679705a167c017f036",
  "d77fd3f694f0ef9b7846f90c0f6af0130296492f531199fbdee595bac52da5a1",
  "ec062563935ca5d605888f43d668fe33a51828fdc50e45263014a9ad4b091212",
  "e1b09090a2d5715ba573124f765a61b600ac5d08cae5095df8bffe47bf345484",
  "e0bfbfd730ef9c785b0c8fe2ed288bd4f4c47f040dbad419ba4a70782204b699"
];
const engine = loadTsModule('app/_lib/ziwei-engine.ts');
const { normalizeZiweiInput } = loadTsModule('app/_lib/normalize-ziwei-input.ts');
const charts = fixtures.map(fixture => {
  const normalized = normalizeZiweiInput(fixture);
  assert.equal(normalized.errors.length,0);
  return engine.normalizeZiweiForAdvancedReport(engine.calculateZiweiChart(normalized.input));
});
function facts(chart) {
  const { summary, ...rest } = chart;
  return { ...rest, summary: { keywords:summary.keywords, strongestPalaceId:summary.strongestPalaceId, weakestPalaceId:summary.weakestPalaceId, palaceMatrix:summary.palaceMatrix } };
}
assert.deepEqual(charts.map(chart => createHash('sha256').update(JSON.stringify(facts(chart))).digest('hex')), BASELINE_FACT_HASHES, 'calculation and normalization must match baseline');
assert.ok(charts.some(chart => chart.palaces.some(palace=>!palace.mainStars.length)), 'empty palace fixture');
const { buildQuestionReading, CONSULTATION_QUESTIONS } = loadTsModule('app/_lib/ziwei-consultation-narrative.ts');
const { generateZiweiDeepChapter } = loadTsModule('app/_lib/generate-ziwei-deep-chapter.ts');
const { ziweiReportBlocks, ziweiChapterPreview } = loadTsModule('lib/pdf/ziwei-report-plan.ts');
const { getPremiumZiweiCopy } = loadTsModule('app/components/ziwei/_lib/advanced-ziwei-copy.ts');
const forbidden = /다음과 같은 관점|이 주제에서는|이를 기반으로|종합해보면|annualFlow|내담자|강한 궁 활용/;
for(const id of Object.keys(CONSULTATION_QUESTIONS)) {
  const outputs=charts.map(chart=>buildQuestionReading(chart,id));
  assert.ok(new Set(outputs.map(row=>JSON.stringify(row.scenes))).size>1, id+' varies by chart');
  for(const [index,row] of outputs.entries()) {
    assert.ok(row.conclusion.length>20 && row.question.endsWith('?'));
    assert.ok(row.actions.length>=1 && row.actions.length<=3);
    assert.ok(!forbidden.test([row.conclusion,row.heroNote,...row.scenes,...row.actions].join(' ')));
    assert.ok(!row.scenes.includes(row.heroNote),'hero note must not repeat question prose');
    assert.ok(row.evidence.length>=3);
    for(const ref of row.evidence) assert.ok(charts[index].palaces.some(p=>p.id===ref.palaceId));
  }
}
for(const chart of charts) {
  for(const id of ['overview','master']) {
    const chapter=generateZiweiDeepChapter(chart,id);
    assert.ok(!/개관 노트|마스터플랜 노트|올해 유년은|유년 데이터/.test(chapter.fullText));
    assert.ok(chapter.actionItems.length>0);
  }
}
const legacy = { id:'old',title:'기존 제목',body:'기존 첫 문단입니다.\n\n오래 저장된 두 번째 문단입니다.\n줄바꿈도 보존합니다.' };
assert.deepEqual(ziweiReportBlocks(legacy.body).map(b=>b.text),['기존 첫 문단입니다.','오래 저장된 두 번째 문단입니다.\n줄바꿈도 보존합니다.']);
assert.equal(ziweiChapterPreview(legacy),'기존 첫 문단입니다.');
const long='긴 문단도 빠짐없이 보존합니다. '.repeat(1000);
assert.equal(ziweiReportBlocks(long)[0].text,long);
assert.deepEqual(ziweiReportBlocks('● 핵심 답변\n답입니다.').map(b=>b.kind),['heading','body']);
for(const locale of ['ko','en','ja','zh-CN','zh-TW','es']) assert.ok(Object.values(getPremiumZiweiCopy(locale)).every(Boolean));
console.log('[verify-ziwei-consultation] PASS: 5 calculation fixtures, 40 answers, 10 local chapters, legacy/long report text, 6 locale dictionaries; no network');
