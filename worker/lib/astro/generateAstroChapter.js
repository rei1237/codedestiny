// ============================================================
// Astro Western Premium - Chapter Generation (STRICT MODE)
// ============================================================
// NO fallback text, NO skeleton output
// If LLM fails after 3 attempts, PDF generation fails explicitly
// ============================================================

import { getAstroChapterByNumber } from "./astroChapterConfig.js";
import { assertNoAstroPdfFallbackText } from "./assertNoAstroPdfFallbackText.js";

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

/**
 * Build Gemini prompt for astrology chapter
 * CONSTRAINT: Use ONLY provided chart data. Do NOT calculate. Do NOT fabricate.
 */
function buildAstroChapterPrompt(chapterNum, chart, previousContext = "") {
  const meta = getAstroChapterByNumber(chapterNum);
  const sun = chart.planets?.Sun;
  const moon = chart.planets?.Moon;
  const asc = chart.ascendant;
  const venus = chart.planets?.Venus;
  const mars = chart.planets?.Mars;
  const jupiter = chart.planets?.Jupiter;
  const saturn = chart.planets?.Saturn;
  const mercury = chart.planets?.Mercury;
  const uranus = chart.planets?.Uranus;
  const neptune = chart.planets?.Neptune;
  const pluto = chart.planets?.Pluto;
  const northNode = chart.northNode;
  const aspects = (Array.isArray(chart.aspects) ? chart.aspects : []).slice(0, 12) || [];

  const contextHint = previousContext
    ? `\n\n【이전 챕터 요약】\n${previousContext.substring(0, 400)}`
    : "";

  return `당신은 서양 점성술 전문 PDF 리포트 작가입니다.

【출생 차트 정보】(다음 정보만 사용하세요. 없는 데이터는 해석하지 마세요.)
- 상승궁(ASC): ${asc?.signKo || "-"} ${Math.round(asc?.degree || 0)}° ${asc?.house ? `(${asc.house}하우스)` : ""}
- 태양(Sun): ${sun?.signKo || "-"} ${Math.round(sun?.degree || 0)}° ${sun?.house ? `(${sun.house}하우스)` : ""}
- 달(Moon): ${moon?.signKo || "-"} ${Math.round(moon?.degree || 0)}° ${moon?.house ? `(${moon.house}하우스)` : ""}
- 수성(Mercury): ${mercury?.signKo || "-"} ${mercury?.house ? `(${mercury.house}하우스)` : ""}
- 금성(Venus): ${venus?.signKo || "-"} ${venus?.house ? `(${venus.house}하우스)` : ""}
- 화성(Mars): ${mars?.signKo || "-"} ${mars?.house ? `(${mars.house}하우스)` : ""}
- 목성(Jupiter): ${jupiter?.signKo || "-"} ${jupiter?.house ? `(${jupiter.house}하우스)` : ""}
- 토성(Saturn): ${saturn?.signKo || "-"} ${saturn?.house ? `(${saturn.house}하우스)` : ""}
${uranus ? `- 천왕성(Uranus): ${uranus?.signKo || "-"}` : ""}
${neptune ? `- 해왕성(Neptune): ${neptune?.signKo || "-"}` : ""}
${pluto ? `- 명왕성(Pluto): ${pluto?.signKo || "-"}` : ""}
${northNode ? `- 북노드(North Node): ${northNode?.signKo || "-"}` : ""}
- 주요 애스펙트: ${
    aspects.length > 0
      ? aspects
          .slice(0, 8)
          .map((a) => `${a.p1}-${a.p2}(${a.type}${a.orb ? ` ${a.orb}°` : ""})`)
          .join(", ")
      : "없음"
  }

【제약 조건】
✓ 위 정보만 사용
✓ 없는 데이터는 지어내지 말 것
✓ 계산하지 말 것 - 제시값을 해석만 할 것
✗ 시스템 메시지, 생성 상태, 오류 표시 금지
✗ "자동 복구", "기본 골각", "fallback" 금지
✗ "compatibility", "partner", "synastry" 금지

【챕터 ${chapterNum}: ${meta.title}】
부제: ${meta.subtitle}

한국어로 고품질 PDF 본문을 작성하세요.

구조:
## 핵심 별자리 구조
(위 차트 정보의 배치가 주는 의미)

## 심리적 작동 방식
(성격, 습관, 반복 패턴)

## 현실 적용
(관계·일·돈에서 어떻게 나타나는지)

## 어스펙트 심화
(주요 애스펙트의 영향)

## 실천 전략
(구체적 조언, 3-5가지)

각 섹션은 2문단 이상, 2800~4000자로 작성하세요.${contextHint}`;
}

