const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

test('gender buttons are explicit non-submit buttons', () => {
  const html = read('public/index.html');
  assert.ok(
    html.includes('<button type="button" class="tog-btn on" id="btnF" data-action="setGender" data-action-args="F">')
  );
  assert.ok(
    html.includes('<button type="button" class="tog-btn" id="btnM" data-action="setGender" data-action-args="M">')
  );
});

test('coin-gate action invoke forwards data-action-args', () => {
  const html = read('public/index.html');
  assert.ok(html.includes('window[action].apply(window, _actionArgs);'));
  assert.ok(html.includes('window[action].apply(window, _lazyActionArgs);'));
});

test('saju engine normalizes gender and blocks empty submit', () => {
  const engine = read('public/js/saju-engine.js');
  assert.ok(engine.includes('function setGender(g){'));
  assert.ok(engine.includes("if (normalized !== 'M' && normalized !== 'F') return;"));
  assert.ok(engine.includes("alert('성별을 선택해 주세요.');"));
  assert.ok(engine.includes("console.debug('[saju] submit input'"));
});
