import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { getBillingFeaturePricing } from '../../worker/lib/billing-feature-registry.js';
import { renderFeatureDetailPanels } from '../../js/feature-detail-panels.mjs';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const document = new JSDOM(read('index.html').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')).window.document;

test('VVIP contains expert consultations and fusion while exploratory cards stay discoverable', () => {
  const archive = document.querySelector('#premiumVvipCollection');
  for (const cls of ['human-design', 'ziwei-island', 'destiny-compass', 'nakshatra-codex']) {
    assert.equal(archive.querySelector(`.tarot-tile--${cls}`), null);
    assert.ok(document.querySelector(`#cosmicCollection .tarot-tile--${cls}`));
  }
  assert.ok(archive.querySelector('[data-cd-price-key="fusion-fortune-consultation"]'));
  for (const tile of archive.querySelectorAll('.tarot-tile')) {
    assert.doesNotMatch(tile.querySelector('.cd-card-pricing').textContent, /무료/);
  }
});

test('detail choices show every canonical option and retain the free basic entry', () => {
  assert.equal(renderFeatureDetailPanels(null), '');
  assert.equal(renderFeatureDetailPanels({verification:'source-inventory-only'}), '');
  const items = JSON.parse(read('lib/marketing/feature-visual-details.generated.json')).items;
  for (const [slug, count] of [['destiny-compass', 4], ['master-love-codex', 2], ['tarot-prompt-maker', 4]]) {
    const detail = items[slug];
    assert.equal(detail.priceOptions.length, count, slug);
    const output = new JSDOM(renderFeatureDetailPanels(detail)).window.document;
    assert.equal(output.querySelectorAll('.fortunePriceOptions dd').length, count);
    for (const option of detail.priceOptions) {
      assert.equal(option.amountKRW, getBillingFeaturePricing({featureKey:option.featureKey}).pricing.amountKRW);
    }
    if (slug === 'destiny-compass') assert.match(output.querySelector('.fortunePriceOptions').textContent, /기본 탐색은 무료/);
  }
});

test('free psychology entries cannot seed or advertise the separate paid reading', () => {
  const tile = document.querySelector('.tarot-tile--psychotest');
  assert.equal(tile.getAttribute('href'), '/psychotest/');
  assert.equal(tile.querySelector('.cd-card-pricing').textContent, '무료');
  assert.equal(tile.querySelectorAll('[data-feature-key],[data-cd-price-key],[data-coin-cost],[data-price-krw]').length, 0);
  assert.equal(tile.hasAttribute('data-feature-key'), false);
  assert.match(read('app/mini-games/page.tsx'), /slug: "psychotest"[^\n]*badge: "무료"/);
  assert.equal(document.querySelector('.tarot-tile--human-design').hasAttribute('data-feature-key'), false);
});

test('all numeric discovery badges match the billed feature, including optional courses and ranges', () => {
  const badges = [...document.querySelectorAll('.tarot-tile .tarot-tile__coin-badge')];
  assert.ok(badges.length > 45);
  for (const badge of badges) {
    assert.ok(badge.closest('.cd-card-pricing'), badge.textContent);
    const shown = badge.textContent.match(/\d{1,3}(?:,\d{3})+|\d{4,}/g);
    if (!shown) continue;
    const key = badge.getAttribute('data-cd-price-key');
    assert.ok(key, `Missing price source: ${badge.textContent}`);
    const amount = getBillingFeaturePricing({featureKey:key, reason:badge.getAttribute('data-cd-price-reason')}).pricing.amountKRW;
    assert.equal(Number(shown[0].replaceAll(',', '')), amount, key);
    assert.equal(Number(badge.getAttribute('data-price-krw')), amount, key);
    if (shown.length > 1) {
      const end = getBillingFeaturePricing({featureKey:badge.getAttribute('data-cd-price-key-to'), reason:badge.getAttribute('data-cd-price-reason-to')}).pricing.amountKRW;
      assert.equal(Number(shown[1].replaceAll(',', '')), end, key);
      assert.equal(Number(badge.getAttribute('data-price-krw-to')), end, key);
    }
  }
});

test('catalog refresh preserves free scope and localized units without poisoning reason-specific prices', async () => {
  const dom = new JSDOM('<span class="tarot-tile__coin-badge" data-cd-price-key="destiny-compass-life-voyage" data-price-krw="7000">Basic free · in-depth ₩5,000 per reading</span><span data-cd-price-key="cosmic-soul-meditation" data-cd-price-reason="30 minutes" data-price-krw="5000"></span>', {runScripts:'outside-only'});
  dom.window.fetch = async () => ({ok:true,json:async()=>({legacyFeatureTable:[{featureKey:'destiny-compass-life-voyage',amountKRW:7000,cost:70}]})});
  dom.window.eval(read('js/core/feature-pricing-store.js'));
  const store = dom.window.CodeDestinyFeaturePricingStore;
  store.seedFromMarkup(dom.window.document);
  assert.equal(store.get('cosmic-soul-meditation'), null);
  await store.load();
  const badge = dom.window.document.querySelector('.tarot-tile__coin-badge');
  assert.equal(badge.textContent, 'Basic free · in-depth ₩7,000 per reading');
  badge.textContent = '基本無料 · 詳細 5,000ウォン';
  dom.window.dispatchEvent(new dom.window.Event('cd:locale-ready'));
  assert.equal(badge.textContent, '基本無料 · 詳細 7,000ウォン');
  dom.window.close();
});

for (const file of ['js/core/uiBindings.js', 'js/core/index-inline-runtime.js']) {
  test(`${file}: cached and subsequently loaded images retire placeholders; exhausted errors restore them`, () => {
    const source = read(file);
    const name = file.includes('uiBindings') ? '__bindCollectionImageFallback' : 'bindCollectionImageFallback';
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0);
    const next = source.indexOf('\nfunction ', start + 1);
    // The legacy runtime nests declarations two spaces inside its IIFE.
    const nestedNext = source.indexOf('\n  function ', start + 1);
    const end = Math.min(...[next, nestedNext].filter(value => value > start));
    const context = {};
    vm.runInNewContext(source.slice(start, end), context);
    for (const cached of [true, false]) {
      const listeners = {}, placeholder = {style:{display:'grid'}};
      const img = {complete:cached,naturalWidth:cached?320:0,dataset:{},getAttribute:()=>'/image.webp',setAttribute(){},removeAttribute(){},hasAttribute:()=>false,addEventListener:(event,fn)=>{listeners[event]=fn;},remove(){}};
      context[name](img, [], placeholder, null);
      if (!cached) listeners.load();
      assert.equal(placeholder.style.display, 'none');
      listeners.error();
      assert.equal(placeholder.style.display, '');
    }
  });
}
