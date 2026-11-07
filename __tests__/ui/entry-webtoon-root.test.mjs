import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
