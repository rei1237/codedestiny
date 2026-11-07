import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { HOME_CONCERNS } from '../../lib/marketing/home-concerns.mjs';
import { mountYehwaHome } from '../../js/core/yehwa-home.mjs';

// P8 측정: 진입 웹툰·고민 동선 이벤트가 맞는 자리에서 맞는 값으로 나가고, 계측이 던져도 화면·이동은 멀쩡하다.
// 전부 jsdom + 가짜 window.cdTrack 이며 네트워크는 쓰지 않는다.
const root = path.resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url), Module = require('node:module');
const React = require('react'), { createRoot } = require('react-dom/client'), { act } = require('react');
const read = file => readFileSync(path.join(root, file), 'utf8');

const cssModules = { name: 'css-module-names', setup(builder) {
  builder.onLoad({ filter: /\.module\.css$/ }, () => ({ contents: 'export default new Proxy({}, {get: (_, key) => String(key)});', loader: 'js' }));
} };
async function load(file) {
  const bundle = await build({
    stdin: { contents: `export { default } from './${file}';`, resolveDir: root, loader: 'tsx' },
    bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
    external: ['react', 'react/jsx-runtime', 'react-dom'], plugins: [cssModules],
  });
  const loaded = new Module(path.join(root, `p8-${path.basename(file)}.cjs`));
  loaded.paths = Module._nodeModulePaths(root);
  loaded._compile(bundle.outputFiles[0].text, loaded.id);
  return loaded.exports.default;
}

