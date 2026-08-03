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
  assert.match(html, /id="cd-guardian-fortune-feature-flags"/);
  assert.match(html, /ENABLE_MAIN_GUARDIAN_FORTUNE:\s*true/);
  assert.match(html, /ENABLE_GUARDIAN_FORTUNE_API:\s*true/);
  assert.match(html, /ENABLE_GUARDIAN_FORTUNE_SHARE:\s*true/);
  assert.match(html, /ENABLE_GUARDIAN_FORTUNE_CREDITS:\s*false/);
  assert.match(html, /daily-fortune-core\.js/);
  assert.match(html, /data-guardian-duo-chat/);
  assert.match(html, /data-guardian-dialogue="yeoni"/);
  assert.match(html, /data-guardian-dialogue="neo"/);
  assert.match(html, /data-guardian-room-label/);
});

test('guardian fortune production activation keeps real LLM and credit sales disabled', () => {
  const wrangler = read('worker/wrangler.toml');
  assert.match(wrangler, /ENABLE_GUARDIAN_FORTUNE_API\s*=\s*"true"/);
  assert.match(wrangler, /ENABLE_GUARDIAN_FORTUNE_SHARE\s*=\s*"true"/);
  assert.match(wrangler, /ENABLE_GUARDIAN_FORTUNE_CREDITS\s*=\s*"false"/);
  assert.match(wrangler, /ENABLE_GUARDIAN_FORTUNE_REAL_LLM\s*=\s*"false"/);
  assert.match(wrangler, /ALLOW_REAL_GUARDIAN_FORTUNE_LLM\s*=\s*"false"/);
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
  assert.match(mock, /neo-operation-room\/sprites\/transparent\/neo-transparent-s1-f01\.webp/);
  assert.match(mock, /팩폭 전략실 네오가 시크하게 짚어줘요/);
  assert.match(mock, /네오 모드의 팩폭 전략실 인간형 캐릭터/);
  assert.match(home, /NEO_HUMAN_SPRITE_SRC/);
  assert.match(home, /NEO STRATEGY ROOM/);
  assert.match(home, /neo-operation-room\/sprites\/transparent\/neo-transparent-s1-f01\.webp/);
  assert.doesNotMatch(mock, /neo-operation-room\/sprites\/lion\/neo-lion-/);
  assert.doesNotMatch(home, /neo-operation-room\/sprites\/lion\/neo-lion-/);
  assert.ok(fs.existsSync(path.join(root, 'public/images/fortune-tea-house/flower-pig-honey-hug.webp')));
  assert.ok(fs.existsSync(path.join(root, 'public/images/fortune-tea-house/talking-flower-pig-yeoni3-sprite-safe.webp')));
  for (let i = 1; i <= 16; i += 1) {
    assert.ok(fs.existsSync(path.join(root, `public/images/guardian-fortune/yeoni/flower-pig-f${String(i).padStart(2, '0')}.webp`)));
  }
  for (let i = 1; i <= 8; i += 1) {
    assert.ok(fs.existsSync(path.join(root, `public/neo-operation-room/sprites/transparent/neo-transparent-s1-f${String(i).padStart(2, '0')}.webp`)));
  }
  assert.ok(fs.existsSync(path.join(root, 'public/images/guardian-fortune/guardian-room-yeoni-bg.webp')));
  assert.ok(fs.existsSync(path.join(root, 'public/images/guardian-fortune/guardian-room-neo-bg.webp')));
  assert.ok(fs.existsSync(path.join(root, 'public/images/guardian-fortune/guardian-button-yeoni.webp')));
  assert.ok(fs.existsSync(path.join(root, 'public/images/guardian-fortune/guardian-button-neo.webp')));
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
  assert.match(css, /guardian-fortune__duo-chat/);
  assert.match(css, /guardianDuoPop/);
  assert.match(css, /guardianCharacterBreathe/);
  assert.doesNotMatch(css, /guardianYeoniSprite/);
  assert.doesNotMatch(css, /guardianNeoSprite/);
  assert.match(css, /guardian-room-yeoni-bg\.webp/);
  assert.match(css, /guardian-room-neo-bg\.webp/);
  assert.match(css, /guardian-button-yeoni\.webp/);
  assert.match(css, /guardian-button-neo\.webp/);
  assert.match(css, /prefers-reduced-motion: no-preference/);
});

