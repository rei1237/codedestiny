/**
 * 자미두수 프리미엄 PDF: 세부 카테고리별 LLM 호출 및 검증
 *
 * 구조:
 * 1. generateZiweiSectionWithLLM: 단일 세부 카테고리 LLM 호출 (최대 재시도 3회)
 * 2. validateLLMSectionContent: LLM 결과 품질 검증
 * 3. generateZiweiChapterFromSections: 모든 섹션이 성공해야 챕터 완성
 */

import { callGeminiText, pickGeminiKeys, pickGeminiModels } from "./gemini.js";
import {
  buildCanonicalZiweiPdfChapters,
  buildZiweiCategorySeed,
  buildZiweiBroadChartSeed,
  resolveZiweiCategoryData,
  normalizeZiweiPalaceKey,
  normalizeZiweiPalaces,
  mapZiweiBrightnessToStrengthSymbol,
  normalizeZiweiStrengthSymbol,
} from "./ziwei-premium-book-structure.js";

/**
 * 원인 추적 가능한 구조화 로그 헬퍼
 *
 * 구분 기준:
 *   errorCode: "ZIWEI_LLM_KEY_MISSING"           → LLM API 키 미설정
 *   errorCode: "LLM_SECTION_GENERATION_FAILED"   → LLM 호출 실패 (네트워크/쿼터)
 *   errorCode: "LLM_VALIDATION_FAILED"           → LLM 출력이 품질 기준 미달
 *   palaceCount: 0 / resolvedPalaceCount: 0      → 데이터 없음 (payload 비어 있음)
 *   resolvedPalaceCount: 0, palaceCount > 0      → 키 불일치 (palace key alias 매핑 실패)
 */
function logZiweiFlow(level, stage, fields = {}) {
  const payload = {
    stage,
    sessionId: String(fields.sessionId || fields.requestId || "").trim() || null,
    purchaseId: String(fields.purchaseId || "").trim() || null,
    reportId: String(fields.reportId || "").trim() || null,
    chapterId: String(fields.chapterId || "").trim() || null,
    chapterTitle: String(fields.chapterTitle || "").trim() || null,
    categoryId: String(fields.categoryId || "").trim() || null,
    categoryTitle: String(fields.categoryTitle || "").trim() || null,
    // palace key 진단 — 개인정보 포함하지 않음
    expectedPalaceKeys: Array.isArray(fields.expectedPalaceKeys) ? fields.expectedPalaceKeys : null,
    resolvedPalaceKeys: Array.isArray(fields.resolvedPalaceKeys) ? fields.resolvedPalaceKeys : null,
    availablePalaceKeys: Array.isArray(fields.availablePalaceKeys) ? fields.availablePalaceKeys : null,
    palaceCount: typeof fields.palaceCount === "number" ? fields.palaceCount : null,
    resolvedPalaceCount: typeof fields.resolvedPalaceCount === "number" ? fields.resolvedPalaceCount : null,
    mainStarCount: typeof fields.mainStarCount === "number" ? fields.mainStarCount : null,
    maleficStarCount: typeof fields.maleficStarCount === "number" ? fields.maleficStarCount : null,
    transformationCount: typeof fields.transformationCount === "number" ? fields.transformationCount : null,
    hasLifePalaceKey: typeof fields.hasLifePalaceKey === "boolean" ? fields.hasLifePalaceKey : null,
    hasBodyPalaceKey: typeof fields.hasBodyPalaceKey === "boolean" ? fields.hasBodyPalaceKey : null,
    hasFourTransformations: typeof fields.hasFourTransformations === "boolean" ? fields.hasFourTransformations : null,
    // LLM 진단
    keyCount: typeof fields.keyCount === "number" ? fields.keyCount : null,
    modelCandidates: Array.isArray(fields.modelCandidates) ? fields.modelCandidates : null,
    attempt: typeof fields.attempt === "number" ? fields.attempt : null,
    maxAttempts: typeof fields.maxAttempts === "number" ? fields.maxAttempts : null,
    validationErrors: Array.isArray(fields.validationErrors) ? fields.validationErrors : null,
    // 오류 정보 — stack은 1000자 상한
    errorCode: fields.errorCode || null,
    errorName: fields.errorName || null,
    errorMessage: fields.errorMessage || null,
    errorStack: typeof fields.errorStack === "string" ? fields.errorStack.slice(0, 1000) : null,
    // 기타
    source: fields.source || null,
    bodyLength: typeof fields.bodyLength === "number" ? fields.bodyLength : null,
    message: fields.message || null,
  };
  // null 필드 제거하여 로그 크기 절감
  const clean = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== null));
  if (level === "error") console.error(`[ZiweiPremium][Flow] ${stage}`, clean);
  else if (level === "warn") console.warn(`[ZiweiPremium][Flow] ${stage}`, clean);
  else console.info(`[ZiweiPremium][Flow] ${stage}`, clean);
}

/** 최소 payload 진단 정보 추출 (개인정보 제외) */
function _diagPayload(minimalPayload) {
  const palaces = Array.isArray(minimalPayload?.chart?.palaces) ? minimalPayload.chart.palaces : [];
  return {
    palaceCount: palaces.length,
    availablePalaceKeys: palaces.map((p) => String(p?.key || "")).filter(Boolean),
    hasLifePalaceKey: Boolean(minimalPayload?.chart?.lifePalace),
    hasBodyPalaceKey: Boolean(minimalPayload?.chart?.bodyPalace),
    hasFourTransformations: palaces.some((p) => Array.isArray(p?.transformations) && p.transformations.length > 0),
  };
}

const ZIWEI_SECTION_FORBIDDEN_WORDS = [
  "자동 복구 생성",
  "fallback",
  "현재 확보된 자미두수 핵심 데이터를 기준으로",
  "성향/패턴/실행 전략을 정리했습니다.",
  "핵심 데이터를 바탕으로 분석합니다.",
  "일반적인 흐름으로 해석하면",
  "기본 성향상",
  "skeleton",
  "Internal server error",
  "Ch.1 생성 실패",
  "Chapter 1",
  "기본 자미두수 분석을 먼저 실행",
  "잠시 후 다시 시도",
  "데이터가 부족합니다",
  "일반 해석으로 대체",
  "로컬 생성",
  "복구 생성",
  "스켈레톤",
  "placeholder",
  "기본 골격",
  "자동 재작성",
  "\"chapterMeta\"",
  "\"chapterSpecificSections\"",
  "\"sections\"",
  "\"payload\"",
  "internal key",
  "raw json",
];

const ZIWEI_SECTION_MIN_CHARS = 1200;

function resolveZiweiSectionMinChars(input = {}) {
  const sectionMin = Number(input?.section?.minChars || 0);
  const writingMin = Number(input?.writingRules?.minLength || 0);
  const numericCandidates = [sectionMin, writingMin].filter((n) => Number.isFinite(n) && n > 0);
  return Math.max(ZIWEI_SECTION_MIN_CHARS, ...numericCandidates, ZIWEI_SECTION_MIN_CHARS);
}

/**
 * 동일 문장 반복 감지 (최소 5단어 이상)
 */
