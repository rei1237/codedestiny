import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
import {brandCopy} from '../../lib/seo/brand-copy.mjs';

// `/` 교체(Task 5)의 정적 검사. 웹 빌드는 진입 웹툰, 앱 빌드(IS_APP_BUILD)는 기존 서비스 선택 카드를 그대로 둔다.
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const page = read('app/page.js');
const analytics = read('js/core/analytics.js');

test('page.js: EntryWebtoon 을 import 하고 !IS_APP_BUILD 분기에서만 렌더한다', () => {
  assert.match(page, /import EntryWebtoon from ["']@\/app\/_entry\/EntryWebtoon["']/);
  assert.match(page, /\{!IS_APP_BUILD\s*\?\s*<EntryWebtoon\s*\/>\s*:/);
  assert.equal((page.match(/<EntryWebtoon\b/g) || []).length, 1);
});

test('page.js: 앱 빌드 분기는 서비스 선택 카드(CARDS)를 그대로 둔다', () => {
  assert.match(page, /const CARDS = \[/);
  assert.match(page, /CARDS\.map\(/);
  assert.match(page, /id="homeCardTitle"/);
  assert.match(page, /꿀꿀 운세에서 어떤 운세를 만나볼까요\?/);
});

test('page.js: 레거시 진입, 푸터, JSON-LD 는 그대로 남는다', () => {
  assert.equal((page.match(/<LegacyHomeEntry \/>/g) || []).length, 1);
  assert.match(page, /<footer className=\{styles\.footer\}>/);
  assert.match(page, /FOOTER_LINKS\.map/);
  assert.match(page, /buildWebPageJsonLd\(/);
  assert.match(page, /buildAuthorPersonJsonLd\(/);
  assert.equal((page.match(/buildServiceJsonLd\(\{/g) || []).length, 2);
  assert.match(page, /serializeJsonLd\(/);
});

test('page.js: 제목은 homeSearchTitle, canonical 은 /', () => {
  assert.match(page, /const HOME_TITLE = brandCopy\(["']homeSearchTitle["']\)/);
  assert.match(page, /title:\s*\{\s*absolute:\s*HOME_TITLE\s*\}/);
  assert.match(page, /canonical:\s*service\.homeUrl/);
  assert.equal(brandCopy('homeSearchTitle'), '대통령 운세를 미리 짚은 명리학자가 만든 운세 | 꿀꿀 운세');
});

test('page.js: description 은 새 문구이고 금지 표현이 없다', () => {
  const match = page.match(/const HOME_DESCRIPTION = "([^"]+)"/);
  assert.ok(match, 'HOME_DESCRIPTION');
  const description = match[1];
  assert.ok(description.length >= 90 && description.length <= 150, `길이 ${description.length}`);
  assert.doesNotMatch(description, /적중|1위|최고|100%|1년 전|대통령|정치|누적|[0-9,]+\s*명/);
  assert.notEqual(description, '꽃돼지 연이와 영냥이를 만나는 꿀꿀 운세. 사주·타로와 주제별 운세를 웹에서 살펴보고, Android 앱은 Google Play에서 설치하세요.');
});

test('analytics.js: entry_webtoon 이 진입 위치·고민 표면 허용 목록에 있다', () => {
  assert.match(analytics, /ENTRY_FROM = \/\^\(entry_webtoon\|/);
  assert.match(analytics, /pick\(p\.surface, \['entry_webtoon'/);
});

test('EntryWebtoon: 첫 그림은 fetchPriority(카멜) high, 소문자 fetchpriority 속성은 쓰지 않는다', () => {
  const source = read('app/_entry/EntryWebtoon.tsx');
  // React 19(Next 앱 라우터)는 소문자 fetchpriority 를 모르는 DOM 속성으로 경고한다.
  assert.match(source, /fetchPriority:\s*'high'/);
  assert.doesNotMatch(source, /fetchpriority:/);
});

// 웹 `/` 의 페이지 안 링크(헤더 "상담 추천" 등)가 실제 렌더에 대응하는 id 를 가져야 한다(죽은 앵커 방지).
const require = createRequire(import.meta.url), Module = require('node:module');
const cssModules = {name: 'css-module-names', setup(builder) {
  builder.onLoad({filter: /\.module\.css$/}, () => ({contents: 'export default new Proxy({}, {get: (_, key) => String(key)});', loader: 'js'}));
}};
const nextImage = {name: 'next-image-adapter', setup(builder) {
  builder.onResolve({filter: /^next\/image$/}, () => ({path: 'next-image', namespace: 'next-image'}));
  builder.onLoad({filter: /.*/, namespace: 'next-image'}, () => ({contents: "import React from 'react';export default function Image(props){return React.createElement('img',props);}", loader: 'js', resolveDir: process.cwd()}));
}};
async function renderWebEntry() {
  const bundle = await build({
    stdin: {contents: "export {default} from './app/_entry/EntryWebtoon';", resolveDir: process.cwd(), loader: 'tsx'},
    bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic', loader: {'.css': 'empty'},
    external: ['react', 'react/jsx-runtime', 'react-dom'], plugins: [cssModules, nextImage],
  });
  const loaded = new Module(path.resolve('entry-webtoon-root-render.cjs'));
  loaded.paths = Module._nodeModulePaths(process.cwd());
  loaded._compile(bundle.outputFiles[0].text, loaded.id);
  const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
  return renderToStaticMarkup(React.createElement(loaded.exports.default));
}

test('웹 /: 웹툰 H1 은 id=homeCardTitle 을 가진다(레거시 /#homeCardTitle 앵커가 페이지 안에 남는다)', async () => {
  const html = await renderWebEntry();
  assert.match(html, /<h1[^>]*\sid="homeCardTitle"/);
});

test('웹 /: 헤더의 페이지 안 링크(href="#...")는 모두 웹 렌더에 같은 id 가 있다', async () => {
  const html = await renderWebEntry();
  const header = page.match(/<header className=\{styles\.brandRow\}>[\s\S]*?<\/header>/)[0];
  const webLinks = [...header.matchAll(/!IS_APP_BUILD && <a href="#([^"]+)"/g)].map(match => match[1]);
  assert.ok(webLinks.length >= 1, '웹 헤더에 페이지 안 링크가 있어야 한다');
  for (const id of webLinks) assert.ok(html.includes(`id="${id}"`), `#${id} 대응 id 없음`);
  assert.ok(webLinks.includes('entry-question'), '상담 추천은 고민 고르기 장으로 간다');
});

test('웹 /: MobileHomeNav 는 웹 분기에 없다(고정 CTA 가 대신한다)', () => {
  assert.doesNotMatch(page, /MobileHomeNav/);
});
