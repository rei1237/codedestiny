import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';
import { FEATURE_KEY_PRICE_TABLE, UNLOCK_PRODUCT_BY_FEATURE_KEY } from '../../worker/lib/paid-feature-registry.js';

// Exercise the generator's actual card renderer without writing index.html or public mirrors.
const source = readFileSync(new URL('../../scripts/design/build-home-funnel.mjs', import.meta.url), 'utf8');
const itemsSource = source.match(/const LIGHT_FORTUNES = \[[\s\S]*?\n\];/)?.[0];
const renderer = source.match(/vars\.lightFortunes = LIGHT_FORTUNES\.map\([\s\S]*?\n\}\)\.join\(''\);/)?.[0];
assert.ok(itemsSource && renderer, 'home light-fortune generator remains testable');
assert.match(source, /import \{ isFreeFortuneFeatureKey \} from '\.\.\/\.\.\/lib\/payment\/free-fortune-policy\.mjs'/);
const items = runInNewContext(itemsSource + '\nLIGHT_FORTUNES;');
const productFor = key => FEATURE_KEY_PRICE_TABLE[key] || UNLOCK_PRODUCT_BY_FEATURE_KEY[key];
const fixture = key => ({ name: key, key, href: '/fixture/', image: '/fixture.webp', desc: 'fixture' });
function render(cards = items, prices = FEATURE_KEY_PRICE_TABLE, unlocks = UNLOCK_PRODUCT_BY_FEATURE_KEY) {
  const vars = {};
  runInNewContext(renderer, {
    vars, LIGHT_FORTUNES: cards, isFreeFortuneFeatureKey,
    FEATURE_KEY_PRICE_TABLE: prices, UNLOCK_PRODUCT_BY_FEATURE_KEY: unlocks,
  });
  return JSDOM.fragment(vars.lightFortunes);
}
function assertFree(node) {
  assert.equal(node.textContent, '무료');
  assert.equal(node.getAttribute('data-cd-price-free'), 'true');
  for (const attr of ['data-cd-play-price', 'data-cd-play-feature', 'data-cd-play-kind', 'data-cd-price-key', 'data-price-krw']) {
    assert.equal(node.hasAttribute(attr), false, `${attr} must not restore a paid label`);
  }
}

test('home flower and destiny-bias cards are free without changing their historical price records', () => {
  const document = render();
  assert.equal(document.querySelectorAll('a.cdh-light__item').length, 6);
  for (const [key, href] of [['flower-fc', '/flower/'], ['destiny-bias-analyze', '/saju/destiny-bias/']]) {
    assert.equal(productFor(key).amountKRW, 5000, `${key}: historical price remains intact`);
    assertFree(document.querySelector(`a[href="${href}"] small`));
  }
  for (const card of items.filter(item => !item.key)) assertFree(document.querySelector(`a[href="${card.href}"] small`));
});

// 2026-11-12 무료 전환: 영국 홍차점도 무료 표기, 과거 주문 대조용 가격 기록은 그대로.
test('royal tea is free without changing its historical price record', () => {
  const node = render().querySelector('a[href="/oracle/royal-tea/"] small');
  assert.equal(isFreeFortuneFeatureKey('royal-tea-oracle'), true);
  assert.equal(productFor('royal-tea-oracle').amountKRW, 3000);
  assertFree(node);
});

test('free display comes from the canonical predicate without requiring a historical price', () => {
  for (const key of ['flower-fc', 'destiny-bias-analyze', 'unlock.flower_fc']) {
    assertFree(render([fixture(key)], {}, {}).querySelector('small'));
  }
});

test('light saju, daewun, guardian and actual AI products retain paid display', () => {
  for (const key of ['saju_lifetime_bundle', 'section_daewun', 'saju-guardian-unlock', 'fortune-chat-consultation']) {
    assert.equal(isFreeFortuneFeatureKey(key), false, key);
    const product = productFor(key);
    assert.ok(product?.amountKRW > 0, `${key}: existing paid product`);
    const node = render([fixture(key)]).querySelector('small');
    const prefix = product.accessModel === 'unlock' ? '해금 ' : '1회 ';
    assert.equal(node.textContent, prefix + product.amountKRW.toLocaleString('ko-KR') + '원', key);
    assert.equal(node.getAttribute('data-cd-play-feature'), key);
    assert.equal(node.getAttribute('data-price-krw'), String(product.amountKRW));
    assert.equal(node.hasAttribute('data-cd-price-free'), false);
  }
});

test('unknown keys never become free from a matching prefix or missing price', () => {
  const key = 'flower-fc-new-ai';
  const node = render([fixture(key)], { [key]: { amountKRW: 5000, accessModel: 'perUse' } }, {}).querySelector('small');
  assert.equal(node.textContent, '1회 5,000원');
  assert.equal(node.hasAttribute('data-cd-price-free'), false);
  for (const product of [undefined, { amountKRW: 0 }, { amountKRW: -1 }, { amountKRW: 5000.5 }]) {
    assert.throws(() => render([fixture(key)], { [key]: product }, {}), /Missing light fortune price: flower-fc-new-ai/);
  }
});
