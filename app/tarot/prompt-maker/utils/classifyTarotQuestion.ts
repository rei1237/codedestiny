import { CATEGORY_KEYWORD_MAP, SPREAD_LIBRARY } from "../data/tarotSpreadLibrary";
import type { TarotSpread, TarotSpreadCategory } from "../types";

function normalizeText(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function scoreCategory(question: string, category: TarotSpreadCategory) {
  return CATEGORY_KEYWORD_MAP[category].reduce((acc, keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return acc;
    return acc + (question.includes(normalizedKeyword) ? Math.max(1, normalizedKeyword.length >= 3 ? 2 : 1) : 0);
  }, 0);
}

export function detectTarotCategory(question: string): TarotSpreadCategory {
  const normalized = normalizeText(question);
  if (!normalized) return "special";

  let best: TarotSpreadCategory = "special";
  let bestScore = 0;

  (Object.keys(CATEGORY_KEYWORD_MAP) as TarotSpreadCategory[]).forEach((category) => {
    const score = scoreCategory(normalized, category);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  });

  return best;
}

export function recommendSpreads(question: string, cardCount?: number | "all", preferredCategory?: TarotSpreadCategory): TarotSpread[] {
  const detected = preferredCategory || detectTarotCategory(question);
  const safeCount = cardCount === "all" ? null : Number(cardCount || 0);
  const normalized = normalizeText(question);
  const tokens = tokenize(question);

  const ranked = SPREAD_LIBRARY.map((spread) => {
    let score = 0;
    if (spread.category === detected) score += 12;
    if (detected === "special" && spread.category === "special") score += 4;
    if (safeCount && spread.cardCount === safeCount) score += 5;
    if (safeCount && Math.abs(spread.cardCount - safeCount) <= 1) score += 2;
    if (normalized && normalizeText(spread.title).includes(normalized)) score += 4;
    if (normalized && normalizeText(spread.purpose).includes(normalized)) score += 3;
    tokens.forEach((token) => {
      if (normalizeText(spread.title).includes(token)) score += 2;
      if (normalizeText(spread.purpose).includes(token)) score += 1;
      spread.tags.forEach((tag) => {
        if (normalizeText(tag).includes(token)) score += 1;
      });
    });
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
