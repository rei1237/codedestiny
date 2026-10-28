// 2026-10-16: 숙요 인연 레이더 전체 리포트는 서버가 결제를 거절하면 열리지 않는다.
// 예전에는 /api/sukuyo/past-life-reading 실패를 삼키고 reveal(true) 했다 — 복귀 경로(skipGate)를
// 증빙 없이 타면 결제 없이 전체 리포트가 열렸다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('js/saju-engine-tarot-sukuyo-quantum.js', 'utf8');

function block(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, endMarker);
  return source.slice(start, end);
}

test('서버 거절 상태 코드를 오류에 싣는다', () => {
  const fn = block('async function syRequestSukuyoPastLifeReading', 'async function syLookupSukuyoBondArchive');
  assert.match(fn, /failure\.status = Number\(response && response\.status/);
});

test('4xx 거절이나 게이트 결제가 없으면 reveal(true) 전에 멈춘다', () => {
  const fn = block('var unlockBondReport = async function(gateResult)', 'if (opts.skipGate === true)');
  const guard = fn.indexOf('if (paymentRejected || !gateResult)');
  assert.ok(guard > 0, '거절 가드가 있다');
  assert.match(fn.slice(guard, fn.indexOf('}', guard)), /return;/);
  assert.ok(fn.lastIndexOf('reveal(true)') > guard, '열기는 가드 뒤에만 있다');
});

test('공개 미러가 같은 코드를 싣는다', () => {
  assert.equal(fs.readFileSync('public/js/saju-engine-tarot-sukuyo-quantum.js', 'utf8'), source);
});
