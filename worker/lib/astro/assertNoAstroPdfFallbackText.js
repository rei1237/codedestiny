/**
 * Astro Western Premium - Forbidden Text Assertion
 * 
 * Prevents skeleton, fallback, and internal error messages from appearing in PDF.
 * These phrases must NEVER appear in final PDF output.
 */

const ASTRO_FORBIDDEN_PHRASES = [
  // Status/fallback indicators
  "자동 복구",
  "자동 복구 생성",
  "기본 골격",
  "구조화된 스켈레톤",
  "fallback",
  "skeleton",
  "placeholder",
  "스켈레톤",

  // Data quality warnings
  "데이터가 부족",
  "서버 응답이 불안정",
  "생성 상태 안내",
  "다음 생성 시",
  "다음 생성 시 자동 재작성",
  "이 섹션은 챕터 구조 보존을 위한 기본 골격입니다",

  // Internal error messages
  "ASTRO_SWISS_REQUIRED",
  "AstroSeedUnavailable",
  "seed unavailable",
  "Invalid seed",
  "ephemeris missing",
  "chart data unavailable",

  // Compatibility/partnership (not allowed in personal natal)
  "compatibility",
  "partner",
  "synastry",
  "composite",
  "matching",
  "궁합",
  "두 사람",
  "상대방 차트",
  "상대방 정보",

  // System messages
  "Chapter 1",
  "Chapter 2",
  "원인:",
  "기본 점성술 분석을 먼저",
  "Internal server error",
  "API 실패",
  "API failure",

  // Template markers
  "## 핵심 별자리 구조",  // Generic template header (not allowed in real output)
  "## 삶에서 드러나는 패턴", // Generic template header
  "## 관계/커리어/타이밍 적용", // Generic template header
  "## 30일 실행 가이드", // Generic template header (too generic)
];

/**
 * Check if text contains any forbidden phrases
 * @param {string} text - Text to check
 * @returns {Array<string>} Array of found forbidden phrases (empty if none)
 */
export function findAstroPdfForbiddenText(text) {
  if (!text) return [];

  const source = String(text || "").toLowerCase();
  const found = [];
  const seen = new Set();

  for (const phrase of ASTRO_FORBIDDEN_PHRASES) {
    const searchLower = phrase.toLowerCase();
    if (source.includes(searchLower) && !seen.has(searchLower)) {
      found.push(phrase);
      seen.add(searchLower);
    }
  }

  return found;
}

/**
 * Assert that text contains no forbidden phrases
 * Throws if forbidden phrases are found
 */
export function assertNoAstroPdfFallbackText(text, context = {}) {
  const forbidden = findAstroPdfForbiddenText(text);

  if (forbidden.length > 0) {
    const contextInfo = [
      context.chapterId ? `chapterId: ${context.chapterId}` : "",
      context.categoryId ? `categoryId: ${context.categoryId}` : "",
      context.source ? `source: ${context.source}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    const message = [
      "[AstroBook] FATAL: Forbidden phrases detected in PDF text",
      contextInfo ? `Context: ${contextInfo}` : "",
      `Found ${forbidden.length} forbidden phrase(s):`,
      ...forbidden.map((p, i) => `  ${i + 1}. "${p}"`),
      "",
      "This PDF output MUST NOT be used. Regenerate with proper data.",
    ]
      .filter(Boolean)
      .join("\n");

    throw new Error(message);
  }
}

/**
 * Filter out a simple generic template marker
 * Unlike assertNoAstroPdfFallbackText, this only removes clearly generic headers
 */
export function cleanAstroPdfGenericHeaders(text) {
  if (!text) return text;

  const genericPatterns = [
    /^## 핵심 별자리 구조\n\n(?=## |$)/gm,
    /^## 삶에서 드러나는 패턴\n\n(?=## |$)/gm,
    /^## 관계\/커리어\/타이밍 적용\n\n(?=## |$)/gm,
    /^## 30일 실행 가이드\n\n(?=## |$)/gm,
  ];

  let cleaned = text;
  for (const pattern of genericPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned.trim();
}

/**
 * Test helper: Get list of all forbidden phrases
 */
export function getAstroPdfForbiddenPhrasesList() {
  return [...ASTRO_FORBIDDEN_PHRASES];
}
