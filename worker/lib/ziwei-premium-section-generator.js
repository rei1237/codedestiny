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

  const textLower = text.toLowerCase();
  const matchedKeywords = sectionKeywords.filter((kw) => textLower.includes(kw));

  if (matchedKeywords.length === 0 && sectionKeywords.length > 1) {
    // 섹션 제목 키워드 누락은 경고로만 취급
    warnings.push("NO_SECTION_KEYWORD_MATCH");
  }

  // 7. targetPalace 또는 관련 궁 이름 확인
  const targetPalaces = Array.isArray(input.targetPalaces)
    ? input.targetPalaces
    : input.targetPalace
    ? [input.targetPalace]
    : [];

  const palacesFound = targetPalaces.filter((palace) =>
    textLower.includes(palace.toLowerCase())
  );

  if (targetPalaces.length > 0 && palacesFound.length === 0) {
    errors.push("NO_TARGET_PALACE_FOUND");
  }

  // 8. 별 이름 또는 강도 기호 확인
  const starNames = input.starNames || [];
  const strengthSymbols = ["◎", "O", "▲", "△", "X"];

  const hasStarOrSymbol =
    starNames.some((star) => textLower.includes(star.toLowerCase())) ||
    strengthSymbols.some((symbol) => text.includes(symbol));

  const hasStrengthSymbol = strengthSymbols.some((symbol) => text.includes(symbol));
  const hasStarName = starNames.some((star) => textLower.includes(star.toLowerCase()));

  if (starNames.length > 0 && !hasStarName) {
    errors.push("NO_STAR_NAME");
  }
  if (!hasStrengthSymbol) {
    errors.push("NO_STRENGTH_SYMBOL");
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
  const palaceCount = Array.isArray(payload?.chart?.palaces) ? payload.chart.palaces.length : 0;
  return {
    stage,
    sessionId: String(input.requestId || input.reportId || input.sessionId || "").trim() || null,
    chapterId: String(chapter.chapterId || chapter.key || "").trim() || null,
    categoryId: String(section.sectionId || section.id || "").trim() || null,
    mode: String(payload?.mode || "personal").trim() || "personal",
    hasPayload: Boolean(payload && typeof payload === "object"),
    palaceCount,
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

function buildLocalFallbackSection(input = {}, section = {}, reason = "") {
  const chapter = input.chapter || {};
  const payload = input.minimalPayload || toMinimalZiweiPayload(input);
  const canonicalChapter = input.canonicalChapter || null;
  const canonicalCategory = input.canonicalCategory || null;

  const localSeedText = String(
    canonicalCategory?.localSeedText
    || buildZiweiCategorySeed(
      {
        title: section?.title || "핵심 해석",
        requiredPalaces: Array.isArray(chapter?.targetPalaces)
          ? chapter.targetPalaces
          : (chapter?.targetPalace ? [chapter.targetPalace] : ["명궁"]),
      },
      payload,
    )
    || "핵심 궁 구조를 바탕으로 현실 선택 전략을 제시합니다."
  ).trim();

  const chapterTitle = String(chapter?.title || canonicalChapter?.title || "자미두수 해석").trim() || "자미두수 해석";
  const categoryTitle = String(section?.title || canonicalCategory?.title || "핵심 해석").trim() || "핵심 해석";
  const palaceSummary = Array.isArray(payload?.chart?.palaces)
    ? payload.chart.palaces.slice(0, 3).map((row) => String(row?.name || "").trim()).filter(Boolean).join(", ")
    : "명궁";

  const fallbackBody = [
    `${chapterTitle}의 ${categoryTitle}에서는 ${palaceSummary || "핵심 궁"}을 중심으로 현재의 성향과 의사결정 패턴을 해석합니다.`,
    localSeedText,
    "실전 적용 포인트: 현재 강점이 높은 영역은 작은 실행을 빠르게 누적하고, 변동성이 높은 영역은 기준 루틴을 먼저 고정한 뒤 확장하는 전략이 유효합니다.",
    "관계·일·재정 모두에서 단정 예언보다 관찰 가능한 지표를 먼저 세우고 2주 단위로 점검하면 운의 편차를 줄일 수 있습니다.",
    reason ? `주의 포인트: ${String(reason).trim()}` : "주의 포인트: 감정 반응이 강한 구간에서는 즉시 결정보다 1회 재검토 루틴을 적용하세요.",
  ].join("\n\n");

  return {
    title: categoryTitle,
    body: fallbackBody,
    source: "local-fallback",
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
  const chapter = input.chapter || {};
  const section = input.section || {};
  const profile = input.userProfile || {};
  const palaceData = input.targetPalaceData || {};
  const canonicalZiweiChart = input.canonicalZiweiChart || {};
  const reportPayload = input.reportPayload || {};
  const chartMeta = canonicalZiweiChart.chartMeta || reportPayload.chartMeta || {};
  const profileEvidence = canonicalZiweiChart.profile || reportPayload.profile || {};
  const luckData = reportPayload.luck || canonicalZiweiChart.luck || {};

  const systemInstruction = [
    "너는 자미두수 프리미엄 PDF 상담문 작성자다.",
    "최고 수준의 자미두수 실전 고수처럼, 근거 중심으로 정밀하게 해석하라.",
    "계산은 하지 마라.",
    "제공된 자미두수 명반 JSON과 section context만 해석하라.",
    "제공되지 않은 별, 궁, 사화를 지어내지 마라.",
    "본문에는 JSON, payload, 계산 로그, 내부 키 이름을 노출하지 마라.",
    '절대 쓰면 안 되는 문구:',
    "  - 자동 복구 생성",
    "  - fallback",
    "  - skeleton",
    "  - Internal server error",
    "  - Ch.1 생성 실패",
    "  - 기본 분석을 먼저 실행",
    "  - 잠시 후 다시 시도",
    "각 세부 카테고리 제목에 맞는 상담문만 작성하라.",
    "같은 문장 반복 금지.",
    "지나치게 일반적인 운세 문구 금지.",
    "실제 명반의 궁/별/강도 기호를 자연스럽게 반영하라.",
    "반드시 제공된 엔진 계산값(명궁/신궁/궁별 별 구성/사화/운세 흐름)만 근거로 해석하라.",
    "근거 없이 단정하거나 임의의 별/궁/시점을 추가하지 마라.",
    "단정적 예언보다 선택 기준, 성향 분석, 실전 조언 중심으로 작성하라.",
    "출력은 순수 본문 텍스트만 반환하라.",
    "Markdown 표, JSON, 코드블록은 사용하지 마라.",
  ].join("\n");

  const contextInfo = [
    `[섹션 정보]`,
    `챕터: ${chapter.title || `Chapter ${chapter.chapterNo || 1}`}`,
    `섹션: ${section.title || "Section"}`,
    `목적: ${section.purpose || ""}`,
    `최소 길이: ${section.minChars || 1200}자 이상`,
    "",
    `[사용자 정보]`,
    `이름: ${profile.name || "사용자"}`,
    `성별: ${profile.gender === "M" ? "남성" : profile.gender === "F" ? "여성" : "미지정"}`,
    `생년월일: ${profile.birthDate || "미지정"}`,
    `출생 시간: ${profile.birthTime || "미지정"}`,
    "",
    `[명반 정보]`,
    `대상 궁: ${chapter.targetPalace || chapter.targetPalaces?.join(", ") || "미지정"}`,
    `명궁: ${String(chartMeta.mingGong || "").trim() || "미지정"}`,
    `신궁: ${String(chartMeta.shenGong || "").trim() || "미지정"}`,
    `명반 기준시: ${String(profileEvidence?.birth?.solarDate || profile.birthDate || "").trim() || "미지정"}`,
  ];

  // 궁 데이터 추가
  if (palaceData.name || palaceData.branch) {
    contextInfo.push(`궁 위치: ${palaceData.branch || ""}`);
  }

  if (Array.isArray(palaceData.mainStars) && palaceData.mainStars.length > 0) {
    contextInfo.push(
      `주성: ${palaceData.mainStars
        .map((s) => `${s.name}(${normalizeZiweiStrengthSymbol(s.strength)})`)
        .join(", ")}`
    );
  }

  if (Array.isArray(palaceData.subStars) && palaceData.subStars.length > 0) {
    contextInfo.push(
      `보조성: ${palaceData.subStars
        .map((s) => `${s.name}(${normalizeZiweiStrengthSymbol(s.strength)})`)
        .join(", ")}`
    );
  }

  if (Array.isArray(palaceData.transformations) && palaceData.transformations.length > 0) {
    contextInfo.push(
      `사화: ${palaceData.transformations
        .map((t) => `${t.name}(${t.target})`)
        .join(", ")}`
    );
  }

  const decadeSummary = String(luckData?.decadeSummary || luckData?.tenYearSummary || "").trim();
  const yearlySummary = String(luckData?.yearlySummary || luckData?.annualSummary || "").trim();
  if (decadeSummary) {
    contextInfo.push(`대운 요약: ${decadeSummary}`);
  }
  if (yearlySummary) {
    contextInfo.push(`세운 요약: ${yearlySummary}`);
  }

  contextInfo.push("");

  if (String(input?.localSeedText || "").trim()) {
    contextInfo.push("[로컬 해석 시드]");
    contextInfo.push(String(input.localSeedText).trim());
    contextInfo.push("");
  }

  const userPrompt = [
    ...contextInfo,
    `[작성 지시문]`,
    `1. 위 섹션 정보에 맞는 상담문을 작성하세요.`,
    `2. 사용자의 명반 정보를 자연스럽게 반영하세요.`,
    `3. 다음 항목을 포함하세요:`,
    `   - 대상 궁의 성향과 의미`,
    `   - 주성/보조성의 상호작용`,
    `   - 강도 기호(◎ O ▲ △ X)의 의미`,
    `   - 실제 활용 조언 또는 주의점`,
    `4. 최소 ${section.minChars || 1200}자 이상으로 작성하세요.`,
    `5. 순수 본문 텍스트만 출력하세요. (Markdown, JSON, 코드 불가)`,
    "",
  ].join("\n");

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
  const minimalPayload = toMinimalZiweiPayload(input);
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
    const localSeedText = String(canonicalCategory?.localSeedText || "").trim()
      || buildZiweiCategorySeed(
        {
          title: section?.title || "핵심 해석",
          requiredPalaces: Array.isArray(chapter?.targetPalaces)
            ? chapter.targetPalaces
            : (chapter?.targetPalace ? [chapter.targetPalace] : ["명궁"]),
        },
        minimalPayload,
      );

    const sectionInput = {
      chapter,
      section,
      userProfile: input.userProfile,
      targetPalaceData: input.targetPalaceData,
      canonicalZiweiChart: input.canonicalZiweiChart,
      reportPayload: input.reportPayload,
      starNames: input.starNames || [],
      targetPalaces: chapter.targetPalaces || [chapter.targetPalace],
      minimalPayload,
      canonicalChapter,
      canonicalCategory,
      localSeedText,
      requestId: input.requestId,
      reportId: input.reportId,
      chapterCount: canonicalChapters.length,
      categoryCount: sections.length,
    };

    console.info("[ZiweiPremium][Flow] SECTION_GENERATION_START", makeSectionFlowPayload("SECTION_GENERATION_START", sectionInput, {
      chapterCount: canonicalChapters.length,
      categoryCount: sections.length,
      message: "llm-request",
    }));

    const result = await generateZiweiSectionWithLLM(env, sectionInput);

    if (result.ok) {
      generatedSections.push({
        sectionId: section.sectionId,
        sectionTitle: section.title,
        content: result.content,
        textLength: result.textLength,
        source: result.source || "llm",
      });
    } else {
      const fallback = buildLocalFallbackSection(sectionInput, section, result.lastError);
      console.info("[ZiweiPremium][Flow] SECTION_GENERATION_FALLBACK", makeSectionFlowPayload("SECTION_GENERATION_FALLBACK", sectionInput, {
        chapterCount: canonicalChapters.length,
        categoryCount: sections.length,
        errorCode: result.errorCode || "LLM_SECTION_GENERATION_FAILED",
        message: String(result.lastError || "LLM_SECTION_GENERATION_FAILED"),
      }));
      failedSections.push({
        sectionId: section.sectionId,
        sectionTitle: section.title,
        errorCode: result.errorCode || "UNKNOWN_ERROR",
        reason: result.lastError || "Unknown reason",
      });
      generatedSections.push({
        sectionId: section.sectionId,
        sectionTitle: fallback.title,
        content: fallback.body,
        textLength: String(fallback.body || "").length,
        source: "local-fallback",
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
