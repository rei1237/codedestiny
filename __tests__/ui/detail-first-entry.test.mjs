import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { renderCraftedDetail } from '../../js/feature-detail-panels.mjs';

const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const capture = html.match(/document\.addEventListener\('click',function\(e\)\{\s*if\(window\.__cdFeatureMarketingPreviewEnabled[\s\S]*?\n  \},true\);/)[0];

test('the shell media optimizer preserves the crafted cover priority and defers later panels', () => {
  const detail = JSON.parse(fs.readFileSync(new URL('../../public/feature-details/neo-operation-room.json', import.meta.url), 'utf8'));
  const dom = new JSDOM(renderCraftedDetail(detail.crafted[0]));
  const patch = fs.readFileSync(new URL('../../js/mobile-interaction-patch.js', import.meta.url), 'utf8');
  const optimize = patch.match(/  function applyMobileMediaPerformance\(root\) \{[^]*?\n  \}/)[0];
  const runtime = { document: dom.window.document, isMobileRuntime: () => true };
  vm.createContext(runtime);
  vm.runInContext(optimize + '\napplyMobileMediaPerformance(document);', runtime);
  const images = [...dom.window.document.querySelectorAll('img')];
  assert.equal(images[0].getAttribute('loading'), 'eager');
  assert.equal(images[0].getAttribute('fetchpriority'), 'high');
  assert.ok(images.slice(1).every(img => img.getAttribute('loading') === 'lazy'));
  dom.window.close();
});
function source(name) {
  return html.match(new RegExp(`  function ${name}\\([^]*?\\n  \\}`))[0];
}
function setup(markup) {
  const dom = new JSDOM(markup, { url: 'https://code-destiny.com/ggulggul/' });
  const opened = [], gates = [], closed = [];
  const runtime = {
    document: dom.window.document, Element: dom.window.Element,
    window: { __cdFeatureMarketingPreviewPaidOnly: true, location: { href: '/ggulggul/' },
      __cdRunPerUseCoinGateFromTile: tile => { gates.push(tile); return true; } },
    LIFE_BOOK_AI_FEATURE_KEY: 'life-book-ai-consultation',
    _pvwIsOpenRptToggle: () => false, _cdShouldSuppressActionDuringScroll: () => false,
    _resolvePreviewData: () => ({ title: 'detail' }),
    _open: (tile, href) => opened.push({ tile, href }), _close: () => closed.push(true),
    setTimeout: fn => fn(),
  };
  vm.createContext(runtime);
  vm.runInContext(['_hasPaidPreviewSignal', '_isPreviewCtaBypass', '_shouldBypassMainVvipPreview', '_runCta'].map(source).join('\n') + '\n' + capture, runtime);
  const click = tile => tile.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return { dom, runtime, opened, gates, closed, click };
}

test('all paid home signature cards open detail before navigating or paying; CTA launches once', () => {
  const cards = [...html.matchAll(/<a\b[^>]*data-cd-service-id="[^"]+"[^>]*>/g)]
    .map(match => match[0]).filter(tag => tag.includes('data-pvw-paid'));
  assert.ok(cards.length >= 4, 'the real home signature cards must be covered');
  for (const markup of cards) {
    const env = setup(markup + '<span>서비스</span></a>');
    const tile = env.dom.window.document.querySelector('a');
    assert.equal(env.click(tile), false, tile.outerHTML);
    assert.equal(env.opened.length, 1);
    assert.equal(env.runtime.window.location.href, '/ggulggul/');
    assert.deepEqual(env.gates, []);
    env.runtime._runCta(tile, tile.getAttribute('href'));
    assert.equal(env.runtime.window.location.href, tile.getAttribute('href'));
    assert.equal(env.opened.length, 1, 'CTA must not open detail again');
    assert.equal(env.closed.length, 1);
    assert.deepEqual(env.gates, [], 'standalone input screen owns its payment');
    env.dom.window.close();
  }
});

test('search results show detail; free entry, saved results and CTA bypass retain their behavior', () => {
  const env = setup('<a id="search" href="/life-book-ai/" data-pvw-paid="1">검색 결과</a>' +
    '<button id="free" data-pvw-free="1" data-action="cdHomeSajuEntry">무료</button>' +
    '<a id="saved" href="/records/?resultId=existing">구매 결과</a>');
  const get = id => env.dom.window.document.getElementById(id);
  assert.equal(env.click(get('search')), false);
  assert.equal(env.opened.length, 1);
  assert.equal(env.click(get('free')), true);
  assert.equal(env.click(get('saved')), true);
  get('search').setAttribute('data-pvw-bypass', '1');
  get('search').setAttribute('data-pvw-cta-bypass', '1');
  assert.equal(env.click(get('search')), true);
  assert.equal(env.opened.length, 1);
  assert.deepEqual(env.gates, []);
  env.dom.window.close();
});

test('legacy paid actions reach their existing gate only after the detail CTA', () => {
  const env = setup('<button data-action="openTarotLoveModal" data-coin-cost="30">타로</button>');
  const tile = env.dom.window.document.querySelector('button');
  env.click(tile);
  assert.equal(env.opened.length, 1);
  assert.deepEqual(env.gates, []);
  env.runtime._runCta(tile, null);
  assert.equal(env.gates.length, 1);
  env.dom.window.close();
});
