/**
 * Sukuyo Premium - Generate Single Chapter with Retry & Fallback
 *
 * Pattern aligned with Vedic/Astro chapter generators.
 */

import { SUKUYO_CHAPTER_CONFIG, validateSukuyoChapter } from "./sukuyo-chapter-config.js";
import { getSukuyoFallbackText } from "./sukuyo-fallback.js";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
const MAX_RETRIES = 8;
const REQUEST_TIMEOUT = 12000;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

let geminiKeyCursor = 0;

function pickGeminiKeys() {
  return [
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

function rotateGeminiKeys(keys, seed = 0) {
  if (!keys.length) return [];
  const len = keys.length;
  const start = ((geminiKeyCursor + Number(seed || 0)) % len + len) % len;
  geminiKeyCursor = (start + 1) % len;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

function parseGeminiText(payload) {
  for (const candidate of payload?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      if (part?.text && String(part.text).trim()) {
        return String(part.text).trim();
      }
    }
  }
  return "";
}

function normalizeMode(mode) {
  return mode === "compat" ? "compat" : "personal";
}

function buildSukuyoChartSummary(data = {}, mode = "personal") {
  if (mode === "compat") {
    const relation = data?.relationType || data?.compatibility?.relationType || "미상";
    const myMansion = data?.myMansion || data?.personA?.mansion || data?.base?.mansion || "미상";
    const partnerMansion = data?.partnerMansion || data?.personB?.mansion || "미상";
    const distance = data?.distanceLabel || data?.compatibility?.distanceLabel || "미상";
    const score = data?.score ?? data?.compatibility?.score ?? "미상";

    return [
      `모드: 궁합(compat)`,
      `나의 숙요: ${myMansion}`,
      `상대 숙요: ${partnerMansion}`,
      `관계 유형: ${relation}`,
      `거리감: ${distance}`,
      `궁합 지수: ${score}`,
      `핵심 감정 패턴: ${data?.emotionalPattern || data?.compatibility?.emotionalPattern || "미상"}`,
      `갈등 패턴: ${data?.conflictPattern || data?.compatibility?.conflictPattern || "미상"}`,
    ].join("\n");
  }

  const mansion = data?.mansion || data?.base?.mansion || "미상";
  const moonPhase = data?.moonPhase || data?.lunar?.phase || "미상";
  const traitCore = data?.traits?.core || data?.coreTrait || "미상";
  const traitHidden = data?.traits?.hidden || data?.hiddenTrait || "미상";
  const talent = data?.talent ?? data?.profile?.talent ?? "미상";

  return [
    `모드: 개인(personal)`,
    `본명숙: ${mansion}`,
    `달 위상: ${moonPhase}`,
    `핵심 기질: ${traitCore}`,
    `그림자 기질: ${traitHidden}`,
    `재능 지수: ${talent}`,
    `요약: ${data?.summary || "미상"}`,
  ].join("\n");
}

function buildSukuyoChapterPrompt(chapterNum, config, sukuyoData, mode, previousContext) {
  const chartSummary = buildSukuyoChartSummary(sukuyoData, mode);
  const contextHint = previousContext
    ? `\n\n## 이전 챕터 컨텍스트\n${String(previousContext).slice(0, 600)}`
    : "";

  return `당신은 숙요점(27수) 기반 프리미엄 리포트 작성 전문가입니다.

## 리포트 모드
${mode === "compat" ? "궁합 리포트" : "개인 리포트"}

## 분석 데이터
${chartSummary}

## 요청 챕터
${config.num}. ${config.title}
${config.subtitle}

## 작성 규칙
- 반드시 한국어로 작성
- 최소 ${config.minChars}자 이상
- 섹션 중심 구조: ${config.sections.join(", ")}
- 추상적인 문장보다 실행 가능한 조언 중심
- 동일 문장을 3회 이상 반복 금지
- 기술 메타 텍스트(reportId, fallback, generated) 노출 금지
- ${mode === "compat" ? "두 사람의 상호작용, 거리감, 조율 전략을 구체적으로" : "개인의 감정 리듬, 관계 패턴, 행동 전환을 구체적으로"}

## 출력 형식
### 섹션 제목
본문 (2개 이상 문단)

### 실행 체크리스트
- 이번 주 실행 3개
- 이번 달 점검 3개${contextHint}`;
}

function hasForbiddenText(text) {
  const source = String(text || "");
  const forbidden = ["reportId", "fallback", "generated", "[Generated", "[Fallback", "테스트", "샘플"];
  return forbidden.some((token) => source.includes(token));
}

export async function generateSukuyoChapter(chapterNum, sukuyoData = {}, options = {}) {
  const config = SUKUYO_CHAPTER_CONFIG[chapterNum - 1];
  if (!config) {
    return { ok: false, text: "", source: "error", error: `Invalid chapter: ${chapterNum}` };
  }

  const mode = normalizeMode(options.mode);
  const forceLocal = options.forceLocal === true;
  const maxRetries = Math.min(Number(options.maxRetries || MAX_RETRIES), MAX_RETRIES);
  const previousContext = options.previousContext || "";

  if (forceLocal) {
    const text = getSukuyoFallbackText(chapterNum, sukuyoData, mode);
    console.log(`[SukuyoBook] CHAPTER_${chapterNum}_LOCAL_FALLBACK_USED (forceLocal=true)`);
    return { ok: true, text, source: "local-fallback" };
  }

  const keys = rotateGeminiKeys(pickGeminiKeys(), chapterNum + (mode === "compat" ? 17 : 3));
  if (!keys.length) {
    const text = getSukuyoFallbackText(chapterNum, sukuyoData, mode);
    console.log(`[SukuyoBook] CHAPTER_${chapterNum}_LOCAL_FALLBACK_USED (no_api_key)`);
    return { ok: true, text, source: "local-fallback" };
  }

  const prompt = buildSukuyoChapterPrompt(chapterNum, config, sukuyoData, mode, previousContext);

  let attempt = 0;
  for (let modelIdx = 0; modelIdx < GEMINI_MODELS.length && attempt < maxRetries; modelIdx++) {
    const model = GEMINI_MODELS[modelIdx];
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));

    for (let keyIdx = 0; keyIdx < keys.length && attempt < maxRetries; keyIdx++) {
      attempt += 1;
      const key = keys[(keyIdx + modelIdx) % keys.length];

      try {
        const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.86,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 4096,
            },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!response.ok) {
          if (response.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          continue;
        }

        const payload = await response.json().catch(() => ({}));
        const text = parseGeminiText(payload);
        if (!text) continue;

        const validation = validateSukuyoChapter(chapterNum, text, mode);
        if (!validation.ok || hasForbiddenText(text)) {
          continue;
        }

        console.log(`[SukuyoBook] CHAPTER_${chapterNum}_GEMINI_SUCCESS (model=${model}, attempt=${attempt})`);
        return { ok: true, text, source: "gemini" };
      } catch (error) {
        console.warn(`[SukuyoBook] CHAPTER_${chapterNum}_GEMINI_RETRY (attempt=${attempt})`, {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const fallbackText = getSukuyoFallbackText(chapterNum, sukuyoData, mode);
  console.log(`[SukuyoBook] CHAPTER_${chapterNum}_LOCAL_FALLBACK_USED (after retries=${maxRetries})`);
  return { ok: true, text: fallbackText, source: "local-fallback" };
}

export async function generateSukuyoChaptersSequentially(chapters, sukuyoData = {}, options = {}) {
  const result = {};
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const previousTexts = [];
  const mode = normalizeMode(options.mode);

  for (const chapterNum of chapters) {
    if (onProgress) {
      onProgress({ code: `CHAPTER_${chapterNum}_START`, message: `Sukuyo chapter ${chapterNum} generating...` });
    }

    const generated = await generateSukuyoChapter(chapterNum, sukuyoData, {
      ...options,
      mode,
      previousContext: previousTexts.slice(-1)[0] || "",
    });

    result[chapterNum] = generated.text;
    previousTexts.push(String(generated.text || "").slice(0, 800));

    if (onProgress) {
      onProgress({
        code: `CHAPTER_${chapterNum}_COMPLETE`,
        message: `Sukuyo chapter ${chapterNum} complete (${generated.source})`,
      });
    }
  }

  return result;
}
