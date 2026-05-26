/**
 * 자미두수 프리미엄 PDF: 세부 카테고리별 LLM 호출 및 검증
 *
 * 구조:
 * 1. generateZiweiSectionWithLLM: 단일 세부 카테고리 LLM 호출 (최대 재시도 3회)
 * 2. validateLLMSectionContent: LLM 결과 품질 검증
 * 3. generateZiweiChapterFromSections: 모든 섹션이 성공해야 챕터 완성
 */

import { callGeminiText } from "./gemini.js";
import { normalizeZiweiStrengthSymbol } from "./ziwei-premium-book-structure.js";

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
  const minChars = input.section?.minChars || 1000;
  if (text.length < minChars * 0.9) {
    errors.push(`BELOW_MIN_CHARS(${text.length}/${minChars})`);
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
    warnings.push("NO_TARGET_PALACE_FOUND");
  }

  // 8. 별 이름 또는 강도 기호 확인
  const starNames = input.starNames || [];
  const strengthSymbols = ["◎", "O", "▲", "△", "X"];

  const hasStarOrSymbol =
    starNames.some((star) => textLower.includes(star.toLowerCase())) ||
    strengthSymbols.some((symbol) => text.includes(symbol));

  if (starNames.length > 0 && !hasStarOrSymbol) {
    warnings.push("NO_STAR_OR_SYMBOL");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    textLength: text.length,
    minRequired: minChars,
  };
}

/**
 * 세부 카테고리별 LLM 호출 (최대 재시도 3회)
 */
export async function generateZiweiSectionWithLLM(env, input) {
  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 프롬프트 구성
      const prompt = buildZiweiSectionLLMPrompt(input);

      // LLM 호출
      const llmResult = await callGeminiText(env, prompt, {
        modelEnvKeys: ["PREMIUM_ZIWEI_GEMINI_MODEL"],
        temperature: 0.72,
        topP: 0.92,
        maxOutputTokens: 4096,
        timeoutMs: Number(env.PREMIUM_ZIWEI_GEMINI_TIMEOUT_MS || 30000),
      });

      if (!llmResult?.ok || !String(llmResult?.text || "").trim()) {
        lastError = new Error(String(llmResult?.message || llmResult?.error || "EMPTY_LLM_RESPONSE"));
        console.warn("[ZiweiBook.LLMEmptyResponse]", {
          chapterId: input.chapter?.chapterId,
          sectionId: input.section?.sectionId,
          attempt,
          error: String(lastError.message || "EMPTY_LLM_RESPONSE"),
        });
        continue;
      }

      const content = String(llmResult.text || "").trim();

      // 결과 검증
      const validation = validateLLMSectionContent(content, input);

      if (validation.ok) {
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
        };
      }

      // 검증 실패
      lastError = new Error(validation.errors.join(";"));
      console.warn("[ZiweiBook.LLMValidationFailed]", {
        chapterId: input.chapter?.chapterId,
        sectionId: input.section?.sectionId,
        errors: validation.errors,
        attempt,
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

  const systemInstruction = [
    "너는 자미두수 프리미엄 PDF 상담문 작성자다.",
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

  contextInfo.push("");

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

  // 각 섹션을 순차 생성
  for (const section of sections) {
    const sectionInput = {
      chapter,
      section,
      userProfile: input.userProfile,
      targetPalaceData: input.targetPalaceData,
      starNames: input.starNames || [],
      targetPalaces: chapter.targetPalaces || [chapter.targetPalace],
    };

    const result = await generateZiweiSectionWithLLM(env, sectionInput);

    if (result.ok) {
      generatedSections.push({
        sectionId: section.sectionId,
        sectionTitle: section.title,
        content: result.content,
        textLength: result.textLength,
      });
    } else {
      failedSections.push({
        sectionId: section.sectionId,
        sectionTitle: section.title,
        errorCode: result.errorCode || "UNKNOWN_ERROR",
        reason: result.lastError || "Unknown reason",
      });
    }
  }

  // 하나라도 실패하면 전체 실패 (재시도 필요)
  if (failedSections.length > 0) {
    return {
      ok: false,
      code: "ZIWEI_CHAPTER_PARTIAL_GENERATION_FAILED",
      message: "자미두수 PDF 본문 생성 중 일부 섹션이 완성되지 않았습니다.",
      totalSections: sections.length,
      successCount: generatedSections.length,
      failedCount: failedSections.length,
      failedSections,
      retryable: true,
    };
  }

  // 모든 섹션 성공
  return {
    ok: true,
    chapterId: chapter.chapterId,
    chapterNo: chapter.chapterNo,
    generatedSections,
    totalLength: generatedSections.reduce((sum, s) => sum + s.textLength, 0),
  };
}