/** jsdom 을 전역에 걸고 가짜 cdTrack 을 단다. throwing=true 면 cdTrack 이 던진다. */
function setup(body, { url = 'https://example.test/', throwing = false } = {}) {
  const dom = new JSDOM(`<!doctype html><body>${body}</body>`, { url });
  const calls = [];
  dom.window.cdTrack = (name, params) => { calls.push([name, params]); if (throwing) throw new Error('boom'); };
  const keep = Object.fromEntries(['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'].map(k => [k, globalThis[k]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const restore = () => { for (const [k, v] of Object.entries(keep)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; } };
  return { dom, calls, restore };
}
const names = calls => calls.map(c => c[0]);
const click = (el, win) => { const e = new win.MouseEvent('click', { bubbles: true, cancelable: true }); el.dispatchEvent(e); return e; };

const PAGE = `<div id="r"></div>
  <a data-entry-cta="" data-position="hero" href="/ggulggul/?action=cdOneStepFreeSajuEntry&from=entry_webtoon">hero</a>
  <a data-entry-cta="" data-position="sticky" href="/ggulggul/?action=cdOneStepFreeSajuEntry&from=entry_webtoon">sticky</a>
  <a data-entry-cta="" data-position="invite" href="/ggulggul/?action=cdOneStepFreeSajuEntry&from=entry_webtoon">invite</a>
  <a data-entry-skip="" href="#entry-invite">skip</a><a id="plain" href="/x">plain</a>`;

function scrollTo(win, y, { total = 4000, viewport = 1000 } = {}) {
  Object.defineProperty(win.document.documentElement, 'scrollHeight', { configurable: true, value: total });
  win.innerHeight = viewport;
  win.scrollY = y;
  win.dispatchEvent(new win.Event('scroll'));
}

test('EntryTracker: view 1회, 진행 25/50/75/100 각 1회(되돌아 스크롤해도 다시 안 나감)', async () => {
  const Tracker = await load('app/_entry/EntryTracker');
  const { dom, calls, restore } = setup(PAGE);
  try {
    scrollTo(dom.window, 0, { total: 100000 }); // 아직 아무 구간도 지나지 않았다
    const reactRoot = createRoot(dom.window.document.getElementById('r'));
    await act(async () => { reactRoot.render(React.createElement(Tracker)); });
    assert.deepEqual(names(calls), ['entry_webtoon_view']);
    assert.deepEqual(calls[0][1] ?? {}, {});
    scrollTo(dom.window, 1500); // (1500+1000)/4000 = 62.5%
    scrollTo(dom.window, 0);
    scrollTo(dom.window, 1500);
    assert.deepEqual(calls.filter(c => c[0] === 'entry_webtoon_progress').map(c => c[1].percent), [25, 50]);
    scrollTo(dom.window, 3000); // 100%
    scrollTo(dom.window, 3000);
    assert.deepEqual(calls.filter(c => c[0] === 'entry_webtoon_progress').map(c => c[1].percent), [25, 50, 75, 100]);
    await act(async () => { reactRoot.render(React.createElement(Tracker)); }); // 다시 그려도 view 는 1회
    assert.equal(calls.filter(c => c[0] === 'entry_webtoon_view').length, 1);
    await act(async () => { reactRoot.unmount(); });
  } finally { restore(); }
});

test('EntryTracker: CTA 위치별 클릭 · 선택한 고민 · 건너뛰기, 이동은 막지 않는다', async () => {
  const Tracker = await load('app/_entry/EntryTracker');
  const { dom, calls, restore } = setup(PAGE);
  try {
    const reactRoot = createRoot(dom.window.document.getElementById('r'));
    await act(async () => { reactRoot.render(React.createElement(Tracker)); });
    const doc = dom.window.document;
    const cta = pos => doc.querySelector(`a[data-position="${pos}"]`);
    const events = () => calls.filter(c => c[0] === 'entry_webtoon_cta_click').map(c => c[1]);
    assert.equal(click(cta('sticky'), dom.window).defaultPrevented, false);
    // 고민 칩이 주소를 갈아 끼운 상태를 흉내 낸다.
    doc.querySelectorAll('a[data-entry-cta]').forEach(a => a.setAttribute('href', '/ggulggul/?action=cdOneStepFreeSajuEntry&from=entry_webtoon&concern=reunion'));
    click(cta('invite'), dom.window);
    click(cta('hero'), dom.window);
    assert.equal(click(doc.querySelector('a[data-entry-skip]'), dom.window).defaultPrevented, false);
    click(doc.getElementById('plain'), dom.window);
    assert.deepEqual(events(), [
      { concern: 'none', position: 'sticky' },
      { concern: 'reunion', position: 'invite' },
      { concern: 'reunion', position: 'hero' },
      { concern: 'reunion', position: 'skip' },
    ]);
    // 위조된 concern 은 none 으로 접힌다.
    doc.querySelectorAll('a[data-entry-cta]').forEach(a => a.setAttribute('href', '/ggulggul/?concern=%3Cscript%3E'));
    click(cta('hero'), dom.window);
    assert.deepEqual(events().at(-1), { concern: 'none', position: 'hero' });
    await act(async () => { reactRoot.unmount(); });
  } finally { restore(); }
});

test('EntryTracker: cdTrack 이 던져도 렌더·스크롤·클릭·이동이 계속된다', async () => {
  const Tracker = await load('app/_entry/EntryTracker');
  const { dom, restore } = setup(PAGE, { throwing: true });
  try {
    const reactRoot = createRoot(dom.window.document.getElementById('r'));
    await act(async () => { reactRoot.render(React.createElement(Tracker)); });
    assert.doesNotThrow(() => scrollTo(dom.window, 3000));
    const e = click(dom.window.document.querySelector('a[data-position="hero"]'), dom.window);
    assert.equal(e.defaultPrevented, false);
    await act(async () => { reactRoot.unmount(); });
  } finally { restore(); }
});

test('ConcernPicker: 칩을 고르면 home_concern_select{surface:entry_webtoon}, 저장소·계측이 던져도 주소 교체는 끝난다', async () => {
  const Picker = await load('app/_entry/ConcernPicker');
  for (const throwing of [false, true]) {
    const { dom, calls, restore } = setup(PAGE, { throwing });
    try {
      Object.defineProperty(dom.window, 'sessionStorage', { get() { throw new Error('denied'); } });
      const mount = dom.window.document.getElementById('r');
      const reactRoot = createRoot(mount);
      await act(async () => { reactRoot.render(React.createElement(Picker, { concerns: HOME_CONCERNS, ctaHrefBase: 'entry_webtoon' })); });
      await act(async () => { click(mount.querySelector('button[data-concern="job"]'), dom.window); });
      assert.deepEqual(calls, [['home_concern_select', { concern: 'job', surface: 'entry_webtoon' }]]);
      assert.match(dom.window.document.querySelector('a[data-position="hero"]').getAttribute('href'), /concern=job/);
      await act(async () => { reactRoot.unmount(); });
    } finally { restore(); }
  }
});

test('ConcernBridge: 칩 클릭에 home_concern_select{surface:fortune_bridge}, 이동은 막지 않는다', async () => {
  const Bridge = await load('app/fortune/_components/ConcernBridge');
  for (const throwing of [false, true]) {
    const { dom, calls, restore } = setup('<div id="r"></div>', { throwing });
    try {
      const mount = dom.window.document.getElementById('r');
      const reactRoot = createRoot(mount);
      await act(async () => { reactRoot.render(React.createElement(Bridge, { from: 'fortune_bridge' })); });
      let event;
      await act(async () => { event = click(mount.querySelector('a[data-concern="money"]'), dom.window); });
      assert.equal(event.defaultPrevented, false);
      assert.deepEqual(calls, [['home_concern_select', { concern: 'money', surface: 'fortune_bridge' }]]);
      await act(async () => { reactRoot.unmount(); });
    } finally { restore(); }
  }
});

test('꿀꿀 홈 칩: 허용 고민만 home_concern_select{surface:ggulggul_home}, 목록 밖은 보내지 않고 계측이 던져도 CTA 는 바뀐다', () => {
  const markup = new JSDOM(read('index.html')).window.document.querySelector('[data-yh-home]').outerHTML;
  for (const throwing of [false, true]) {
    const dom = new JSDOM(`<!doctype html><div id="cdHomeFunnel">${markup}</div>`, { url: 'https://example.invalid/ggulggul/' });
    const win = dom.window, calls = [];
    win.matchMedia = () => ({ matches: false, addEventListener() {} });
    win.cdTrack = (name, params) => { calls.push([name, params]); if (throwing) throw new Error('boom'); };
    globalThis.window = win; globalThis.location = win.location;
    mountYehwaHome(win.document.querySelector('[data-yh-home]'));
    const cta = win.document.querySelector('[data-concern-cta]');
    win.document.querySelector('[data-concern="reunion"]').click();
    assert.deepEqual(calls, [['home_concern_select', { concern: 'reunion', surface: 'ggulggul_home' }]]);
    assert.match(cta.getAttribute('href'), /concern=reunion/);
    const rogue = win.document.querySelector('[data-concern="love"]');
    rogue.dataset.concern = 'health';
    rogue.click();
    assert.equal(calls.length, 1, '목록 밖 고민은 이벤트도 없다');
  }
  delete globalThis.window; delete globalThis.location;
});

function resultWindow({ url, throwing = false, noTracker = false } = {}) {
  const dom = new JSDOM('<!doctype html><body><section id="sajuCard"><div id="sajuBundleOffer"></div><section id="sajuConcernAnswer" hidden></section></section></body>',
    { runScripts: 'outside-only', url });
  const w = dom.window, calls = [];
  // window 쪽 realm 의 객체라 JSON 으로 옮겨 담아야 deepStrictEqual 이 프로토타입 때문에 어긋나지 않는다.
  if (!noTracker) w.cdTrack = (name, params) => { calls.push([name, JSON.parse(JSON.stringify(params))]); if (throwing) throw new Error('boom'); };
  w.cdBirthScopeCurrentProfileId = () => 'profile-1';
  w.isTileKeyUnlocked = () => false;
  for (const file of ['js/core/saju/bundle-offer.js', 'js/core/saju/concern-offers.generated.js', 'js/core/saju/concern-answer.js']) w.eval(read(file));
  return { w, calls };
}
const CTX = { ygd: { e: 'fire', n: '병화' }, yEv: { score: 64, label: '좋은 운' }, gaeun: { wealth: '지출을 먼저 적어 보세요. 두 번째.' } };

test('고민 답: answer_view · offer_view 는 렌더 때, offer_click 은 카드 링크 클릭 때(이동은 막지 않는다)', () => {
  const { w, calls } = resultWindow({ url: 'https://code-destiny.com/ggulggul/?concern=money' });
  const host = w.document.getElementById('sajuConcernAnswer');
  w.CdConcernAnswer.render(host, CTX);
  const featureKey = HOME_CONCERNS.find(c => c.id === 'money').featureKey;
  assert.deepEqual(calls, [
    ['concern_answer_view', { concern: 'money' }],
    ['concern_offer_view', { feature_key: featureKey }],
  ]);
  const link = host.querySelector('.concern-offer__cta');
  const event = new w.MouseEvent('click', { bubbles: true, cancelable: true });
  link.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.deepEqual(calls.at(-1), ['concern_offer_click', { feature_key: featureKey }]);
  // 환불 기준 링크 클릭은 제안 클릭이 아니다.
  const refund = host.querySelector('.concern-offer__refund a');
  if (refund) {
    const count = calls.length;
    refund.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.equal(calls.length, count);
  }
  // 다시 그려도 클릭 리스너가 겹치지 않는다.
  w.CdConcernAnswer.render(host, CTX);
  const clicks = () => calls.filter(c => c[0] === 'concern_offer_click').length;
  const before = clicks();
  host.querySelector('.concern-offer__cta').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(clicks(), before + 1);
});

test('고민 답: 고민이 없거나 위조면 answer_view{concern:none} 만, 카드 이벤트는 없다', () => {
  for (const url of ['https://code-destiny.com/ggulggul/', 'https://code-destiny.com/ggulggul/?concern=%3Cscript%3E', 'https://code-destiny.com/ggulggul/?concern=foo']) {
    const { w, calls } = resultWindow({ url });
    w.CdConcernAnswer.render(w.document.getElementById('sajuConcernAnswer'), CTX);
    assert.deepEqual(calls, [['concern_answer_view', { concern: 'none' }]], url);
  }
});

test('고민 답: cdTrack 이 없거나 던져도 결과 화면은 그대로 그려지고 카드 링크는 눌린다', () => {
  for (const options of [{ noTracker: true }, { throwing: true }]) {
    const { w } = resultWindow({ url: 'https://code-destiny.com/ggulggul/?concern=job', ...options });
    const host = w.document.getElementById('sajuConcernAnswer');
    assert.doesNotThrow(() => w.CdConcernAnswer.render(host, CTX));
    assert.equal(host.hidden, false);
    assert.ok(host.querySelector('.concern-answer'));
    const link = host.querySelector('.concern-offer__cta');
    assert.ok(link && link.getAttribute('href'));
    const event = new w.MouseEvent('click', { bubbles: true, cancelable: true });
    assert.doesNotThrow(() => link.dispatchEvent(event));
    assert.equal(event.defaultPrevented, false);
  }
});
