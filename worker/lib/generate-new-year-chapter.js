/**
 * Saju New Year Premium - Generate Single Chapter with Retry & Fallback
 */

import { SAJU_NEWYEAR_CHAPTER_CONFIG, validateSajuNewYearChapter } from "./saju-new-year-chapter-config.js";

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

function countChars(text) {
  return [...String(text || "")].length;
}

function buildNewYearSummary(data = {}) {
  const year = data?.targetYear || data?.year || new Date().getFullYear();
  const dayMaster = data?.dayMaster || data?.saju?.dayMaster || "미상";
  const flow = data?.yearFlow || data?.summary || "미상";

  return [
    `대상 연도: ${year}`,
    `일간/핵심 축: ${dayMaster}`,
    `연간 흐름: ${flow}`,
    `강점: ${data?.strength || data?.strengths || "미상"}`,
    `주의점: ${data?.caution || data?.risks || "미상"}`,
  ].join("\n");
}

function buildNewYearPrompt(chapterNum, config, data, previousContext = "") {
  const summary = buildNewYearSummary(data);
  const contextHint = previousContext
    ? `\n\n## 이전 월 컨텍스트\n${String(previousContext).slice(0, 600)}`
    : "";

  return `당신은 신년운세 전문 리포트 작가입니다.

## 기본 데이터
${summary}

## 요청 월
${config.month} (${config.num}장)
제목: ${config.title}
부제: ${config.subtitle}

## 작성 규칙
- 한국어로 작성
- 최소 ${config.minChars}자 이상
- 반드시 섹션 포함: ${config.sections.join(", ")}
- 구체적 행동 조언과 일정 중심
- 추상 문장/메타 문장 금지 (reportId, fallback, generated)
- 같은 문장 3회 이상 반복 금지

## 출력 형식
### 월 핵심 흐름
### 기회와 위험
### 관계/일/재정 실행안
### 주간 실행 체크리스트${contextHint}`;
}

function buildMonthlyActionText(config, data = {}) {
  const year = data?.targetYear || data?.year || new Date().getFullYear();
  const month = config?.month || `${config?.num || 1}월`;
  const sections = (config?.sections || []).map((s, idx) => `${idx + 1}. ${s}`).join("\n");

  let text = `# ${config.num}. ${config.title}\n\n${config.subtitle}\n\n`;
  text += `## ${month} 핵심 흐름\n`;
  text += `${year}년 ${month}은 전개 속도보다 리듬 관리가 중요한 구간입니다. 성급한 확정 대신, 이미 진행 중인 일의 구조를 정리하면 손실을 줄이고 성과를 안정화할 수 있습니다. 특히 관계와 재정은 서로 영향을 주기 때문에, 감정이 흔들리는 주간에는 큰 결정을 유예하는 방식이 유리합니다.\n\n`;
  text += `## 주요 섹션 가이드\n${sections}\n\n`;
  text += `## 실행 전략\n`;
  text += `- 주 1회 일정 재정렬: 우선순위 3개만 고정\n`;
  text += `- 주 2회 관계 점검: 오해 누적 장면을 문장화\n`;
  text += `- 주 1회 재정 점검: 고정비/변동비 분리\n`;
  text += `- 월말 리뷰: 다음 달에 유지/중단할 습관 확정\n\n`;
  text += `## 현실 적용 메모\n`;
  text += `신년운세는 사건 예측보다 선택의 정확도를 높이는 도구입니다. 동일한 기회라도 준비 수준이 다르면 결과가 달라집니다. 따라서 이번 달은 "행동의 양"보다 "행동의 정렬"을 우선하십시오. 해야 할 일을 늘리는 대신, 이미 하고 있는 행동이 목표와 연결되는지 점검하면 월말 만족도가 크게 상승합니다.\n`;

  let cycle = 0;
  while (countChars(text) < Math.max(config.minChars || 3500, 3800)) {
    text += `\n\n## 보강 실행 블록 ${cycle + 1}\n`;
    text += `이번 블록에서는 ${month}의 감정 파동을 다룹니다. 중요한 대화를 하기 전에는 10분 냉각 시간을 두고 사실-감정-요청 순서로 정리하십시오. 업무에서는 하루 시작 15분에 우선순위 3개를 고정하고, 종료 10분에 미완료 항목을 다음 날로 이동하십시오. 관계에서는 설명보다 확인 질문을 먼저 사용하면 충돌을 줄일 수 있습니다. 재정은 주간 단위로 점검해야 월말 급격한 불안이 줄어듭니다.\n`;
    cycle += 1;
    if (cycle > 12) break;
  }

  return text;
}

