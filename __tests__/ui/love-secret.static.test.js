const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

function between(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start === -1 || end === -1 || end <= start) {
    return '';
  }
  return source.slice(start, end);
}

test('love secret public shell exposes explicit start button labels', () => {
  const html = read('public/index.html');
  assert.ok(html.includes('입력 정보 확인하고 시작하기'));
  assert.ok(html.includes('두 사람의 궁합 분석 시작하기'));
  assert.ok(html.includes('나 혼자만의 연애 분석으로 시작하기'));
});

test('love secret input step does not trigger coin gate before mode choice', () => {
  const script = read('public/js/love-secret-v2.js');
  const generateSlice = between(
    script,
    'window.generateLoveSecret = function () {',
    'window.handleStartCompatibilityLoveBook = async function () {'
  );

  assert.ok(generateSlice.includes("_showScreen('lsPartnerScreen');"));
  assert.equal(generateSlice.includes('_runLoveSecretCoinGate('), false);
  assert.equal(generateSlice.includes('/api/billing/coin-gate'), false);
});

test('love secret coin gate is only wired on solo and compatibility start handlers', () => {
  const script = read('public/js/love-secret-v2.js');
  const compatibilitySlice = between(
    script,
    'window.handleStartCompatibilityLoveBook = async function () {',
    'window.handleStartSoloLoveBook = async function () {'
  );
  const soloSlice = between(
    script,
    'window.handleStartSoloLoveBook = async function () {',
    'window.lsStartWithPartner = function () {'
  );

  assert.ok(script.includes("_getLoveBookCoinGateHelper"));
  assert.ok(script.includes("saju_love_book_pdf"));
  assert.ok(compatibilitySlice.includes('_runLoveSecretCoinGate('));
  assert.ok(compatibilitySlice.includes("_runLoveSecretCoinGate('compatibility'"));
  assert.ok(soloSlice.includes('_runLoveSecretCoinGate('));
  assert.ok(soloSlice.includes("_runLoveSecretCoinGate('solo'"));
});