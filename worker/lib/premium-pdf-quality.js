const DEBUG_TOKEN_PATTERNS = [
  /\bjson\b/i,
  /\bpayload\b/i,
  /\bmissingFields\b/i,
  /\bavailableFields\b/i,
  /\bdebug\b/i,
  /\bchapterJson\b/i,
  /\bengineData\b/i,
  /\[system\]/i,
  /\[user\]/i,
];

export const BLOCKED_FALLBACK_PHRASES = Object.freeze([
  "당신은 특별한 사람입니다",
  "당신은 강한 에너지를 가지고 있습니다",
  "균형이 중요합니다",
  "자신을 믿고 나아가세요",
  "지금은 변화의 시기입니다",
  "좋은 기회가 찾아올 수 있습니다",
  "관계에서 소통이 중요합니다",
  "재물운은 신중함이 필요합니다",
  "건강은 무리하지 않는 것이 중요합니다",
  "올해는 중요한 해입니다",
  "이 관계는 배움이 있는 관계입니다",
  "내면의 목소리를 들어야 합니다",
  "운명은 스스로 만들어가는 것입니다",
  "부족한 데이터로 인해 일반적인 해석을 제공합니다",
  "현재 데이터가 부족하지만 참고용으로 작성합니다",
  "확보된 데이터 범위에서 작성합니다",
  "핵심 데이터 맥락",
]);

