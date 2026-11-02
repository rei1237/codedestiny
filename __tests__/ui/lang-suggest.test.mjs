import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync('js/cd-lang-suggest.js', 'utf8');
const LINKS = {
  en: 'https://code-destiny.com/en/saju/',
  ja: 'https://code-destiny.com/ja/saju/',
  ko: 'https://code-destiny.com/saju/',
  'zh-TW': 'https://code-destiny.com/zh-tw/saju/',
  'zh-CN': 'https://code-destiny.com/zh/saju/',
  'x-default': 'https://code-destiny.com/saju/',
};

function visit(path, languages, { alternates = ['en', 'ja', 'ko', 'zh-TW', 'zh-CN'], links, search = '', cookie = '', storage = {}, appLanguage } = {}) {
  const table = links || Object.fromEntries(alternates.map(code => [code, LINKS[code]]));
  const head = Object.entries(table).map(([code, href]) => '<link rel="alternate" hreflang="' + code + '" href="' + href + '">').join('');
  const dom = new JSDOM('<!doctype html><html lang="ko"><head>' + head + '</head><body><main>page</main></body></html>', {
    url: 'https://code-destiny.com' + path + search,
    runScripts: 'outside-only',
  });
  const { window } = dom;
  Object.defineProperty(window.navigator, 'languages', { value: languages, configurable: true });
  if (cookie) window.document.cookie = cookie;
  for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
  if (appLanguage) window.__cdAppLanguage = appLanguage;
  const run = () => window.eval(source);
  run();
  const box = () => window.document.getElementById('cd-lang-suggest');
  const link = () => box() && box().querySelector('a');
  return { window, run, box, link };
}

test('offers the first browser language that has an alternate', () => {
  const en = visit('/saju/', ['en-US', 'ko']);
  assert.equal(en.link().getAttribute('href'), '/en/saju/');
  assert.equal(en.link().textContent, 'View in English');
  assert.equal(en.link().getAttribute('hreflang'), 'en');
  assert.equal(en.box().textContent.includes('This page is also available in English.'), true);
  const ja = visit('/saju/', ['fr-FR', 'ja']);
  assert.equal(ja.link().getAttribute('href'), '/ja/saju/');
  assert.equal(ja.link().textContent, '日本語で見る');
});

test('stays silent when the browser reaches the page language first', () => {
  assert.equal(visit('/saju/', ['ko-KR', 'en']).box(), null);
  assert.equal(visit('/en/saju/', ['en', 'ko']).box(), null);
});

test('offers Korean on an English page', () => {
  const page = visit('/en/saju/', ['ko-KR']);
  assert.equal(page.link().getAttribute('href'), '/saju/');
  assert.equal(page.link().textContent, '한국어로 보기');
});

test('maps Chinese scripts', () => {
  assert.equal(visit('/saju/', ['zh-HK']).link().getAttribute('href'), '/zh-tw/saju/');
  assert.equal(visit('/saju/', ['zh-Hant-TW']).link().getAttribute('href'), '/zh-tw/saju/');
  assert.equal(visit('/saju/', ['zh-CN']).link().getAttribute('href'), '/zh/saju/');
  assert.equal(visit('/saju/', ['zh']).link().textContent, '查看简体中文版');
  assert.equal(visit('/saju/', ['zh-TW']).link().textContent, '查看繁體中文版');
  assert.equal(visit('/zh-tw/saju/', ['zh-CN', 'ko']).link().getAttribute('href'), '/zh/saju/');
  assert.equal(visit('/zh/saju/', ['zh-CN']).box(), null);
});

test('uses the root table only on /', () => {
  assert.equal(visit('/', ['ja'], { alternates: [] }).link().getAttribute('href'), '/ja/');
  assert.equal(visit('/checkout/', ['ja'], { alternates: [] }).box(), null);
});

test('uses the alternate path, not its host', () => {
  const page = visit('/saju/', ['en'], { links: { en: 'https://code-destiny.com/en/saju/' } });
  assert.equal(page.link().getAttribute('href'), '/en/saju/');
  const staging = visit('/saju/', ['en'], { links: { en: 'https://code-destiny.com/en/saju/?utm=1#top' } });
  assert.equal(staging.link().getAttribute('href'), '/en/saju/');
});

test('never shows after an explicit choice or dismissal', () => {
  assert.equal(visit('/saju/', ['en'], { cookie: 'cd_locale_explicit=1' }).box(), null);
  assert.equal(visit('/saju/', ['en'], { storage: { cd_lang_explicit: '1' } }).box(), null);
  assert.equal(visit('/saju/', ['en'], { storage: { cd_lang_suggest_dismissed: '1' } }).box(), null);
  assert.equal(visit('/saju/', ['en'], { search: '?lang=ko' }).box(), null);
  assert.equal(visit('/saju/', ['en'], { appLanguage: 'ko' }).box(), null);
});

