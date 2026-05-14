const DEFAULT_BANNED_PHRASES = [
  "데이터가 없어 기본 해석만 제공합니다",
  "계산값이 없어 보수적으로 해석합니다",
  "일반적인 해석으로는",
  "정보가 부족하지만",
  "AI가 추정하기로는",
  "위 JSON에는 없지만",
];

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
}

function tokenizePath(path) {
  return String(path || "")
    .split(".")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^([^\[\]]+)(?:\[(\d*)\])?$/);
      if (!match) return { key: token, indexToken: null };
      const key = String(match[1] || "").trim();
      const indexToken = match[2] === undefined ? null : String(match[2]);
      return { key, indexToken };
    });
}

function checkValueByTokens(currentValue, tokens, cursor = 0) {
  if (cursor >= tokens.length) return hasMeaningfulValue(currentValue);

  const token = tokens[cursor] || {};
  const key = token.key;
  if (!key || !currentValue || typeof currentValue !== "object") return false;

  const nextValue = currentValue[key];

  if (token.indexToken === null) {
    return checkValueByTokens(nextValue, tokens, cursor + 1);
  }

  if (!Array.isArray(nextValue)) return false;

  if (token.indexToken === "") {
    return nextValue.some((item) => checkValueByTokens(item, tokens, cursor + 1));
  }

  const idx = Number(token.indexToken);
  if (!Number.isInteger(idx) || idx < 0 || idx >= nextValue.length) return false;
  return checkValueByTokens(nextValue[idx], tokens, cursor + 1);
}

export function hasValueByPath(normalizedData, path) {
  const tokens = tokenizePath(path);
  if (!tokens.length) return false;
  return checkValueByTokens(normalizedData, tokens, 0);
}

export function validateChapterData(normalizedData, chapterPlan) {
  const requiredFields = Array.isArray(chapterPlan?.requiredFields)
    ? chapterPlan.requiredFields
    : [];

  const missingFields = requiredFields.filter((field) => !hasValueByPath(normalizedData, field));
  if (missingFields.length > 0) {
    return { ok: false, missingFields };
  }

  return { ok: true };
}

export function validateNormalizedDataByChapterPlan(normalizedData, chapterPlans = []) {
  const missingByChapter = [];

  for (let i = 0; i < chapterPlans.length; i += 1) {
    const chapter = chapterPlans[i];
    const result = validateChapterData(normalizedData, chapter);
    if (!result.ok) {
      missingByChapter.push({
        chapterId: String(chapter?.chapterId || chapter?.order || i + 1),
        title: String(chapter?.title || ""),
        missingFields: result.missingFields,
      });
    }
  }

  return {
    ok: missingByChapter.length === 0,
    missingByChapter,
  };
}

export function removeRepeatedParagraphs(content) {
  const paragraphs = String(content || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const seen = new Set();
  const result = [];

  for (const paragraph of paragraphs) {
    const normalized = paragraph.replace(/\s+/g, " ").trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(paragraph);
    }
  }

  return result.join("\n\n");
}

function hasForbiddenPhrase(content, bannedPhrases) {
  const source = String(content || "");
  const list = Array.isArray(bannedPhrases) && bannedPhrases.length
    ? bannedPhrases
    : DEFAULT_BANNED_PHRASES;
  return list.filter((phrase) => source.includes(String(phrase)));
}

function includesAnyKeyword(content, keywords = []) {
  if (!Array.isArray(keywords) || keywords.length === 0) return true;
  const source = String(content || "");
  return keywords.some((keyword) => source.includes(String(keyword || "")));
}

function findDisallowedKeywords(content, keywords = []) {
  if (!Array.isArray(keywords) || keywords.length === 0) return [];
  const source = String(content || "");
  return keywords
    .map((keyword) => String(keyword || "").trim())
    .filter(Boolean)
    .filter((keyword) => source.includes(keyword));
}

function detectUnbackedCalcClaim(content, normalizedData) {
  const source = String(content || "");
  const checks = [
    { keyword: "라그나", path: "chart.lagna" },
    { keyword: "어센던트", path: "natalChart.ascendant" },
    { keyword: "나크샤트라", path: "chart.nakshatra" },
    { keyword: "다샤", path: "dasha.timeline" },
    { keyword: "트랜짓", path: "transits.currentTransits" },
  ];

  return checks
    .filter((entry) => source.includes(entry.keyword) && !hasValueByPath(normalizedData, entry.path))
    .map((entry) => ({ keyword: entry.keyword, path: entry.path }));
}

export function validateGeneratedChapterText(content, options = {}) {
  const minChars = Number(options.minChars || 0);
  const maxChars = Number(options.maxChars || 0);
  const expectedKeywords = Array.isArray(options.expectedKeywords) ? options.expectedKeywords : [];
  const disallowedKeywords = Array.isArray(options.disallowedKeywords) ? options.disallowedKeywords : [];
  const normalizedData = options.normalizedData || {};

  const cleaned = removeRepeatedParagraphs(String(content || "").trim());
  const errors = [];
  const warnings = [];

  if (!cleaned) {
    errors.push("EMPTY_CONTENT");
  }

  if (minChars > 0 && cleaned.length < minChars) {
    errors.push("MIN_CHARS_NOT_MET");
  }

  if (maxChars > 0 && cleaned.length > maxChars * 1.35) {
    warnings.push("MAX_CHARS_EXCEEDED");
  }

  const forbiddenHits = hasForbiddenPhrase(cleaned, options.bannedPhrases);
  if (forbiddenHits.length > 0) {
    errors.push("BANNED_PHRASE_FOUND");
  }

  if (!includesAnyKeyword(cleaned, expectedKeywords)) {
    errors.push("CHAPTER_PURPOSE_MISMATCH");
  }

  const disallowedHits = findDisallowedKeywords(cleaned, disallowedKeywords);
  if (disallowedHits.length > 0) {
    errors.push("DISALLOWED_KEYWORD_FOUND");
  }

  const unbackedClaims = detectUnbackedCalcClaim(cleaned, normalizedData);
  if (unbackedClaims.length > 0) {
    errors.push("UNBACKED_CALC_CLAIM");
  }

  if (cleaned.length < String(content || "").trim().length) {
    warnings.push("REPEATED_PARAGRAPHS_REMOVED");
  }

  return {
    ok: errors.length === 0,
    text: cleaned,
    errors,
    warnings,
    forbiddenHits,
    disallowedHits,
    unbackedClaims,
  };
}

export const PREMIUM_PDF_V2_BANNED_PHRASES = Object.freeze(DEFAULT_BANNED_PHRASES);
