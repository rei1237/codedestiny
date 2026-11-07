import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { HOME_CONCERNS, freeEntryHref } from '../../lib/marketing/home-concerns.mjs';

// P6 띠운세 → 고민 다리. 칩 5개가 무료 꿀꿀 고민 풀이로 이어지고, 두 띠운세 화면에서 KakaoChannelInvite 보다 앞에 온다.
const root = path.resolve(import.meta.dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const require = createRequire(import.meta.url), Module = require('node:module');
const BANNED = /적중|1위|최고|100%|1년 전|돼지|[0-9,]+원/;

async function loadBridge() {
  const bundle = await build({
    stdin: { contents: "export { default } from './app/fortune/_components/ConcernBridge';", resolveDir: root, loader: 'tsx' },
    bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
    external: ['react', 'react/jsx-runtime', 'react-dom'],
  });
  const loaded = new Module(path.join(root, 'concern-bridge.cjs'));
  loaded.paths = Module._nodeModulePaths(root);
  loaded._compile(bundle.outputFiles[0].text, loaded.id);
  return loaded.exports.default;
}
const render = async from => {
  const Bridge = await loadBridge();
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  return renderToStaticMarkup(React.createElement(Bridge, { from }));
};

test('다리: 칩 5개, 각 href 는 freeEntryHref(id, fortune_bridge) 그대로', async () => {
  const html = await render('fortune_bridge');
  const doc = new JSDOM(html).window.document;
  const chips = [...doc.querySelectorAll('a[data-concern]')];
  assert.deepEqual(chips.map(a => a.dataset.concern), HOME_CONCERNS.map(c => c.id));
  for (const [i, concern] of HOME_CONCERNS.entries()) {
    assert.equal(chips[i].getAttribute('href'), freeEntryHref(concern.id, 'fortune_bridge'));
    assert.equal(chips[i].textContent.trim(), concern.label);
  }
  assert.doesNotMatch(doc.body.textContent, BANNED, '금지 표현·가격 없음');
});

test('다리: 링크는 JS 없이도 된다(a href), from 은 주소에 실린다', async () => {
  const html = await render('fortune_bridge');
  assert.equal((html.match(/<a\b/g) || []).length, 5);
  assert.equal((html.match(/<button\b/g) || []).length, 0);
  assert.match(html.replaceAll('&amp;', '&'), /from=fortune_bridge&concern=love/);
});

test('다리: 칩을 누르면 cd:home-concern 을 남기고, 저장소가 throw 해도 이동은 막지 않는다', async () => {
  const Bridge = await loadBridge();
  const React = require('react'), { createRoot } = require('react-dom/client'), { act } = require('react');
  const dom = new JSDOM('<div id="r"></div>', { url: 'https://example.test/fortune/today/rat' });
  const keep = Object.fromEntries(['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'].map(k => [k, globalThis[k]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  try {
    const mount = dom.window.document.getElementById('r');
    const reactRoot = createRoot(mount);
    await act(async () => { reactRoot.render(React.createElement(Bridge, { from: 'fortune_bridge' })); });
    const click = id => {
      const event = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true });
      mount.querySelector(`a[data-concern="${id}"]`).dispatchEvent(event);
      return event;
    };
    await act(async () => { click('money'); });
    assert.equal(dom.window.sessionStorage.getItem('cd:home-concern'), 'money');
    Object.defineProperty(dom.window, 'sessionStorage', { get() { throw new Error('denied'); } });
    let event;
    await act(async () => { event = click('job'); });
    assert.equal(event.defaultPrevented, false, '기본 이동을 막지 않는다');
    await act(async () => { reactRoot.unmount(); });
  } finally {
    for (const [k, v] of Object.entries(keep)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; }
  }
});

test('두 띠운세 화면: ko 일 때만 다리를 그리고, KakaoChannelInvite 보다 앞에 온다', () => {
  const sign = read('app/fortune/[period]/[sign]/SignFortuneView.tsx');
  const signPage = read('app/fortune/[period]/[sign]/page.tsx');
  const date = read('app/fortune/date/[date]/[sign]/DateSignFortuneView.tsx');
  const datePage = read('app/fortune/date/[date]/[sign]/page.tsx');
  assert.match(sign, /import ConcernBridge from ["']\.\.\/\.\.\/_components\/ConcernBridge["']/);
  assert.match(sign, /locale === "ko" && <ConcernBridge from="fortune_bridge" \/>/);
  assert.match(date, /<ConcernBridge from="fortune_bridge" \/>/);
  // KakaoChannelInvite 는 페이지가 뷰 다음에 붙인다 → 뷰 안의 다리가 항상 앞이다.
  assert.ok(signPage.indexOf('<SignFortuneView') < signPage.indexOf('<KakaoChannelInvite'));
  assert.doesNotMatch(datePage, /KakaoChannelInvite/, '날짜 페이지에는 초대가 없다(변경 없음)');
  // 뷰 안에서 다리는 마지막 큰 구획(더 깊이 / 다른 기간) 앞에 둔다.
  assert.ok(sign.indexOf('<ConcernBridge') < sign.indexOf('id="deeper-heading"'));
  assert.ok(date.indexOf('<ConcernBridge') < date.indexOf('id="more-date-heading"'));
});