test('close removes it and remembers', () => {
  const page = visit('/saju/', ['en']);
  const close = page.box().querySelector('button');
  assert.equal(close.getAttribute('type'), 'button');
  assert.equal(close.getAttribute('aria-label'), 'Close');
  close.click();
  assert.equal(page.box(), null);
  assert.equal(page.window.localStorage.getItem('cd_lang_suggest_dismissed'), '1');
  page.window.__cdLangSuggestLoaded = false;
  page.run();
  assert.equal(page.box(), null);
});

test('runs only once per page', () => {
  const page = visit('/saju/', ['en']);
  page.run();
  assert.equal(page.window.document.querySelectorAll('#cd-lang-suggest').length, 1);
});

test('is a non-translatable region reachable by keyboard', () => {
  const box = visit('/saju/', ['en']).box();
  assert.equal(box.getAttribute('translate'), 'no');
  assert.equal(box.getAttribute('role'), 'region');
  assert.equal(box.style.position, 'fixed');
  assert.notEqual(box.querySelector('a[href]'), null);
  assert.notEqual(box.querySelector('button[type=button]'), null);
});

test('survives storage that throws', () => {
  const dom = new JSDOM('<!doctype html><html lang="ko"><head><link rel="alternate" hreflang="en" href="https://code-destiny.com/en/saju/"></head><body></body></html>', {
    url: 'https://code-destiny.com/saju/',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  Object.defineProperty(window.navigator, 'languages', { value: ['en'], configurable: true });
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); }, configurable: true });
  assert.doesNotThrow(() => window.eval(source));
  const box = window.document.getElementById('cd-lang-suggest');
  assert.notEqual(box, null);
  assert.doesNotThrow(() => box.querySelector('button').click());
  assert.equal(window.document.getElementById('cd-lang-suggest'), null);
});

test('x-default is not an alternate', () => {
  assert.equal(visit('/saju/', ['en'], { alternates: ['x-default'] }).box(), null);
});

test('never navigates by itself', () => {
  const page = visit('/saju/', ['en']);
  assert.equal(page.window.location.href, 'https://code-destiny.com/saju/');
});

test('falls back to navigator.language when languages is missing', () => {
  const dom = new JSDOM('<!doctype html><html><head><link rel="alternate" hreflang="ja" href="https://code-destiny.com/ja/saju/"></head><body></body></html>', { url: 'https://code-destiny.com/saju/', runScripts: 'outside-only' });
  Object.defineProperty(dom.window.navigator, 'languages', { value: undefined, configurable: true });
  Object.defineProperty(dom.window.navigator, 'language', { value: 'ja-JP', configurable: true });
  dom.window.eval(source);
  assert.equal(dom.window.document.querySelector('#cd-lang-suggest a').getAttribute('href'), '/ja/saju/');
});

test('is wired from the layout and the native language runtime, never from server output', () => {
  assert.match(readFileSync('app/layout.js', 'utf8'), /<Script src="\/js\/cd-lang-suggest\.js" strategy="lazyOnload" \/>/);
  const native = readFileSync('js/cd-lang-native.js', 'utf8');
  assert.match(native, /script\.src = '\/js\/cd-lang-suggest\.js'/);
  assert.doesNotMatch(native, /cd-lang-suggest['"]\s*\)?\s*\.(innerHTML|insertAdjacent)/);
  assert.doesNotMatch(readFileSync('app/layout.js', 'utf8'), /id=["']cd-lang-suggest["']/);
});

test('moves below the first visible h1 only when it overlaps in the top half', () => {
  const rectOf = (top, bottom) => () => ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top });
  function run(h1Rect) {
    const dom = new JSDOM('<!doctype html><html lang="ko"><head><link rel="alternate" hreflang="en" href="https://code-destiny.com/en/saju/"></head><body><h1>title</h1></body></html>', { url: 'https://code-destiny.com/saju/', runScripts: 'outside-only' });
    const { window } = dom;
    Object.defineProperty(window.navigator, 'languages', { value: ['en'], configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    window.document.querySelector('h1').getBoundingClientRect = rectOf(...h1Rect);
    window.HTMLDivElement.prototype.getBoundingClientRect = function () { return this.style.top ? rectOf(parseInt(this.style.top, 10), parseInt(this.style.top, 10) + 60)() : rectOf(8, 68)(); };
    window.eval(source);
    return window.document.getElementById('cd-lang-suggest').style.top;
  }
  assert.equal(run([40, 120]), '128px');
  assert.equal(run([200, 260]), '8px');
  assert.equal(run([30, 500]), '8px');
});
