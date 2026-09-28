import manifest from '../../public/assets/yeongnyangi/tarot/v1/manifest.json';
import { createTarotDeckRegistry } from './deck-registry.mjs';

const { resolveTarotDeckCard } = createTarotDeckRegistry(manifest);

export function yeongnyangiCardMetadata(cardCode: string | undefined) {
  const code = String(cardCode || '').toUpperCase();
  const card = manifest.cards.find((item) => item.id === code);
  return card ? {
    id: card.id,
    arcana: card.arcana,
    suit: card.suit,
    rank: card.rank,
    gaze: card.gaze,
  } : null;
}

export function yeongnyangiCardArt(cardCode: string | undefined, locale = 'ko', imageFailed = false) {
  return resolveTarotDeckCard({ brand: 'yeongnyangi', cardCode, locale, imageFailed });
}
