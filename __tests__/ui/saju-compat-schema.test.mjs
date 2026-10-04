import test from 'node:test';
import assert from 'node:assert/strict';
import { requestBody, samplePairs, llmResponse } from '../fixtures/saju-compat-llm-fixture.mjs';
import { hasRepeatedReportPassage } from '../../worker/lib/paid-report-quality.js';
import {
  assembleSajuCompatSnapshot, buildSajuCompatPart, completeSajuCompatPart, groupFields, mergeSajuCompatShaped,
  measureSajuCompatPart, normalizeSajuCompatInput, sajuCompatSeenKeys, sajuCompatTasks, shapeSajuCompatGroup,
} from '../../worker/lib/saju-compat-schema.js';

// 서버가 받는 요청(엔진 facts)과 LLM 응답을 정제하는 계약. 실제 LLM 은 부르지 않는다.
const TYPES = ['love', 'business', 'friend'];
const clone = (value) => JSON.parse(JSON.stringify(value));
const fieldOf = (error) => error?.payload?.field;
const invalid = (field) => (error) => error.status === 422 && error.payload.code === 'SAJU_COMPAT_INPUT_INVALID' && (!field || fieldOf(error) === field);
const sample = () => requestBody(...samplePairs(11, 1)[0], 'love');
const loveWithReasons = () => {
  for (const [a, b] of samplePairs(5, 200)) {
    const body = requestBody(a, b, 'love');
    if (body.facts.reasons.length >= 4) return body;
  }
  throw new Error('no sample with enough reasons');
};

test('엔진이 만든 facts 는 3유형 코퍼스 전체에서 그대로 통과한다', () => {
  let total = 0;
  for (const [a, b] of samplePairs(777, 150)) {
    for (const type of TYPES) {
      const body = requestBody(a, b, type);
      const input = normalizeSajuCompatInput(body);
      assert.deepEqual(clone(input.facts.score), body.facts.score);
      assert.equal(input.facts.reasons.length, body.facts.reasons.length);
      total += 1;
    }
  }
  assert.equal(total, 450);
});

test('상대 호칭은 정제되고 알 수 없는 필드와 생년월일은 버린다', () => {
  const body = { ...sample(), partnerName: '  <b>하늘</b>"\n{}  ', birthDate: '1990-01-01', extra: 1 };
  const input = normalizeSajuCompatInput(body);
  assert.equal(input.partnerName, 'b하늘b');
  assert.deepEqual(Object.keys(input).sort(), ['compatType', 'facts', 'partner', 'partnerName', 'self']);
  assert.equal(normalizeSajuCompatInput({ ...sample(), partnerName: '' }).partnerName, '상대방');
});

test('변조·불일치 facts 는 422 로 거부한다', () => {
  const base = loveWithReasons();
  const cases = [
    ['facts.score.display', (b) => { b.facts.score.display += 1; }],
    ['facts.grade.code', (b) => { b.facts.grade.code = b.facts.grade.code === 'S' ? 'F' : 'S'; }],
    ['facts.reasons.0', (b) => { b.facts.reasons[0].delta += 1; }],
    ['facts.score.sum', (b) => { b.facts.reasons.pop(); }],
    ['facts.reasons.0', (b) => { b.facts.reasons[0].code = 'FREE_BONUS'; }],
    ['facts.type', (b) => { b.facts.type = 'business'; }],
    ['facts.dayPillars.self', (b) => { b.facts.dayPillars.self.gan = b.facts.dayPillars.self.gan === '甲' ? '丙' : '甲'; }],
    ['facts.pastLife.grade.pScore', (b) => { b.facts.pastLife.grade.pScore += 1; }],
    ['facts.size', (b) => { b.facts.padding = 'x'.repeat(17000); }],
    ['self.0', (b) => { b.self.pillars[0] = { gan: '甲', ji: '丑' }; }],
    ['compatType', (b) => { b.compatType = 'family'; }],
    ['facts', (b) => { b.facts = null; }],
  ];
  for (const [field, mutate] of cases) {
    const body = clone(base);
    mutate(body);
    assert.throws(() => normalizeSajuCompatInput(body), invalid(field), field);
  }
});

