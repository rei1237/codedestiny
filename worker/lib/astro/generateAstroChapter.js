// ============================================================
// Astro Western Premium - Chapter Generation
// ============================================================

import { ASTRO_CHAPTER_META, getAstroChapterByNumber } from "./astroChapterConfig.js";
import { generateAstroFallbackText } from "./astroFallback.js";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

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

let geminiKeyCursor = 0;

function rotateGeminiKeys(keys, seed = 0) {
  if (!keys.length) return [];
  const len = keys.length;
  const base = Number.isFinite(Number(seed)) ? Number(seed) : 0;
  const start = ((geminiKeyCursor + base) % len + len) % len;
  geminiKeyCursor = (start + 1) % len;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

function parseGeminiText(payload) {
  const p = payload;
  for (const c of p?.candidates ?? []) {
    for (const part of c?.content?.parts ?? []) {
      if (part?.text?.trim()) return part.text.trim();
    }
  }
  return "";
}

function buildAstroChapterPrompt(chapterNum, chart, previousContext = "") {
  const meta = getAstroChapterByNumber(chapterNum);
  const sun = chart.planets?.Sun;
  const moon = chart.planets?.Moon;
  const asc = chart.ascendant;
  const venus = chart.planets?.Venus;
  const mars = chart.planets?.Mars;
  const jupiter = chart.planets?.Jupiter;
  const saturn = chart.planets?.Saturn;
  const northNode = chart.northNode;
  const aspects = chart.aspects?.slice(0, 12) || [];

  const contextHint = previousContext
    ? `\n\n이전 챕터 요약:\n${previousContext.substring(0, 500)}`
    : "";

  return `당신은 전문 서양 점성술 리포트 작가입니다.

【 출생 차트 정보 】
- 상승궁(ASC): ${asc?.signKo || "알수없음"} ${Math.round(asc?.degree || 0)}도
- 태양(Sun): ${sun?.signKo || "알수없음"} ${sun?.house || 1}하우스
- 달(Moon): ${moon?.signKo || "알수없음"} ${moon?.house || 1}하우스
- 금성(Venus): ${venus?.signKo || "알수없음"} ${venus?.house || 1}하우스
- 화성(Mars): ${mars?.signKo || "알수없음"} ${mars?.house || 1}하우스
- 목성(Jupiter): ${jupiter?.signKo || "알수없음"} ${jupiter?.house || 1}하우스
- 토성(Saturn): ${saturn?.signKo || "알수없음"} ${saturn?.house || 1}하우스
- 북노드(North Node): ${northNode?.signKo || "알수없음"} ${northNode?.house || 1}하우스
- 주요 에스펙트: ${aspects.length > 0 ? aspects.slice(0, 8).map((a) => `${a.p1}-${a.p2}(${a.type})`).join(", ") : "없음"}

【 챕터 ${chapterNum}: ${meta.title} 】
부제: ${meta.subtitle}

한국어로 고품질 PDF 본문을 작성하세요. 아래 구조를 따르세요:

## 핵심 별자리 구조
(행성과 하우스의 배치가 주는 의미 설명)

## 삶에서 드러나는 패턴
(성향, 습관, 반복되는 경험 패턴 분석)

## 관계/커리어/타이밍 적용
(실제 생활에서 어떻게 활용할 수 있는지)

## 30일 실행 가이드
(구체적인 행동 아이템과 점검 방법)

각 섹션은 2문단 이상으로, 앱 사용자가 바로 행동으로 옮길 수 있는 구체적 조언을 포함하세요.
마크다운 형식을 유지하고, 총 2500자 이상 4000자 이하로 작성하세요.${contextHint}`;
}

export async function generateAstroChapter(chapterNum, chart, options = {}) {
  const maxRetries = options.maxRetries ?? 2;
  const forceLocal = options.forceLocal === true;
  const previousContext = options.previousContext || "";

  if (forceLocal) {
    const fallback = generateAstroFallbackText(chapterNum, chart);
    return { ok: true, text: fallback, source: "local-fallback" };
  }

  // Try Vertex Gemini first
  try {
    const vertexResponse = await fetch("https://vertex-api-call", {
      headers: { Authorization: `Bearer ${process.env.VERTEX_API_TOKEN}` },
    });
    if (vertexResponse.ok) {
      const data = await vertexResponse.json();
      if (data?.text) return { ok: true, text: data.text, source: "vertex-gemini" };
    }
  } catch {
    // continue to direct API
  }

  // Direct Gemini API with retry
  const keys = rotateGeminiKeys(pickGeminiKeys(), String(chapterNum).length);
  if (!keys.length) {
    console.warn(`[AstroBook] No Gemini keys for chapter ${chapterNum}, using local fallback`);
    const fallback = generateAstroFallbackText(chapterNum, chart);
    return { ok: true, text: fallback, source: "local-fallback" };
  }

  const prompt = buildAstroChapterPrompt(chapterNum, chart, previousContext);
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  let attempts = 0;
  const maxAttempts = Math.min(keys.length * 2, 8);

  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    for (const key of keys) {
      if (attempts >= maxAttempts) break;
      attempts += 1;

      try {
        const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.86,
              maxOutputTokens: 4096,
              topP: 0.95,
              topK: 40,
            },
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit - wait a bit
            await new Promise((r) => setTimeout(r, 500));
          }
          continue;
        }

        const payload = await response.json().catch(() => ({}));
        const text = parseGeminiText(payload);
        if (text && text.length > 1000) {
          console.info(`[AstroBook] CHAPTER_${chapterNum}_GEMINI_SUCCESS`, { model, keyIndex: keys.indexOf(key) });
          return { ok: true, text, source: "gemini-api" };
        }
      } catch (err) {
        console.warn(`[AstroBook] CHAPTER_${chapterNum}_GEMINI_ERROR`, {
          model,
          message: err instanceof Error ? err.message : "Unknown error",
        });
        // continue to next attempt
      }
    }
  }

  // All retries failed, use local fallback
  console.warn(`[AstroBook] CHAPTER_${chapterNum}_GEMINI_FAILED_USE_LOCAL_FALLBACK`);
  const fallback = generateAstroFallbackText(chapterNum, chart);
  return { ok: true, text: fallback, source: "local-fallback" };
}

export async function generateAstroChaptersSequentially(chapters, chart, options = {}) {
  const result = {};
  const previousTexts = [];
  const onProgress = options.onProgress;

  for (const chapterNum of chapters) {
    if (onProgress) onProgress({ chapter: chapterNum, status: "generating" });

    const generated = await generateAstroChapter(chapterNum, chart, {
      maxRetries: options.maxRetries ?? 2,
      forceLocal: options.forceLocal === true,
      previousContext: previousTexts.join("\n\n").substring(0, 1000),
    });

    result[chapterNum] = generated.text;
    previousTexts.push(generated.text.substring(0, 500));

    if (onProgress) {
      onProgress({ chapter: chapterNum, status: generated.source === "local-fallback" ? "fallback" : "success" });
    }
  }

  return result;
}
