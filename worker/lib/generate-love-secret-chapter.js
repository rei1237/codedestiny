/**
 * Love Secret Premium - Generate Single Chapter with Retry & Fallback
 */

import { LOVE_SECRET_CHAPTER_CONFIG, validateLoveSecretChapter } from "./saju-love-secret-chapter-config.js";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
const MAX_RETRIES = 8;
const REQUEST_TIMEOUT = 12000;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
const LOVE_SECRET_MODES = ["personal", "couple", "support"];

let geminiKeyCursor = 0;

function normalizeMode(mode) {
  return LOVE_SECRET_MODES.includes(mode) ? mode : "personal";
}

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

function buildModeSummary(mode, data = {}) {
  if (mode === "couple") {
    return [
      `모드: couple`,
      `당사자 A: ${data?.personAName || "나"}`,
      `당사자 B: ${data?.personBName || "상대"}`,
      `현재 상태: ${data?.relationshipStage || "미상"}`,
      `핵심 과제: ${data?.coreIssue || "미상"}`,
    ].join("\n");
  }

  if (mode === "support") {
    return [
      `모드: support`,
      `대상자: ${data?.targetName || data?.personAName || "대상"}`,
      `지원 목적: ${data?.supportGoal || "정서적 안정 및 관계 회복"}`,
      `현재 난관: ${data?.currentChallenge || "미상"}`,
      `지원자 역할: ${data?.supportRole || "중립적 조력자"}`,
    ].join("\n");
  }

  return [
    `모드: personal`,
    `당사자: ${data?.personAName || "나"}`,
    `연애 성향: ${data?.loveStyle || "미상"}`,
    `주요 욕구: ${data?.emotionalNeed || "미상"}`,
    `개선 목표: ${data?.growthGoal || "미상"}`,
  ].join("\n");
}

function buildLoveSecretPrompt(chapterNum, config, data, mode, previousContext = "") {
  const summary = buildModeSummary(mode, data);
  const contextHint = previousContext
    ? `\n\n## 이전 챕터 컨텍스트\n${String(previousContext).slice(0, 600)}`
    : "";

  return `당신은 연애 비책(LOVE SECRET) 프리미엄 리포트 작성 전문가입니다.

## 모드 데이터
${summary}

## 요청 챕터
${config.num}. ${config.title}
${config.subtitle}

## 작성 규칙
- 한국어 작성
- 최소 ${config.minChars}자 이상
- 섹션 포함: ${config.sections.join(", ")}
- 구체적 대화 문장, 행동 루틴, 시간 단위 실천안 포함
- 메타 텍스트(reportId, fallback, generated) 노출 금지
- 동일 문장 3회 이상 반복 금지
- 모드별 문맥 준수:
  - personal: 자기 이해와 행동 개선 중심
  - couple: 두 사람 상호작용과 조율 중심
  - support: 제3자 조력 관점의 지원 전략 중심

## 출력 형식
### 핵심 해석
### 위험/기회 포인트
### 실전 대화/행동 가이드
### 30일 실행 체크리스트${contextHint}`;
}

function buildLoveSecretFallbackBase(config, data = {}, mode = "personal") {
  const modeTitle = mode === "couple" ? "커플" : mode === "support" ? "지원" : "개인";
  const modeDirection = mode === "couple"
    ? "관계의 상호작용을 중심으로 오해 누적을 줄이고 회복 대화를 설계합니다."
    : mode === "support"
      ? "직접 당사자가 아닌 조력자 관점에서 감정 안전망과 대화 중재 기술을 설계합니다."
      : "자기 인식 기반으로 연애 습관을 수정하고 지속 가능한 표현 방식을 만듭니다.";

  let text = `# ${config.num}. ${config.title}\n\n${config.subtitle}\n\n`;
  text += `## ${modeTitle} 모드 핵심 관점\n${modeDirection}\n\n`;
  text += `## 관계 구조 해석\n`;
  text += `이 챕터의 핵심은 반복되는 반응 패턴을 식별해 행동 루틴으로 전환하는 것입니다. 사랑은 감정의 강도만으로 유지되지 않으며, 갈등 이후 복구 속도와 대화 품질에 의해 장기 안정성이 결정됩니다. 따라서 이번 장에서는 상대를 바꾸는 전략이 아니라, 관계의 흐름을 조정하는 전략에 집중해야 합니다.\n\n`;
  text += `## 실전 가이드\n`;
  text += `- 감정이 올라오는 순간: 즉시 결론 대신 10분 정리\n`;
  text += `- 대화 시작 문장: 사실-감정-요청 순서 유지\n`;
  text += `- 주간 점검: 반복된 갈등 장면 1개를 재작성\n`;
  text += `- 월간 점검: 유지할 습관 2개, 중단할 습관 2개 확정\n\n`;
  text += `## 모드 맞춤 조언\n`;

  if (mode === "couple") {
    text += `두 사람의 에너지가 다를 때는 "누가 옳은가"보다 "무엇이 안전한가"를 먼저 합의해야 합니다. 갈등 시에는 상대의 의도를 추정하지 말고 들은 문장을 재확인하십시오. 회복은 사과의 길이보다 타이밍의 정확도가 더 중요합니다.\n`;
  } else if (mode === "support") {
    text += `조력자는 문제를 대신 해결하지 않습니다. 대신 당사자가 스스로 말할 수 있는 환경을 조성해야 합니다. 한쪽 편을 드는 순간 신뢰는 무너질 수 있으므로, 감정 확인과 경계 설정을 동시에 유지하는 중립적 언어를 사용하십시오.\n`;
  } else {
    text += `개인 모드에서는 상대 분석보다 자기 패턴 분석이 우선입니다. 특히 관계가 불안할수록 과잉 설명, 과잉 확인, 과잉 양보가 나타나기 쉽습니다. 이를 줄이면 감정 소모가 크게 감소하고 관계의 선명도가 올라갑니다.\n`;
  }

  text += `\n## 30일 실행표\n`;
  text += `1주차: 트리거 기록\n2주차: 대화 문장 교정\n3주차: 갈등 복구 루틴 적용\n4주차: 관계 리듬 고정\n`;

  return text;
}

