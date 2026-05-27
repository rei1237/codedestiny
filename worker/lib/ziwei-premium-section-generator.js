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
  resolveZiweiCategoryData,
  mapZiweiBrightnessToStrengthSymbol,
  normalizeZiweiStrengthSymbol,
} from "./ziwei-premium-book-structure.js";

const ZIWEI_SECTION_FORBIDDEN_WORDS = [
  "자동 복구 생성",
  "fallback",
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
  const minChars = Number(input.section?.minChars || 1000);
  const hardMinChars = Math.max(220, Math.floor(minChars * 0.35));
  const softMinChars = Math.max(hardMinChars, Math.floor(minChars * 0.75));
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
  const sourcePalaces = Array.isArray(reportPayload?.palaces)
    ? reportPayload.palaces
    : (Array.isArray(canonicalZiweiChart?.palaces) ? canonicalZiweiChart.palaces : []);

  const palaces = sourcePalaces.map((palace, index) => {
    const src = palace && typeof palace === "object" ? palace : {};
    const mainStars = Array.isArray(src.mainStars) ? src.mainStars : (Array.isArray(src.stars) ? src.stars : []);
    const subStars = Array.isArray(src.subStars) ? src.subStars : (Array.isArray(src.auxStars) ? src.auxStars : []);

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

    return {
      key: String(src.key || `palace-${index + 1}`).trim() || `palace-${index + 1}`,
      name: String(src.nameKo || src.name || src.palace || `궁${index + 1}`).trim() || `궁${index + 1}`,
      mainStars: mainStars.map(normalizeStar).filter(Boolean),
      subStars: subStars.map(normalizeStar).filter(Boolean),
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
  const resolved = resolveZiweiCategoryData(
    input.canonicalCategory || { id: category.categoryId, title: category.categoryTitle, requiredPalaces: input.chapter?.targetPalaces || [input.chapter?.targetPalace || "명궁"] },
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

function containsAnyKnownZiweiStarOrPalace(body, input) {
  const text = String(body || "");
  const summarySources = [
    input?.relatedPalaceSummary,
    input?.relatedStarSummary,
    input?.transformationSummary,
    input?.strengthSummary,
    input?.localSeedText,
    input?.chapterTitle,
    input?.categoryTitle,
  ];
  const tokens = new Set();
  summarySources.forEach((source) => {
    String(source || "")
      .split(/[\n,|/·:;\s]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .forEach((token) => tokens.add(token));
  });
  const resolved = input?.resolved?.palaces || [];
  resolved.forEach((palace) => {
    const palaceName = String(palace?.name || palace?.key || "").trim();
    if (palaceName) tokens.add(palaceName);
    [...(palace?.mainStars || []), ...(palace?.assistantStars || []), ...(palace?.minorStars || []), ...(palace?.maleficStars || [])].forEach((star) => {
      const starName = String(star?.name || star?.nameKo || "").trim();
      if (starName) tokens.add(starName);
    });
  });
  return Array.from(tokens).some((token) => text.includes(token));
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
  if (!text || text.length < 900) return true;

  const banned = [
    "이 항목은 현재 확보된 명반 핵심값을 기준으로",
    "실행 포인트: 강점 구간은 작은 실행을 빠르게 누적하고",
    "변동 구간은 기준 루틴을 먼저 고정하세요",
    "자미두수 명반 데이터를 서버에서 구성하는 중 문제가 발생했습니다",
    "잠시 후 다시 시도해 주세요",
    "자동 복구 생성",
    "fallback",
    "데이터 미확보",
    "계산 데이터가 부족합니다",
    "현재 확보된 명반 핵심값",
  ];

  if (banned.some((phrase) => text.includes(phrase))) return true;
  if (!containsAnyKnownZiweiStarOrPalace(text, input)) return true;
  return hasHighRepetitionRatio(text);
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

export function buildZiweiExpertLocalFallbackSection(input, payload) {
  return [
    buildZiweiOpeningParagraph(input, payload),
    buildZiweiStarEvidenceParagraph(input, payload),
    buildZiweiPatternParagraph(input, payload),
    buildZiweiRiskParagraph(input, payload),
    buildZiweiPracticalAdviceParagraph(input, payload),
  ].join("\n\n");
}

export function normalizeZiweiSectionResult(input, raw, payload) {
  const rawBody = extractBodyFromLlmResponse(raw);
  const body = String(rawBody || "").trim();
  if (isLowQualityZiweiSection(body, input)) {
    return {
      chapterId: input.chapterId,
      categoryId: input.categoryId,
      title: input.categoryTitle,
      body: buildZiweiExpertLocalFallbackSection(input, payload),
      source: "expert-local-fallback",
    };
  }
  return {
    chapterId: input.chapterId,
    categoryId: input.categoryId,
    title: input.categoryTitle,
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
  const maxAttempts = 3;
  let lastError = null;
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

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 프롬프트 구성
      const prompt = buildZiweiSectionLLMPrompt(input);

      // LLM 호출
      const llmResult = await callGeminiText(env, prompt, {
        modelEnvKeys,
        keyEnvKeys,
        temperature: 0.72,
        topP: 0.92,
        maxOutputTokens: 4096,
        timeoutMs: Number(env.PREMIUM_ZIWEI_GEMINI_TIMEOUT_MS || 30000),
        totalTimeoutMs: Number(env.PREMIUM_ZIWEI_GEMINI_TOTAL_TIMEOUT_MS || 50000),
        maxAttemptsPerPair: Math.max(1, Math.min(3, Number(env.PREMIUM_ZIWEI_GEMINI_RETRY_PER_PAIR || 2))),
      });

      if (!llmResult?.ok || !String(llmResult?.text || "").trim()) {
        lastError = new Error(String(llmResult?.message || llmResult?.error || "EMPTY_LLM_RESPONSE"));
        console.warn("[ZiweiBook.LLMEmptyResponse]", {
          chapterId: input.chapter?.chapterId,
          sectionId: input.section?.sectionId,
          attempt,
          error: String(lastError.message || "EMPTY_LLM_RESPONSE"),
          keyConfigured: resolvedKeyCount > 0,
          keyCount: resolvedKeyCount,
          modelCandidates: resolvedModels,
        });
        continue;
      }

      const content = String(llmResult.text || "").trim();

      // 결과 검증
      const validation = validateLLMSectionContent(content, input);

      if (validation.ok) {
        console.info("[ZiweiPremium][Flow] SECTION_GENERATION_SUCCESS", makeSectionFlowPayload("SECTION_GENERATION_SUCCESS", input, {
          chapterCount: Number(input.chapterCount || 0),
          categoryCount: Number(input.categoryCount || 0),
          message: "llm",
        }));
        console.info("[ZiweiBook.LLMSectionSuccess]", {
          chapterId: input.chapter?.chapterId,
          sectionId: input.section?.sectionId,
          textLength: validation.textLength,
          warnings: validation.warnings || [],
          attempt,
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
      console.warn("[ZiweiBook.LLMValidationFailed]", {
        chapterId: input.chapter?.chapterId,
        sectionId: input.section?.sectionId,
        errors: validation.errors,
        attempt,
        keyConfigured: resolvedKeyCount > 0,
        modelCandidates: resolvedModels,
      });

      // 마지막 시도가 아니면 재시도
      if (attempt < maxAttempts) {
        continue;
      }
    } catch (error) {
      lastError = error;
      console.error("[ZiweiBook.LLMRequestFailed]", {
        chapterId: input.chapter?.chapterId,
        sectionId: input.section?.sectionId,
        attempt,
        message: String(error?.message || "UNKNOWN_ERROR"),
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
  const systemInstruction = [
    "당신은 30년 경력의 자미두수 고수다.",
    "사용자가 읽는 프리미엄 PDF 상담문을 작성한다.",
    "반드시 제공된 자미두수 계산 데이터만 근거로 해석한다.",
    "명반에 없는 별, 궁, 사화를 임의로 만들지 않는다.",
    "계산을 새로 하지 않는다.",
    "JSON, 내부 키, payload, fallback, debug 문구를 노출하지 않는다.",
    "각 카테고리 본문은 핵심 기질, 주성/보조성 상호작용, 밝기/강도, 반복 패턴, 위험 요소, 현실 조언의 순서로 쓴다.",
    "문체는 단정적인 예언이 아니라 명반 근거 기반의 깊은 상담문이어야 한다.",
    "막연한 위로나 일반론을 쓰지 말고, 반드시 제공된 궁/별/사화 데이터를 구체적으로 언급한다.",
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
    `최소 길이: ${Number(writingRules.minLength || 900)}자 이상`,
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
    `[작성 규칙]`,
    `- 해당 궁 이름을 반드시 언급한다.`,
    `- 주성과 보조성 또는 살성 중 확인 가능한 요소를 자연스럽게 반영한다.`,
    `- 별의 밝기/강도 해석을 넣는다.`,
    `- 성향, 반복 패턴, 주의점, 현실 조언을 모두 포함한다.`,
    `- 내부 오류 문구나 fallback 문구를 절대 쓰지 않는다.`,
    `- 계산을 새로 하지 말고, 이미 주어진 명반 데이터만 해석한다.`,
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
  const minimalPayload = (input?.minimalPayload && typeof input.minimalPayload === "object")
    ? input.minimalPayload
    : toMinimalZiweiPayload(input);
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

  // 각 섹션을 순차 생성
  for (let idx = 0; idx < sections.length; idx += 1) {
    const section = sections[idx];
    const canonicalCategory = Array.isArray(canonicalChapter?.categories)
      ? canonicalChapter.categories[idx] || null
      : null;
    const resolved = summarizeZiweiResolvedData({
      chapter,
      section,
      canonicalChapter,
      canonicalCategory,
      minimalPayload,
    }, minimalPayload);
    const localSeedText = String(canonicalCategory?.localSeedText || "").trim()
      || buildZiweiCategorySeed(
        {
          id: canonicalCategory?.id || section?.sectionId || section?.id || "",
          title: section?.title || canonicalCategory?.title || "핵심 해석",
          requiredPalaces: Array.isArray(chapter?.targetPalaces)
            ? chapter.targetPalaces
            : (chapter?.targetPalace ? [chapter.targetPalace] : ["명궁"]),
        },
        minimalPayload,
      );

    const sectionInput = {
      service: "ziwei-premium",
      mode: "personal",
      chapterId: String(chapter.chapterId || canonicalChapter?.id || `ch${String(chapterNo).padStart(2, "0")}`).trim(),
      chapterTitle: String(chapter.title || canonicalChapter?.title || `Chapter ${chapterNo}`).trim(),
      categoryId: String(canonicalCategory?.id || section?.sectionId || section?.id || "").trim(),
      categoryTitle: String(section?.title || canonicalCategory?.title || "핵심 해석").trim(),
      localSeedText,
      relatedPalaceSummary: resolved.relatedPalaceSummary,
      relatedStarSummary: resolved.relatedStarSummary,
      transformationSummary: resolved.transformationSummary,
      strengthSummary: resolved.strengthSummary,
      writingRules: {
        persona: "30년 경력의 자미두수 고수",
        tone: "고급 자미두수 프리미엄 상담문",
        minLength: Number(section?.minChars || canonicalCategory?.minChars || 900),
        avoid: [
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

    console.info("[ZiweiPremium][Flow] SECTION_GENERATION_START", makeSectionFlowPayload("SECTION_GENERATION_START", sectionInput, {
      chapterCount: canonicalChapters.length,
      categoryCount: sections.length,
      message: "llm-request",
    }));

    const result = await generateZiweiSectionWithLLM(env, sectionInput);
    const normalized = normalizeZiweiSectionResult(sectionInput, result.ok ? result.content : result, minimalPayload);

    if (result.ok && normalized.source === "llm") {
      console.info("[ZiweiPremium][Flow] LLM_SECTION_SUCCESS", {
        sessionId: String(input.requestId || input.reportId || input.sessionId || "").trim() || null,
        purchaseId: String(input.purchaseId || input.reportId || "").trim() || null,
        chapterId: sectionInput.chapterId,
        categoryId: sectionInput.categoryId,
        palaceKeys: Array.isArray(resolved.resolved?.dataMap?.palaceKeys) ? resolved.resolved.dataMap.palaceKeys : [],
        palaceNames: resolved.resolved.palaces.map((palace) => String(palace?.name || palace?.key || "").trim()).filter(Boolean),
        mainStarCount: resolved.resolved.palaces.reduce((sum, palace) => sum + (Array.isArray(palace?.mainStars) ? palace.mainStars.length : 0), 0),
        assistantStarCount: resolved.resolved.palaces.reduce((sum, palace) => sum + (Array.isArray(palace?.assistantStars) ? palace.assistantStars.length : 0), 0),
        transformationCount: Array.isArray(resolved.resolved?.transformations) ? resolved.resolved.transformations.length : 0,
        bodyLength: String(normalized.body || "").length,
        source: normalized.source,
        errorCode: null,
        message: "llm-section-success",
      });
      generatedSections.push({
        sectionId: sectionInput.categoryId || section.sectionId,
        sectionTitle: normalized.title,
        content: normalized.body,
        textLength: String(normalized.body || "").length,
        source: normalized.source,
      });
    } else {
      console.info("[ZiweiPremium][Flow] LLM_SECTION_LOW_QUALITY", {
        sessionId: String(input.requestId || input.reportId || input.sessionId || "").trim() || null,
        purchaseId: String(input.purchaseId || input.reportId || "").trim() || null,
        chapterId: sectionInput.chapterId,
        categoryId: sectionInput.categoryId,
        palaceKeys: Array.isArray(resolved.resolved?.dataMap?.palaceKeys) ? resolved.resolved.dataMap.palaceKeys : [],
        palaceNames: resolved.resolved.palaces.map((palace) => String(palace?.name || palace?.key || "").trim()).filter(Boolean),
        mainStarCount: resolved.resolved.palaces.reduce((sum, palace) => sum + (Array.isArray(palace?.mainStars) ? palace.mainStars.length : 0), 0),
        assistantStarCount: resolved.resolved.palaces.reduce((sum, palace) => sum + (Array.isArray(palace?.assistantStars) ? palace.assistantStars.length : 0), 0),
        transformationCount: Array.isArray(resolved.resolved?.transformations) ? resolved.resolved.transformations.length : 0,
        bodyLength: String(normalized.body || "").length,
        source: normalized.source,
        errorCode: result.errorCode || "LOW_QUALITY_SECTION",
        message: String(result.lastError || result.errorCode || "low-quality-or-llm-failed"),
      });
      console.info("[ZiweiPremium][Flow] EXPERT_FALLBACK_USED", {
        sessionId: String(input.requestId || input.reportId || input.sessionId || "").trim() || null,
        purchaseId: String(input.purchaseId || input.reportId || "").trim() || null,
        chapterId: sectionInput.chapterId,
        categoryId: sectionInput.categoryId,
        palaceKeys: Array.isArray(resolved.resolved?.dataMap?.palaceKeys) ? resolved.resolved.dataMap.palaceKeys : [],
        palaceNames: resolved.resolved.palaces.map((palace) => String(palace?.name || palace?.key || "").trim()).filter(Boolean),
        mainStarCount: resolved.resolved.palaces.reduce((sum, palace) => sum + (Array.isArray(palace?.mainStars) ? palace.mainStars.length : 0), 0),
        assistantStarCount: resolved.resolved.palaces.reduce((sum, palace) => sum + (Array.isArray(palace?.assistantStars) ? palace.assistantStars.length : 0), 0),
        transformationCount: Array.isArray(resolved.resolved?.transformations) ? resolved.resolved.transformations.length : 0,
        bodyLength: String(normalized.body || "").length,
        source: normalized.source,
        errorCode: result.errorCode || "LOW_QUALITY_SECTION",
        message: String(result.lastError || result.errorCode || "expert-local-fallback"),
      });
      failedSections.push({
        sectionId: sectionInput.categoryId || section.sectionId,
        sectionTitle: section.title,
        errorCode: result.errorCode || "LOW_QUALITY_SECTION",
        reason: result.lastError || "Unknown reason",
      });
      generatedSections.push({
        sectionId: sectionInput.categoryId || section.sectionId,
        sectionTitle: normalized.title,
        content: normalized.body,
        textLength: String(normalized.body || "").length,
        source: normalized.source,
      });
    }
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
  ];
  const finalText = generatedSections.map((row) => String(row?.content || "")).join("\n");
  const hasBanned = bannedPdfText.some((phrase) => finalText.includes(phrase));
  if (hasBanned) {
    console.warn("[ZiweiPremium][Flow] PDF_TEXT_VALIDATION_SUCCESS", {
      sessionId: String(input.requestId || input.reportId || input.sessionId || "").trim() || null,
      purchaseId: String(input.purchaseId || input.reportId || "").trim() || null,
      chapterId: String(chapter.chapterId || canonicalChapter?.id || "").trim() || null,
      categoryId: null,
      palaceKeys: [],
      palaceNames: [],
      mainStarCount: 0,
      assistantStarCount: 0,
      transformationCount: 0,
      bodyLength: finalText.length,
      source: "validation-failed",
      errorCode: "BANNED_TEXT_PRESENT",
      message: "pdf text contains banned ziwei text",
    });
  } else {
    console.info("[ZiweiPremium][Flow] PDF_TEXT_VALIDATION_SUCCESS", {
      sessionId: String(input.requestId || input.reportId || input.sessionId || "").trim() || null,
      purchaseId: String(input.purchaseId || input.reportId || "").trim() || null,
      chapterId: String(chapter.chapterId || canonicalChapter?.id || "").trim() || null,
      categoryId: null,
      palaceKeys: [],
      palaceNames: [],
      mainStarCount: 0,
      assistantStarCount: 0,
      transformationCount: 0,
      bodyLength: finalText.length,
      source: "validation-success",
      errorCode: null,
      message: "pdf text validation success",
    });
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