test('정상 응답은 네 그룹 모두 결손 없이 완결 part 가 되고 스냅샷에 서술이 모인다', () => {
  for (const type of TYPES) {
    const input = normalizeSajuCompatInput(requestBody(...samplePairs(21, 1)[0], type));
    const state = { input, tasks: sajuCompatTasks(input), parts: {} };
    const seen = new Set();
    for (const task of state.tasks) {
      const shaped = shapeSajuCompatGroup(task.id, llmResponse(task.id, input), input, seen);
      assert.deepEqual(shaped.missing, [], `${type}:${task.id}`);
      const part = buildSajuCompatPart(task.id, shaped, { model: 'gemini-2.5-flash' });
      assert.equal(completeSajuCompatPart(part), true);
      assert.ok(measureSajuCompatPart(part) > 0);
      assert.equal(hasRepeatedReportPassage(part), false);
      state.parts[task.id] = part;
    }
    assert.equal(hasRepeatedReportPassage(Object.values(state.parts).join('\n')), false);
    const snapshot = assembleSajuCompatSnapshot(state);
    assert.equal(snapshot.model, 'gemini-2.5-flash');
    assert.deepEqual(snapshot.meta.missing, []);
    assert.equal(snapshot.narrative.pastLife.questions.length, 3);
    assert.equal(snapshot.narrative.reality.repeatScene.length > 30, true);
    if (type === 'love') assert.equal(typeof snapshot.narrative.loveMarriage.emotion, 'string');
    else assert.equal(snapshot.narrative.loveMarriage.emotion, null);
    for (const reason of input.facts.reasons) assert.ok(snapshot.narrative.reasonDetails[reason.code], reason.code);
  }
});

test('금지 표현·근거에 없는 사주 용어·틀린 점수는 문장 단위로 걷어내고 단정어는 완화한다', () => {
  const input = normalizeSajuCompatInput(sample());
  const wrongScore = input.facts.score.display === 77 ? 78 : 77;
  const wrongGrade = input.facts.grade.code === 'F' ? 'S' : 'F';
  const dirty = [
    '두 분은 반드시 서로에게 힘이 되는 시간을 만들어 가는 편입니다.',
    '내년 대운이 들어오면 관계가 크게 달라집니다.',
    '결국 헤어지게 됩니다.',
    '주식 투자하세요 그러면 좋아집니다.',
    `궁합 점수는 ${wrongScore}점입니다.`,
    `${wrongGrade}급 궁합이라서 안정적입니다.`,
    `궁합 점수 ${input.facts.score.display}점은 서로를 알아 가며 조율할 여지가 충분하다는 뜻입니다.`,
  ].join(' ');
  const value = { ...llmResponse('core', input), overview: `${dirty} ${llmResponse('core', input).overview}` };
  const shaped = shapeSajuCompatGroup('core', value, input);
  const text = shaped.value.overview;
  assert.match(text, /되도록 서로에게 힘이 되는/);
  assert.doesNotMatch(text, /반드시|대운|헤어지게|주식|투자/);
  assert.ok(!text.includes(`${wrongScore}점`) && !text.includes(`${wrongGrade}급`));
  assert.ok(text.includes(`${input.facts.score.display}점`));
  assert.equal(shaped.stats.lintDrops, 5);
});

