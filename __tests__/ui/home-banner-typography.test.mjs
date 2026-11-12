import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';
import { renderYehwaHome } from '../../lib/marketing/yehwa-home.mjs';

const html = readFileSync('index.html', 'utf8');
const hero = html.match(/<div class="yh-hero yh-entry-scene"[\s\S]*?(?=    <section class="cdh-(?:promo|free)")/)[0];
const document = new JSDOM(hero).window.document;
const css = postcss.parse(readFileSync('styles/yehwa-home.css', 'utf8'));
const declarations = selector => {
  const result = [];
  css.walkRules(selector, rule => result.push(Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]))));
  return result;
};

test('banner keeps its copy, heading translation keys, and free-entry action', () => {
  assert.equal(document.querySelector('#cdhTitle').textContent, '오늘은 어떤 이야기가궁금하세요?');
  assert.equal(document.querySelector('.yh-greeting p').textContent, '사주·타로와 고민별 상담.무료 만세력부터 시작해 보세요.');
  assert.deepEqual([...document.querySelectorAll('[data-cd-trans]')].map(node => node.dataset.cdTrans), ['home.yehwa.titleA', 'home.yehwa.titleB']);
  const cta = document.querySelector('.yh-free-start');
  assert.equal(cta.textContent, '무료 만세력 시작하기');
  assert.equal(cta.getAttribute('href'), '/?action=cdOneStepFreeSajuEntry');
  assert.equal(cta.dataset.action, 'cdOneStepFreeSajuEntry');
  assert.equal(cta.dataset.cdServiceId, 'saju');
  assert.ok(cta.classList.contains('cd-yehwa-button'));
  assert.ok(cta.classList.contains('cd-yehwa-button--primary'));
  assert.equal(cta.querySelector('svg').getAttribute('aria-hidden'), 'true');
  assert.equal(cta.querySelector('svg').getAttribute('focusable'), 'false');
});

test('banner retains the responsive original character and both garden themes', () => {
  const img = document.querySelector('#honeypigLogo');
  assert.equal(img.dataset.character, 'yeoni');
  assert.equal(img.getAttribute('src'), '/images/home/illustrated/yeoni-character-480.webp');
  assert.equal(img.getAttribute('srcset'), '/images/home/illustrated/yeoni-character-320.webp 320w, /images/home/illustrated/yeoni-character-480.webp 480w, /images/home/illustrated/yeoni-character-800.webp 800w');
  assert.equal(img.getAttribute('sizes'), '(max-width:600px) 156px, 270px');
  assert.equal(img.getAttribute('width'), '800');
  assert.equal(img.getAttribute('height'), '800');
  assert.equal(img.getAttribute('fetchpriority'), 'high');
  assert.equal(img.getAttribute('decoding'), 'async');
  assert.equal(img.parentElement.getAttribute('aria-hidden'), 'true');
  assert.match(css.toString(), /yeoni-moon-garden-(?:1280|640)\.webp/);
  assert.match(css.toString(), /html\.neo-mode \.yh-hero\{--yh-garden:url\("\/images\/home\/illustrated\/yeoni-moon-garden-night-1280\.webp"\)/);
});

test('the shared primary component owns the banner button palette and shape', () => {
  const [cta] = declarations('.yh-home .yh-free-start');
  assert.equal(cta['min-height'], '52px');
  assert.equal(cta['margin-top'], '20px');
  assert.equal(cta['font-family'], 'var(--font-body)');
  assert.equal(cta.color, 'var(--cd-cta-primary-ink)');
  assert.equal(cta['white-space'], 'normal');
  for (const rules of declarations('.yh-home .yh-free-start')) {
    for (const property of ['background', 'background-color', 'border-radius', 'box-shadow']) assert.equal(rules[property], undefined);
  }
  assert.equal(declarations('.yh-free-start::before')[0]['pointer-events'], 'none');
  assert.equal(declarations('.yh-free-start__label')[0]['min-width'], '0');
});

test('banner typography and layout stay fluid instead of clipping enlarged or translated copy', () => {
  assert.equal(declarations('.yh-greeting')[0]['min-width'], '0');
  assert.equal(declarations('.yh-greeting h1')[0]['line-height'], '1.32');
  assert.equal(declarations('.yh-greeting h1')[0]['font-weight'], '400');
  assert.ok(declarations('.yh-entry-scene .yh-greeting h1').some(rule => rule['font-size'] === 'calc(26rem / 14)'));
  assert.equal(declarations('.yh-greeting p')[0]['line-height'], '1.72');
  assert.equal(declarations('.yh-greeting p')[0]['margin-top'], '12px');
  assert.equal(declarations('.yh-hero')[0]['grid-template-columns'], 'minmax(0,1.2fr) minmax(0,1fr)');
  assert.ok(declarations('.yh-entry-scene').some(rule => rule.padding === '26px 24px 14px' && rule['grid-template-columns'] === 'minmax(0,1fr)'));
  css.walkRules(rule => {
    if (!/yh-(?:greeting|entry-scene|free-start)/.test(rule.selector) || /(?: svg|\.yh-art)$/.test(rule.selector)) return;
    rule.walkDecls(decl => {
      assert.notEqual(decl.prop, 'height', rule.selector + ' must grow with its content');
      assert.ok(!(decl.prop === 'white-space' && decl.value === 'nowrap'), rule.selector + ' must allow wrapping');
      assert.ok(!(decl.prop === 'overflow' && /hidden|clip/.test(decl.value)), rule.selector + ' must not clip enlarged copy');
    });
  });
});


test('the source renderer preserves the same CTA and its conditional escaped action', () => {
  const catalog = [{ id: 'saju', price: '무료 시작', quickHref: '/?action=cdOneStepFreeSajuEntry', action: 'cdOneStepFreeSajuEntry' }];
  const rendered = new JSDOM(renderYehwaHome(catalog)).window.document;
  assert.equal(rendered.querySelector('.yh-free-start').outerHTML, document.querySelector('.yh-free-start').outerHTML);
  assert.equal(rendered.querySelector('.yh-art').outerHTML, document.querySelector('.yh-art').outerHTML);
  assert.equal(new JSDOM(renderYehwaHome([])).window.document.querySelector('.yh-free-start'), null);
  const escaped = renderYehwaHome([{ ...catalog[0], quickHref: '/?value="&<>', action: 'go"&<>' }]);
  assert.ok(escaped.includes('href="/?value=&quot;&amp;&lt;&gt;"'));
  assert.ok(escaped.includes('data-action="go&quot;&amp;&lt;&gt;"'));
});


test('banner title translation spans inherit the display font and its real weight', () => {
  const spans = [...document.querySelectorAll('.yh-greeting h1 span')];
  assert.equal(spans.length, 2);
  assert.ok(spans.every(span => span.hasAttribute('data-cd-trans')));
  assert.deepEqual(declarations('.yh-greeting h1 span'), [{ 'font-family': 'inherit', 'font-weight': 'inherit' }]);
  assert.equal(declarations('.yh-greeting h1')[0]['font-weight'], '400');
});
