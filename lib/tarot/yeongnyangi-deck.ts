import manifest from '../../public/assets/yeongnyangi/tarot/v1/manifest.json';
import { createTarotDeckRegistry } from './deck-registry.mjs';

const { resolveTarotDeckCard } = createTarotDeckRegistry(manifest);

export function yeongnyangiCardArt(cardCode: string | undefined, locale = 'ko', imageFailed = false) {
  return resolveTarotDeckCard({ brand: 'yeongnyangi', cardCode, locale, imageFailed });
}
