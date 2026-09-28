import manifest from '../../public/assets/yeongnyangi/tarot/v1/manifest.json' with { type: 'json' };
import { buildCaretaroCardImageUrl } from './caretaro-card-images.mjs';
import { getYeongnyangiDeckText } from './yeongnyangi-deck-copy.mjs';

// 아직 화면에 연결하지 않는다. 22장 덱을 유료 78장 리딩에 쓰는 것은 Phase 4b다.
export const TAROT_DECK_REGISTRY = Object.freeze({
  yeongnyangi: Object.freeze({ deckId: manifest.deckId, manifest }),
  yeon: Object.freeze({ deckId: 'caretaro', manifest: null }),
});

export function getTarotDeck(brand) {
  const deck = Object.hasOwn(TAROT_DECK_REGISTRY, brand) && TAROT_DECK_REGISTRY[brand];
  if (!deck) throw new Error(`Unknown tarot brand: ${brand}`);
  return deck;
}

// 호출부는 엔진의 정본 카드 코드(M00~M21)를 넘긴다. 역방향 이미지는 만들지 않는다.
export function resolveTarotDeckCard({ brand, cardCode, size = 'std', locale = 'ko', imageFailed = false, env } = {}) {
  if (!['thumb', 'std', 'hi'].includes(size)) throw new Error(`Unknown tarot image size: ${size}`);
  const deck = getTarotDeck(brand);
  const code = String(cardCode || '').toUpperCase();
  if (brand === 'yeon') {
    return { deckId: deck.deckId, src: buildCaretaroCardImageUrl(code, { env }), fallback: false };
  }
  const card = deck.manifest.cards.find((item) => item.id === code);
  const fallback = imageFailed || !card;
  const art = fallback ? deck.manifest.back : card;
  return {
    deckId: deck.deckId,
    src: art.files[size],
    avifSrc: art.avifFiles?.[size] || null,
    fallback,
    name: card ? getYeongnyangiDeckText(card.nameKey, locale) : getYeongnyangiDeckText(art.nameKey, locale),
    alt: getYeongnyangiDeckText(art.altKey, locale),
  };
}
