const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '../../fortune-teller-fish.html'), 'utf8');

function setup({ random = 0, reduced = false } = {}) {
  let image;
  let finish;
  const dom = new JSDOM(html, {
    url: 'https://example.test/fortune-teller-fish.html',
    runScripts: 'dangerously',
    beforeParse(window) {
      window.matchMedia = () => ({ matches: reduced, addEventListener() {} });
      window.Math.random = () => random;
      window.Image = function MockImage() { image = {}; return image; };
      window.setTimeout = callback => { finish = callback; return 1; };
      window.localStorage.setItem('ftf_v3', '{"intimacy":42,"gachaHistory":["saved"]}');
    },
  });
  return { dom, get: id => dom.window.document.getElementById(id), image: () => image, finish: () => finish() };
}

for (const [random, motion, title] of [
  [0, 'swim', '작은 시작'], [0.3, 'lift', '마음이'],
  [0.6, 'curl', '다르게'], [0.9, 'rest', '쉬어'],
]) {
  test(`fish ${motion} pairs its visible movement with the reading and allows another reading`, () => {
    const app = setup({ random });
    try {
      app.image().onload();
      app.get('read-button').click();
      assert.equal(app.get('pond').dataset.motion, motion);
      assert.equal(app.get('read-button').disabled, true);
      assert.equal(app.get('reading').hidden, true);
      app.finish();
      assert.equal(app.get('reading').hidden, false);
      assert.match(app.get('reading-title').textContent, new RegExp(title));
      assert.equal(app.get('read-button').disabled, false);
      app.get('read-button').click();
      assert.equal(app.get('reading').hidden, true);
      app.finish();
      assert.equal(app.dom.window.localStorage.getItem('ftf_v3'), '{"intimacy":42,"gachaHistory":["saved"]}');
    } finally { app.dom.window.close(); }
  });
}

test('sprite failure offers a recoverable load action instead of an empty reading', () => {
  const app = setup();
  try {
    app.image().onerror();
    assert.equal(app.get('read-button').disabled, false);
    assert.match(app.get('read-button').textContent, /다시 불러오기/);
    app.get('read-button').click();
    assert.equal(app.get('reading').hidden, true);
    assert.equal(app.get('read-button').disabled, true);
    app.image().onload();
    assert.equal(app.get('read-button').disabled, false);
  } finally { app.dom.window.close(); }
});

test('motion can pause; reduced motion preserves a readable static experience', () => {
  const app = setup();
  const reduced = setup({ reduced: true });
  try {
    app.get('motion-toggle').click();
    assert.equal(app.get('motion-toggle').getAttribute('aria-pressed'), 'true');
    assert.equal(app.get('pond').classList.contains('paused'), true);
    app.get('motion-toggle').click();
    assert.equal(app.get('pond').classList.contains('paused'), false);
    assert.equal(reduced.get('motion-toggle').hidden, true);
    reduced.image().onload();
    reduced.get('read-button').click();
    reduced.finish();
    assert.equal(reduced.get('reading').hidden, false);
  } finally { app.dom.window.close(); reduced.dom.window.close(); }
});

test('leaving during observation restores an actionable state for browser back', () => {
  const app = setup();
  try {
    app.image().onload();
    app.get('read-button').click();
    app.dom.window.dispatchEvent(new app.dom.window.Event('pagehide'));
    assert.equal(app.get('read-button').disabled, false);
    assert.equal(app.get('read-button').textContent, '물고기의 움직임 읽기');
    assert.match(app.get('status').textContent, /다시 바라보세요/);
    app.get('read-button').click();
    app.finish();
    assert.equal(app.get('reading').hidden, false);
  } finally { app.dom.window.close(); }
});
