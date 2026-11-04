import test from 'node:test';
import assert from 'node:assert/strict';
import { __newYearAiTestUtils as hooks } from '../../worker/routes/new-year-ai.js';
import { approvedSajuLabels } from '../../worker/lib/saju-authority-consumer.js';

const input = (over = {}) => ({ targetYear: 2027, year: 2027, birthInfo: {
  birthDate: '1990-05-15', birthTime: '08:30', birthTimeUnknown: false, calendarType: 'solar', gender: 'female', ...over } });

test('승인 판정: 시주가 없으면 격국·용신을 보류한다', () => {
  const labels = approvedSajuLabels({ year: '庚午', month: '辛巳', day: '甲子' });
  assert.equal(labels.status, 'pending');
  assert.equal(labels.yongshinLabel, '판정 보류');
  assert.deepEqual(labels.candidates, []);
});

test('신년운세 플래그 OFF 는 기존 데이터를 그대로 만든다', () => {
  const data = hooks.calculateNewYearFortuneData(input());
  assert.equal(data.advancedSajuSummary.yongshin.calculationVersion, undefined);
  assert.match(data.advancedSajuSummary.gyeokguk.finalGyeokguk, /현실 작용을 읽는 구조/);
});

test('신년운세 플래그 ON 은 승인 격국·용신 후보를 쓰고 단일 용신·기신을 만들지 않는다', () => {
  const data = hooks.calculateNewYearFortuneData(input(), { authorityEnabled: true });
  const { gyeokguk, yongshin, johu, domainSignals } = data.advancedSajuSummary;
  assert.ok(/격$/.test(gyeokguk.finalGyeokguk), gyeokguk.finalGyeokguk);
  assert.equal(yongshin.status, 'candidates');
  assert.match(yongshin.coreYongshinKo, /^후보 /);
  assert.equal(yongshin.gisinKo, '');
  assert.deepEqual(data.natalAnalysis.power.kijishin, []);
  assert.equal(johu.urgentElementKo, '');
  assert.doesNotMatch(JSON.stringify(domainSignals), /후보 [^ ]+이 살아나는|undefined/);
  assert.doesNotMatch(JSON.stringify(data.monthlyFlow.map(row => row.domains)), /기신|급용신|undefined/);
  assert.equal(data.prevention.balance?.burdensomeElements?.length ?? 0, 0);
});

test('신년운세 시간 미상은 후보도 만들지 않고 보류로 유지한다', () => {
  const data = hooks.calculateNewYearFortuneData(input({ birthTime: '', birthTimeUnknown: true }), { authorityEnabled: true });
  assert.equal(data.advancedSajuSummary.yongshin.status, 'pending');
  assert.equal(data.advancedSajuSummary.yongshin.coreYongshinKo, '판정 보류');
  assert.deepEqual(data.advancedSajuSummary.yongshin.yongshinElementsKo, []);
});

test('신년운세 프롬프트 확정값에 승인 판정과 후보 규칙이 들어간다', () => {
  const data = hooks.calculateNewYearFortuneData(input(), { authorityEnabled: true });
  const lines = hooks.buildCanonicalNewYearFacts(data).join('\n');
  assert.match(lines, /용신 후보는 확정 용신이 아닙니다/);
  assert.ok(lines.includes(`격국: ${data.advancedSajuSummary.gyeokguk.finalGyeokguk}`));
});

test('신년운세 공개 프로필 라벨이 승인 판정을 보여 준다', () => {
  const data = hooks.calculateNewYearFortuneData(input(), { authorityEnabled: true });
  const profile = hooks.buildBasicSajuProfile({ llmMeta: { fortuneData: data } });
  assert.equal(profile.gyeokguk, data.advancedSajuSummary.gyeokguk.finalGyeokguk);
  assert.match(profile.yongshin.core, /^후보 /);
  assert.equal(profile.yongshin.gisin, '');
});
