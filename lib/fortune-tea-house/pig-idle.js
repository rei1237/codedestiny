/** Recent exclusion is bounded by the small existing catalogue. No persistent user state. */
export function nextPigSpeech(state, count, random = Math.random()) {
  const recent = state.recent || [];
  const rareEligible = (state.turn || 0) >= 5 && (state.turn || 0) - (state.lastRare ?? -5) >= 5 && (state.rareCount || 0) < 2;
  const candidates = Array.from({ length: count }, (_, index) => index).filter(index => index !== 3 || rareEligible);
  let available = candidates.filter(index => !recent.slice(-3).includes(index));
  if (!available.length) available = candidates.filter(index => index !== recent.at(-1));
  if (!available.length) available = candidates;
  const index = available[Math.min(available.length - 1, Math.floor(Math.max(0, random) * available.length))] ?? 0;
  return { index, turn: (state.turn || 0) + 1, recent: [...recent.slice(-2), index], rareCount: (state.rareCount || 0) + (index === 3 ? 1 : 0), lastRare: index === 3 ? (state.turn || 0) + 1 : state.lastRare ?? -5 };
}
