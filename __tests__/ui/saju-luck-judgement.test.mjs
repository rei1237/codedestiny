import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNatalJudgementFacts, buildLuckJudgement, buildLuckJudgementRows, judgementChart, luckDynamicsFor } from '../../worker/lib/saju-luck-judgement.js';
import { SAJU_LUCK_JUDGEMENT_RULE } from '../../worker/lib/saju-temperament.js';

const pillars = { year: '壬辰', month: '辛酉', day: '丙申', hour: '癸未' };

test('원국 판정 사실은 최종 용신(방법·이유)과 조후 요약을 짧게 싣는다', () => {
  const facts = buildNatalJudgementFacts({ year: '庚午', month: '己卯', day: '己卯', hour: '己巳' });
  assert.match(facts.yongsin.method, /억부|조후|종격/);
  assert.ok(facts.yongsin.yongsin);
  assert.ok(facts.yongsin.reason.length > 10);
  assert.ok((facts.yongsin.supplements || []).length <= 2);
  assert.equal(facts.climate.type, '습열');
  assert.ok(facts.climate.summary);
});

test('원국 천간 사이의 십간 짝 규칙만 싣는다(己土濁壬)', () => {
  const facts = buildNatalJudgementFacts({ year: '壬子', month: '己酉', day: '甲寅', hour: '丙寅' });
  assert.ok(facts.stemPairs.some((line) => /己.*壬.*흐리게/.test(line)), JSON.stringify(facts.stemPairs));
  const none = buildNatalJudgementFacts({ year: '甲子', month: '甲子', day: '甲子', hour: '甲子' });
  assert.equal(none.stemPairs, undefined);
});

test('용신 달이라도 합거되면 좋은 흐름으로 넘기지 않고 이유를 함께 준다', () => {
  const month = buildLuckJudgement(pillars, { seun: '戊戌', wolun: '丙寅', label: '3월' });
  assert.equal(month.label, '3월');
  assert.equal(month.pillar, '丙寅');
  assert.notEqual(month.verdict, '좋은 흐름');
  assert.match(month.headline, /^이 달은/);
  assert.ok(month.reasons.some((r) => /합거/.test(r)));
  assert.ok(month.reasons.length <= 3);
  assert.equal(luckDynamicsFor(pillars, { seun: '戊戌', wolun: '丙寅' }).scope, 'wolun');
});

test('한글 간지와 시각 미상을 받아들이고, 일주가 없으면 판정하지 않는다', () => {
  assert.deepEqual(judgementChart({ year: '임진', month: '신유', day: '병신', hour: '계미' }, { timeUnknown: true }).h, { g: '', j: '' });
  assert.equal(buildNatalJudgementFacts({ year: '壬辰' }), null);
  assert.equal(buildLuckJudgement({ year: '壬辰' }, { seun: '丙寅' }), null);
  const rows = buildLuckJudgementRows(pillars, [{ label: '대운', daeun: '戊戌' }, { label: '없음', seun: 'xx' }]);
  assert.deepEqual(rows.map((r) => r.label), ['대운']);
  assert.match(rows[0].headline, /^이 대운 10년은/);
});

test('공통 전달 규칙은 용신 단정 금지·쉬운 말·사실 일치를 모두 담는다', () => {
  assert.match(SAJU_LUCK_JUDGEMENT_RULE, /용신 오행이 들어온다는 이유만으로 .*단정하지 않는다/);
  assert.match(SAJU_LUCK_JUDGEMENT_RULE, /luckJudgement/);
  assert.match(SAJU_LUCK_JUDGEMENT_RULE, /쉬운 말로 공감을 먼저/);
  assert.match(SAJU_LUCK_JUDGEMENT_RULE, /처음 한 번만 괄호/);
  assert.match(SAJU_LUCK_JUDGEMENT_RULE, /성향 풀이와 특정 시기의 운은 제공된 계산 사실과 맞게/);
});

test('신년운세: 용신 달이라도 합거되면 총운 +1 을 주지 않고 판정을 기회·주의에 그대로 쓴다', async () => {
  const { __newYearAiTestUtils: u } = await import('../../worker/routes/new-year-ai.js');
  const input = { targetYear: 2027, year: 2027, focusArea: 'overall', birthInfo: { birthDate: '1985-04-15', birthTime: '08:30', birthTimeUnknown: false, calendarType: 'solar', gender: 'female' } };
  const data = u.calculateNewYearFortuneData(input);
  const may = data.monthlyFlow[4];
  assert.ok(data.advancedSajuSummary.yongshin.yongshinElementsKo.includes(may.element), '5월은 용신 오행 달이어야 한다');
  assert.equal(may.luck.verdict, '조심할 흐름');
  assert.ok(may.luck.reasons.some((r) => /합거/.test(r)));
  assert.notEqual(may.domains.overall.level, '강');
  assert.equal(may.domains.overall.basis, may.luck.headline);
  assert.ok(!may.timing.includes('기회'), may.timing);
  const judgement = data.advancedSajuSummary.luckJudgement;
  assert.ok(judgement.natal.yongsin.reason);
  assert.equal(judgement.year.pillar, '丁未');
  const facts = u.buildCanonicalNewYearFacts(data).join('\n');
  assert.match(facts, /- 5월 을사 .*운 판정 조심할 흐름/);
  const monthly = u.newYearSectionsForPlan(2).find((s) => s.key === 'monthly');
  assert.ok(u.buildFirstPrompt(input, data, monthly).includes(SAJU_LUCK_JUDGEMENT_RULE));
});
