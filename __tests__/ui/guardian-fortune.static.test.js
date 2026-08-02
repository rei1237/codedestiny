const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('guardian fortune prototype is feature-flagged and preserves the legacy hub', () => {
  const html = read('index.html');
  assert.match(html, /id="cdTodayHub"/);
  assert.match(html, /id="guardianFortuneSection"/);
  assert.match(html, /data-feature-flag="ENABLE_MAIN_GUARDIAN_FORTUNE"/);
  assert.match(html, /guardian-fortune\.css/);
  assert.match(html, /guardian-fortune-mock\.js/);
  assert.match(html, /guardian-fortune-home\.js/);
  assert.match(html, /daily-fortune-core\.js/);
});

test('guardian fortune prototype exposes all six topics and verified local webp assets', () => {
  const mock = read('js/guardian-fortune-mock.js');
  const home = read('js/guardian-fortune-home.js');
  const expectedTopics = ['daily', 'love', 'money_work', 'relationship', 'mind', 'decision'];
  for (const topic of expectedTopics) {
    assert.match(mock, new RegExp(`\\b${topic}\\b`));
  }
  assert.match(home, /guardianFortuneSection/);
  assert.match(home, /CDGuardianFortuneMock/);
  assert.match(mock, /flower-pig-honey-hug\.webp/);
  assert.match(mock, /neo-transparent-s1-f01\.webp/);
  assert.ok(fs.existsSync(path.join(root, 'public/images/fortune-tea-house/flower-pig-honey-hug.webp')));
  assert.ok(fs.existsSync(path.join(root, 'public/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp')));
});

test('guardian fortune mock controller does not call real API, LLM, payment, or share services', () => {
  const home = read('js/guardian-fortune-home.js');
  assert.doesNotMatch(home, /\bfetch\s*\(/);
  assert.doesNotMatch(home, /navigator\.share/);
  assert.doesNotMatch(home, /navigator\.clipboard/);
  assert.doesNotMatch(home, /\/api\//);
  assert.match(home, /setTimeout/);
});

test('guardian fortune prototype includes mobile and reduced-motion rules', () => {
  const css = read('styles/guardian-fortune.css');
  assert.match(css, /max-width: 780px/);
  assert.match(css, /max-width: 380px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /min-height: 44px/);
});

test('guardian fortune flag off leaves the legacy hub visible', () => {
  const dom = new JSDOM(`<!doctype html><body>
    <section id="cdTodayHub"></section>
    <section id="guardianFortuneSection" hidden></section>
  </body>`, { url: 'https://codedestiny.example/', runScripts: 'outside-only' });
  const { window } = dom;
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  window.eval(read('js/guardian-fortune-home.js'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  assert.equal(window.document.getElementById('cdTodayHub').hidden, false);
  assert.equal(window.document.getElementById('guardianFortuneSection').hidden, true);
});

test('guardian fortune mock controller switches on safely and renders a mock result', async () => {
  const dom = new JSDOM(`<!doctype html><body>
    <section id="cdTodayHub"></section>
    <section id="guardianFortuneSection" hidden data-guardian-mode="yeoni">
      <button data-guardian-mode-button="yeoni"></button>
      <button data-guardian-mode-button="neo"></button>
      <img data-mode-image="yeoni"><img data-mode-image="neo" hidden>
      <p data-guardian-mode-title></p><p data-guardian-mode-description></p>
      <p data-guardian-usage></p>
      <form data-guardian-form>
        <input data-guardian-input="birthDate" type="date">
        <input data-guardian-calendar type="radio" value="solar" checked>
        <input data-guardian-input="birthTime" type="time" disabled>
        <input data-guardian-input="birthTimeUnknown" type="checkbox" checked>
        <select data-guardian-input="gender"><option value="unknown" selected>unknown</option></select>
        <input data-guardian-input="nickname"><textarea data-guardian-input="concern"></textarea>
        <button data-guardian-generate type="submit"></button>
      </form>
      <button data-guardian-topic="daily"></button>
      <p data-guardian-topic-description></p><p data-guardian-error></p><p data-guardian-live></p>
      <section data-guardian-result hidden>
        <img data-result-mode-image="yeoni"><img data-result-mode-image="neo" hidden>
        <p data-result-opening></p><p data-result-inner-state></p><p data-result-core-reading></p>
        <p data-result-topic-advice></p><p data-result-caution></p><p data-result-action></p>
        <p data-result-mode-label></p><p data-result-title></p><p data-result-cta-label></p>
        <p data-result-cta-reason></p>
      </section>
      <div data-guardian-cta hidden><p data-guardian-cta-title></p><p data-guardian-cta-description></p><div data-guardian-cta-actions></div></div>
      <div data-guardian-toast hidden></div>
    </section>
  </body>`, { url: 'http://localhost/?guardianFortune=1', runScripts: 'outside-only' });
  const { window } = dom;
  window.__CD_FEATURE_FLAGS__ = { ENABLE_MAIN_GUARDIAN_FORTUNE: true };
  window.matchMedia = () => ({ matches: true });
  window.eval(read('js/guardian-fortune-mock.js'));
  window.eval(read('js/guardian-fortune-home.js'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const root = window.document.getElementById('guardianFortuneSection');
  const legacy = window.document.getElementById('cdTodayHub');
  assert.equal(root.hidden, false);
  assert.equal(legacy.hidden, true);

  const neoButton = root.querySelector('[data-guardian-mode-button="neo"]');
  neoButton.click();
  assert.equal(root.getAttribute('data-guardian-mode'), 'neo');
  assert.equal(neoButton.getAttribute('aria-pressed'), 'true');

  root.querySelector('[data-guardian-input="birthDate"]').value = '1990-01-01';
  root.querySelector('[data-guardian-form]').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(root.querySelector('[data-guardian-generate]').disabled, true);
  await new Promise((resolve) => setTimeout(resolve, 720));
  assert.equal(root.querySelector('[data-guardian-result]').hidden, false);
  assert.match(root.querySelector('[data-result-opening]').textContent, /네오가 보기엔/);
});