export function getLoveSecretFallbackText(chapterNum, loveData = {}, mode = "personal") {
  const config = LOVE_SECRET_CHAPTER_CONFIG[chapterNum - 1];
  if (!config) return "";

  const normalizedMode = normalizeMode(mode);
  let text = buildLoveSecretFallbackBase(config, loveData, normalizedMode);

  let cycle = 0;
  const minLen = Math.max(config.minChars || 3500, 3800);
  while (countChars(text) < minLen) {
    text += `\n\n## 보강 블록 ${cycle + 1}\n`;
    text += `이 보강 블록은 ${normalizedMode} 모드의 실행력을 높이기 위한 점검 항목입니다. 오늘의 감정 상태를 10점 척도로 기록하고, 갈등 장면에서는 즉각 반박보다 의미 재확인 질문을 사용하십시오. 대화가 길어질수록 핵심 요청은 흐려지므로 한 번에 한 가지 요청만 전달하십시오. 매주 말에는 관계의 에너지 소모 지점을 확인하고, 다음 주 루틴을 3개 이내로 줄여 반복성을 확보하십시오.\n`;
    cycle += 1;
    if (cycle > 12) break;
  }

  return text;
}

export async function generateLoveSecretChapter(chapterNum, loveData = {}, options = {}) {
  const config = LOVE_SECRET_CHAPTER_CONFIG[chapterNum - 1];
  if (!config) {
    return { ok: false, text: "", source: "error", error: `Invalid chapter: ${chapterNum}` };
  }

  const mode = normalizeMode(options.mode);
  const forceLocal = options.forceLocal === true;
  const maxRetries = Math.min(Number(options.maxRetries || MAX_RETRIES), MAX_RETRIES);
  const previousContext = options.previousContext || "";

  if (forceLocal) {
    const text = getLoveSecretFallbackText(chapterNum, loveData, mode);
    console.log(`[LoveSecretBook] CHAPTER_${chapterNum}_LOCAL_FALLBACK_USED (forceLocal=true)`);
    return { ok: true, text, source: "local-fallback" };
  }

  const keys = rotateGeminiKeys(pickGeminiKeys(), chapterNum + mode.length);
  if (!keys.length) {
    const text = getLoveSecretFallbackText(chapterNum, loveData, mode);
    console.log(`[LoveSecretBook] CHAPTER_${chapterNum}_LOCAL_FALLBACK_USED (no_api_key)`);
    return { ok: true, text, source: "local-fallback" };
  }

  const prompt = buildLoveSecretPrompt(chapterNum, config, loveData, mode, previousContext);

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

        const validation = validateLoveSecretChapter(chapterNum, text, mode);
        if (!validation.ok) continue;

        console.log(`[LoveSecretBook] CHAPTER_${chapterNum}_GEMINI_SUCCESS (model=${model}, attempt=${attempt}, mode=${mode})`);
        return { ok: true, text, source: "gemini" };
      } catch (error) {
        console.warn(`[LoveSecretBook] CHAPTER_${chapterNum}_GEMINI_RETRY (attempt=${attempt}, mode=${mode})`, {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const fallbackText = getLoveSecretFallbackText(chapterNum, loveData, mode);
  console.log(`[LoveSecretBook] CHAPTER_${chapterNum}_LOCAL_FALLBACK_USED (after retries=${maxRetries}, mode=${mode})`);
  return { ok: true, text: fallbackText, source: "local-fallback" };
}

export async function generateLoveSecretChaptersSequentially(chapters, loveData = {}, options = {}) {
  const result = {};
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const previousTexts = [];
  const mode = normalizeMode(options.mode);

  for (const chapterNum of chapters) {
    if (onProgress) {
      onProgress({ code: `CHAPTER_${chapterNum}_START`, message: `Love Secret chapter ${chapterNum} generating...` });
    }

    const generated = await generateLoveSecretChapter(chapterNum, loveData, {
      ...options,
      mode,
      previousContext: previousTexts.slice(-1)[0] || "",
    });

    result[chapterNum] = generated.text;
    previousTexts.push(String(generated.text || "").slice(0, 800));

    if (onProgress) {
      onProgress({
        code: `CHAPTER_${chapterNum}_COMPLETE`,
        message: `Love Secret chapter ${chapterNum} complete (${generated.source})`,
      });
    }
  }

  return result;
}