/**
 * Generate single astrology chapter
 * STRICT: No fallback. Fails explicitly if LLM fails 3 times.
 */
export async function generateAstroChapter(chapterNum, chart, options = {}) {
  if (!chart || !chart.planets) {
    throw new Error(`[AstroBook] Chart data missing for chapter ${chapterNum}`);
  }

  const previousContext = options.previousContext || "";
  const keys = rotateGeminiKeys(pickGeminiKeys(), String(chapterNum).length);

  if (!keys.length) {
    throw new Error(`[AstroBook] No Gemini API keys available for chapter ${chapterNum}`);
  }

  const prompt = buildAstroChapterPrompt(chapterNum, chart, previousContext);
  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];

  let totalAttempts = 0;
  const maxTotalAttempts = Math.min(keys.length * models.length, 6);

  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));

    for (const key of keys) {
      if (totalAttempts >= maxTotalAttempts) break;
      totalAttempts += 1;

      try {
        const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.85,
              maxOutputTokens: 4096,
              topP: 0.95,
              topK: 40,
            },
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          if (response.status === 429) {
            await new Promise((r) => setTimeout(r, 800));
          }
          continue;
        }

        const payload = await response.json().catch(() => ({}));
        const text = parseGeminiText(payload);

        // Validate response length
        if (!text || text.trim().length < 1500) {
          console.warn(`[AstroBook] Chapter ${chapterNum} response too short: ${text?.length || 0} chars`);
          continue;
        }

        // Validate forbidden phrases
        try {
          assertNoAstroPdfFallbackText(text, {
            chapterId: chapterNum,
            source: "gemini-api",
          });
        } catch (err) {
          console.error(`[AstroBook] Chapter ${chapterNum} validation failed:`, err.message);
          continue;
        }

        // Success!
        console.info(`[AstroBook] CHAPTER_${chapterNum}_SUCCESS attempt ${totalAttempts}`, {
          model,
          charCount: text.length,
        });

        return {
          ok: true,
          text,
          source: "gemini-api",
          model,
          charCount: text.length,
        };
      } catch (err) {
        console.warn(`[AstroBook] CHAPTER_${chapterNum} attempt ${totalAttempts} failed`, {
          model,
          error: err instanceof Error ? err.message : String(err),
        });
        // Continue to next attempt
      }
    }
  }

  // All retries exhausted - FAIL EXPLICITLY
  throw new Error(
    `[AstroBook] FATAL: Chapter ${chapterNum} generation failed after ${totalAttempts} API attempts. ` +
    `No valid Gemini response. Cannot generate PDF without LLM-generated content. ` +
    `Check Gemini API keys and rate limits.`
  );
}

/**
 * Generate multiple chapters sequentially
 * Stops on first failure (no fallback recovery)
 */
export async function generateAstroChaptersSequentially(chapters, chart, options = {}) {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    throw new Error("[AstroBook] chapters array is empty or invalid");
  }

  if (!chart || !chart.planets) {
    throw new Error("[AstroBook] chart data is missing or incomplete");
  }

  const result = {};
  const previousTexts = [];
  const onProgress = options.onProgress;

  for (const chapterNum of chapters) {
    if (onProgress) {
      onProgress({
        chapter: chapterNum,
        status: "generating",
        totalChapters: chapters.length,
      });
    }

    // This will throw if generation fails - NO fallback
    const generated = await generateAstroChapter(chapterNum, chart, {
      maxRetries: options.maxRetries ?? 3,
      previousContext: previousTexts.join("\n\n").substring(0, 600),
    });

    result[chapterNum] = generated.text;
    previousTexts.push(generated.text.substring(0, 500));

    if (onProgress) {
      onProgress({
        chapter: chapterNum,
        status: "success",
        charCount: generated.charCount,
      });
    }

    // Small delay between chapters to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  return result;
}
