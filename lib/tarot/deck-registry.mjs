import { buildCaretaroCardImageUrl } from './caretaro-card-images.mjs';
import { getYeongnyangiDeckText } from './yeongnyangi-deck-copy.mjs';

// 아직 화면에 연결하지 않는다. 22장 덱을 유료 78장 리딩에 쓰는 것은 Phase 4b다.
// 호스트가 JSON을 읽어 전달한다. 브라우저/Worker/Node의 JSON import 문법에 의존하지 않는다.
export function createTarotDeckRegistry(manifest) {
  const registry = Object.freeze({
    yeongnyangi: Object.freeze({ deckId: manifest.deckId, manifest }),
    yeon: Object.freeze({ deckId: 'caretaro', manifest: null }),
  });

  function getTarotDeck(brand) {
    const deck = Object.hasOwn(registry, brand) && registry[brand];
    if (!deck) throw new Error(`Unknown tarot brand: ${brand}`);
    return deck;
  }

  // 호출부는 엔진의 정본 카드 코드(M00~M21)를 넘긴다. 역방향 이미지는 만들지 않는다.
  function resolveTarotDeckCard({ brand, cardCode, size = 'std', locale = 'ko', imageFailed = false, env } = {}) {
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
  return { getTarotDeck, resolveTarotDeckCard };
}
