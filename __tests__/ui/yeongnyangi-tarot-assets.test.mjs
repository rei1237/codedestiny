import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateTarotManifest } from '../../scripts/verify-yeongnyangi-tarot-assets.mjs';
import { createTarotDeckRegistry } from '../../lib/tarot/deck-registry.mjs';
import { buildCaretaroCardImageUrl } from '../../lib/tarot/caretaro-card-images.mjs';
import { getYeongnyangiDeckText } from '../../lib/tarot/yeongnyangi-deck-copy.mjs';

const manifest = JSON.parse(readFileSync(new URL('../../public/assets/yeongnyangi/tarot/v1/manifest.json', import.meta.url), 'utf8'));
const { resolveTarotDeckCard, getTarotDeck } = createTarotDeckRegistry(manifest);

test('major-only deck cannot claim to support a complete paid spread', () => {
  validateTarotManifest(manifest);
  assert.throws(() => validateTarotManifest(manifest, { requireFullDeck: true }), /full78/);
  const invalid = structuredClone(manifest);
  invalid.completeDeck = true;
  assert.throws(() => validateTarotManifest(invalid));
});

test('missing/duplicate ranks, wrong paths and missing i18n keys fail closed', () => {
  for (const corrupt of [
    (value) => value.cards.pop(),
    (value) => { value.cards[1] = value.cards[0]; },
    (value) => { value.cards[0].files.std = '/assets/../caretaro.webp'; },
    (value) => { value.cards[0].altKey = 'missing.key'; },
    (value) => { value.cards[0].integrity = {}; },
  ]) {
    const invalid = structuredClone(manifest);
    corrupt(invalid);
    assert.throws(() => validateTarotManifest(invalid));
  }
});

test('failed Yeongnyangi art keeps the card name and uses only its own back', () => {
  const card = resolveTarotDeckCard({ brand: 'yeongnyangi', cardCode: 'M18', locale: 'ja', imageFailed: true });
  assert.equal(card.src, manifest.back.files.std);
  assert.equal(card.name, '月');
  assert.equal(card.fallback, true);
  assert(!card.src.includes('caretaro'));
  const unavailable = resolveTarotDeckCard({ brand: 'yeongnyangi', cardCode: 'P01', size: 'thumb' });
  assert.equal(unavailable.src, manifest.back.files.thumb);
  assert.equal(unavailable.fallback, true);
});

test('Yeon resolution remains the existing caretaro URL and brand mistakes fail', () => {
  for (const cardCode of ['M00', 'M18', 'P14']) {
    assert.equal(resolveTarotDeckCard({ brand: 'yeon', cardCode }).src, buildCaretaroCardImageUrl(cardCode));
  }
  assert.equal(getTarotDeck('yeon').manifest, null);
  assert.throws(() => getTarotDeck('misspelled'));
});

test('non-site reading languages fall back to English, never Korean', () => {
  assert.equal(getYeongnyangiDeckText('tarot.M18.name', 'fr'), 'The Moon');
  assert.equal(getYeongnyangiDeckText('tarot.M18.name', 'zh-CN'), '月亮');
  const normal = resolveTarotDeckCard({ brand: 'yeongnyangi', cardCode: 'm00' });
  assert.equal(normal.src, manifest.cards[0].files.std);
  assert.equal(normal.fallback, false);
});
