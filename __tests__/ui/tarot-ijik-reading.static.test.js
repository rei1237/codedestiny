/**
 * 커리어 전환 타로의 판정 계약.
 *
 * 2026-08-24: 판정·리딩 생성기가 `js/tarot-job-change-assessment.js` + `tarot-ijik.html` 에서
 * `worker/lib/tarot-ijik-reading.js` 로 옮겨 갔다(유료 산출물을 브라우저가 만들고 있었다).
 * 판정 결과의 계약은 그대로여야 하므로 같은 단언을 새 위치에 대고 그대로 유지한다.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const pagePath = path.join(root, 'tarot-ijik.html');
const enginePath = path.join(root, 'worker', 'lib', 'tarot-ijik-reading.js');
const page = fs.readFileSync(pagePath, 'utf8');
const engineSource = fs.readFileSync(enginePath, 'utf8');

/** 워커 모듈은 ESM 이라 CJS 테스트에서는 동적 import 로 받는다. */
let assessJobChange;
let buildIjikReading;
test('워커 판정 모듈을 불러온다', async () => {
  const mod = await import(require('node:url').pathToFileURL(enginePath).href);
  assessJobChange = mod.assessJobChange;
  buildIjikReading = mod.buildIjikReading;
  assert.equal(typeof assessJobChange, 'function');
  assert.equal(typeof buildIjikReading, 'function');
});

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

test('buildIjikReading 은 판정·리딩·AI 프롬프트를 한 번에 돌려준다', () => {
  const result = buildIjikReading(cards(['M00', 'M01', 'M03', 'M19', 'M10', 'M16', 'M07']));

  assert.deepEqual(Object.keys(result).sort(), ['aiPrompt', 'assessment', 'reading']);
  assert.ok(result.reading.length > 500, `리딩이 ${result.reading.length}자밖에 안 된다`);
  assert.ok(result.aiPrompt.length > 500, `프롬프트가 ${result.aiPrompt.length}자밖에 안 된다`);
  assert.match(result.reading, /✦ 이번 리딩의 결론/);
});

test('판정 문구는 워커 모듈이 갖는다', () => {
  for (const label of ['이직 쪽으로 열림', '현직 유지가 안정적', '준비 후 판단', '지금~4주', '1~3개월', '3~6개월', '준비기']) {
    assert.ok(engineSource.includes(label), `워커 모듈에 "${label}" 이 없다`);
  }
});

test('정적 페이지는 판정 표시 자리와 결제 게이트를 유지한다', () => {
  assert.match(page, /id="jobChangeAssessment"/);
  assert.match(page, /id="jobChangeDirection"/);
  assert.match(page, /id="jobChangeTiming"/);
  assert.match(page, /id="jobChangeCurrentCompany"/);
  assert.match(page, /id="jobChangeCheckpoints"/);

  // 🔴 결제가 먼저, 서버 리딩 요청이 나중이어야 한다.
  const gateIndex = page.indexOf("await ijikCoinGate(IJIK_COIN_COST, '커리어 전환 타로 리딩')");
  const fetchIndex = page.indexOf('await fetchIjikReading(drawnCards, _ijikLastRequestId)');
  assert.ok(gateIndex >= 0, '결제 게이트 호출을 못 찾았다');
  assert.ok(fetchIndex > gateIndex, '리딩 요청이 결제보다 먼저다');
});