function normalizeText(value) {
  return String(value || "")
    .replace(/[\r\t]+/g, " ")
    .replace(/[#>*`|\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function splitParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/g)
    .map((row) => String(row || "").trim())
    .filter(Boolean);
}

function repeatedParagraphs(text) {
  const seen = new Set();
  const duplicates = [];
  for (const paragraph of splitParagraphs(text)) {
    const fp = normalizeText(paragraph);
    if (!fp || fp.length < 18) continue;
    if (seen.has(fp)) duplicates.push(paragraph);
    seen.add(fp);
  }
  return duplicates;
}

function repeatedNgrams(text, minN = 12, maxN = 20) {
  const source = normalizeText(text).replace(/\s+/g, " ");
  if (!source || source.length < minN * 2) return [];

  const repeated = new Set();
  for (let n = minN; n <= maxN; n += 1) {
    const counts = new Map();
    for (let i = 0; i <= source.length - n; i += 1) {
      const gram = source.slice(i, i + n);
      if (gram.trim().length < n) continue;
      const c = (counts.get(gram) || 0) + 1;
      counts.set(gram, c);
      if (c >= 3) repeated.add(gram);
    }
  }
  return Array.from(repeated).slice(0, 20);
}

function genericFallbackHits(text, blockedPhrases = BLOCKED_FALLBACK_PHRASES) {
  const source = normalizeText(text);
  return blockedPhrases
    .filter(Boolean)
    .map((phrase) => String(phrase).trim())
    .filter((phrase) => {
      const target = normalizeText(phrase);
      if (!target || target.length < 4) return false;
      return source.includes(target) || target.includes(source);
    });
}

function jaccardSimilarity(a, b) {
  const tokensA = new Set(normalizeText(a).split(" ").filter((t) => t.length >= 2));
  const tokensB = new Set(normalizeText(b).split(" ").filter((t) => t.length >= 2));
  if (!tokensA.size || !tokensB.size) return 0;
  let inter = 0;
  tokensA.forEach((t) => {
    if (tokensB.has(t)) inter += 1;
  });
  const union = tokensA.size + tokensB.size - inter;
  return union > 0 ? inter / union : 0;
}

function detectDebugTokens(text) {
  const source = String(text || "");
  return DEBUG_TOKEN_PATTERNS.filter((pattern) => pattern.test(source)).map((pattern) => String(pattern));
}

export function buildChapterMemory(chapterId, title, text) {
  const source = String(text || "").trim();
  const sentences = source
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((row) => row.trim())
    .filter((row) => row.length >= 18);

  return {
    chapterId: String(chapterId || ""),
    title: String(title || "").trim(),
    summary: source.slice(0, 280),
    usedThemes: sentences.slice(0, 6),
    usedAdvice: sentences.slice(6, 12),
    usedKeywords: Array.from(new Set(normalizeText(source).split(" ").filter((t) => t.length >= 3))).slice(0, 20),
  };
}

export function validateChapterQuality(options = {}) {
  const text = String(options.text || "").trim();
  const targetChars = Number(options.targetChars || 0);
  const blockedPhrases = Array.isArray(options.blockedPhrases) ? options.blockedPhrases : BLOCKED_FALLBACK_PHRASES;
  const previousChapterTexts = Array.isArray(options.previousChapterTexts) ? options.previousChapterTexts : [];
  const similarityThreshold = Number.isFinite(Number(options.similarityThreshold)) ? Number(options.similarityThreshold) : 0.78;

  const reasons = [];
  const duplicatedParagraphs = repeatedParagraphs(text);
  const duplicatedPhrases = repeatedNgrams(text, 12, 20);
  const fallbackHits = genericFallbackHits(text, blockedPhrases);
  const debugHits = detectDebugTokens(text);

  if (!text) reasons.push("EMPTY_CHAPTER");
  if (targetChars > 0 && text.length < Math.floor(targetChars * 0.85)) reasons.push("CHAPTER_TOO_SHORT");
  if (duplicatedParagraphs.length > 0) reasons.push("DUPLICATED_PARAGRAPHS");
  if (duplicatedPhrases.length > 0) reasons.push("REPEATED_NGRAMS");
  if (fallbackHits.length > 0) reasons.push("GENERIC_FALLBACK_PHRASE");
  if (debugHits.length > 0) reasons.push("INTERNAL_TOKEN_EXPOSED");

  let similarityScore = 0;
  for (const previous of previousChapterTexts) {
    const score = jaccardSimilarity(text.slice(0, 1200), String(previous || "").slice(0, 1200));
    if (score > similarityScore) similarityScore = score;
  }
  if (similarityScore >= similarityThreshold) reasons.push("CHAPTER_SIMILARITY_TOO_HIGH");

  return {
    ok: reasons.length === 0,
    reasons,
    duplicatedPhrases,
    duplicatedParagraphs,
    genericFallbackHits: [...fallbackHits, ...debugHits],
    similarityScore,
  };
}

export function validateFullPdfQuality(options = {}) {
  const serviceKey = String(options.serviceKey || "unknown");
  const chapters = Array.isArray(options.chapters) ? options.chapters : [];
  const minTotalChars = Number(options.minTotalChars || 48000);
  const requiredChapterCount = Number(options.requiredChapterCount || 0);

  const failedChapters = [];
  const duplicatedPhrases = [];
  const genericFallbackHits = [];
  const chapterTexts = chapters.map((row) => String(row?.text || ""));

  chapters.forEach((chapter, index) => {
    const title = String(chapter?.title || `Chapter ${index + 1}`);
    const chapterId = String(chapter?.chapterId || chapter?.id || index + 1);
    const targetChars = Number(chapter?.targetChars || 0);
    const previous = chapterTexts.slice(0, index);
    const result = validateChapterQuality({
      text: chapter?.text || "",
      targetChars,
      previousChapterTexts: previous,
      blockedPhrases: options.blockedPhrases,
      similarityThreshold: options.similarityThreshold,
    });

    if (!result.ok) {
      failedChapters.push({ chapterId, title, reasons: result.reasons });
    }
    duplicatedPhrases.push(...result.duplicatedPhrases);
    genericFallbackHits.push(...result.genericFallbackHits);
  });

  const totalChars = chapterTexts.reduce((sum, row) => sum + row.length, 0);
  const reasons = [];
  if (requiredChapterCount > 0 && chapters.length < requiredChapterCount) reasons.push("MISSING_REQUIRED_CHAPTERS");
  if (totalChars < minTotalChars) reasons.push("TOTAL_CHARS_BELOW_MIN");
  if (failedChapters.length > 0) reasons.push("FAILED_CHAPTER_QUALITY");

  return {
    ok: reasons.length === 0,
    serviceKey,
    totalChars,
    chapterCount: chapters.length,
    failedChapters,
    duplicatedPhrases: Array.from(new Set(duplicatedPhrases)).slice(0, 30),
    genericFallbackHits: Array.from(new Set(genericFallbackHits)).slice(0, 30),
    reasons,
  };
}