export function getNewYearFallbackText(chapterNum, data = {}) {
  const config = SAJU_NEWYEAR_CHAPTER_CONFIG[chapterNum - 1];
  if (!config) return "";
  return buildMonthlyActionText(config, data);
}

export async function generateNewYearChapter(chapterNum, yearData = {}, options = {}) {
  const config = SAJU_NEWYEAR_CHAPTER_CONFIG[chapterNum - 1];
  if (!config) {
    return { ok: false, text: "", source: "error", error: `Invalid chapter: ${chapterNum}` };
  }

  const forceLocal = options.forceLocal === true;
  const previousContext = options.previousContext || "";
  const maxRetries = Math.min(Number(options.maxRetries || MAX_RETRIES), MAX_RETRIES);

  if (forceLocal) {
    const text = getNewYearFallbackText(chapterNum, yearData);
    console.log(`[NewYearBook] CHAPTER_${chapterNum}_LOCAL_FALLBACK_USED (forceLocal=true)`);
    return { ok: true, text, source: "local-fallback" };
  }

  const keys = rotateGeminiKeys(pickGeminiKeys(), chapterNum + 5);
  if (!keys.length) {
    const text = getNewYearFallbackText(chapterNum, yearData);
    console.log(`[NewYearBook] CHAPTER_${chapterNum}_LOCAL_FALLBACK_USED (no_api_key)`);
    return { ok: true, text, source: "local-fallback" };
  }

  const prompt = buildNewYearPrompt(chapterNum, config, yearData, previousContext);

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
              temperature: 0.84,
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

        const validation = validateSajuNewYearChapter(chapterNum, text);
        if (!validation.ok) continue;

        console.log(`[NewYearBook] CHAPTER_${chapterNum}_GEMINI_SUCCESS (model=${model}, attempt=${attempt})`);
        return { ok: true, text, source: "gemini" };
      } catch (error) {
        console.warn(`[NewYearBook] CHAPTER_${chapterNum}_GEMINI_RETRY (attempt=${attempt})`, {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const fallbackText = getNewYearFallbackText(chapterNum, yearData);
  console.log(`[NewYearBook] CHAPTER_${chapterNum}_LOCAL_FALLBACK_USED (after retries=${maxRetries})`);
  return { ok: true, text: fallbackText, source: "local-fallback" };
}

export async function generateNewYearChaptersSequentially(chapters, yearData = {}, options = {}) {
  const result = {};
  const previousTexts = [];
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;

  for (const chapterNum of chapters) {
    if (onProgress) {
      onProgress({ code: `CHAPTER_${chapterNum}_START`, message: `New Year chapter ${chapterNum} generating...` });
    }

    const generated = await generateNewYearChapter(chapterNum, yearData, {
      ...options,
      previousContext: previousTexts.slice(-1)[0] || "",
    });

    result[chapterNum] = generated.text;
    previousTexts.push(String(generated.text || "").slice(0, 800));

    if (onProgress) {
      onProgress({
        code: `CHAPTER_${chapterNum}_COMPLETE`,
        message: `New Year chapter ${chapterNum} complete (${generated.source})`,
      });
    }
  }

  return result;
}
