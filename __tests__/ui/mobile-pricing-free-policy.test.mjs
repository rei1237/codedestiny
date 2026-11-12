import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inspectMobilePricingParity } from '../../scripts/inspect-mobile-pricing-parity.mjs';
import { listBillingFeatures } from '../../worker/lib/billing-feature-registry.js';
import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';

const catalog = listBillingFeatures();
const catalogBefore = JSON.stringify(catalog);
const entries = new Map([
  ...(catalog.legacyFeatureTable || []),
  ...(catalog.categories || []).flatMap(category => [category, ...(category.subFeatures || [])]),
].map(entry => [entry.featureKey, entry]));
const tile = (key, coins, krw, extra = '') => `<button data-feature-key="${key}" data-coin-cost="${coins}"${krw === undefined ? '' : ` data-price-krw="${krw}"`} ${extra}></button>`;
const check = html => inspectMobilePricingParity(html, catalog);
const passes = html => {
  const result = check(html);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.priceMismatches, []);
};

for (const key of ['flower-fc', 'olympus-fc', 'animal-destiny-unlock', 'destiny-bias-analyze']) {
  test(`${key}: exact free zero passes while historical prices and hidden locks fail`, () => {
    assert.equal(isFreeFortuneFeatureKey(key), true);
    const historical = entries.get(key);
    assert.ok(historical.coinPrice > 0);
    passes(tile(key, 0, 0));
    passes(tile(key, 0)); // Some cards put their KRW badge in a child element.
    passes(`<button data-feature-key="${key}" data-tile-lock-cost="0"></button>`);
    for (const html of [
      tile(key, historical.coinPrice, historical.amountKRW),
      tile(key, 0, historical.amountKRW),
      tile(key, 0, 'invalid'),
      tile(key, 0, ''),
      tile(key, 'invalid', 0),
      tile(key, '', 0),
      tile(key, 0, 0, 'data-tile-lock-cost="50"'),
      tile(key, 0, 0, 'data-tile-lock-cost="invalid"'),
      tile(key, 0, 0, 'data-tile-lock-cost=""'),
    ]) assert.equal(check(html).priceMismatches.length, 1, html);
  });
}

test('paid Light/Daewun, bundle, LLM, Guardian and tarot still require historical prices', () => {
  for (const key of ['section_summary', 'section_daewun', 'saju_lifetime_bundle', 'ziwei-ai-consultation', 'saju-guardian-unlock', 'tarot-mindscan']) {
    assert.equal(isFreeFortuneFeatureKey(key), false, key);
    const historical = entries.get(key);
    passes(tile(key, historical.coinPrice, historical.amountKRW));
    assert.equal(check(tile(key, 0, 0)).priceMismatches.length, 1, key);
    assert.equal(check(tile(key, historical.coinPrice + 1, historical.amountKRW)).priceMismatches.length, 1, key);
  }
  assert.equal(entries.get('saju_lifetime_bundle').amountKRW, 29000);
});

test('unknown suffixes are not made free and historical catalogue is never mutated', () => {
  assert.equal(isFreeFortuneFeatureKey('flower-fc-extra'), false);
  assert.deepEqual(check(tile('flower-fc-extra', 0, 0)).missing, ['flower-fc-extra']);
  assert.equal(JSON.stringify(catalog), catalogBefore);
});

test('real shell has no pricing drift under the exact current free policy', () => {
  passes(fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8'));
});