test('guardian fortune hero uses one active mascot per mode with local webp sprite assets', () => {
  const html = read('index.html');
  const css = read('styles/guardian-fortune.css');
  const home = read('js/guardian-fortune-home.js');

  assert.match(html, /data-guardian-character="yeoni"/);
  assert.match(html, /data-guardian-character="neo"/);
  assert.match(html, /data-guardian-sprite="neo"/);
  assert.match(css, /flower-pig-f16\.webp/);
  assert.doesNotMatch(css, /talking-flower-pig-yeoni3-sprite-safe\.webp/);
  assert.doesNotMatch(css, /talking-flower-pig-yeoni3-sprite-mobile\.webp/);
  assert.match(css, /background-size:\s*contain/);
  assert.match(css, /neo-operation-room\/sprites\/transparent\/neo-transparent-s1-f01\.webp/);
  assert.doesNotMatch(css, /neo-operation-room\/sprites\/lion\/neo-lion-/);
  assert.doesNotMatch(css, /codedestinyassets\/DestinyWar/);
  assert.match(css, /\.guardian-fortune__character\[hidden\]/);
  assert.match(css, /\.guardian-fortune__duo-bubble\[hidden\]/);
  assert.match(css, /data-guardian-mode="yeoni"[\s\S]*guardian-fortune__character--neo/);
  assert.match(css, /data-guardian-mode="neo"[\s\S]*guardian-fortune__character--yeoni/);
  assert.match(css, /data-guardian-mode="yeoni"[\s\S]*guardian-fortune__duo-bubble--neo/);
  assert.match(css, /data-guardian-mode="neo"[\s\S]*guardian-fortune__duo-bubble--yeoni/);
  assert.match(home, /NEO_HUMAN_SPRITE_SRC/);
  assert.match(home, /YEONI_FRAME_SEQUENCES/);
  assert.match(home, /YEONI_FRAME_MS = 1800/);
  assert.match(home, /NEO_HUMAN_FRAME_SEQUENCES/);
  assert.match(home, /NEO_HUMAN_FRAME_MS = 1800/);
  assert.match(home, /updateYeoniSprite/);
  assert.match(home, /updateNeoSprite/);
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(home, /neo-lion-s1-f/);
  assert.match(home, /neo-transparent-s1-f01/);
});

test('guardian fortune buy-credit CTA points to the live points shop section', () => {
  const home = read('js/guardian-fortune-home.js');
  assert.match(home, /\/points\?source=guardian-fortune-credits#guardian-fortune-credit-heading/);
  assert.doesNotMatch(home, /대화권 상점 연결은 다음 단계에서 진행돼요/);
  assert.doesNotMatch(home, /대화권 상점은 아직 mock 상태예요/);
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
      <figure data-guardian-character="yeoni"><span class="guardian-fortune__sprite guardian-fortune__sprite--yeoni" data-guardian-sprite="yeoni" data-sprite-state="idle" data-sprite-frame="1"></span></figure>
      <figure data-guardian-character="neo"><span data-guardian-sprite="neo"></span></figure>
      <div data-guardian-duo-chat>
        <p class="guardian-fortune__duo-bubble guardian-fortune__duo-bubble--yeoni"><span data-guardian-dialogue="yeoni"></span></p>
        <p class="guardian-fortune__duo-bubble guardian-fortune__duo-bubble--neo" hidden><span data-guardian-dialogue="neo"></span></p>
      </div>
      <p data-guardian-mode-title></p><p data-guardian-mode-description></p>
      <p data-guardian-usage></p>
      <form data-guardian-form>
        <input data-guardian-input="birthDate" type="date">
        <input data-guardian-calendar type="radio" value="solar" checked>
        <input data-guardian-input="birthTime" type="time">
        <select data-guardian-input="gender"><option value="unknown" selected>unknown</option></select>
        <input data-guardian-input="nickname"><textarea data-guardian-input="concern"></textarea>
        <button data-guardian-generate type="submit"></button>
      </form>
      <button data-guardian-topic="daily"></button>
      <button data-guardian-category="saju"></button>
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
      <button data-guardian-topic="love"></button>
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
  assert.equal(root.querySelector('[data-guardian-duo-chat]').getAttribute('data-active-speaker'), 'neo');
  assert.equal(root.querySelector('[data-guardian-character="yeoni"]').hidden, true);
  assert.equal(root.querySelector('[data-guardian-character="neo"]').hidden, false);
  assert.equal(root.querySelector('.guardian-fortune__duo-bubble--yeoni').hidden, true);
  assert.equal(root.querySelector('.guardian-fortune__duo-bubble--neo').hidden, false);

  root.querySelector('[data-guardian-topic="love"]').click();
  assert.match(root.querySelector('[data-guardian-dialogue="yeoni"]').textContent, /연애 흐름/);

  root.querySelector('[data-guardian-input="birthDate"]').value = '1990-01-01';
  root.querySelector('[data-guardian-input="birthTime"]').value = '08:30';
  root.querySelector('[data-guardian-category="saju"]').click();
  root.querySelector('[data-guardian-form]').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(root.querySelector('[data-guardian-generate]').disabled, true);
  await new Promise((resolve) => setTimeout(resolve, 720));
  assert.equal(root.querySelector('[data-guardian-result]').hidden, false);
  assert.match(root.querySelector('[data-result-opening]').textContent, /네오가 보기엔/);
});
