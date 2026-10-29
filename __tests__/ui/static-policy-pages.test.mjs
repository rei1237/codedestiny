import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'parse5';
import { STATIC_POLICY_ROUTES, policyStaticPath, isStaticPolicyPath } from '../../lib/navigation/static-policy-routes.mjs';

const read = (file) => fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
const walk = (node, fn) => { fn(node); for (const child of node.childNodes || []) walk(child, fn); };

test('policy document navigation only matches exact canonical and alias paths', () => {
  for (const pathname of ['/privacy', '/privacy-policy/', '/terms/', '/contact-us']) assert.ok(isStaticPolicyPath(pathname));
  for (const pathname of ['/api/privacy', '/privacy/settings', '/en/privacy', '/', null]) assert.equal(isStaticPolicyPath(pathname), false);
});

for (const route of STATIC_POLICY_ROUTES) test(`${route.canonical} is complete static HTML without hydration`, () => {
  const html = read('public' + policyStaticPath(route));
  assert.doesNotMatch(html, /\/_next\/|__next_f|data-action="cd/);
  assert.match(html, /class="policy-site-header"/);
  assert.match(html, /class="policy-site-footer"/);
  assert.match(html, /class="policy-main-nav"/);
  // 2026-10-16 "직관성": 푸터는 React 푸터와 같은 최소 규격(전문성 한 줄·정책 링크·안내·사업자 정보)이다.
  assert.match(html, /class="policy-footer-byline"><a href="\/about\/#author"/);
  assert.match(html, /<a href="\/privacy\/" class="is-strong">개인정보처리방침<\/a>/);
  assert.match(html, /class="policy-business"/);
  assert.doesNotMatch(html.split('<footer')[1], /policy-footer-grid|오락/);
  assert.match(html, /src="\/icons\/app-logo-512\.webp"/);
  if (route.key === 'about') {
    assert.match(html, /class="cd-service-intro"/);
    assert.match(html, /마음은 가볍게/);
    assert.match(html, /href="\/styles\/service-intro\.css\?v=/);
    assert.match(html, /id="service-details"/);
    assert.match(html, /id="author"/);
    assert.doesNotMatch(html, /9,900원|4,900원|운영 반영 전|게시용 이미지/);
  } else {
    assert.match(html, /<a href="\/ggulggul\/"[^>]*>운세 둘러보기<\/a>/);
    assert.match(html, /<a href="\/records\/"[^>]*>내 결과 다시 보기<\/a>/);
    assert.doesNotMatch(html, /href="\/styles\/service-intro\.css/);
  }
  assert.match(html, /<meta name="robots" content="index, follow">/);
  const publisherId = read('ads.txt').match(/^google\.com,\s*(pub-\d+),/m)[1];
  assert.ok(html.split('</head>')[0].includes(`<meta name="google-adsense-account" content="ca-${publisherId}">`));
  const ids = new Set();
  const anchors = [];
  const scripts = [];
  const languages = {};
  walk(parse(html), (node) => {
    const attrs = Object.fromEntries((node.attrs || []).map((attr) => [attr.name, attr.value]));
    if (attrs.id) {
      assert.ok(!ids.has(attrs.id), `duplicate id: ${attrs.id}`);
      ids.add(attrs.id);
    }
    if (node.tagName === 'a' && attrs.href?.startsWith('#')) anchors.push(attrs.href.slice(1));
    if (node.tagName === 'script' && attrs.src) scripts.push(attrs.src);
    if (node.tagName === 'link' && attrs.rel === 'canonical') assert.equal(new URL(attrs.href).pathname, route.canonical + '/');
    if (node.tagName === 'link' && attrs.hreflang) languages[attrs.hreflang] = attrs.href;
  });
  if (['terms', 'privacy', 'contact'].includes(route.key)) {
    assert.equal(languages.ko, `https://code-destiny.com${route.canonical}/`);
    assert.equal(languages['x-default'], languages.ko);
    for (const locale of ['ja', 'en', 'zh']) assert.ok(languages[locale]?.startsWith(`https://code-destiny.com/${locale}/`), `${route.key}: missing return link for ${locale}`);
  }
  for (const anchor of anchors) assert.ok(ids.has(anchor), `broken section anchor: ${anchor}`);
  const expectedScripts = route.key === 'contact' ? ['/js/static-policy-contact.js']
    : route.key === 'faq' ? ['/js/faq-search.js'] : [];
  assert.deepEqual(scripts.map((src) => src.split('?')[0]), expectedScripts);
  if (route.key === 'faq') {
    assert.match(html, /<script type="module" src="\/js\/faq-search\.js\?v=/);
  }
});

test('static contact composes mail without an API request and has a copy fallback', async () => {
  const events = {};
  const copyEvents = {};
  const status = {};
  const form = { getAttribute: () => 'support@example.invalid', addEventListener: (name, fn) => { events[name] = fn; }, insertAdjacentElement: () => {} };
  const copy = { addEventListener: (name, fn) => { copyEvents[name] = fn; } };
  const window = { location: { href: '' } };
  vm.runInNewContext(read('js/static-policy-contact.js'), {
    window,
    document: { querySelector: (selector) => selector === '[data-policy-contact]' ? form : copy, createElement: () => Object.assign(status, { setAttribute() {} }) },
    navigator: { clipboard: { writeText: async () => { throw new Error('denied'); } } },
    FormData: class { get(key) { return { name: '홍길동', email: 'reply@example.invalid', message: '문의 & 확인' }[key]; } },
    encodeURIComponent,
  });
  let prevented = false;
  events.submit({ preventDefault: () => { prevented = true; } });
  assert.ok(prevented);
  const mailto = new URL(window.location.href);
  assert.equal(mailto.protocol, 'mailto:');
  assert.equal(mailto.pathname, 'support@example.invalid');
  assert.equal(mailto.searchParams.get('subject'), '[Code Destiny 문의] 홍길동');
  await copyEvents.click();
  assert.ok(status.textContent.includes('support@example.invalid'));
});
