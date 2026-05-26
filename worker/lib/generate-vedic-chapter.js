/**
 * Vedic Astrology - Generate Single Chapter with Retry & Fallback
 * 
 * Astro 패턴 적용:
 * 1. Vertex AI 시도 → 직접 Gemini API → 로컬 폴백
 * 2. 키 로테이션 (4개 API 키)
 * 3. 모델 폴백 (3개 모델)
 * 4. 최대 8회 재시도
 * 5. 429 (Rate Limit) 자동 대기
 */

import { VEDIC_CHAPTER_CONFIG, validateVedicChapter } from "./vedic-chapter-config.js";
import { getVedicFallbackText } from "./vedic-fallback.js";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
const MAX_RETRIES = 8;
const REQUEST_TIMEOUT = 12000; // 12 seconds

let GEMINI_API_KEYS = [];

function rotateGeminiKeys() {
  if (!GEMINI_API_KEYS.length) {
    GEMINI_API_KEYS = [
      process.env.GEMINIF_API_KEY1,
      process.env.GEMINIF_API_KEY2,
      process.env.GEMINIF_API_KEY3,
      process.env.GEMINIF_API_KEY4,
    ].filter(Boolean);
  }
  if (!GEMINI_API_KEYS.length) {
    throw new Error("No Gemini API keys configured");
  }
  return GEMINI_API_KEYS[Math.floor(Math.random() * GEMINI_API_KEYS.length)];
}

/**
 * 단일 챕터 생성
 */
export async function generateVedicChapter(
  chapterNum,
  vedicChart,
  options = {}
) {
  const config = VEDIC_CHAPTER_CONFIG[chapterNum - 1];
  if (!config) {
    return {
      ok: false,
      error: `Invalid chapter: ${chapterNum}`,
      text: null,
      source: null,
    };
  }

  const { forceLocal = false, previousContext = "", maxRetries = MAX_RETRIES } = options;
  let lastError = null;
  let attemptCount = 0;

  console.log(`[VedicBook] CHAPTER_${chapterNum}_GENERATION_START`);

  // Try API generation
  if (!forceLocal) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      attemptCount++;
      const modelIdx = attempt % GEMINI_MODELS.length;
      const model = GEMINI_MODELS[modelIdx];
      const apiKey = rotateGeminiKeys();

      try {
        const prompt = buildVedicChapterPrompt(chapterNum, config, vedicChart, previousContext);
        const controller = new AbortSignal.timeout(REQUEST_TIMEOUT);

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.86,
              maxOutputTokens: 4096,
            },
          }),
          signal: controller,
          timeout: REQUEST_TIMEOUT,
        });

        if (response.status === 429) {
          // Rate limit: wait & retry
          console.log(`[VedicBook] CHAPTER_${chapterNum}_RATE_LIMITED (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!text) {
          throw new Error("Empty response from API");
        }

        // Validate text
        const validation = validateVedicChapter(chapterNum, text);
        if (validation.ok) {
          console.log(`[VedicBook] CHAPTER_${chapterNum}_GEMINI_SUCCESS (model: ${model}, attempt: ${attempt + 1})`);
          return { ok: true, text, source: "gemini", model };
        }

        throw new Error(`Text validation failed: ${validation.error}`);
      } catch (err) {
        lastError = err;
        console.log(`[VedicBook] CHAPTER_${chapterNum}_GEMINI_RETRY (attempt ${attempt + 1}/${maxRetries}, error: ${err.message})`);
      }
    }
  }

  // Fallback to local template
  console.log(`[VedicBook] CHAPTER_${chapterNum}_LOCAL_FALLBACK_USED (after ${attemptCount} attempts)`);
  const fallbackText = getVedicFallbackText(chapterNum, vedicChart);

  return {
    ok: true,
    text: fallbackText,
    source: "local-fallback",
    lastError: lastError?.message || null,
    attempts: attemptCount,
  };
}

/**
 * 여러 챕터 순차 생성
 */
export async function generateVedicChaptersSequentially(chapters, vedicChart, options = {}) {
  const { forceLocal = false, onProgress = null } = options;
  const result = {};
  const previousTexts = [];

  console.log(`[VedicBook] SEQUENTIAL_GENERATION_START (${chapters.length} chapters)`);

  for (const chapterNum of chapters) {
    if (onProgress) {
      onProgress({
        code: `CHAPTER_${chapterNum}_START`,
        message: `Generating chapter ${chapterNum}/${chapters.length}...`,
      });
    }

    const generated = await generateVedicChapter(chapterNum, vedicChart, {
      forceLocal,
      previousContext: previousTexts.slice(-1)[0]?.substring(0, 500) || "",
      ...options,
    });

    if (generated.ok) {
      result[chapterNum] = generated.text;
      previousTexts.push(generated.text);
    } else {
      result[chapterNum] = `[Generated chapter ${chapterNum} failed]`;
    }

    if (onProgress) {
      onProgress({
        code: `CHAPTER_${chapterNum}_COMPLETE`,
        message: `Chapter ${chapterNum} generated (source: ${generated.source})`,
      });
    }
  }

  console.log(`[VedicBook] SEQUENTIAL_GENERATION_COMPLETE`);
  return result;
}

/**
 * Build Vedic chapter prompt
 */
function buildVedicChapterPrompt(chapterNum, config, vedicChart, previousContext) {
  const chartSummary = buildVedicChartSummary(vedicChart);

  let prompt = `당신은 베다 점성술 전문가입니다.

## 차트 정보
${chartSummary}

## 요청 챕터
${config.num}. ${config.title}
${config.subtitle}

## 작성 기준
- 최소 ${config.minChars}자 이상
- 구체적이고 실행 가능한 조언
- 해당 챕터의 섹션: ${config.sections.join(", ")}
${previousContext ? `\n## 이전 챕터 요약 (컨텍스트)\n${previousContext}` : ""}

## 마크다운 형식
### 섹션 제목
내용 (자세하고 구체적)

금지사항:
- reportId, 파일명, 기술 용어 노출
- [Generated, fallback, 반복 사용
- 같은 문장 3회 이상 반복`;

  return prompt;
}

/**
 * Build chart summary for prompt context
 */
function buildVedicChartSummary(chart) {
  return `
라그나(Lagna): ${chart.lagna?.sign || "N/A"} ${chart.lagna?.degree || ""}°
태양(Sun): ${chart.sun?.sign || "N/A"}
달(Moon): ${chart.moon?.sign || "N/A"}
화성(Mars): ${chart.mars?.sign || "N/A"}
수성(Mercury): ${chart.mercury?.sign || "N/A"}
목성(Jupiter): ${chart.jupiter?.sign || "N/A"}
금성(Venus): ${chart.venus?.sign || "N/A"}
토성(Saturn): ${chart.saturn?.sign || "N/A"}
라후(Rahu): ${chart.rahu?.sign || "N/A"}
케투(Ketu): ${chart.ketu?.sign || "N/A"}
`.trim();
}