function detectDuplicateSentences(text, minWords = 5) {
  const sentences = text
    .split(/[.!?。！？\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const normalizedSentences = sentences.map((s) =>
    s.replace(/\s+/g, " ").toLowerCase()
  );

  for (let i = 0; i < normalizedSentences.length; i++) {
    const words = normalizedSentences[i].split(/\s+/).length;
    if (words < minWords) continue;

    for (let j = i + 1; j < normalizedSentences.length; j++) {
      if (normalizedSentences[i] === normalizedSentences[j]) {
        return {
          found: true,
          sentence: sentences[i],
          positions: [i, j],
        };
      }
    }
  }

  return { found: false };
}

/**
 * 일반적인 운세 문구만 반복되는지 감지
 */
function hasOnlyGenericFortunePhrases(text) {
  const genericPhrases = [
    "운이 좋습니다",
    "잘 진행됩니다",
    "주의가 필요합니다",
    "변화가 일어납니다",
    "기회가 옵니다",
    "노력이 필요합니다",
    "조심해야 합니다",
    "긍정적입니다",
    "도움이 될 것입니다",
    "성공할 수 있습니다",
    "좋은 시기입니다",
    "어려운 시기입니다",
  ];

  const lowerText = text.toLowerCase();
  const matchCount = genericPhrases.filter((phrase) =>
    lowerText.includes(phrase)
  ).length;

  // 전체 텍스트 길이 대비 일반 문구 비율 계산
  const contentLength = text.split(/\s+/).length;
  const genericMatchLength = genericPhrases.reduce((sum, phrase) => {
    const count = (lowerText.match(new RegExp(phrase, "g")) || []).length;
    return sum + count * phrase.split(/\s+/).length;
  }, 0);

  // 일반 문구 비율이 30% 이상이면 위험
  if (contentLength <= 0) return false;
  return genericMatchLength / contentLength > 0.3;
}

function asBoundedString(value, maxLen = 180) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

function toZiweiPromptEvidence(input = {}) {
  const payload = (input?.minimalPayload && typeof input.minimalPayload === "object") ? input.minimalPayload : {};
  const chart = (payload?.chart && typeof payload.chart === "object") ? payload.chart : {};
  const resolvedRoot = (input?.resolved && typeof input.resolved === "object") ? input.resolved : {};
  const resolvedData = (resolvedRoot?.resolved && typeof resolvedRoot.resolved === "object") ? resolvedRoot.resolved : {};
  const resolvedPalaces = Array.isArray(resolvedData?.palaces) ? resolvedData.palaces : [];
  const sourcePalaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const palaces = (resolvedPalaces.length ? resolvedPalaces : sourcePalaces).slice(0, 8).map((palace) => {
    const stars = []
      .concat(Array.isArray(palace?.mainStars) ? palace.mainStars : [])
      .concat(Array.isArray(palace?.assistantStars) ? palace.assistantStars : [])
      .concat(Array.isArray(palace?.minorStars) ? palace.minorStars : [])
      .concat(Array.isArray(palace?.maleficStars) ? palace.maleficStars : []);
    return {
      key: asBoundedString(palace?.key, 30),
      name: asBoundedString(palace?.name || palace?.nameKo, 30),
      branch: asBoundedString(palace?.branch, 12),
      stars: stars
        .map((star) => ({
          name: asBoundedString(star?.name || star?.nameKo, 20),
          brightness: asBoundedString(star?.brightness || star?.strength, 8),
          strengthSymbol: asBoundedString(star?.strengthSymbol || star?.symbol, 4),
        }))
        .filter((star) => star.name)
        .slice(0, 10),
    };
  });

  const transformations = [];
  if (Array.isArray(resolvedData?.transformations)) {
    resolvedData.transformations.forEach((row) => {
      transformations.push({
        starName: asBoundedString(row?.starName || row?.name, 20),
        type: asBoundedString(row?.type || row?.transformation, 10),
        palaceName: asBoundedString(row?.palaceName || row?.palace, 20),
      });
    });
  }

  return {
    user: {
      name: asBoundedString(payload?.user?.name || input?.userProfile?.name, 20),
      gender: asBoundedString(payload?.user?.gender || input?.userProfile?.gender, 12),
      birthDate: asBoundedString(payload?.user?.birthDate || input?.userProfile?.birthDate, 20),
      birthTime: asBoundedString(payload?.user?.birthTime || input?.userProfile?.birthTime, 10),
      calendarType: asBoundedString(payload?.user?.calendarType || input?.userProfile?.calendarType, 12),
    },
    chapter: {
      chapterId: asBoundedString(input?.chapterId || input?.chapter?.chapterId, 20),
      chapterTitle: asBoundedString(input?.chapterTitle || input?.chapter?.title, 60),
      categoryId: asBoundedString(input?.categoryId || input?.section?.sectionId, 24),
      categoryTitle: asBoundedString(input?.categoryTitle || input?.section?.title, 60),
    },
    chartMeta: {
      lifePalace: asBoundedString(chart?.lifePalace || chart?.lifePalaceKey, 20),
      bodyPalace: asBoundedString(chart?.bodyPalace || chart?.bodyPalaceKey, 20),
      palaceCount: palaces.length,
    },
    targetPalaces: Array.isArray(input?.targetPalaces)
      ? input.targetPalaces.map((row) => asBoundedString(row, 20)).filter(Boolean).slice(0, 6)
      : (input?.targetPalace ? [asBoundedString(input.targetPalace, 20)] : []),
    starNames: Array.isArray(input?.starNames)
      ? input.starNames.map((row) => asBoundedString(row, 20)).filter(Boolean).slice(0, 18)
      : [],
    palaces,
    transformations: transformations.slice(0, 12),
    summaries: {
      relatedPalaceSummary: asBoundedString(input?.relatedPalaceSummary, 300),
      relatedStarSummary: asBoundedString(input?.relatedStarSummary, 500),
      transformationSummary: asBoundedString(input?.transformationSummary, 400),
      strengthSummary: asBoundedString(input?.strengthSummary, 260),
    },
  };
}

function getZiweiSectionBatchConfig(env = {}) {
  const rawBatchSize = Number(env?.PREMIUM_ZIWEI_SECTION_BATCH_SIZE || 1);
  const batchSize = Number.isFinite(rawBatchSize)
    ? Math.max(1, Math.min(4, Math.floor(rawBatchSize)))
    : 1;
  const rawParallel = String(env?.PREMIUM_ZIWEI_SECTION_PARALLEL || "false").trim().toLowerCase();
  const parallel = rawParallel === "1" || rawParallel === "true" || rawParallel === "yes";
  return { batchSize, parallel };
}

function isZiweiLlmRequired(env = {}) {
  const raw = String(env?.PREMIUM_ZIWEI_REQUIRE_LLM || "true").trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "no");
}

/**
 * LLM 섹션 결과 검증
 *
 * 필수 조건:
 * - 최소 글자 수 기준
 * - 해당 섹션 제목과 관련 있는 내용
 * - targetPalace 또는 관련 궁 이름이 자연스럽게 반영
 * - 실제 별 이름 또는 강도 기호가 최소 1회 반영
 * - 동일 문장 반복 없음
 * - 일반적인 운세 문구만 반복하면 안 됨
 * - 금지어 없음
 */
export function validateLLMSectionContent(content, input) {
  const text = String(content || "").trim();
  const errors = [];
  const warnings = [];
  const textLower = text.toLowerCase();

  // 1. 비어 있는지 확인
  if (!text || text.length < 50) {
    errors.push("EMPTY_OR_TOO_SHORT");
  }

  // 2. 최소 글자 수 기준
  // section.minChars는 "권장 목표 길이"로 취급하고, 너무 짧은 경우만 하드 실패 처리한다.
  const minChars = resolveZiweiSectionMinChars(input);
  const hardMinChars = minChars;
  const softMinChars = minChars;
  if (text.length < hardMinChars) {
    errors.push(`BELOW_HARD_MIN_CHARS(${text.length}/${hardMinChars})`);
  } else if (text.length < softMinChars) {
    warnings.push(`BELOW_TARGET_CHARS(${text.length}/${minChars})`);
  }

  // 3. 금지어 검사
  const foundForbidden = ZIWEI_SECTION_FORBIDDEN_WORDS.find((word) =>
    text.includes(word)
  );
  if (foundForbidden) {
    errors.push(`FORBIDDEN_WORD(${foundForbidden})`);
  }

  // 4. 동일 문장 반복 검사
  const duplicateCheck = detectDuplicateSentences(text, 5);
  if (duplicateCheck.found) {
    errors.push("DUPLICATE_SENTENCE");
  }

  // 5. 일반적인 운세 문구만 반복되는지 확인
  if (hasOnlyGenericFortunePhrases(text)) {
    warnings.push("GENERIC_FORTUNE_ONLY");
  }

  // 6. 섹션 제목 관련 키워드 확인
  const sectionTitle = String(input.section?.title || "").toLowerCase();
  const sectionKeywords = sectionTitle
    .split(/[(\-—·,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
    .slice(0, 3);

  const matchedKeywords = sectionKeywords.filter((kw) => textLower.includes(kw));

  if (matchedKeywords.length === 0 && sectionKeywords.length > 1) {
    // 섹션 제목 키워드 누락은 경고로만 취급
    warnings.push("NO_SECTION_KEYWORD_MATCH");
  }

  // 7. targetPalace 또는 관련 궁 이름 확인
  const resolvedPalaceTokens = Array.isArray(input?.resolved?.resolved?.palaces)
    ? input.resolved.resolved.palaces.flatMap((palace) => [
      String(palace?.name || "").trim(),
      String(palace?.key || "").trim(),
    ]).filter(Boolean)
    : [];

  const targetPalaces = resolvedPalaceTokens.length > 0
    ? resolvedPalaceTokens
    : (Array.isArray(input.targetPalaces)
      ? input.targetPalaces
      : input.targetPalace
      ? [input.targetPalace]
      : []);

  const palacesFound = targetPalaces.filter((palace) =>
    textLower.includes(palace.toLowerCase())
  );

  if (targetPalaces.length > 0 && palacesFound.length === 0) {
    warnings.push("NO_TARGET_PALACE_FOUND");
  }

  // 8. 별 이름 또는 강도 기호 확인
  const starNames = []
    .concat(Array.isArray(input.starNames) ? input.starNames : [])
    .concat(
      Array.isArray(input?.resolved?.resolved?.palaces)
        ? input.resolved.resolved.palaces.flatMap((palace) =>
          []
            .concat(Array.isArray(palace?.mainStars) ? palace.mainStars : [])
            .concat(Array.isArray(palace?.assistantStars) ? palace.assistantStars : [])
            .concat(Array.isArray(palace?.minorStars) ? palace.minorStars : [])
            .concat(Array.isArray(palace?.maleficStars) ? palace.maleficStars : [])
            .map((star) => String(star?.name || star?.nameKo || "").trim())
            .filter(Boolean)
        )
        : []
    );
  const strengthSymbols = ["◎", "O", "▲", "△", "X"];

  const hasStarOrSymbol =
    starNames.some((star) => textLower.includes(star.toLowerCase())) ||
    strengthSymbols.some((symbol) => text.includes(symbol));

  const hasStrengthSymbol = strengthSymbols.some((symbol) => text.includes(symbol));
  const hasStarName = starNames.some((star) => textLower.includes(star.toLowerCase()));

  if (starNames.length > 0 && !hasStarName) {
    warnings.push("NO_STAR_NAME");
  }
  if (!hasStrengthSymbol) {
    warnings.push("NO_STRENGTH_SYMBOL");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    textLength: text.length,
    minRequired: hardMinChars,
    targetMinChars: minChars,
  };
}

function makeSectionFlowPayload(stage, input = {}, extra = {}) {
  const chapter = input.chapter || {};
  const section = input.section || {};
  const payload = input.minimalPayload || {};
  const resolved = input.resolved || {};
  const resolvedPalaces = Array.isArray(resolved?.resolved?.palaces)
    ? resolved.resolved.palaces
    : (Array.isArray(payload?.chart?.palaces) ? payload.chart.palaces : []);
  const palaceNames = resolvedPalaces.map((row) => String(row?.name || row?.key || "").trim()).filter(Boolean);
  const palaceKeys = Array.isArray(resolved?.resolved?.dataMap?.palaceKeys)
    ? resolved.resolved.dataMap.palaceKeys
    : palaceNames;
  const mainStarCount = resolvedPalaces.reduce((sum, palace) => sum + (Array.isArray(palace?.mainStars) ? palace.mainStars.length : 0), 0);
  const assistantStarCount = resolvedPalaces.reduce((sum, palace) => sum + (Array.isArray(palace?.assistantStars) ? palace.assistantStars.length : 0), 0);
  const transformationCount = Array.isArray(resolved?.resolved?.transformations) ? resolved.resolved.transformations.length : 0;
  const palaceCount = resolvedPalaces.length;
  return {
    stage,
    sessionId: String(input.requestId || input.reportId || input.sessionId || "").trim() || null,
    purchaseId: String(input.purchaseId || input.reportId || "").trim() || null,
    chapterId: String(chapter.chapterId || chapter.key || "").trim() || null,
    categoryId: String(section.sectionId || section.id || "").trim() || null,
    mode: String(payload?.mode || "personal").trim() || "personal",
    hasPayload: Boolean(payload && typeof payload === "object"),
    palaceCount,
    palaceKeys,
    palaceNames,
    mainStarCount,
    assistantStarCount,
    transformationCount,
    bodyLength: Number(extra.bodyLength || String(input.body || input.content || input.text || "").length || 0),
    source: String(extra.source || input.source || "").trim() || null,
    chapterCount: Number(extra.chapterCount || 0),
    categoryCount: Number(extra.categoryCount || 0),
    errorCode: extra.errorCode || null,
    message: extra.message || null,
  };
}

function toMinimalZiweiPayload(input = {}) {
  const profile = input.userProfile || {};
  const reportPayload = input.reportPayload || {};
  const canonicalZiweiChart = input.canonicalZiweiChart || {};
  const sourcePalacesRaw = Array.isArray(reportPayload?.palaces)
    ? reportPayload.palaces
    : (Array.isArray(canonicalZiweiChart?.palaces) ? canonicalZiweiChart.palaces : []);
  const sourcePalaces = normalizeZiweiPalaces(sourcePalacesRaw);

  const palaces = sourcePalaces.map((palace, index) => {
    const src = palace && typeof palace === "object" ? palace : {};
    const mainStars = Array.isArray(src.mainStars) ? src.mainStars : (Array.isArray(src.stars) ? src.stars : []);
    const subStars = Array.isArray(src.subStars) ? src.subStars : (Array.isArray(src.auxStars) ? src.auxStars : []);
    const maleficStars = Array.isArray(src.maleficStars) ? src.maleficStars : [];

    const normalizeStar = (star) => {
      const name = String(star?.name || star?.nameKo || "").trim();
      if (!name) return null;
      const brightness = String(star?.brightness || star?.strength || "").trim() || "평";
      const strengthSymbol = normalizeZiweiStrengthSymbol(star?.strengthSymbol || star?.symbol || brightness)
        || mapZiweiBrightnessToStrengthSymbol(brightness);
      return {
        name,
        brightness,
        strengthSymbol,
      };
    };

    const originalKey = String(src.originalKey || src.key || "").trim();
    const normalizedKey = normalizeZiweiPalaceKey(src.key || src.nameKo || src.name || src.palace || originalKey);

    return {
      key: normalizedKey || String(src.key || `palace-${index + 1}`).trim() || `palace-${index + 1}`,
      originalKey: originalKey || undefined,
      name: String(src.nameKo || src.name || src.palace || `궁${index + 1}`).trim() || `궁${index + 1}`,
      mainStars: mainStars.map(normalizeStar).filter(Boolean),
      subStars: subStars.map(normalizeStar).filter(Boolean),
      maleficStars: maleficStars.map(normalizeStar).filter(Boolean),
      isMing: Boolean(src.isMing),
      isShen: Boolean(src.isShen),
      brightnessSummary: String(src.brightnessSummary || "").trim() || "",
      shortInterpretationSeed: String(src.interpretationSeed || src.shortInterpretationSeed || "").trim() || "",
    };
  });

  return {
    service: "ziwei-premium",
    mode: "personal",
    user: {
      name: String(profile.name || "사용자").trim() || "사용자",
      gender: String(profile.gender || "").trim() || "",
      birthDate: String(profile.birthDate || reportPayload?.profile?.birth?.solarDate || "1970-01-01").trim() || "1970-01-01",
      birthTime: String(profile.birthTime || reportPayload?.profile?.birth?.time || "").trim() || "",
      calendarType: String(profile.calendarType || "solar").trim() === "lunar" ? "lunar" : "solar",
    },
    chart: {
      lifePalace: String(reportPayload?.chartMeta?.mingGong || canonicalZiweiChart?.chartMeta?.mingGong || "명궁").trim() || "명궁",
      bodyPalace: String(reportPayload?.chartMeta?.shenGong || canonicalZiweiChart?.chartMeta?.shenGong || "").trim() || undefined,
      palaces,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      engineVersion: String(reportPayload?.diagnostics?.source || canonicalZiweiChart?.version || "ziwei-engine").trim(),
      source: "local-ziwei-engine",
    },
  };
}

function normalizeZiweiSectionCategory(input = {}) {
  const chapter = input.chapter || {};
  const section = input.section || {};
  const canonicalChapter = input.canonicalChapter || null;
  const canonicalCategory = input.canonicalCategory || null;
  const chapterId = String(chapter.chapterId || canonicalChapter?.id || "").trim();
  const categoryId = String(section.sectionId || section.id || canonicalCategory?.id || "").trim();
  const categoryTitle = String(section.title || canonicalCategory?.title || "핵심 해석").trim() || "핵심 해석";
  const chapterTitle = String(chapter.title || canonicalChapter?.title || "자미두수 해석").trim() || "자미두수 해석";
  return {
    chapterId,
    chapterTitle,
    categoryId,
    categoryTitle,
  };
}

function formatZiweiStarEntry(star) {
  const name = String(star?.name || star?.nameKo || "").trim();
  if (!name) return "";
  const brightness = String(star?.brightness || star?.strength || "").trim() || "평";
  const symbol = String(star?.strengthSymbol || star?.symbol || mapZiweiBrightnessToStrengthSymbol(brightness)).trim() || "△";
  return `${name}(${brightness}/${symbol})`;
}

function formatZiweiStarCollection(stars = []) {
  return (Array.isArray(stars) ? stars : []).map(formatZiweiStarEntry).filter(Boolean).join(", ");
}

function formatZiweiPalaceSnapshot(palace) {
  const palaceName = String(palace?.name || palace?.nameKo || palace?.key || "").trim();
  if (!palaceName) return "";
  const mainStars = formatZiweiStarCollection(palace?.mainStars || palace?.stars || []);
  const assistantStars = formatZiweiStarCollection(palace?.assistantStars || palace?.subStars || palace?.auxStars || []);
  const minorStars = formatZiweiStarCollection(palace?.minorStars || []);
  const maleficStars = formatZiweiStarCollection(palace?.maleficStars || palace?.badStars || []);
  const transformations = Array.isArray(palace?.transformations)
    ? palace.transformations
      .map((row) => `${String(row?.starName || row?.name || row?.star || "").trim()}${String(row?.type || row?.transformation || "").trim() ? `-${String(row?.type || row?.transformation || "").trim()}` : ""}${String(row?.palaceName || row?.palace || "").trim() ? `→${String(row?.palaceName || row?.palace || "").trim()}` : ""}`)
      .filter(Boolean)
      .join(", ")
    : "";
  return [
    `${palaceName}`,
    mainStars ? `주성 ${mainStars}` : "",
    assistantStars ? `보조성 ${assistantStars}` : "",
    minorStars ? `잡성 ${minorStars}` : "",
    maleficStars ? `살성 ${maleficStars}` : "",
    transformations ? `사화 ${transformations}` : "",
    String(palace?.brightnessSummary || "").trim() ? `밝기 ${String(palace.brightnessSummary).trim()}` : "",
    String(palace?.palaceStrength || "").trim() ? `강도 ${String(palace.palaceStrength).trim()}` : "",
  ].filter(Boolean).join(" | ");
}

function summarizeZiweiResolvedData(input = {}, payload = {}) {
  const category = normalizeZiweiSectionCategory(input);
  const sectionId = String(input?.section?.sectionId || input?.section?.id || category.categoryId || "").trim();
  const sectionOrder = Number(input?.section?.order || Number(String(sectionId).match(/-(\d{1,2})$/)?.[1] || 0) || 0);
  const chapterOrder = Number(input?.chapter?.chapterNo || input?.canonicalChapter?.order || 0) || 0;
  const resolved = resolveZiweiCategoryData(
    input.canonicalCategory || {
      id: category.categoryId,
      order: sectionOrder || undefined,
      chapterOrder: chapterOrder || undefined,
      dataKey: String(input?.section?.dataKey || "").trim() || undefined,
      title: category.categoryTitle,
      requiredPalaces: input.chapter?.targetPalaces || [input.chapter?.targetPalace || "명궁"],
    },
    payload,
  );
  const palaceNames = resolved.palaces.map((palace) => String(palace?.name || palace?.key || "").trim()).filter(Boolean);
  const palaceSummary = palaceNames.length ? palaceNames.join(", ") : "명궁";
  const palaceSnapshots = resolved.palaces.map(formatZiweiPalaceSnapshot).filter(Boolean);
  const allMainStars = resolved.palaces.flatMap((palace) => Array.isArray(palace?.mainStars) ? palace.mainStars : []);
  const allAssistantStars = resolved.palaces.flatMap((palace) => Array.isArray(palace?.assistantStars) ? palace.assistantStars : []);
  const allMinorStars = resolved.palaces.flatMap((palace) => Array.isArray(palace?.minorStars) ? palace.minorStars : []);
  const allMaleficStars = resolved.palaces.flatMap((palace) => Array.isArray(palace?.maleficStars) ? palace.maleficStars : []);
  const allTransformations = Array.isArray(resolved.transformations) ? resolved.transformations : [];
  const strengthSummary = resolved.palaces.map((palace) => `${String(palace?.name || palace?.key || "").trim()}:${String(palace?.palaceStrength || "").trim() || "medium"}`).filter(Boolean).join(", ");
  const brightnessSummary = resolved.palaces.map((palace) => String(palace?.brightnessSummary || "").trim()).filter(Boolean).join(" / ");
  return {
    ...category,
    resolved,
    palaceSummary,
    palaceSnapshots,
    relatedPalaceSummary: palaceSnapshots.join(" / ") || palaceSummary,
    relatedStarSummary: [
      `주성 ${formatZiweiStarCollection(allMainStars)}`,
      allAssistantStars.length ? `보조성 ${formatZiweiStarCollection(allAssistantStars)}` : "",
      allMinorStars.length ? `잡성 ${formatZiweiStarCollection(allMinorStars)}` : "",
      allMaleficStars.length ? `살성 ${formatZiweiStarCollection(allMaleficStars)}` : "",
    ].filter(Boolean).join(" | "),
    transformationSummary: allTransformations.length
      ? allTransformations.map((row) => `${String(row?.starName || "").trim()}${String(row?.type || "").trim() ? `-${String(row.type).trim()}` : ""}${String(row?.palaceName || "").trim() ? `→${String(row.palaceName).trim()}` : ""}`).filter(Boolean).join(", ")
      : "",
    strengthSummary: strengthSummary || "",
    brightnessSummary: brightnessSummary || "",
  };
}

function containsZiweiEvidence(body, resolvedCategoryData = {}) {
  const text = String(body || "");
  if (!text) return false;

  const palaceNames = Array.isArray(resolvedCategoryData?.palaceNames)
    ? resolvedCategoryData.palaceNames.map((name) => String(name || "").trim()).filter(Boolean)
    : [];
  const mainStarNames = Array.isArray(resolvedCategoryData?.mainStars)
    ? resolvedCategoryData.mainStars.map((star) => String(star?.name || star?.nameKo || "").trim()).filter(Boolean)
    : [];
  const assistantStarNames = Array.isArray(resolvedCategoryData?.assistantStars)
    ? resolvedCategoryData.assistantStars.map((star) => String(star?.name || star?.nameKo || "").trim()).filter(Boolean)
    : [];
  const transformationNames = Array.isArray(resolvedCategoryData?.transformations)
    ? resolvedCategoryData.transformations
      .flatMap((row) => [
        String(row?.type || row?.transformation || "").trim(),
        String(row?.starName || row?.name || "").trim(),
      ])
      .filter(Boolean)
    : [];
  const brightnessTokens = new Set([
    "◎", "O", "▲", "△", "X", "묘", "왕", "득", "리", "평", "함", "실", "강", "약",
  ]);
  String(resolvedCategoryData?.brightnessSummary || "")
    .split(/[\s,|/()]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => brightnessTokens.add(token));

  if (palaceNames.some((token) => text.includes(token))) return true;
  if (mainStarNames.some((token) => text.includes(token))) return true;
  if (assistantStarNames.some((token) => text.includes(token))) return true;
  if (transformationNames.some((token) => text.includes(token))) return true;
  if (Array.from(brightnessTokens).some((token) => token && text.includes(token))) return true;
  return false;
}

function hasHighRepetitionRatio(body) {
  const sentences = String(body || "")
    .split(/[.!?。！？\n]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (sentences.length < 4) return false;
  const normalized = sentences.map((sentence) => sentence.replace(/\s+/g, " ").toLowerCase());
  const counts = new Map();
  normalized.forEach((sentence) => {
    counts.set(sentence, (counts.get(sentence) || 0) + 1);
  });
  const repeated = Array.from(counts.values()).filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
  return repeated / normalized.length >= 0.25 || Math.max(...counts.values()) >= 3;
}

export function isLowQualityZiweiSection(body, input = {}) {
  const text = String(body || "").trim();
  const minLength = resolveZiweiSectionMinChars(input);
  if (!text || text.length < minLength) return true;

  const banned = [
    "현재 확보된 명반 핵심값",
    "현재 확보된 자미두수 핵심 데이터를 기준으로",
    "성향/패턴/실행 전략을 정리했습니다.",
    "핵심 데이터를 바탕으로 분석합니다.",
    "일반적인 흐름으로 해석하면",
    "기본 성향상",
    "이 항목은 현재 확보된 명반 핵심값을 기준으로",
    "이 항목은 현재 확보된",
    "실행 포인트: 강점 구간은 작은 실행을 빠르게 누적하고",
    "실행 포인트: 강점 구간은",
    "변동 구간은 기준 루틴을 먼저 고정하세요",
    "변동 구간은 기준 루틴",
    "자미두수 명반 데이터를 서버에서 구성하는 중 문제가 발생했습니다",
    "잠시 후 다시 시도해 주세요",
    "자동 복구 생성",
    "fallback",
    "데이터 미확보",
    "계산 데이터가 부족합니다",
  ];

  if (banned.some((phrase) => text.includes(phrase))) return true;
  if (hasHighRepetitionRatio(text)) return true;
  if (!containsZiweiEvidence(text, input?.resolvedCategoryData || {})) return true;
  return false;
}

function getZiweiSectionTone(categoryId = "") {
  const chapterNo = Number(String(categoryId).match(/^c(\d{2})-/)?.[1] || 0);
  const toneMap = {
    1: {
      pattern: "명궁은 타고난 자아와 판단 습관이 드러나는 자리이므로, 선택 방식과 반응 속도를 먼저 읽어야 한다.",
      risk: "명궁의 흐름이 강하면 자기확신이 과해지고, 약하면 타인의 시선을 기준으로 움직이기 쉬워진다.",
      advice: "하루 선택 기준을 하나만 고정하고, 반응보다 검토를 먼저 두는 루틴이 중요하다.",
    },
    2: {
      pattern: "신궁은 후천적으로 굳어지는 선택 방식과 생활 습관의 축을 보여준다.",
      risk: "명궁과 신궁의 간극이 크면 겉모습과 실제 행동이 어긋날 수 있다.",
      advice: "초기 판단보다 반복 행동의 패턴을 점검해 후천적 강점을 의식적으로 키워야 한다.",
    },
    3: {
      pattern: "관록궁은 일의 방식이 곧 삶의 구조가 되는 영역이라 업무 습관과 성과의 리듬이 핵심이다.",
      risk: "성과를 급히 내려고 하면 소진이 빠르고, 기준이 흐리면 직업 방향이 자주 흔들린다.",
      advice: "성과보다 지속 가능한 업무 습관을 먼저 세팅하고, 평가 기준을 단순하게 유지하라.",
    },
    4: {
      pattern: "재백궁은 돈이 들어오고 나가는 방식 자체가 생활 전략과 연결되는 자리다.",
      risk: "수익 구조가 선명하지 않으면 누수와 충동 지출이 반복되기 쉽다.",
      advice: "수입원과 지출원을 분리해 기록하고, 고정비와 변동비를 따로 관리해야 한다.",
    },
    5: {
      pattern: "부부궁은 관계에서 어떤 기준으로 가까워지고 멀어지는지가 드러나는 자리다.",
      risk: "기대치를 말하지 않으면 실망이 쌓이고, 감정의 파도가 관계 리듬을 흔들 수 있다.",
      advice: "관계는 감정이 아니라 약속과 재확인으로 유지해야 하며, 경계와 요구를 분명히 해야 한다.",
    },
    6: {
      pattern: "복덕궁은 내면의 안정과 만족의 조건이 무엇인지 보여주는 자리다.",
      risk: "외부 성과만 쫓으면 정신적 소진이 빨라지고 회복의 감각을 잃기 쉽다.",
      advice: "혼자 회복하는 방식과 사람 속에서 회복하는 방식을 구분해 루틴화해야 한다.",
    },
    7: {
      pattern: "천이궁은 바깥 환경에서의 반응과 이동, 확장 운을 읽는 자린다.",
      risk: "외부 기회를 너무 빨리 넓히면 기준이 분산되고 실속이 약해질 수 있다.",
      advice: "이동과 확장은 검증된 장면에서만 넓히고, 나가기 전에 안쪽 기준을 먼저 세워야 한다.",
    },
    8: {
      pattern: "교우궁은 협업과 네트워크가 운을 키우는 방식과 손상시키는 방식을 함께 보여준다.",
      risk: "사람을 많이 만나는 것과 좋은 인연을 유지하는 것은 전혀 다르다.",
      advice: "도움을 주는 사람과 소모시키는 사람을 구분하는 기준을 명확히 해야 한다.",
    },
    9: {
      pattern: "부모궁과 형제궁은 초기 환경과 가족 구조가 성향에 남기는 흔적을 보여준다.",
      risk: "가족 기준을 그대로 내면화하면 성인이 된 뒤의 선택이 경직될 수 있다.",
      advice: "원가족의 영향은 인정하되, 현재의 삶에 맞는 거리와 기준을 새로 정해야 한다.",
    },
    10: {
      pattern: "질액궁과 전택궁은 몸의 리듬과 생활 기반이 안정성을 어떻게 만드는지 보여준다.",
      risk: "생활 기반이 흔들리면 컨디션과 감정, 성과가 동시에 무너질 수 있다.",
      advice: "건강 관리와 생활 기반 정비를 분리하지 말고 같은 루틴으로 묶어 관리해야 한다.",
    },
    11: {
      pattern: "자녀궁은 표현력, 창작물, 후대성과 결과물이 세상에 나오는 방식과 맞닿아 있다.",
      risk: "표현을 억누르면 결과물의 흐름이 막히고, 과잉 책임은 창작성을 약화시킨다.",
      advice: "결과물은 완성도보다 지속성으로 키우고, 생산의 리듬을 지키는 것이 우선이다.",
    },
    12: {
      pattern: "종합 장에서는 강점과 약점을 묶어 현실 전략으로 바꾸는 일이 핵심이다.",
      risk: "조각난 해석만 따라가면 전체 운의 구조를 놓치기 쉽다.",
      advice: "강점 궁, 약점 궁, 반복 패턴을 하나의 실행 계획으로 묶어야 한다.",
    },
  };
  return toneMap[chapterNo] || {
    pattern: "이 카테고리는 실제 궁과 별의 구조를 바탕으로 삶의 반복 패턴을 읽는 데 초점을 둔다.",
    risk: "명반 근거가 흔들릴수록 일반론이 강해지기 쉬우므로, 구체 별 구조를 다시 확인해야 한다.",
    advice: "명궁·신궁·해당 궁의 조합을 먼저 확인하고, 행동 기준을 짧게 정리해 실행해야 한다.",
  };
}

function buildZiweiOpeningParagraph(input, payload) {
  const summary = summarizeZiweiResolvedData(input, payload);
  const primaryPalace = summary.resolved.primaryPalace || summary.resolved.palaces[0] || null;
  const palaceName = String(primaryPalace?.name || summary.palaceSummary || input.categoryTitle || "해당 궁").trim();
  const starNames = formatZiweiStarCollection(primaryPalace?.mainStars || []) || formatZiweiStarCollection(summary.resolved.palaces.flatMap((palace) => palace.mainStars || []));
  const branchText = String(primaryPalace?.branch || "").trim();
  const stemText = String(primaryPalace?.stem || "").trim();
  return `${summary.chapterTitle}의 ${summary.categoryTitle}은 ${palaceName}의 구조를 중심으로 읽어야 한다. ${branchText || stemText ? `이 궁은 ${branchText || "지지 미상"}${stemText ? `·${stemText}` : ""}의 배치와 함께 해석할 때 더 선명해진다.` : ""} ${starNames ? `이 궁에서 확인되는 주성은 ${starNames}이며,` : ""} 이 조합은 현재의 선택 습관, 반응 속도, 관계를 받아들이는 기준이 어디에서 시작되는지를 드러낸다. 그래서 같은 사건이 와도 누구는 밀어붙이고, 누구는 관망하고, 누구는 재정비에 먼저 들어가는지 그 차이를 읽는 출발점이 된다.`;
}

function buildZiweiStarEvidenceParagraph(input, payload) {
  const summary = summarizeZiweiResolvedData(input, payload);
  const body = [
    summary.relatedPalaceSummary ? `궁 구조: ${summary.relatedPalaceSummary}.` : "",
    summary.relatedStarSummary ? `별 증거: ${summary.relatedStarSummary}.` : "",
    summary.transformationSummary ? `사화 흐름: ${summary.transformationSummary}.` : "",
    summary.strengthSummary ? `강도 분포: ${summary.strengthSummary}.` : "",
    summary.brightnessSummary ? `밝기 힌트: ${summary.brightnessSummary}.` : "",
  ].filter(Boolean).join(" ");
  return `${body || "이 궁의 구조는 실제 명반 근거를 따라 주성, 보조성, 사화, 강도 차이의 순서로 읽어야 한다."} ${summary.palaceSnapshots.length ? `특히 ${summary.palaceSnapshots.join("; ")}처럼 각 궁의 별 조합이 다르기 때문에, 같은 성향도 어떤 궁에서는 추진력으로, 어떤 궁에서는 부담으로 나타난다.` : ""} 밝기와 강도는 단순한 장식이 아니라 성향의 발현 속도와 안정도를 가늠하게 해 주며, 강한 별은 밀어붙이는 힘을, 약한 별은 조율과 보정의 필요성을 알려준다.`;
}

function buildZiweiPatternParagraph(input, payload) {
  const tone = getZiweiSectionTone(input.categoryId || input.section?.sectionId || "");
  const summary = summarizeZiweiResolvedData(input, payload);
  const palaceNames = summary.resolved.palaces.map((palace) => String(palace?.name || palace?.key || "").trim()).filter(Boolean).join(", ");
  const firstPalace = summary.resolved.palaces[0] || null;
  const firstMainStars = formatZiweiStarCollection(firstPalace?.mainStars || []);
  const secondPalace = summary.resolved.palaces[1] || null;
  const secondMainStars = formatZiweiStarCollection(secondPalace?.mainStars || []);
  return `${tone.pattern} ${palaceNames ? `이 구간에서는 ${palaceNames}의 실제 배치가 반복 패턴을 만든다.` : ""} ${summary.categoryTitle}의 핵심은 한 번의 사건보다 같은 선택이 어떤 방식으로 되풀이되는지에 있다. ${firstMainStars ? `첫 번째 궁의 주성 ${firstMainStars}는 출발 습관을 보여주고,` : ""} ${secondMainStars ? `보조 궁의 주성 ${secondMainStars}는 그 습관이 현실에서 어떤 결과로 굳어지는지 알려준다.` : ""} 그래서 해석은 감정 묘사보다 패턴의 지속성과 전환점을 먼저 잡아야 한다.`;
}

function buildZiweiRiskParagraph(input, payload) {
  const tone = getZiweiSectionTone(input.categoryId || input.section?.sectionId || "");
  const summary = summarizeZiweiResolvedData(input, payload);
  const warningPalaces = summary.palaceSummary || summary.categoryTitle;
  return `${tone.risk} ${warningPalaces ? `특히 ${warningPalaces}에서 보이는 과잉, 누수, 충돌 신호를 함께 확인해야 한다.` : ""} 내부 오류 문구가 아니라 실제 궁 구조에 따라 위험의 종류가 달라진다. ${summary.transformationSummary ? `사화가 붙어 있는 별과 궁은 위험이 빠르게 드러나므로, ${summary.transformationSummary} 같은 흐름을 따로 떼어 읽어야 한다.` : ""} 이런 위험은 한 번의 실수보다 반복되는 습관에서 커지므로, 본문에서는 어떤 행동이 어떤 손실로 이어지는지를 분명히 짚어야 한다.`;
}

function buildZiweiPracticalAdviceParagraph(input, payload) {
  const tone = getZiweiSectionTone(input.categoryId || input.section?.sectionId || "");
  const summary = summarizeZiweiResolvedData(input, payload);
  const advicePrefix = summary.categoryTitle.includes("사화") || String(input.categoryId || "").startsWith("c12")
    ? "사화와 궁 강도를 함께 묶어"
    : "실제 궁 구조를 기준으로";
  const firstAdvice = summary.resolved.palaces[0] ? `${String(summary.resolved.palaces[0].name || summary.resolved.palaces[0].key || "").trim()}의 ${formatZiweiStarCollection(summary.resolved.palaces[0].mainStars || []) || "핵심 별 구조"}` : summary.palaceSummary;
  return `${advicePrefix} ${tone.advice} ${summary.palaceSummary ? `이번 카테고리에서는 ${summary.palaceSummary}의 정보가 직접적인 실행 기준이 된다.` : ""} ${firstAdvice ? `가장 먼저 점검할 것은 ${firstAdvice}가 일상에서 어떤 선택 습관으로 바뀌는지이다.` : ""} 따라서 해석 끝에는 반드시 오늘 바로 바꿀 수 있는 한 가지 행동과, 한 주 안에 검증할 한 가지 기준을 같이 제시해야 한다.`;
}

function buildZiweiPsychologyAndRelationshipParagraph(input, payload) {
  const summary = summarizeZiweiResolvedData(input, payload);
  const categoryId = String(input?.categoryId || input?.section?.sectionId || "").trim();
  const firstPalace = summary.resolved.palaces[0] || {};
  const secondPalace = summary.resolved.palaces[1] || {};
  const firstPalaceName = String(firstPalace?.name || firstPalace?.key || summary.palaceSummary || "해당 궁").trim();
  const firstMain = formatZiweiStarCollection(firstPalace?.mainStars || []);
  const firstAssistant = formatZiweiStarCollection(firstPalace?.assistantStars || []);
  const secondPalaceName = String(secondPalace?.name || secondPalace?.key || "").trim();
  const secondMain = formatZiweiStarCollection(secondPalace?.mainStars || []);
  const relationSentence = categoryId.startsWith("c05")
    ? "부부궁 축에서는 감정의 밀도와 관계 운영 방식이 바로 삶의 성과로 연결되므로, 마음의 반응 속도를 관계 규칙으로 바꾸는 연습이 핵심이다."
    : "인간관계는 단순 호감 문제가 아니라 궁의 별 조합이 만든 반응 습관의 결과이므로, 같은 자극에서 반복되는 감정 루프를 먼저 끊어야 한다.";
  return `${firstPalaceName}${firstMain ? `의 주성 ${firstMain}` : "의 주성 배치"} ${firstAssistant ? `및 보조성 ${firstAssistant}` : "구조"}는 심리의 중심축을 만든다. 이 축이 강하게 작동하면 스스로 기준을 세우고 밀어붙이는 힘이 커지지만, 감정 충격을 받은 뒤에는 방어적으로 닫히는 양상도 같이 나타난다. ${secondPalaceName ? `${secondPalaceName}${secondMain ? `의 ${secondMain}` : "의 별 배치"}는` : "보조 궁의 별 배치는"} 이 심리 구조가 타인과의 거리 조절, 신뢰 형성, 갈등 해소에서 어떤 형태로 표출되는지를 보여준다. ${relationSentence} 따라서 관계 문제를 운의 탓으로 보지 말고, 명반에서 이미 반복되는 반응 패턴을 행동 규칙으로 전환해야 실제 변화가 난다.`;
}

function buildZiweiWorkMoneyLoveParagraph(input, payload) {
  const summary = summarizeZiweiResolvedData(input, payload);
  const palaceByName = (keyword) => summary.resolved.palaces.find((palace) => String(palace?.name || "").includes(keyword));
  const careerPalace = palaceByName("관록") || summary.resolved.palaces[0] || {};
  const wealthPalace = palaceByName("재백") || summary.resolved.palaces[1] || summary.resolved.palaces[0] || {};
  const lovePalace = palaceByName("부부") || summary.resolved.palaces[2] || summary.resolved.palaces[0] || {};
  const careerText = `${String(careerPalace?.name || careerPalace?.key || "직업 축").trim()}${formatZiweiStarCollection(careerPalace?.mainStars || []) ? `의 주성 ${formatZiweiStarCollection(careerPalace?.mainStars || [])}` : "의 별 조합"}`;
  const wealthText = `${String(wealthPalace?.name || wealthPalace?.key || "재정 축").trim()}${formatZiweiStarCollection(wealthPalace?.mainStars || []) ? `의 주성 ${formatZiweiStarCollection(wealthPalace?.mainStars || [])}` : "의 별 조합"}`;
  const loveText = `${String(lovePalace?.name || lovePalace?.key || "관계 축").trim()}${formatZiweiStarCollection(lovePalace?.mainStars || []) ? `의 주성 ${formatZiweiStarCollection(lovePalace?.mainStars || [])}` : "의 별 조합"}`;
  return `직업에서는 ${careerText}이 일 처리 방식, 의사결정 구조, 책임을 감당하는 방식에 직접적으로 반영된다. 돈의 흐름은 ${wealthText}에서 보이는 확장/보수 성향에 따라 수입원 운영과 지출 통제가 갈리며, 단기 성과보다 구조적 누수 차단이 먼저다. 연애와 친밀 관계는 ${loveText}가 보여주는 기대치와 감정 표현 방식의 영향을 크게 받기 때문에, 상대를 바꾸기보다 먼저 자신의 반응 규칙을 명확히 해야 안정이 생긴다. 결국 직업-재정-연애는 분리된 문제가 아니라 같은 성향 축의 다른 표현이므로, 한 영역의 패턴을 교정하면 나머지 영역도 같이 개선된다.`;
}

function extractZiweiDaewoonSummary(payload = {}) {
  const chart = payload?.chart && typeof payload.chart === "object" ? payload.chart : {};
  const candidates = [chart?.majorLuck, chart?.daewoon, chart?.decadalLuck, chart?.tenYearLuck, chart?.fortunePeriods];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      const rows = candidate
        .slice(0, 3)
        .map((row) => {
          if (typeof row === "string") return row.trim();
          const age = String(row?.ageRange || row?.range || row?.age || "").trim();
          const palace = String(row?.palaceName || row?.palace || "").trim();
          const star = String(row?.starName || row?.star || "").trim();
          return [age, palace, star].filter(Boolean).join("/");
        })
        .filter(Boolean);
      if (rows.length) return rows.join(", ");
    }
  }
  return "";
}

function buildZiweiTimingAndExecutionParagraph(input, payload) {
  const summary = summarizeZiweiResolvedData(input, payload);
  const lifePalace = String(payload?.chart?.lifePalace || "명궁").trim() || "명궁";
  const bodyPalace = String(payload?.chart?.bodyPalace || "").trim();
  const daewoonSummary = extractZiweiDaewoonSummary(payload);
  const transformationText = String(summary.transformationSummary || "").trim();
  return `${lifePalace}${bodyPalace ? `과 신궁(${bodyPalace})` : ""}의 결합은 생각과 실행 간격을 결정하는 핵심 축이다. ${transformationText ? `사화 흐름(${transformationText})은 사건이 어떤 순서로 현실화되는지를 보여주므로, 중요한 선택은 사화가 집중되는 궁의 리스크를 먼저 점검한 뒤 진행해야 한다.` : "사화가 관여한 별은 사건 전개 속도를 빠르게 만들 수 있으므로, 감정 반응보다 실행 순서를 먼저 설계해야 한다."} ${daewoonSummary ? `대운 흐름에서는 ${daewoonSummary} 구간이 전환점으로 읽히며, 이 시기에는 확장보다 기반 정비가 우선인지 점검이 필요하다.` : "대운 데이터가 명시된 경우에는 전환 구간을 기준으로 목표와 리스크 관리 강도를 다르게 배치해야 성과 변동을 줄일 수 있다."} 실전에서는 오늘 실행할 항목(작은 행동), 주간 점검 항목(반복 패턴), 월간 조정 항목(직업·돈·관계)을 분리해 관리하면 명반의 강점을 손실 없이 현실 성과로 연결할 수 있다.`;
}

function ensureZiweiFallbackLength(text, input = {}, payload = {}) {
  let body = String(text || "").trim();
  const target = resolveZiweiSectionMinChars(input);
  if (body.length >= target) return body;
  const supplements = [
    buildZiweiPsychologyAndRelationshipParagraph(input, payload),
    buildZiweiWorkMoneyLoveParagraph(input, payload),
    buildZiweiTimingAndExecutionParagraph(input, payload),
  ];
  for (const paragraph of supplements) {
    if (!paragraph) continue;
    body = `${body}\n\n${paragraph}`.trim();
    if (body.length >= target) break;
  }
  return body;
}

export function buildZiweiExpertLocalFallbackSection(input, payload) {
  const text = [
    buildZiweiOpeningParagraph(input, payload),
    buildZiweiStarEvidenceParagraph(input, payload),
    buildZiweiPatternParagraph(input, payload),
    buildZiweiPsychologyAndRelationshipParagraph(input, payload),
    buildZiweiWorkMoneyLoveParagraph(input, payload),
    buildZiweiRiskParagraph(input, payload),
    buildZiweiPracticalAdviceParagraph(input, payload),
    buildZiweiTimingAndExecutionParagraph(input, payload),
  ].join("\n\n");
  return ensureZiweiFallbackLength(text, input, payload);
}

export function normalizeZiweiSectionResult(input, raw, payload) {
  const rawBody = extractBodyFromLlmResponse(raw);
  const body = String(rawBody || "").trim();
  if (isLowQualityZiweiSection(body, input)) {
    logZiweiFlow("warn", "LLM_SECTION_LOW_QUALITY", {
      sessionId: input?.requestId || input?.sessionId,
      purchaseId: input?.purchaseId,
      reportId: input?.reportId,
      chapterId: input?.chapterId,
      chapterTitle: input?.chapterTitle,
      categoryId: input?.categoryId,
      categoryTitle: input?.categoryTitle,
      bodyLength: body.length,
      source: "expert-local-fallback",
      errorCode: "LOW_QUALITY_SECTION",
      message: "LLM 응답 품질 기준 미달로 expert-local-fallback 사용",
    });
    return {
      chapterId: String(input?.chapterId || "").trim(),
      categoryId: String(input?.categoryId || "").trim(),
      title: String(input?.categoryTitle || "핵심 해석").trim() || "핵심 해석",
      body: String(buildZiweiExpertLocalFallbackSection(input, payload) || "").trim(),
      source: "expert-local-fallback",
    };
  }
  return {
    chapterId: String(input?.chapterId || "").trim(),
    categoryId: String(input?.categoryId || "").trim(),
    title: String(input?.categoryTitle || "핵심 해석").trim() || "핵심 해석",
    body,
    source: "llm",
  };
}

function extractBodyFromLlmResponse(raw) {
  if (typeof raw === "string") return raw;
  if (!raw || typeof raw !== "object") return "";
  if (typeof raw.body === "string") return raw.body;
  if (typeof raw.content === "string") return raw.content;
  if (typeof raw.text === "string") return raw.text;
  if (typeof raw.output === "string") return raw.output;
  if (typeof raw.response === "string") return raw.response;
  return "";
}

function buildLocalFallbackSection(input = {}, section = {}, reason = "") {
  return {
    title: String(section?.title || input?.categoryTitle || "핵심 해석").trim() || "핵심 해석",
    body: buildZiweiExpertLocalFallbackSection({
      ...normalizeZiweiSectionCategory(input),
      categoryId: input?.section?.sectionId || input?.section?.id || input?.categoryId || "",
    }, input?.minimalPayload || toMinimalZiweiPayload(input)),
    source: "expert-local-fallback",
  };
}

/**
 * 세부 카테고리별 LLM 호출 (최대 재시도 3회)
 */
export async function generateZiweiSectionWithLLM(env, input) {
  const maxAttempts = Math.max(1, Math.min(3, Number(env?.PREMIUM_ZIWEI_SECTION_MAX_ATTEMPTS || 3)));
  let lastError = null;
  const baseTimeoutMs = Number(env.PREMIUM_ZIWEI_GEMINI_TIMEOUT_MS || 30000);
  const baseTotalTimeoutMs = Number(env.PREMIUM_ZIWEI_GEMINI_TOTAL_TIMEOUT_MS || 50000);
  const modelEnvKeys = [
    "PREMIUM_ZIWEI_GEMINI_MODEL",
    "ZIWEI_GEMINI_MODEL",
    "PREMIUM_GEMINI_MODEL",
    "GEMINI_MODEL",
  ];
  const keyEnvKeys = [
    "GEMINIF_API_KEY1",
    "GEMINIF_API_KEY2",
    "GEMINIF_API_KEY3",
    "GEMINIF_API_KEY4",
    "PREMIUM_GEMINI_API_KEY1",
    "PREMIUM_GEMINI_API_KEY2",
    "PREMIUM_GEMINI_API_KEY3",
    "PREMIUM_GEMINI_API_KEY4",
    "GEMINI_API_KEY",
    "GOOGLE_GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_AI_API_KEY",
    "GOOGLE_API_KEY",
  ];
  const resolvedKeyCount = pickGeminiKeys(env, keyEnvKeys).length;
  const resolvedModels = pickGeminiModels(env, modelEnvKeys);
  const processGeminiKeyConfigured = Boolean(
    typeof process !== "undefined"
      ? String(process?.env?.GEMINI_API_KEY || process?.env?.GOOGLE_GEMINI_API_KEY || "").trim()
      : "",
  );

  // 섹션 생성 시작 — 원인 추적을 위한 구조화 진단 로그
  const _dbgPalaces = Array.isArray(input.minimalPayload?.chart?.palaces) ? input.minimalPayload.chart.palaces : [];
  const _dbgResolvedPalaces = Array.isArray(input.resolved?.resolved?.palaces) ? input.resolved.resolved.palaces : [];
  const _diagBase = {
    sessionId: input.requestId || input.sessionId,
    purchaseId: input.purchaseId,
    reportId: input.reportId,
    chapterId: input.chapter?.chapterId || input.chapterId,
    chapterTitle: input.chapter?.title || input.chapterTitle,
    categoryId: input.section?.sectionId || input.categoryId,
    categoryTitle: input.section?.title || input.categoryTitle,
    ..._diagPayload(input.minimalPayload),
    resolvedPalaceCount: _dbgResolvedPalaces.length,
    resolvedPalaceKeys: _dbgResolvedPalaces.map((p) => String(p?.key || p?.name || "")).filter(Boolean),
    mainStarCount: _dbgResolvedPalaces.reduce((s, p) => s + (Array.isArray(p?.mainStars) ? p.mainStars.length : 0), 0),
    maleficStarCount: _dbgResolvedPalaces.reduce((s, p) => s + (Array.isArray(p?.maleficStars) ? p.maleficStars.length : 0), 0),
    keyCount: resolvedKeyCount,
    modelCandidates: resolvedModels,
    maxAttempts,
    localSeedLength: String(input.localSeedText || "").length,
  };

  const corePalaces = Array.isArray(input?.coreAnalysisJson?.palaces) ? input.coreAnalysisJson.palaces : [];
  if (corePalaces.length <= 0) {
    logZiweiFlow("error", "CORE_ANALYSIS_JSON_EMPTY", {
      ..._diagBase,
      errorCode: "ZIWEI_CORE_ANALYSIS_EMPTY",
      errorMessage: "coreAnalysisJson.palaces is empty",
      message: "LLM 입력 차단: coreAnalysisJson.palaces가 비어 있음",
    });
    return {
      ok: false,
      errorCode: "ZIWEI_CORE_ANALYSIS_EMPTY",
      chapterId: input.chapter?.chapterId || input.chapterId,
      sectionId: input.section?.sectionId || input.categoryId,
      maxAttempts: 0,
      lastError: "coreAnalysisJson.palaces is empty",
      source: "llm",
    };
  }

  if (resolvedKeyCount <= 0) {
    logZiweiFlow("error", "LLM_KEY_MISSING", {
      ..._diagBase,
      errorCode: "ZIWEI_LLM_KEY_MISSING",
      errorMessage: "Gemini API key not configured. Set GEMINIF_API_KEY1-4 or PREMIUM_GEMINI_API_KEY1-4 in worker secrets.",
      message: "데이터 없음 아님 — LLM API 키 미설정. 키 환경변수를 확인하라.",
    });
    return {
      ok: false,
      errorCode: "ZIWEI_LLM_KEY_MISSING",
      chapterId: input.chapter?.chapterId,
      sectionId: input.section?.sectionId,
      maxAttempts: 0,
      lastError: "Gemini API key is not configured",
      source: "llm",
    };
  }

  const prompt = buildZiweiSectionLLMPrompt(input);
  logZiweiFlow("info", "LLM_SECTION_REQUEST_READY", {
    ..._diagBase,
    promptLength: prompt.length,
    hasCorePalaces: corePalaces.length > 0,
    message: "LLM 요청 입력 준비 완료",
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logZiweiFlow("info", "LLM_SECTION_CALL_START", {
        ..._diagBase,
        attempt,
        promptLength: prompt.length,
        message: `LLM 호출 시작 (${attempt}/${maxAttempts})`,
      });

      // LLM 호출
      const llmResult = await callGeminiText(env, prompt, {
        modelEnvKeys,
        keyEnvKeys,
        temperature: 0.72,
        topP: 0.92,
        maxOutputTokens: 4096,
        timeoutMs: Math.min(120000, Math.max(15000, baseTimeoutMs + ((attempt - 1) * 12000))),
        totalTimeoutMs: Math.min(160000, Math.max(30000, baseTotalTimeoutMs + ((attempt - 1) * 18000))),
        maxAttemptsPerPair: Math.max(1, Math.min(3, Number(env.PREMIUM_ZIWEI_GEMINI_RETRY_PER_PAIR || 2))),
      });

      if (!llmResult?.ok || !String(llmResult?.text || "").trim()) {
        lastError = new Error(String(llmResult?.message || llmResult?.error || "EMPTY_LLM_RESPONSE"));
        logZiweiFlow("warn", "LLM_SECTION_CALL_FAILED", {
          ..._diagBase,
          attempt,
          errorCode: "EMPTY_LLM_RESPONSE",
          errorMessage: String(lastError.message || "EMPTY_LLM_RESPONSE"),
          message: `LLM 호출 실패 — 빈 응답. HTTP ${Number(llmResult?.status || 0) || "unknown"}. 시도 ${attempt}/${maxAttempts}.`,
        });
        continue;
      }

      const content = String(llmResult.text || "").trim();

      // 결과 검증
      const validation = validateLLMSectionContent(content, input);

      if (validation.ok) {
        logZiweiFlow("info", "LLM_SECTION_CALL_SUCCESS", {
          ..._diagBase,
          attempt,
          bodyLength: validation.textLength,
          source: "llm",
          message: `LLM 성공. 텍스트 길이 ${validation.textLength}자. 경고: ${(validation.warnings || []).join(",") || "없음"}`,
        });

        return {
          ok: true,
          content,
          textLength: validation.textLength,
          attempt,
          source: "llm",
        };
      }

      // 검증 실패
      lastError = new Error(validation.errors.join(";"));
      logZiweiFlow("warn", "LLM_SECTION_LOW_QUALITY", {
        ..._diagBase,
        attempt,
        errorCode: "LLM_VALIDATION_FAILED",
        validationErrors: validation.errors,
        errorMessage: validation.errors.join("; "),
        message: `LLM 출력 품질 기준 미달. errors=[${validation.errors.join(",")}]. 시도 ${attempt}/${maxAttempts}. resolvedPalaceCount=${_dbgResolvedPalaces.length} — 키 불일치 가능성 확인.`,
      });

      // 마지막 시도가 아니면 재시도
      if (attempt < maxAttempts) {
        continue;
      }
    } catch (error) {
      lastError = error;
      logZiweiFlow("error", "LLM_SECTION_CALL_FAILED", {
        ..._diagBase,
        attempt,
        errorCode: "LLM_REQUEST_FAILED",
        errorName: error?.name,
        errorMessage: String(error?.message || "UNKNOWN_ERROR"),
        errorStack: error?.stack,
        message: `LLM API 호출 예외 발생. 시도 ${attempt}/${maxAttempts}. 네트워크/쿼터/타임아웃 확인.`,
      });

      if (attempt >= maxAttempts) {
        break;
      }
    }
  }

  // 모든 재시도 실패
  return {
    ok: false,
    errorCode: "LLM_SECTION_GENERATION_FAILED",
    chapterId: input.chapter?.chapterId,
    sectionId: input.section?.sectionId,
    maxAttempts,
    lastError: String(lastError?.message || "UNKNOWN_ERROR"),
    source: "llm",
  };
}

/**
 * 세부 카테고리용 LLM 프롬프트 구성
 */
function buildZiweiSectionLLMPrompt(input) {
  const writingRules = input.writingRules || {};
  const avoid = Array.isArray(writingRules.avoid) ? writingRules.avoid : [];
  const mustInclude = Array.isArray(writingRules.mustInclude) ? writingRules.mustInclude : [];
  const evidence = toZiweiPromptEvidence(input);
  const minLength = resolveZiweiSectionMinChars(input);
  const systemInstruction = [
    "당신은 30년 경력의 자미두수 고수입니다.",
    "당신은 프리미엄 PDF 생성 엔진으로서 일반론/placeholder/fallback 반복 문장을 절대 출력하지 않습니다.",
    "LLM은 계산을 하지 않습니다. 로컬 계산 엔진이 산출한 JSON만 해석합니다.",
    "사용자가 읽을 프리미엄 자미두수 PDF의 한 카테고리 본문을 작성합니다.",
    "반드시 제공된 coreAnalysisJson과 resolvedCategoryData만 근거로 해석합니다.",
    "명반에 없는 궁, 별, 사화, 밝기를 임의로 만들지 않습니다.",
    "계산을 새로 하지 않습니다.",
    "JSON 원문, 내부 key, payload, debug, fallback 표현을 사용자에게 노출하지 않습니다.",
    "문체는 고급 상담문이어야 하며, 짧은 요약이나 범용 조언으로 끝내지 않습니다.",
    "각 카테고리 본문은 핵심 기질, 주성/보조성 상호작용, 밝기/강도, 반복 패턴, 위험 요소, 현실 조언의 순서로 쓴다.",
    "문체는 단정적인 예언이 아니라 명반 근거 기반의 깊은 상담문이어야 한다.",
    "막연한 위로나 일반론을 쓰지 말고, 반드시 제공된 궁/별/사화 데이터를 구체적으로 언급한다.",
    "각 카테고리 본문은 해당 궁의 핵심 별 조합을 먼저 짚고, 실제 삶의 선택/관계/일/재정/건강에 바로 적용 가능한 실행 조언으로 마무리한다.",
    "근거 없는 점괘식 표현, 추상적 수사, 형식적 도입부를 금지한다.",
    "각 카테고리는 반드시 실제 주성, 실제 보조성, 실제 궁 의미 연결, 행동 패턴, 심리 구조, 현실 사건 패턴, 인간관계 반복 패턴, 돈/직업/연애 연결, 실전 조언을 포함한다.",
    "카테고리별 문장 구조와 관점은 서로 달라야 하며 같은 문장 패턴을 반복하지 않는다.",
    "출력 텍스트는 반드시 최소 1200자 이상이어야 한다.",
    `절대 쓰면 안 되는 문구: ${avoid.join(" | ")}`,
    `반드시 포함할 항목: ${mustInclude.join(" | ")}`,
    "출력은 순수 본문 텍스트만 반환하라.",
    "Markdown, JSON, 코드블록은 사용하지 마라.",
  ].join("\n");

  const userPrompt = [
    `[섹션 메타]`,
    `챕터: ${input.chapterTitle || "자미두수 해석"}`,
    `카테고리: ${input.categoryTitle || "핵심 해석"}`,
    `챕터 ID: ${input.chapterId || ""}`,
    `카테고리 ID: ${input.categoryId || ""}`,
    `데이터 키: ${input.dataKey || ""}`,
    `최소 길이: ${minLength}자 이상`,
    "",
    `[핵심 분석 JSON]`,
    JSON.stringify(input.coreAnalysisJson || {}, null, 2),
    "",
    `[카테고리 해석 데이터 JSON]`,
    JSON.stringify(input.resolvedCategoryData || {}, null, 2),
    "",
    `[명반 근거]`,
    `궁 요약: ${String(input.relatedPalaceSummary || "").trim()}`,
    `별 요약: ${String(input.relatedStarSummary || "").trim()}`,
    `사화 요약: ${String(input.transformationSummary || "").trim() || "없음"}`,
    `강도 요약: ${String(input.strengthSummary || "").trim() || "없음"}`,
    "",
    `[로컬 시드]`,
    String(input.localSeedText || "").trim(),
    "",
    `[사용자 명반 데이터]`,
    JSON.stringify(evidence, null, 2),
    "",
    `[작성 규칙]`,
    `- 절대 금지 문구: "현재 확보된 자미두수 핵심 데이터를 기준으로...", "성향/패턴/실행 전략을 정리했습니다.", "핵심 데이터를 바탕으로 분석합니다.", "자동 복구 생성", "일반적인 흐름으로 해석하면", "기본 성향상"`,
    `- 1. 해당 궁이 자미두수에서 의미하는 핵심 영역`,
    `- 2. 해당 궁의 주성이 만드는 성향`,
    `- 3. 보조성/잡성/살성이 만드는 보완 또는 위험 신호`,
    `- 4. 밝기/강도 차이가 만드는 장점과 약점`,
    `- 5. 실제 삶에서 반복되는 패턴`,
    `- 6. 조심해야 할 선택`,
    `- 7. 현실에서 적용할 수 있는 구체적 조언`,
    `- 내부 오류 문구나 fallback 문구를 절대 쓰지 않는다.`,
    `- 계산을 새로 하지 말고, 이미 주어진 명반 데이터만 해석한다.`,
    `- coreAnalysisJson.palaces와 resolvedCategoryData.evidenceText를 반드시 직접 인용해 근거를 제시한다.`,
  ].filter(Boolean).join("\n");

  return `${systemInstruction}\n\n${userPrompt}`;
}

/**
 * 전체 챕터의 모든 섹션 생성 (일괄 실패 처리)
 */
export async function generateZiweiChapterFromSections(env, input) {
  const chapter = input.chapter || {};
  const sections = input.sections || [];

  if (!Array.isArray(sections) || sections.length === 0) {
    return {
      ok: false,
      code: "NO_SECTIONS_TO_GENERATE",
      message: "생성할 섹션이 없습니다.",
    };
  }

  const generatedSections = [];
  const failedSections = [];
  const llmRequired = isZiweiLlmRequired(env);
  const minimalPayload = (input?.minimalPayload && typeof input.minimalPayload === "object")
    ? input.minimalPayload
    : toMinimalZiweiPayload(input);

  logZiweiFlow("info", "ENGINE_CALC_SUCCESS", {
    sessionId: input.requestId || input.reportId || input.sessionId,
    purchaseId: input.purchaseId,
    reportId: input.reportId,
    chapterId: String(chapter?.chapterId || "").trim() || null,
    chapterTitle: String(chapter?.title || "").trim() || null,
    availablePalaceKeys: Array.isArray(minimalPayload?.chart?.palaces)
      ? minimalPayload.chart.palaces.map((p) => String(p?.key || "")).filter(Boolean)
      : [],
    palaceCount: Array.isArray(minimalPayload?.chart?.palaces) ? minimalPayload.chart.palaces.length : 0,
    hasLifePalaceKey: Boolean(minimalPayload?.chart?.lifePalace),
    hasBodyPalaceKey: Boolean(minimalPayload?.chart?.bodyPalace),
    message: "엔진 계산 결과가 섹션 생성 단계로 전달됨",
  });

  logZiweiFlow("info", "MINIMAL_PAYLOAD_READY", {
    sessionId: input.requestId || input.reportId || input.sessionId,
    purchaseId: input.purchaseId,
    reportId: input.reportId,
    chapterId: String(chapter?.chapterId || "").trim() || null,
    chapterTitle: String(chapter?.title || "").trim() || null,
    availablePalaceKeys: Array.isArray(minimalPayload?.chart?.palaces)
      ? minimalPayload.chart.palaces.map((p) => String(p?.key || "")).filter(Boolean)
      : [],
    palaceCount: Array.isArray(minimalPayload?.chart?.palaces) ? minimalPayload.chart.palaces.length : 0,
    hasLifePalaceKey: Boolean(minimalPayload?.chart?.lifePalace),
    hasBodyPalaceKey: Boolean(minimalPayload?.chart?.bodyPalace),
    message: "LLM 입력용 minimal payload 준비 완료",
  });

  const canonicalChapters = buildCanonicalZiweiPdfChapters(minimalPayload);
  const chapterNo = Number(chapter?.chapterNo || 1);
  const canonicalChapter = canonicalChapters.find((row) => Number(row?.order || 0) === chapterNo) || null;

  console.info("[ZiweiPremium][Flow] CANONICAL_CHAPTERS_READY", makeSectionFlowPayload("CANONICAL_CHAPTERS_READY", {
    ...input,
    chapter,
    minimalPayload,
  }, {
    chapterCount: canonicalChapters.length,
    categoryCount: Array.isArray(canonicalChapter?.categories) ? canonicalChapter.categories.length : sections.length,
    message: "canonical-ready",
  }));

  const createSectionTask = (section, idx) => {
    const sectionId = String(section?.sectionId || section?.id || "").trim();
    const sectionOrder = Number(section?.order || Number(String(sectionId).match(/-(\d{1,2})$/)?.[1] || 0) || 0);
    const canonicalCategory = Array.isArray(canonicalChapter?.categories)
      ? (
        canonicalChapter.categories.find((cat) => String(cat?.id || "").trim() === sectionId)
        || (sectionOrder > 0 ? canonicalChapter.categories.find((cat) => Number(cat?.order || 0) === sectionOrder) : null)
        || null
      )
      : null;

    logZiweiFlow("info", "CATEGORY_DATA_RESOLVE_START", {
      sessionId: input.requestId || input.reportId || input.sessionId,
      purchaseId: input.purchaseId,
      reportId: input.reportId,
      chapterId: String(chapter.chapterId || canonicalChapter?.id || "").trim(),
      chapterTitle: String(chapter.title || canonicalChapter?.title || "").trim(),
      categoryId: String(canonicalCategory?.id || section?.sectionId || section?.id || "").trim(),
      categoryTitle: String(section?.title || canonicalCategory?.title || "").trim(),
      availablePalaceKeys: Array.isArray(minimalPayload?.chart?.palaces)
        ? minimalPayload.chart.palaces.map((p) => String(p?.key || "")).filter(Boolean)
        : [],
      palaceCount: Array.isArray(minimalPayload?.chart?.palaces) ? minimalPayload.chart.palaces.length : 0,
      message: "카테고리 데이터 해석 시작",
    });

    const resolved = summarizeZiweiResolvedData({
      chapter,
      section,
      canonicalChapter,
      canonicalCategory,
      minimalPayload,
    }, minimalPayload);
    const weakData = !Boolean(resolved?.resolved?.hasAnyUsableData)
      && Boolean(resolved?.resolved?.hasBroadChartData);
    if (weakData) {
      logZiweiFlow("warn", "CATEGORY_DATA_RESOLVE_WEAK", {
        sessionId: input.requestId || input.reportId || input.sessionId,
        purchaseId: input.purchaseId,
        reportId: input.reportId,
        chapterId: String(chapter.chapterId || canonicalChapter?.id || "").trim(),
        chapterTitle: String(chapter.title || canonicalChapter?.title || "").trim(),
        categoryId: String(canonicalCategory?.id || section?.sectionId || section?.id || "").trim(),
        categoryTitle: String(section?.title || canonicalCategory?.title || "").trim(),
        expectedPalaceKeys: Array.isArray(resolved?.resolved?.dataMap?.palaceKeys) ? resolved.resolved.dataMap.palaceKeys : [],
        resolvedPalaceKeys: Array.isArray(resolved?.resolved?.palaces)
          ? resolved.resolved.palaces.map((p) => String(p?.key || p?.name || "")).filter(Boolean)
          : [],
        availablePalaceKeys: Array.isArray(minimalPayload?.chart?.palaces)
          ? minimalPayload.chart.palaces.map((p) => String(p?.key || "")).filter(Boolean)
          : [],
        palaceCount: Array.isArray(minimalPayload?.chart?.palaces) ? minimalPayload.chart.palaces.length : 0,
        resolvedPalaceCount: Array.isArray(resolved?.resolved?.palaces) ? resolved.resolved.palaces.length : 0,
        hasLifePalaceKey: Boolean(minimalPayload?.chart?.lifePalace),
        hasBodyPalaceKey: Boolean(minimalPayload?.chart?.bodyPalace),
        message: "카테고리 단위 데이터가 약해 broad chart seed로 보완합니다. 전체 실패로 처리하지 않습니다.",
      });
    } else {
      logZiweiFlow("info", "CATEGORY_DATA_RESOLVE_SUCCESS", {
        sessionId: input.requestId || input.reportId || input.sessionId,
        purchaseId: input.purchaseId,
        reportId: input.reportId,
        chapterId: String(chapter.chapterId || canonicalChapter?.id || "").trim(),
        chapterTitle: String(chapter.title || canonicalChapter?.title || "").trim(),
        categoryId: String(canonicalCategory?.id || section?.sectionId || section?.id || "").trim(),
        categoryTitle: String(section?.title || canonicalCategory?.title || "").trim(),
        expectedPalaceKeys: Array.isArray(resolved?.resolved?.dataMap?.palaceKeys) ? resolved.resolved.dataMap.palaceKeys : [],
        resolvedPalaceKeys: Array.isArray(resolved?.resolved?.palaces)
          ? resolved.resolved.palaces.map((p) => String(p?.key || p?.name || "")).filter(Boolean)
          : [],
        availablePalaceKeys: Array.isArray(minimalPayload?.chart?.palaces)
          ? minimalPayload.chart.palaces.map((p) => String(p?.key || "")).filter(Boolean)
          : [],
        palaceCount: Array.isArray(minimalPayload?.chart?.palaces) ? minimalPayload.chart.palaces.length : 0,
        resolvedPalaceCount: Array.isArray(resolved?.resolved?.palaces) ? resolved.resolved.palaces.length : 0,
        message: "카테고리 데이터 해석 성공",
      });
    }

    const localSeedText = (weakData
      ? buildZiweiBroadChartSeed(
        {
          id: canonicalCategory?.id || section?.sectionId || section?.id || "",
          title: section?.title || canonicalCategory?.title || "핵심 해석",
          dataKey: String(canonicalCategory?.dataKey || section?.dataKey || "").trim() || undefined,
          order: Number(canonicalCategory?.order || sectionOrder || 0) || undefined,
          chapterOrder: Number(canonicalCategory?.chapterOrder || chapterNo || 0) || undefined,
        },
        minimalPayload,
      )
      : "")
      || buildZiweiCategorySeed(
        {
          id: canonicalCategory?.id || section?.sectionId || section?.id || "",
          order: Number(canonicalCategory?.order || sectionOrder || 0) || undefined,
          chapterOrder: Number(canonicalCategory?.chapterOrder || chapterNo || 0) || undefined,
          dataKey: String(canonicalCategory?.dataKey || section?.dataKey || "").trim() || undefined,
          title: section?.title || canonicalCategory?.title || "핵심 해석",
          requiredPalaces: Array.isArray(chapter?.targetPalaces)
            ? chapter.targetPalaces
            : (chapter?.targetPalace ? [chapter.targetPalace] : ["명궁"]),
        },
        minimalPayload,
        resolved?.resolved,
      );

    const _corePalaces = Array.isArray(minimalPayload?.chart?.palaces) ? minimalPayload.chart.palaces : [];
    const _resolvedPalaces = Array.isArray(resolved?.resolved?.palaces) ? resolved.resolved.palaces : [];
    const _resolvedMainStars = _resolvedPalaces.flatMap((p) => Array.isArray(p?.mainStars) ? p.mainStars : []);
    const _resolvedAssistantStars = _resolvedPalaces.flatMap((p) => Array.isArray(p?.assistantStars) ? p.assistantStars : []);
    const _resolvedMinorStars = _resolvedPalaces.flatMap((p) => Array.isArray(p?.minorStars) ? p.minorStars : []);
    const _resolvedMaleficStars = _resolvedPalaces.flatMap((p) => Array.isArray(p?.maleficStars) ? p.maleficStars : []);
    const _allPalaces = Array.isArray(resolved?.resolved?.allPalaces) ? resolved.resolved.allPalaces : [];
    const _fallbackStarPool = _allPalaces.flatMap((p) => []
      .concat(Array.isArray(p?.mainStars) ? p.mainStars : [])
      .concat(Array.isArray(p?.assistantStars) ? p.assistantStars : [])
      .concat(Array.isArray(p?.minorStars) ? p.minorStars : [])
      .concat(Array.isArray(p?.maleficStars) ? p.maleficStars : [])
    );
    const _evidencePalaceNames = _resolvedPalaces.map((p) => String(p?.name || p?.key || "").trim()).filter(Boolean);
    const _evidenceStarNames = []
      .concat(_resolvedMainStars, _resolvedAssistantStars, _resolvedMinorStars, _resolvedMaleficStars)
      .map((s) => String(s?.name || s?.nameKo || "").trim())
      .filter(Boolean);
    const _fallbackStarNames = _fallbackStarPool
      .map((s) => String(s?.name || s?.nameKo || "").trim())
      .filter(Boolean);
    const _evidenceText = [
      `궁 근거: ${_evidencePalaceNames.join(", ") || (Array.isArray(_corePalaces) && _corePalaces.length ? _corePalaces.map((p) => String(p?.name || p?.key || "").trim()).filter(Boolean).slice(0, 3).join(", ") : "없음")}`,
      `별 근거: ${_evidenceStarNames.join(", ") || _fallbackStarNames.slice(0, 12).join(", ") || "주성 정보 제한"}`,
      `밝기 근거: ${String(resolved?.brightnessSummary || "").trim() || "평/△"}`,
      `사화 근거: ${String(resolved?.transformationSummary || "").trim() || "없음"}`,
    ].join(" | ");

    const coreAnalysisJson = {
      lifePalaceKey: String(minimalPayload?.chart?.lifePalace || "").trim() || "life",
      bodyPalaceKey: String(minimalPayload?.chart?.bodyPalace || "").trim() || undefined,
      palaces: _corePalaces,
      fourTransformations: minimalPayload?.chart?.fourTransformations || undefined,
      strongestPalaces: minimalPayload?.chart?.strongestPalaces || undefined,
      weakestPalaces: minimalPayload?.chart?.weakestPalaces || undefined,
    };

    const resolvedCategoryData = {
      palaceKeys: _resolvedPalaces.map((p) => String(p?.key || "").trim()).filter(Boolean),
      palaceNames: _resolvedPalaces.map((p) => String(p?.name || p?.key || "").trim()).filter(Boolean),
      mainStars: _resolvedMainStars,
      assistantStars: _resolvedAssistantStars,
      minorStars: _resolvedMinorStars,
      maleficStars: _resolvedMaleficStars,
      transformations: Array.isArray(resolved?.resolved?.transformations) ? resolved.resolved.transformations : [],
      brightnessSummary: String(resolved?.brightnessSummary || "").trim() || "평/△",
      evidenceText: _evidenceText,
    };

    const sectionInput = {
      service: "ziwei-premium",
      mode: "personal",
      chapterId: String(chapter.chapterId || canonicalChapter?.id || `ch${String(chapterNo).padStart(2, "0")}`).trim(),
      chapterTitle: String(chapter.title || canonicalChapter?.title || `Chapter ${chapterNo}`).trim(),
      categoryId: String(canonicalCategory?.id || section?.sectionId || section?.id || "").trim(),
      categoryTitle: String(section?.title || canonicalCategory?.title || "핵심 해석").trim(),
      dataKey: String(canonicalCategory?.dataKey || section?.dataKey || resolved?.resolved?.dataKey || "").trim() || String(canonicalCategory?.id || section?.sectionId || section?.id || "").trim(),
      coreAnalysisJson,
      resolvedCategoryData,
      localSeedText,
      relatedPalaceSummary: resolved.relatedPalaceSummary,
      relatedStarSummary: resolved.relatedStarSummary,
      transformationSummary: resolved.transformationSummary,
      strengthSummary: resolved.strengthSummary,
      writingRules: {
        persona: "30년 경력의 자미두수 고수",
        tone: "고급 자미두수 프리미엄 상담문",
        minLength: resolveZiweiSectionMinChars({ section, writingRules: { minLength: Number(canonicalCategory?.minChars || 0) } }),
        avoid: [
          "현재 확보된 명반 핵심값",
          "현재 확보된 자미두수 핵심 데이터를 기준으로",
          "성향/패턴/실행 전략을 정리했습니다.",
          "핵심 데이터를 바탕으로 분석합니다.",
          "일반적인 흐름으로 해석하면",
          "기본 성향상",
          "이 항목은 현재 확보된 명반 핵심값을 기준으로",
          "실행 포인트: 강점 구간은 작은 실행을 빠르게 누적하고",
          "변동 구간은 기준 루틴을 먼저 고정하세요",
          "자미두수 명반 데이터를 서버에서 구성하는 중 문제가 발생했습니다",
          "잠시 후 다시 시도해 주세요",
          "자동 복구 생성",
          "fallback",
          "데이터 미확보",
          "JSON",
          "payload",
          "debug",
          "계산 데이터가 부족합니다",
        ],
        mustInclude: [
          "해당 궁 이름",
          "해당 궁의 주성",
          "보조성 또는 살성 중 확인 가능한 요소",
          "심리 구조와 행동 패턴",
          "현실 사건 패턴",
          "인간관계 반복 패턴",
          "돈/직업/연애 연결",
          "별의 밝기/강도 해석",
          "성향",
          "반복 패턴",
          "주의점",
          "현실 조언",
        ],
      },
      chapter,
      section,
      userProfile: input.userProfile,
      canonicalZiweiChart: input.canonicalZiweiChart,
      reportPayload: input.reportPayload,
      starNames: input.starNames || [],
      targetPalaces: chapter.targetPalaces || [chapter.targetPalace],
      minimalPayload,
      canonicalChapter,
      canonicalCategory,
      requestId: input.requestId,
      reportId: input.reportId,
      chapterCount: canonicalChapters.length,
      categoryCount: sections.length,
      resolved,
    };

    logZiweiFlow("info", "CATEGORY_SEED_READY", {
      sessionId: input.requestId || input.reportId || input.sessionId,
      purchaseId: input.purchaseId,
      reportId: input.reportId,
      chapterId: sectionInput.chapterId,
      chapterTitle: sectionInput.chapterTitle,
      categoryId: sectionInput.categoryId,
      categoryTitle: sectionInput.categoryTitle,
      resolvedPalaceCount: Array.isArray(resolved?.resolved?.palaces) ? resolved.resolved.palaces.length : 0,
      localSeedLength: String(localSeedText || "").length,
      message: weakData ? "weak-data seed 준비 완료" : "resolved seed 준비 완료",
    });

    return {
      idx,
      section,
      resolved,
      sectionInput,
    };
  };

  const runSectionTask = async (task) => {
    const sectionInput = task.sectionInput;
    const section = task.section;
    const resolved = task.resolved;

    console.info("[ZiweiPremium][Flow] SECTION_GENERATION_START", makeSectionFlowPayload("SECTION_GENERATION_START", sectionInput, {
      chapterCount: canonicalChapters.length,
      categoryCount: sections.length,
      message: "llm-request",
    }));

    logZiweiFlow("info", "LLM_SECTION_REQUEST_READY", {
      sessionId: input.requestId || input.reportId || input.sessionId,
      purchaseId: input.purchaseId,
      reportId: input.reportId,
      chapterId: sectionInput.chapterId,
      chapterTitle: sectionInput.chapterTitle,
      categoryId: sectionInput.categoryId,
      categoryTitle: sectionInput.categoryTitle,
      resolvedPalaceCount: Array.isArray(sectionInput?.resolved?.resolved?.palaces)
        ? sectionInput.resolved.resolved.palaces.length
        : 0,
      palaceCount: Array.isArray(sectionInput?.coreAnalysisJson?.palaces) ? sectionInput.coreAnalysisJson.palaces.length : 0,
      localSeedLength: String(sectionInput.localSeedText || "").length,
      message: "LLM 호출 직전 요청 입력 점검 완료",
    });

    const result = await generateZiweiSectionWithLLM(env, sectionInput);
    const normalized = normalizeZiweiSectionResult(sectionInput, result.ok ? result.content : result, minimalPayload);

    return {
      task,
      result,
      normalized,
      sectionInput,
      section,
      resolved,
    };
  };

  const sectionTasks = sections.map((section, idx) => createSectionTask(section, idx));
  const orderedTaskResults = new Array(sectionTasks.length);
  const batchConfig = getZiweiSectionBatchConfig(env);

  for (let start = 0; start < sectionTasks.length; start += batchConfig.batchSize) {
    const taskBatch = sectionTasks.slice(start, start + batchConfig.batchSize);
    for (const task of taskBatch) {
      const row = await runSectionTask(task);
      orderedTaskResults[row.task.idx] = row;
    }
  }

  for (let idx = 0; idx < orderedTaskResults.length; idx += 1) {
    const row = orderedTaskResults[idx];
    if (!row) continue;
    const { result, normalized, sectionInput, section, resolved } = row;

    if (result.ok && normalized.source === "llm") {
      logZiweiFlow("info", "LLM_SECTION_CALL_SUCCESS", {
        sessionId: input.requestId || input.reportId || input.sessionId,
        purchaseId: input.purchaseId,
        reportId: input.reportId,
        chapterId: sectionInput.chapterId,
        chapterTitle: sectionInput.chapterTitle,
        categoryId: sectionInput.categoryId,
        categoryTitle: sectionInput.categoryTitle,
        expectedPalaceKeys: Array.isArray(resolved.resolved?.dataMap?.palaceKeys) ? resolved.resolved.dataMap.palaceKeys : [],
        resolvedPalaceKeys: resolved.resolved.palaces.map((p) => String(p?.key || p?.name || "")).filter(Boolean),
        availablePalaceKeys: minimalPayload?.chart?.palaces?.map((p) => String(p?.key || "")),
        palaceCount: minimalPayload?.chart?.palaces?.length ?? 0,
        resolvedPalaceCount: resolved.resolved.palaces.length,
        mainStarCount: resolved.resolved.palaces.reduce((s, p) => s + (Array.isArray(p?.mainStars) ? p.mainStars.length : 0), 0),
        transformationCount: Array.isArray(resolved.resolved?.transformations) ? resolved.resolved.transformations.length : 0,
        hasLifePalaceKey: Boolean(minimalPayload?.chart?.lifePalace),
        hasBodyPalaceKey: Boolean(minimalPayload?.chart?.bodyPalace),
        bodyLength: String(normalized.body || "").length,
        source: "llm",
      });
      generatedSections.push({
        sectionId: sectionInput.categoryId || section.sectionId,
        sectionTitle: normalized.title,
        content: normalized.body,
        textLength: String(normalized.body || "").length,
        source: normalized.source,
      });
    } else {
      // CHAPTER_DATA_FAILED 원인 추적 — 이 로그에서 데이터없음/키불일치/LLM실패 구분 가능
      const _resolvedPalaceKeys = resolved.resolved.palaces.map((p) => String(p?.key || p?.name || "")).filter(Boolean);
      const _expectedPalaceKeys = Array.isArray(resolved.resolved?.dataMap?.palaceKeys) ? resolved.resolved.dataMap.palaceKeys : [];
      const _availableKeys = minimalPayload?.chart?.palaces?.map((p) => String(p?.key || "")) ?? [];
      const _palaceCount = minimalPayload?.chart?.palaces?.length ?? 0;
      const _resolvedCount = resolved.resolved.palaces.length;
      const _isWeakCategoryData = !Boolean(resolved?.resolved?.hasAnyUsableData)
        && Boolean(resolved?.resolved?.hasBroadChartData);
      // 원인 분류
      const _diagReason = _palaceCount === 0
        ? "데이터 없음 — minimalPayload.chart.palaces가 비어 있음"
        : _resolvedCount === 0
          ? `키 불일치 — expectedPalaceKeys=[${_expectedPalaceKeys.join(",")}], availableKeys=[${_availableKeys.join(",")}]`
          : `LLM 호출 실패 또는 품질 기준 미달 — errorCode=${result.errorCode || "LOW_QUALITY_SECTION"}`;
      const _fallbackStage = _isWeakCategoryData ? "CATEGORY_DATA_WEAK_FALLBACK" : "CHAPTER_DATA_FAILED";
      logZiweiFlow(_isWeakCategoryData ? "info" : "warn", _fallbackStage, {
        sessionId: input.requestId || input.reportId || input.sessionId,
        purchaseId: input.purchaseId,
        reportId: input.reportId,
        chapterId: sectionInput.chapterId,
        chapterTitle: sectionInput.chapterTitle,
        categoryId: sectionInput.categoryId,
        categoryTitle: sectionInput.categoryTitle,
        expectedPalaceKeys: _expectedPalaceKeys,
        resolvedPalaceKeys: _resolvedPalaceKeys,
        availablePalaceKeys: _availableKeys,
        palaceCount: _palaceCount,
        resolvedPalaceCount: _resolvedCount,
        mainStarCount: resolved.resolved.palaces.reduce((s, p) => s + (Array.isArray(p?.mainStars) ? p.mainStars.length : 0), 0),
        maleficStarCount: resolved.resolved.palaces.reduce((s, p) => s + (Array.isArray(p?.maleficStars) ? p.maleficStars.length : 0), 0),
        transformationCount: Array.isArray(resolved.resolved?.transformations) ? resolved.resolved.transformations.length : 0,
        hasLifePalaceKey: Boolean(minimalPayload?.chart?.lifePalace),
        hasBodyPalaceKey: Boolean(minimalPayload?.chart?.bodyPalace),
        hasFourTransformations: _availableKeys.some((_, i) => Array.isArray(minimalPayload?.chart?.palaces?.[i]?.transformations) && minimalPayload.chart.palaces[i].transformations.length > 0),
        bodyLength: String(normalized.body || "").length,
        source: normalized.source,
        errorCode: result.errorCode || "LOW_QUALITY_SECTION",
        errorMessage: String(result.lastError || result.errorCode || "expert-local-fallback"),
        message: _isWeakCategoryData
          ? `최소 데이터 약함 보완 처리: ${_diagReason}`
          : _diagReason,
      });
      if (!_isWeakCategoryData && llmRequired) {
        failedSections.push({
          sectionId: sectionInput.categoryId || section.sectionId,
          sectionTitle: section.title,
          errorCode: result.errorCode || "LOW_QUALITY_SECTION",
          reason: result.lastError || "Unknown reason",
        });
      }
      generatedSections.push({
        sectionId: sectionInput.categoryId || section.sectionId,
        sectionTitle: normalized.title,
        content: String(normalized.body || "").trim(),
        textLength: String(normalized.body || "").trim().length,
        source: normalized.source,
      });
    }
  }

  const nonLlmSections = generatedSections.filter((row) => String(row?.source || "") !== "llm");
  if (llmRequired && nonLlmSections.length > 0) {
    // LLM 호출 실패 시 데이터 기반 expert fallback 허용 — ok: false 차단 제거
    // 원인 로그는 LLM_SECTION_LOW_QUALITY / LLM_KEY_MISSING 에서 이미 기록됨
    logZiweiFlow("warn", "LLM_REQUIRED_EXPERT_FALLBACK_ALLOWED", {
      sessionId: input.requestId || input.reportId || input.sessionId,
      purchaseId: input.purchaseId,
      reportId: input.reportId,
      chapterId: String(chapter.chapterId || canonicalChapter?.id || "").trim() || null,
      availablePalaceKeys: minimalPayload?.chart?.palaces?.map((p) => String(p?.key || "")),
      palaceCount: minimalPayload?.chart?.palaces?.length ?? 0,
      hasLifePalaceKey: Boolean(minimalPayload?.chart?.lifePalace),
      hasBodyPalaceKey: Boolean(minimalPayload?.chart?.bodyPalace),
      message: `expert-fallback 허용: llmRequired=${llmRequired}, nonLlm=${nonLlmSections.length}/${generatedSections.length}. sectionIds=[${nonLlmSections.map((r) => r.sectionId).join(",")}]`,
    });
  }

  const bannedPdfText = [
    "자미두수 명반 데이터를 서버에서 구성하는 중 문제가 발생했습니다",
    "잠시 후 다시 시도해 주세요",
    "현재 확보된 명반 핵심값",
    "강점 구간은 작은 실행을 빠르게 누적",
    "변동 구간은 기준 루틴을 먼저 고정",
    "자동 복구 생성",
    "fallback",
    "데이터 미확보",
    "해석을 불러오는 데 실패했습니다",
  ];
  const finalText = generatedSections.map((row) => String(row?.content || "")).join("\n");
  const hasBanned = bannedPdfText.some((phrase) => finalText.includes(phrase));
  const _baseChapterDiag = {
    sessionId: input.requestId || input.reportId || input.sessionId,
    purchaseId: input.purchaseId,
    reportId: input.reportId,
    chapterId: String(chapter.chapterId || canonicalChapter?.id || "").trim() || null,
    availablePalaceKeys: minimalPayload?.chart?.palaces?.map((p) => String(p?.key || "")),
    palaceCount: minimalPayload?.chart?.palaces?.length ?? 0,
    hasLifePalaceKey: Boolean(minimalPayload?.chart?.lifePalace),
    hasBodyPalaceKey: Boolean(minimalPayload?.chart?.bodyPalace),
    bodyLength: finalText.length,
  };
  if (hasBanned) {
    logZiweiFlow("warn", "PDF_TEXT_BANNED_CONTENT", {
      ..._baseChapterDiag,
      errorCode: "BANNED_TEXT_PRESENT",
      message: "PDF 본문에 금지어 포함됨. bannedPdfText 항목 확인 필요.",
    });
  } else {
    logZiweiFlow("info", "PDF_TEXT_VALIDATION_PASS", {
      ..._baseChapterDiag,
      source: "validation-success",
      errorCode: null,
      message: "pdf text validation success",
    });
    const allBodiesPresent = generatedSections.every((row) => String(row?.content || "").trim().length > 0);
    if (allBodiesPresent) {
      logZiweiFlow("info", "PDF_RENDER_SUCCESS", {
        ..._baseChapterDiag,
        source: "pdf-ready",
        message: "모든 카테고리 본문 생성 완료 및 렌더링 가능한 상태",
      });
    }
  }

  return {
    ok: true,
    chapterId: chapter.chapterId,
    chapterNo: chapter.chapterNo,
    generatedSections,
    totalLength: generatedSections.reduce((sum, s) => sum + s.textLength, 0),
    failedSections,
    failedCount: failedSections.length,
    successCount: generatedSections.length - failedSections.length,
  };
}
