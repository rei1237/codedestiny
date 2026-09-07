import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'parse5';
import { STATIC_POLICY_ROUTES, policyStaticPath, isStaticPolicyPath } from '../../lib/navigation/static-policy-routes.mjs';

const read = file => fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
test('policy document navigation only matches the exact policy paths', () => {
  for (const path of ['/privacy', '/privacy-policy/', '/terms/', '/contact-us']) assert.ok(isStaticPolicyPath(path));
  for (const path of ['/api/privacy', '/privacy/settings', '/en/privacy', '/', null]) assert.equal(isStaticPolicyPath(path), false);
});
function walk(node, fn) { fn(node); for (const child of node.childNodes || []) walk(child, fn); }
for (const route of STATIC_POLICY_ROUTES) test(`${route.canonical} is a complete policy document without hydration`, () => {
  const html = read('public' + policyStaticPath(route));
  assert.doesNotMatch(html, /\/_next\/|__next_f|data-action="cd/);
  assert.ok(html.includes('policy-site-header') && html.includes('policy-site-footer'));
  assert.ok(html.includes('<meta name="robots" content="index, follow">'), 'preserve the existing indexable policy metadata');
  const ids = new Set(), anchors = [], scripts = [];
  walk(parse(html), node => {
    const attrs = Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
    if (attrs.id) {assert.ok(!ids.has(attrs.id), `duplicate id: ${attrs.id}`);ids.add(attrs.id);}
    if (node.tagName === 'a' && attrs.href?.startsWith('#')) anchors.push(attrs.href.slice(1));
    if (node.tagName === 'script') scripts.push(attrs);
    if (node.tagName === 'link' && attrs.rel === 'canonical') assert.equal(new URL(attrs.href).pathname, route.canonical + '/');
  });
  for (const anchor of anchors) assert.ok(ids.has(anchor), `broken section anchor: ${anchor}`);
  assert.equal(scripts.filter(s => s.src).length, route.key === 'contact' ? 1 : 0);
});

test('static contact keeps mail-app composition and copy failure fallback without API requests', async () => {
  const events = {}, copyEvents = {}, status = {};
  const form = { getAttribute: () => 'support@example.invalid', addEventListener: (name, fn) => { events[name] = fn; }, insertAdjacentElement: () => {} };
  const copy = {addEventListener: (name, fn) => {copyEvents[name] = fn;}};
  const window = {location: {href: ''}};
  vm.runInNewContext(read('js/static-policy-contact.js'), {
    window,
    document: {querySelector: selector => selector === '[data-policy-contact]' ? form : copy, createElement: () => Object.assign(status, {setAttribute() {}})},
    navigator: {clipboard: {writeText: async () => {throw new Error('denied');}}},
    FormData: class {get(key) {return {name:'홍길동',email:'reply@example.invalid',message:'문의 & 확인'}[key];}},
    encodeURIComponent,
  });
  let prevented = false;
  events.submit({preventDefault: () => {prevented = true;}});
  assert.ok(prevented);
  const mailto = new URL(window.location.href);
  assert.equal(mailto.protocol, 'mailto:');
  assert.equal(mailto.pathname, 'support@example.invalid');
  assert.equal(mailto.searchParams.get('subject'), '[Code Destiny 문의] 홍길동');
  assert.ok(mailto.searchParams.get('body').includes('문의 & 확인'));
  await copyEvents.click();
  assert.ok(status.textContent.includes('support@example.invalid'));
});
