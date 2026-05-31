import { CATEGORY_KEYWORD_MAP, SPREAD_LIBRARY } from "../data/tarotSpreadLibrary";
import type { TarotSpread, TarotSpreadCategory } from "../types";

function normalizeText(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function detectTarotCategory(question: string): TarotSpreadCategory {
  const normalized = normalizeText(question);
  if (!normalized) return "love";

  let best: TarotSpreadCategory = "love";
  let bestScore = -1;

  (Object.keys(CATEGORY_KEYWORD_MAP) as TarotSpreadCategory[]).forEach((category) => {
    const score = CATEGORY_KEYWORD_MAP[category].reduce((acc, keyword) => {
      return acc + (normalized.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  });

  return best;
}

export function recommendSpreads(question: string, cardCount?: number | "all"): TarotSpread[] {
  const detected = detectTarotCategory(question);
  const safeCount = cardCount === "all" ? null : Number(cardCount || 0);
  const normalized = normalizeText(question);

  const ranked = SPREAD_LIBRARY.map((spread) => {
    let score = 0;
    if (spread.category === detected) score += 12;
    if (safeCount && spread.cardCount === safeCount) score += 5;
    if (safeCount && Math.abs(spread.cardCount - safeCount) <= 1) score += 2;
    if (normalized && normalizeText(spread.title).includes(normalized)) score += 4;
    if (normalized && normalizeText(spread.purpose).includes(normalized)) score += 3;
    if (normalized) {
      spread.tags.forEach((tag) => {
        if (normalizeText(tag).includes(normalized)) score += 1;
      });
    }
    if (spread.difficulty === "premium") score += 1;
    return { spread, score };
  });

  return ranked
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.spread.cardCount - right.spread.cardCount;
    })
    .map((entry) => entry.spread);
}