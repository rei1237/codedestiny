import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {trustStoriesCopy} from '../../lib/brand/trust-stories.mjs';
import {HOME_CONCERNS} from '../../lib/marketing/home-concerns.mjs';

// 진입 웹툰(/) 렌더 계층. 그림 파일은 아직 없어도 된다(마크업만 본다). 가격은 레지스트리에서 읽고,
// 레지스트리가 답하지 못하면(null) 가격 줄만 빠져야 한다(Review Focus #2).
const require = createRequire(import.meta.url), Module = require('node:module');
const ENTRY = './app/_entry/EntryWebtoon';
const nullPricing = {name: 'null-pricing', setup(builder) {
  builder.onResolve({filter: /server-feature-pricing(\.ts)?$/}, () => ({path: 'null-pricing', namespace: 'null-pricing'}));
  builder.onLoad({filter: /.*/, namespace: 'null-pricing'}, () => ({contents: 'export const resolveServerFeaturePricing = () => null;', loader: 'js'}));
}};

// CSS 모듈은 클래스 이름을 그대로 돌려줘 마크업에 undefined 클래스가 생기지 않게 한다.
const cssModules = {name: 'css-module-names', setup(builder) {
  builder.onLoad({filter: /\.module\.css$/}, () => ({contents: 'export default new Proxy({}, {get: (_, key) => String(key)});', loader: 'js'}));
}};
// next/image는 Next 런타임 밖에서 그릴 수 없어 평범한 img로 바꾼다(언론 카드 PressCoverage).
const nextImage = {name: 'next-image-adapter', setup(builder) {
  builder.onResolve({filter: /^next\/image$/}, () => ({path: 'next-image', namespace: 'next-image'}));
  builder.onLoad({filter: /.*/, namespace: 'next-image'}, () => ({contents: "import React from 'react';export default function Image(props){return React.createElement('img',props);}", loader: 'js', resolveDir: process.cwd()}));
}};

async function loadEntry({stubPricing = false} = {}) {
  const bundle = await build({
    stdin: {contents: `export {default, buildOfferPrices} from '${ENTRY}';`, resolveDir: process.cwd(), loader: 'tsx'},
    bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
    loader: {'.css': 'empty'},
    external: ['react', 'react/jsx-runtime', 'react-dom'],
    plugins: stubPricing ? [cssModules, nextImage, nullPricing] : [cssModules, nextImage],
  });
  const loaded = new Module(path.resolve(`entry-webtoon-${stubPricing ? 'null' : 'real'}.cjs`));
  loaded.paths = Module._nodeModulePaths(process.cwd());
  loaded._compile(bundle.outputFiles[0].text, loaded.id);
  return loaded.exports;
}
async function renderEntry(options) {
  const entry = await loadEntry(options);
  const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
  return renderToStaticMarkup(React.createElement(entry.default));
}
const ctaTags = html => html.match(/<a\b[^>]*data-entry-cta[^>]*>/g) || [];
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];

test('entry webtoon: H1 하나, CTA 셋(hero·sticky·invite)이 무료 만세력으로 바로 간다', async () => {
  const html = await renderEntry();
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  const ctas = ctaTags(html);
  assert.equal(ctas.length, 3);
  assert.deepEqual(ctas.map(tag => attr(tag, 'data-position')).sort(), ['hero', 'invite', 'sticky']);
  for (const tag of ctas) {
    const href = attr(tag, 'href').replaceAll('&amp;', '&');
    assert.ok(href.startsWith('/ggulggul/?action=cdOneStepFreeSajuEntry'), href);
    assert.equal(href, '/ggulggul/?action=cdOneStepFreeSajuEntry&from=entry_webtoon');
  }
  assert.match(html, /href="#entry-invite"/, '건너뛰기 앵커');
  assert.match(html, /id="entry-invite"/);
});

test('entry webtoon: 기록 두 건은 날짜·원문 링크·한계 고지를, 끝에는 fine 고지를 둔다', async () => {
  const html = await renderEntry();
  for (const needle of ['2024-05-12', '2024-05-27', '/223444062729', '/223459696339', trustStoriesCopy.fine, trustStoriesCopy.reactionsNote]) {
    assert.ok(html.includes(needle), needle);
  }
  assert.equal(html.split(trustStoriesCopy.recordLimit).length - 1, 2, '기록 한계 고지(trust-stories.mjs)');
  assert.match(html, /1회 30만원/, '1:1 상담 이력 금액(founder.ts)');
});

test('entry webtoon: 후기 영역에 네오 1:1 상담·강의 이용자 후기 고지가 있다', async () => {
  const html = await renderEntry();
  const start = html.indexOf('data-cut="decade-reviews"');
  assert.ok(start > 0);
  const region = html.slice(start, html.indexOf('data-cut="', start + 10));
  assert.ok(region.includes('네오 1:1 상담·강의 이용자 후기'));
  assert.equal((region.match(/<article/g) || []).length, 3, '카카오 후기 3장');
});

test('entry webtoon: 첫 그림만 fetchPriority=high, 나머지는 lazy', async () => {
  const html = await renderEntry();
  const imgs = html.match(/<img\b[^>]*>/g) || [];
  assert.ok(imgs.length >= 15, `img ${imgs.length}`);
  // 속성을 카멜 fetchPriority 로 바꿨다(React 19 개발 경고 제거). 서버 HTML 은 대소문자 무관이라 /i 로 본다.
  assert.match(imgs[0], /fetchpriority="high"/i);
  assert.doesNotMatch(imgs[0], /loading="lazy"/);
  for (const img of imgs.slice(1)) {
    assert.match(img, /loading="lazy"/, img);
    assert.doesNotMatch(img, /fetchpriority/i, img);
  }
});

