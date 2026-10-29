import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'parse5';
import { JSDOM } from 'jsdom';
import { attachFaqSearch } from '../../js/faq-search.mjs';
import { STATIC_POLICY_ROUTES, policyStaticPath, isStaticPolicyPath } from '../../lib/navigation/static-policy-routes.mjs';

const read = (file) => fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
const walk = (node, fn) => { fn(node); for (const child of node.childNodes || []) walk(child, fn); };

test('shared FAQ ES module searches static questions and restores all results', () => {
  const route = STATIC_POLICY_ROUTES.find((item) => item.key === 'faq');
  const dom = new JSDOM(read('public' + policyStaticPath(route)));
  const root = dom.window.document.querySelector('[data-faq-search]');
  const input = root.querySelector('[data-faq-input]');
  const questions = [...root.querySelectorAll('#faq-results > details')];
  const cleanup = attachFaqSearch(root);
  assert.equal(root.querySelector('[data-faq-controls]').hidden, false);
  input.value = '결제';
  input.dispatchEvent(new dom.window.Event('input'));
  const matches = questions.filter((item) => !item.hidden);
  assert.ok(matches.length > 0 && matches.length < questions.length);
  assert.ok(matches.every((item) => item.textContent.includes('결제')));
  input.value = 'no-matching-faq-9f1b';
  input.dispatchEvent(new dom.window.Event('input'));
  assert.ok(questions.every((item) => item.hidden));
  assert.equal(root.querySelector('[data-faq-empty]').hidden, false);
  root.querySelector('[data-faq-clear]').click();
  assert.ok(questions.every((item) => !item.hidden));
  assert.equal(input.value, '');
  assert.equal(root.querySelector('[data-faq-empty]').hidden, true);
  cleanup();
  assert.equal(root.dataset.faqReady, undefined);
  dom.window.close();
});

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
    : route.key === 'faq' ? ['/js/faq-search.mjs'] : [];
  assert.deepEqual(scripts.map((src) => src.split('?')[0]), expectedScripts);
  if (route.key === 'faq') {
    assert.match(html, /<script type="module" src="\/js\/faq-search\.mjs\?v=/);
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
