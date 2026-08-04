const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { assessJobChange } = require('../../js/tarot-job-change-assessment.js');
const pagePath = path.join(__dirname, '..', '..', 'tarot-ijik.html');
const helperPath = path.join(__dirname, '..', '..', 'js', 'tarot-job-change-assessment.js');
const page = fs.readFileSync(pagePath, 'utf8');
const helper = fs.readFileSync(helperPath, 'utf8');

function cards(ids, reversedIndexes = []) {
  const reversed = new Set(reversedIndexes);
  return ids.map((id, index) => ({
    cardId: id,
    orientation: reversed.has(index) ? 'reversed' : 'upright',
  }));
}

test('이직 흐름이 강한 조합은 이직 방향과 빠른 시기를 제시한다', () => {
  const result = assessJobChange(cards(['M00', 'M01', 'M03', 'M19', 'M10', 'M16', 'M07']));

  assert.equal(result.direction.key, 'move_open');
  assert.equal(result.direction.label, '이직 쪽으로 열림');
  assert.equal(result.timing.key, 'immediate');
  assert.equal(result.timing.label, '지금~4주');
  assert.equal(result.checkpoints.length, 3);
  assert.equal(result.actions.length, 3);
});

test('현직 유지 카드가 우세하면 안정적인 현직 흐름과 늦은 시기를 제시한다', () => {
  const result = assessJobChange(cards(['M04', 'M05', 'M08', 'M04', 'M08', 'M11', 'M14']));

  assert.equal(result.direction.key, 'stay_stable');
  assert.equal(result.direction.label, '현직 유지가 안정적');
  assert.equal(result.timing.key, 'later');
  assert.equal(result.timing.label, '3~6개월');
  assert.match(result.currentCompany, /조정/);
});

test('중간 속도의 카드 조합은 1~3개월 시기로 안내한다', () => {
  const result = assessJobChange(cards(['M01', 'M01', 'M03', 'M00', 'M06', 'M16', 'M17']));

  assert.equal(result.timing.key, 'near');
  assert.equal(result.timing.label, '1~3개월');
});

test('역방향이 많거나 최종 카드가 역방향이면 준비 후 판단으로 제한한다', () => {
  const result = assessJobChange(cards(['M01', 'M04', 'M07', 'M10', 'M11', 'M16', 'M14'], [1, 3, 5, 6]));

  assert.equal(result.direction.key, 'prepare_conditionally');
  assert.equal(result.direction.label, '준비 후 판단');
  assert.equal(result.timing.key, 'prepare');
  assert.equal(result.timing.label, '준비기');
  assert.match(result.currentCompany, /유지한 채/);
});

test('helper 결과 계약은 화면 판정에 필요한 항목만 제공한다', () => {
  const result = assessJobChange(cards(['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06']));

  assert.deepEqual(Object.keys(result), ['timing', 'direction', 'currentCompany', 'checkpoints', 'actions']);
  assert.equal(result.checkpoints.length, 3);
  assert.equal(result.actions.length, 3);
  assert.ok(result.checkpoints.every((item) => typeof item === 'string' && item.length > 0));
  assert.ok(result.actions.every((item) => typeof item === 'string' && item.length > 0));
});

test('정적 페이지는 요약 판정과 결과 결제 게이트를 함께 유지한다', () => {
  assert.match(page, /tarot-job-change-assessment\.js\?v=job-change-v1/);
  assert.match(page, /id="jobChangeAssessment"/);
  assert.match(page, /id="jobChangeDirection"/);
  assert.match(page, /id="jobChangeTiming"/);
  assert.match(page, /id="jobChangeCurrentCompany"/);
  assert.match(page, /id="jobChangeCheckpoints"/);
  assert.match(helper, /이직 쪽으로 열림/);
  assert.match(helper, /현직 유지가 안정적/);
  assert.match(helper, /준비 후 판단/);
  assert.match(helper, /지금~4주/);
  assert.match(helper, /1~3개월/);
  assert.match(helper, /3~6개월/);
  assert.match(helper, /준비기/);
  assert.match(page, /function buildIjikAiPromptText\(cards, readingText, assessment\)/);

  const gateIndex = page.indexOf("await ijikCoinGate(IJIK_COIN_COST, '커리어 전환 타로 리딩')");
  const assessmentIndex = page.indexOf('const assessment = getJobChangeAssessment(drawnCards);');
  assert.ok(gateIndex >= 0);
  assert.ok(assessmentIndex > gateIndex);
});
