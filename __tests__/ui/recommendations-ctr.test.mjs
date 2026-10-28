import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanEvent } from '../../js/recommendations-core.mjs';
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
test('all three adapters observe product cards; previews stay excluded', () => {
  const surface = read('app/components/recommendations/RecommendationSurface.jsx');
  const browse = read('app/components/recommendations/RecommendationBrowse.jsx');
  const legacy = read('js/recommendations-legacy.mjs');
  assert.match(surface, /data-recommendation-product=\{product.id\}/);
  for (const text of [surface, browse]) {
    assert.match(text, /observeRecommendationProducts\(host.current/);
    assert.match(text, /if \([^\n]*preview\) return/);
    assert.match(text, /trackRecommendation\('impression', \{ service: trackedService \}, '(result|browse)', id,/);
    assert.doesNotMatch(text, /observeRecommendation\(host.current/);
  }
  assert.match(legacy, /article.dataset.recommendationProduct = p.id/);
  assert.match(legacy, /observeRecommendationProducts\(section, seen, id => track\('impression', id\)\)/);
});
test('impressions require a product and block remains available only for other surface events', () => {
  const event = { event: 'impression', service: 'legacy-saju', placement: 'browse', consent: true };
  assert.equal(cleanEvent(event), null);
  assert.equal(cleanEvent({ ...event, productId: 'block' }), null);
  assert.equal(cleanEvent({ ...event, productId: 'book-a' }).productId, 'book-a');
  assert.equal(cleanEvent({ ...event, event: 'more' }).productId, 'block');
});
