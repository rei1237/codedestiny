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
  assert.match(html, /class="policy-footer-grid"/);
  assert.match(html, /src="\/icons\/app-logo-512\.webp"/);
  assert.match(html, /꽃돼지가 길을 안내할게요/);
  assert.match(html, /<meta name="robots" content="index, follow">/);
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
  assert.equal(scripts.length, route.key === 'contact' ? 1 : 0);
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
