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
// 2026-10-01 S4: 별 강약을 정본 7등급(lib/ziwei-star-strength.js)으로 바꿔 다시 계산했다. 바뀐 필드는
// 별의 symbol·strength·strengthSymbol 과 strengthSummary 뿐이고, 별 배치·최강/최약궁·키워드·궁 매트릭스는 같다.
// 2026-10-02: 23시대 출생을 다음 날 子時로 치는 규칙(子初換日, iztro 기본값과 같음) 때문에 23:30 표본(민준)만 바뀌었다.
// shallow CI checkout에서도 기준 계산을 검증한다. 문구 5필드는 facts()에서 제외한다.
const BASELINE_FACT_HASHES = [
  "016a08b3bb00962300613967a1bf33f5acda8f5066070e1a8c09ab705a45d4e1",
  "8bd6cda26906d1dc1bd1e767b5e34c51e26d5d0fbc4d0947d717e4e27e60c795",
  "482e2848ba5418d31c354b5e0f7600b1543638fd7c49c91d474dff961ef89b57",
  "9a1c6c3ed4120c09d799d3d05bc8060ba94df8df1fd33b83dd4702b477ac6ef2",
  "6e5f7b017c603693740b10774e28d5222b10f489c8dc0939da90aa8198e39f0b"
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
const { buildPalaceCounseling, buildZiweiFoundationReading } = loadTsModule('app/components/ziwei/_lib/advanced-ziwei-reading.ts');
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
const foundationReadings = charts.map(chart => buildZiweiFoundationReading(chart, buildPalaceCounseling(chart)));
assert.equal(new Set(foundationReadings.map(reading => reading.introduction)).size, charts.length, 'foundation reading varies by chart');
for(const [index,reading] of foundationReadings.entries()) {
  const chart = charts[index];
  const text = [reading.headline, reading.introduction, ...reading.sections.flatMap(section => [section.title, section.headline, ...section.paragraphs, ...section.evidence]), ...reading.actions].join(' ');
  assert.equal(reading.sections.length,4,'foundation reading has four interpretation layers');
  assert.ok(reading.sections.every(section => section.paragraphs.length>=2 && section.evidence.length>=4),'each foundation layer has interpretation and chart basis');
  assert.ok(reading.actions.length>=2,'foundation reading has practical actions');
  assert.ok(text.length>=2600,'foundation reading is detailed enough to stand on its own');
  assert.ok(text.includes(chart.sihua.hualu) && text.includes(chart.sihua.huaquan) && text.includes(chart.sihua.huake) && text.includes(chart.sihua.huaji),'foundation reading cites all four transformation stars');
  const lifePalace = chart.palaces.find(palace => palace.id === 'ming');
  const bodyPalace = chart.palaces.find(palace => palace.earthlyBranch === chart.shenGong) || lifePalace;
  assert.ok(text.includes(lifePalace.earthlyBranch) && text.includes(bodyPalace.earthlyBranch),'foundation reading cites life and body palace branches');
  assert.ok(!forbidden.test(text),'foundation reading does not expose internal or deterministic claims');
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
