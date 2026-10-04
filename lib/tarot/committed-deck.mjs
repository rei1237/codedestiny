import { TAROT_CARDS } from './tarot-cards.mjs';
export const COMMITTED_DECK_VERSION = 'yn-committed-deck-v1';
export function randomDeckIndex(size) {
  const words = new Uint32Array(1), limit = 0x100000000 - (0x100000000 % size);
  do { crypto.getRandomValues(words); } while (words[0] >= limit);
  return words[0] % size;
}
// Shared by Yeongnyangi and Yeoni. Orientations are fixed before any selection.
export function commitDeck() {
  const order = TAROT_CARDS.map(card => card.code);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomDeckIndex(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { version: COMMITTED_DECK_VERSION, order, reversed: order.map(() => randomDeckIndex(2) === 1) };
}
/** @returns {{method: "manual" | "auto", picks: number[]}} */
export function selectDeckSlots(body, cardCount) {
  if (!Number.isInteger(cardCount) || cardCount < 1 || cardCount > TAROT_CARDS.length) throw new Error('INVALID_TAROT_PICKS');
  if (body?.auto === true && body?.picks === undefined) {
    const slots = [...Array(TAROT_CARDS.length).keys()], picks = [];
    while (picks.length < cardCount) picks.push(slots.splice(randomDeckIndex(slots.length), 1)[0]);
    return { method: 'auto', picks };
  }
  const picks = body?.picks;
  if (!Array.isArray(picks) || picks.length !== cardCount || new Set(picks).size !== cardCount
    || !picks.every(n => Number.isInteger(n) && n >= 0 && n < TAROT_CARDS.length)) throw new Error('INVALID_TAROT_PICKS');
  return { method: 'manual', picks: [...picks] };
}
