import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';
import { renderYehwaHome } from '../../lib/marketing/yehwa-home.mjs';

const html = readFileSync('index.html', 'utf8');
const hero = html.slice(html.indexOf('<div class="yh-hero yh-entry-scene"'), html.indexOf('<section class="yh-finder"'));
const document = new JSDOM(hero).window.document;
const css = postcss.parse(readFileSync('styles/yehwa-home.css', 'utf8'));
const declarations = selector => {
  const result = [];
  css.walkRules(selector, rule => result.push(Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]))));
  return result;
};

test('the welcome area links directly to the finder without a loading gate', () => {
  assert.equal(document.querySelector('#cdhTitle').textContent.replace(/\s/g,''), '오늘은어떤이야기가궁금하세요?');
  const cta = document.querySelector('.yh-finder-cta');
  assert.equal(cta.getAttribute('href'), '#homeFinder');
  assert.equal(cta.textContent.trim(), '나에게 맞는 상담 찾기');
  assert.ok(cta.classList.contains('cd-yehwa-button--primary'));
});

test('the finder action uses a paired foreground and background even after the link has been visited', () => {
  const rules = declarations(/a\.yh-finder-cta.*:visited/s);
  assert.ok(rules.some(rule => rule.color?.includes('--cd-cta-primary-ink') && rule.background?.includes('--cd-cta-primary-bg')));
  assert.ok(declarations('.yh-greeting .yh-finder-cta span').some(rule => rule.color === 'inherit'));
});

test('each visit selects one correctly sized original character with a static fallback', () => {
  const loader = readFileSync('js/core/home-yeoni-portrait.js', 'utf8');
  for (const [number, form, suffix, width, height] of [
    [0.1, 'human', '/images/home/yeoni-expressions/human-portrait-320.webp', 600, 720],
    [0.9, 'pig', '/images/home/illustrated/yeoni-character-480.webp', 800, 800]
  ]) {
    const dom = new JSDOM('<div data-home-yeoni><script></script></div>', { runScripts: 'outside-only' });
    try {
      const stage = dom.window.document.querySelector('[data-home-yeoni]');
      Object.defineProperty(dom.window.document,'currentScript',{value:stage.querySelector('script')});
      dom.window.Math.random = () => number;
      dom.window.eval(loader);
      dom.window.eval(loader);
      assert.equal(stage.dataset.form, form);
      assert.equal(stage.querySelectorAll('img').length, 1);
      const image = stage.querySelector('img');
      assert.equal(image.getAttribute('src'), suffix);
      assert.equal(image.width, width);
      assert.equal(image.height, height);
    } finally { dom.window.close(); }
  }
  assert.ok(document.querySelector('noscript img[src$="yeoni-character-480.webp"]'));
  assert.equal(new URL(document.querySelector('[data-home-yeoni] script[src]').getAttribute('src'), 'https://example.test').pathname, '/js/core/home-yeoni-portrait.js');
  const backdrop = document.querySelector('picture.yh-garden-picture');
  assert.equal(backdrop.querySelector('img').fetchPriority || backdrop.querySelector('img').getAttribute('fetchpriority'), 'high');
  assert.ok(backdrop.querySelector('source[data-yh-garden-night][srcset$="night-1280.webp"]'));
  assert.ok(backdrop.querySelector('source[media="(max-width:600px)"][srcset$="garden-640.webp"]'));
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


test('the welcome action remains available without catalog data or character frames', () => {
  const rendered = new JSDOM(renderYehwaHome([])).window.document;
  const link = rendered.querySelector('.yh-finder-cta');
  assert.equal(link.getAttribute('href'), '#homeFinder');
  assert.ok(rendered.querySelector(link.getAttribute('href')));
});