test('필드·문단 사이 반복 문장은 걷어내 엔진의 반복 문단 검사를 통과한다', () => {
  const input = normalizeSajuCompatInput(sample());
  const response = llmResponse('core', input);
  const sentence = '두 분이 서로의 하루를 묻는 습관을 이어 가시면 관계의 온도가 한결 안정적으로 유지됩니다.';
  response.overview = `${sentence} ${response.overview}`;
  response.gradeComment = `"${sentence}" ${response.gradeComment}`;
  response.detailCards.longTerm = `(${sentence}) ${response.detailCards.longTerm}`;
  const shaped = shapeSajuCompatGroup('core', response, input);
  assert.ok(shaped.stats.dedupeDrops >= 2);
  assert.equal(hasRepeatedReportPassage(buildSajuCompatPart('core', shaped)), false);
  // 앞선 part 에서 이미 쓴 문장은 다음 part 에서도 반복되지 않는다.
  const first = buildSajuCompatPart('core', shaped);
  const next = llmResponse('practice', input);
  next.reality.strength = `${sentence} ${next.reality.strength}`;
  const second = shapeSajuCompatGroup('practice', next, input, sajuCompatSeenKeys({ core: first }));
  assert.equal(hasRepeatedReportPassage(`${first}\n${buildSajuCompatPart('practice', second)}`), false);
});

test('분량이 길면 거부 대신 결정적으로 자르고, 짧거나 빠진 필드는 결손으로만 보고한다', () => {
  const input = normalizeSajuCompatInput(sample());
  const long = shapeSajuCompatGroup('core', llmResponse('core', input, { scale: 6 }), input);
  assert.deepEqual(long.missing, []);
  assert.ok(long.stats.truncated > 0);
  const spec = groupFields('core', input).required.find((item) => item.path === 'overview');
  assert.ok(Array.from(long.value.overview.replace(/\s/g, '')).length <= spec.cap + 1);
  const holes = shapeSajuCompatGroup('core', { ...llmResponse('core', input, { skip: ['overview'] }), gradeComment: '짧음' }, input);
  assert.deepEqual(holes.missing.sort(), ['gradeComment', 'overview']);
  assert.equal(completeSajuCompatPart(buildSajuCompatPart('core', holes)), true, '허용 한도 안의 결손은 완결로 본다');
  const many = shapeSajuCompatGroup('core', llmResponse('core', input, { skip: ['overview', 'gradeComment', 'detailCards.longTerm', 'detailCards.realOps', 'energyHarmony.johu'] }), input);
  assert.equal(completeSajuCompatPart(buildSajuCompatPart('core', many)), false);
  assert.equal(measureSajuCompatPart(buildSajuCompatPart('core', many)), 0);
  assert.equal(completeSajuCompatPart('not json'), false);
});

test('1차 부분 결과와 2차 결과를 필드별로 합쳐 결손을 메운다', () => {
  const input = normalizeSajuCompatInput(sample());
  const first = shapeSajuCompatGroup('core', llmResponse('core', input, { skip: ['overview'] }), input);
  const second = shapeSajuCompatGroup('core', llmResponse('core', input, { skip: ['gradeComment'] }), input);
  assert.deepEqual(first.missing, ['overview']);
  assert.deepEqual(second.missing, ['gradeComment']);
  const merged = mergeSajuCompatShaped('core', input, second, first);
  assert.deepEqual(merged.missing, []);
  assert.equal(hasRepeatedReportPassage(buildSajuCompatPart('core', merged)), false);
  assert.equal(completeSajuCompatPart(buildSajuCompatPart('core', merged)), true);
});

test('작업 목록은 minChars 1(분량 미달 단독 거부 없음)이고 근거 코드마다 reasons 서술이 있다', () => {
  const input = normalizeSajuCompatInput(loveWithReasons());
  const tasks = sajuCompatTasks(input);
  assert.deepEqual(tasks.map((task) => task.id), ['core', 'reasons', 'practice', 'pastLife']);
  assert.ok(tasks.every((task) => task.minChars === 1 && task.targetChars > 100));
  const reasonPaths = groupFields('reasons', input).required.map((spec) => spec.path);
  assert.deepEqual(reasonPaths, input.facts.reasons.map((reason) => `reasonDetails.${reason.code}`));
});
