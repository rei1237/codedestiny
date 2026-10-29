import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLocalizedListings } from '../../scripts/export-play-localized-listings.mjs';
import { listAppContentTiers } from '../../worker/lib/app-store-pricing.js';
import { CURRENT_PASS_GOOGLE_PLAY_APPROVED_PRODUCT_IDS } from '../../lib/payment/pass-policy.js';

test('review export covers current products only and never embeds a local selling price in titles', () => {
  const result = buildLocalizedListings();
  assert.equal(result.mode, 'review-only');
  assert.deepEqual(result.products.map(p => p.productId).sort(), [...listAppContentTiers().map(p => p.productId), ...CURRENT_PASS_GOOGLE_PLAY_APPROVED_PRODUCT_IDS].sort());
  for (const product of result.products) {
    assert.equal(Object.keys(product.listings).length, 5);
    for (const { title, description } of Object.values(product.listings)) {
      assert.ok(title.length <= 55);
      assert.ok(description.length <= 200);
      assert.doesNotMatch(title, /[0-9₩¥$]/);
    }
  }
  assert.match(result.products.find(p => p.productId === 'cd_pass_premium_30d_v4').listings['en-US'].description, /60,000/);
});