test('entry webtoon: 가격은 레지스트리에서 읽는다', async () => {
  const {buildOfferPrices} = await loadEntry();
  const prices = buildOfferPrices();
  assert.equal(prices.bundle, 29000);
  assert.equal(prices.concern.love, 5000);
  assert.deepEqual(Object.keys(prices.concern).sort(), HOME_CONCERNS.map(c => c.id).sort());
  assert.equal(prices.signature.length, 3);
  for (const item of prices.signature) assert.ok(item.featureKey && item.label && item.amountKRW > 0, JSON.stringify(item));
  const html = await renderEntry();
  assert.ok(html.includes((29000).toLocaleString('ko-KR') + '원'));
});

test('entry webtoon: 가격을 모르면 가격 줄만 빠진다(NaN·null원 없음)', async () => {
  const {buildOfferPrices} = await loadEntry({stubPricing: true});
  const prices = buildOfferPrices();
  assert.equal(prices.bundle, null);
  assert.ok(Object.values(prices.concern).every(value => value === null));
  const html = await renderEntry({stubPricing: true});
  assert.doesNotMatch(html, /NaN|null원|undefined|>원</);
  assert.ok(html.includes('사주 평생 소장 묶음'), '카드는 남는다');
});

test('entry webtoon: 금지 표현이 없다', async () => {
  const html = await renderEntry();
  assert.doesNotMatch(html, /적중|1위|최고|100%|1년 전/);
});

// --- 클라이언트 동작(jsdom) ---
async function clientPage() {
  const bundle = await build({
    stdin: {contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
      import ConcernPicker from './app/_entry/ConcernPicker';import StickyCta from './app/_entry/StickyCta';
      import {HOME_CONCERNS} from './lib/marketing/home-concerns.mjs';
      const picker=createRoot(document.getElementById('picker'));const sticky=createRoot(document.getElementById('sticky'));
      flushSync(()=>{picker.render(React.createElement(ConcernPicker,{concerns:HOME_CONCERNS,ctaHrefBase:'entry_webtoon'}));
        sticky.render(React.createElement(StickyCta,{label:'바로',href:'/ggulggul/?action=cdOneStepFreeSajuEntry&from=entry_webtoon',watchId:'watch'}));});`,
    resolveDir: process.cwd(), loader: 'tsx'},
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: {'process.env.NODE_ENV': '"production"'}, loader: {'.css': 'empty', '.module.css': 'empty'},
  });
  const dom = new JSDOM(`<html lang="ko"><body>
    <a data-entry-cta data-position="hero" href="/ggulggul/?action=cdOneStepFreeSajuEntry&amp;from=entry_webtoon">hero</a>
    <div id="watch"></div><div id="picker"></div><div id="sticky"></div>
    <a data-entry-cta data-position="invite" href="/ggulggul/?action=cdOneStepFreeSajuEntry&amp;from=entry_webtoon">invite</a>
  </body></html>`, {url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true});
  const win = dom.window, observers = [];
  win.IntersectionObserver = class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() {} };
  return {win, observers, run: () => win.eval(bundle.outputFiles[0].text)};
}
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

test('entry webtoon: 고민 칩을 고르면 모든 CTA href에 concern이 실리고 sessionStorage에 남는다', async () => {
  const {win, run} = await clientPage();
  run(); await settle();
  const chip = win.document.querySelector('[data-concern="reunion"]');
  assert.ok(chip);
  chip.click(); await settle();
  const hrefs = [...win.document.querySelectorAll('[data-entry-cta]')].map(a => a.getAttribute('href'));
  assert.equal(hrefs.length, 3);
  for (const href of hrefs) assert.equal(href, '/ggulggul/?action=cdOneStepFreeSajuEntry&from=entry_webtoon&concern=reunion');
  assert.equal(win.sessionStorage.getItem('cd:home-concern'), 'reunion');
  assert.equal(chip.getAttribute('aria-pressed'), 'true');
  win.close();
});

test('entry webtoon: sessionStorage가 throw해도 CTA href는 바뀐다(Review Focus #5)', async () => {
  const {win, run} = await clientPage();
  Object.defineProperty(win, 'sessionStorage', {configurable: true, get() { throw new win.DOMException('blocked', 'SecurityError'); }});
  run(); await settle();
  win.document.querySelector('[data-concern="job"]').click(); await settle();
  for (const a of win.document.querySelectorAll('[data-entry-cta]')) assert.ok(a.getAttribute('href').endsWith('&concern=job'), a.getAttribute('href'));
  win.close();
});

test('entry webtoon: 고정 CTA는 감시 컷이 화면 위로 지나간 뒤에만 보인다', async () => {
  const {win, observers, run} = await clientPage();
  run(); await settle();
  const sticky = win.document.querySelector('[data-position="sticky"]');
  assert.equal(sticky.closest('[data-visible]').getAttribute('data-visible'), 'false');
  assert.equal(observers.length, 1);
  observers[0].callback([{isIntersecting: false, boundingClientRect: {bottom: -40, top: -400}}]); await settle();
  assert.equal(sticky.closest('[data-visible]').getAttribute('data-visible'), 'true');
  observers[0].callback([{isIntersecting: true, boundingClientRect: {bottom: 200, top: 10}}]); await settle();
  assert.equal(sticky.closest('[data-visible]').getAttribute('data-visible'), 'false');
  win.close();
});
