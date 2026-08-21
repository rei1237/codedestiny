// 연애 6카드 리딩 LLM 확장 — normalizeLoveReadingPayload가 만든 로컬 리딩을 폴백 삼아
// Gemini로 상담 문장을 생성하고, 실패하면 로컬 리딩을 그대로 반환한다(mindscan-reading.mjs와 동일 패턴).

import { getTarotCardByAnyId } from "./tarot-cards.mjs";
import { buildCardTopicContext, buildTopicLockPromptBlock } from "./topic-lock.mjs";
import { AI_LOCALE_LABEL, buildOutputLanguageDirective, toAiLocale } from "../i18n/ai-locale.js";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const LOVE_READING_TOPIC = "love";

function toText(value) {
  return String(value || "").trim();
}

function cleanText(value) {
  return toText(value).replace(/\s{2,}/g, " ").trim();
}

function boundedNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function getGeminiModel(env = {}) {
  const source = [env.LOVE_READING_GEMINI_MODEL, env.GEMINI_MODEL, process?.env?.LOVE_READING_GEMINI_MODEL, process?.env?.GEMINI_MODEL]
    .map((value) => toText(value))
    .find(Boolean);
  return source || DEFAULT_GEMINI_MODEL;
}

// 공통 Gemini 키: 캐노니컬 GEMINIF_API_KEY 우선, 표준 이름 폴백(lib/llm-client.ts의 GEMINI_KEY_ORDER와 동일).
function pickGeminiKey(env = {}) {
  const names = ["GEMINIF_API_KEY", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"];
  for (const name of names) {
    const fromEnv = toText(env?.[name]);
    if (fromEnv) return fromEnv;
    const fromProcess = toText(process?.env?.[name]);
    if (fromProcess) return fromProcess;
  }
  return "";
}

function parseJsonFromText(text) {
  const source = toText(text);
  if (!source) return null;
  const candidates = [source];

  const fenceMatch = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) candidates.push(fenceMatch[1]);

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(source.slice(firstBrace, lastBrace + 1));
  }

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw.trim());
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {
      // try next candidate
    }
  }
  return null;
}

// 카드의 고정 키워드만 넘기면 LLM이 그것을 그대로 답변으로 옮긴다.
// 애정운 언어로 한 번 번역한 원재료를 함께 넘겨, 변환을 거친 뒤 답을 쓰게 한다.
function buildLovePositionInput(row, idx) {
  const base = {
    positionOrder: Number(row?.positionOrder || idx + 1),
    positionTitle: toText(row?.positionTitle || row?.title),
    cardName: toText(row?.cardName),
    cardNameEn: toText(row?.cardNameEn),
    orientationLabel: toText(row?.orientationLabel),
  };

  const card = getTarotCardByAnyId(row?.cardId);
  if (!card) {
    return { ...base, keywords: Array.isArray(row?.keywords) ? row.keywords.slice(0, 5) : [] };
  }

  const context = buildCardTopicContext(card, row?.orientation, LOVE_READING_TOPIC);
  return {
    ...base,
    cardCoreMeaning: context.cardCoreMeaning,
    cardSymbols: context.cardSymbols,
    cardArchetype: context.cardArchetype,
    topicProjection: context.topicProjection,
  };
}

export function buildLoveReadingPrompt(baseReading, locale, options = {}) {
  const rows = Array.isArray(baseReading?.positionBreakdown) ? baseReading.positionBreakdown : [];
  const aiLocale = toAiLocale(locale);
  const language = AI_LOCALE_LABEL[aiLocale];
  const promptBody = [
    "너는 연애와 관계의 온도를 섬세하게 읽는 릴레이션십 타로 상담가다. 6장 스프레드(내 마음 → 상대 겉모습 → 상대 속마음 → 상대의 의지 → 장애물 → 가까운 미래 흐름)를 하나의 상담 서사로 읽는다.",
    "말투는 사람이 직접 써 준 상담처럼 따뜻한 존댓말이되, 뭉뚱그린 추상 표현 대신 직설적이고 실행 가능한 문장으로 쓴다. 뻔한 키워드 나열은 금지한다.",
    "상대의 마음은 확정하지 말고 카드가 보여주는 가능성, 경향, 조건으로만 말한다. 희망고문, 공포 자극, 제3자/배신 단정, 의료/법률/투자 판단은 금지한다.",
    "각 포지션 해석은 카드 이름, 정역방향, 포지션 질문 사이의 인과를 설명해야 하며, 2번 포지션부터는 직전 흐름을 최소 한 번 이어받아 6개가 하나의 이야기가 되게 하라.",
    `모든 문자열은 ${language}로만 작성한다. 출력은 JSON 한 개만 반환하고, 설명 문장이나 코드블록을 절대 섞지 마라. 아래 형식의 키 이름을 그대로 유지하라.`,
    "",
    buildTopicLockPromptBlock(LOVE_READING_TOPIC, { userQuestion: options?.userQuestion }),
    "",
    "[입력 카드]",
    JSON.stringify({
      sequenceFlow: toText(baseReading?.relationshipMatrix?.sequenceFlow),
      positions: rows.map(buildLovePositionInput),
    }, null, 2),
    "",
    "[리딩 작성 형식]",
    JSON.stringify({
      overallVibe: "두 사람의 현재 감정 온도를 짚는 4~6문장",
      deepReading: "겉모습과 속마음의 간극을 읽는 4~6문장",
      realityAndFuture: "현실 조건과 가까운 미래 흐름 4~6문장",
      relationshipMatrix: {
        projectionGap: "내가 본 상대와 실제 감정의 간극 2~3문장",
        relationshipFrame: "상대의 관계관과 행동 의지 일치 여부 2~3문장",
        blockToOutcome: "장애물이 결말로 이어지는 연결 고리 2~3문장",
        wholeStory: "6장 전체를 관통하는 이야기 3~4문장",
        dominantSuit: "주도 슈트가 말하는 관계 축 1~2문장",
        majorArcanaSignal: "메이저 카드 비중의 의미 1~2문장",
        reversedSignal: "역방향 카드가 품은 지연/왜곡 1~2문장",
        courtCardSignal: "궁정 카드가 보여주는 태도 차이 1~2문장",
      },
      finalAdvice: {
        instantMission: "오늘 바로 할 수 있는 행동 지침 2~3문장",
        conversationTip: "실제로 건넬 수 있는 대화 예시를 포함한 2~3문장",
        relationshipBoundary: "내 마음을 지키는 경계 기준 2~3문장",
        nextSevenDays: "앞으로 7일의 리듬 제안 2~3문장",
        checklist: ["실행 체크리스트 5개, 각각 한 문장"],
      },
      positionBreakdown: [{
        positionOrder: 1,
        headline: "이 포지션의 핵심 신호 한 줄",
        detail: "카드 상징과 포지션 질문을 잇는 관계 해석 3~5문장",
        relationshipInsight: "이 자리에서 읽히는 관계 심리 2~3문장",
        advice: "이 자리에서 취할 태도 1~2문장",
        caution: "조심할 흐름 1~2문장",
        keywords: ["키워드", "3개", "이상"],
      }],
    }, null, 2),
  ].join("\n");
  const directive = buildOutputLanguageDirective(aiLocale);
  return directive ? `${promptBody}\n\n${directive}` : promptBody;
}

async function requestLoveReadingGeminiOnce({ prompt, env, fetchImpl, apiKey, maxOutputTokens, timeoutMs }) {
  // 개별 Gemini 호출에 상한을 건다. 생성이 늘어지면 abort시켜 상위 루프가 로컬 폴백으로 degrade하게 한다.
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = controller && Number(timeoutMs) > 0 ? setTimeout(() => controller.abort(), Number(timeoutMs)) : null;
  let response;
  try {
    response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getGeminiModel(env))}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: boundedNumber(env.LOVE_READING_GEMINI_TEMPERATURE, 0.7, 0.2, 1),
            topP: boundedNumber(env.LOVE_READING_GEMINI_TOP_P, 0.92, 0.5, 1),
            maxOutputTokens: Number(maxOutputTokens) || boundedNumber(env.LOVE_READING_GEMINI_MAX_OUTPUT_TOKENS, 12000, 3000, 24000),
            responseMimeType: "application/json",
            // gemini-2.5의 thinking 토큰이 maxOutputTokens를 잠식해 긴 JSON이 잘리는 것을 막는다.
            thinkingConfig: { thinkingBudget: boundedNumber(env.LOVE_READING_GEMINI_THINKING_BUDGET, 0, 0, 8192) },
          },
        }),
        signal: controller ? controller.signal : undefined,
      },
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!response.ok) {
    return { ok: false, reason: `gemini_http_${response.status}` };
  }

  const payload = await response.json().catch(() => ({}));
  const candidate = payload?.candidates?.[0];
  const rawText = (candidate?.content?.parts || [])
    .map((part) => toText(part?.text))
    .filter(Boolean)
    .join("\n")
    .trim();
  const parsed = parseJsonFromText(rawText);
  if (!parsed) {
    const finishReason = toText(candidate?.finishReason);
    return { ok: false, reason: finishReason && finishReason !== "STOP" ? `invalid_json_${finishReason}` : "invalid_json" };
  }
  if (toText(candidate?.finishReason) === "MAX_TOKENS") {
    return { ok: false, reason: "truncated_MAX_TOKENS" };
  }
  return { ok: true, reading: parsed };
}

// 짧은 잔여 문자열(한 단어 응답 등)로 로컬 문장을 덮지 않게 최소 길이를 요구한다.
function pickText(llmValue, baseValue, minLength = 20) {
  const cleaned = cleanText(llmValue);
  return cleaned.length >= minLength ? cleaned : cleanText(baseValue) || cleaned;
}

function mergeLoveReading(baseReading, parsed) {
  const base = baseReading && typeof baseReading === "object" ? baseReading : {};
  const baseMatrix = base.relationshipMatrix && typeof base.relationshipMatrix === "object" ? base.relationshipMatrix : {};
  const parsedMatrix = parsed?.relationshipMatrix && typeof parsed.relationshipMatrix === "object" ? parsed.relationshipMatrix : {};
  const baseAdvice = base.finalAdvice && typeof base.finalAdvice === "object" ? base.finalAdvice : {};
  const parsedAdvice = parsed?.finalAdvice && typeof parsed.finalAdvice === "object" ? parsed.finalAdvice : {};
  const baseRows = Array.isArray(base.positionBreakdown) ? base.positionBreakdown : [];
  const parsedRows = Array.isArray(parsed?.positionBreakdown) ? parsed.positionBreakdown : [];

  const positionBreakdown = baseRows.map((row, idx) => {
    const source = parsedRows.find((item) => Number(item?.positionOrder) === Number(row?.positionOrder)) || parsedRows[idx] || {};
    const keywords = Array.isArray(source?.keywords)
      ? source.keywords.map((item) => cleanText(item)).filter(Boolean).slice(0, 5)
      : [];
    return {
      ...row,
      headline: pickText(source?.headline, row?.headline || row?.summary, 8),
      detail: pickText(source?.detail, row?.detail, 40),
      relationshipInsight: pickText(source?.relationshipInsight, row?.relationshipInsight),
      advice: pickText(source?.advice, row?.advice, 10),
      caution: pickText(source?.caution, row?.caution, 10),
      keywords: keywords.length >= 3 ? keywords : row?.keywords,
    };
  });

  const checklist = Array.isArray(parsedAdvice?.checklist)
    ? parsedAdvice.checklist.map((line) => cleanText(line)).filter(Boolean).slice(0, 5)
    : [];
  const finalAdvice = {
    ...baseAdvice,
    instantMission: pickText(parsedAdvice?.instantMission, baseAdvice?.instantMission, 30),
    conversationTip: pickText(parsedAdvice?.conversationTip, baseAdvice?.conversationTip, 30),
    relationshipBoundary: pickText(parsedAdvice?.relationshipBoundary, baseAdvice?.relationshipBoundary, 30),
    nextSevenDays: pickText(parsedAdvice?.nextSevenDays, baseAdvice?.nextSevenDays, 30),
    checklist: checklist.length >= 3 ? checklist : baseAdvice?.checklist,
  };

  const merged = {
    ...base,
    overallVibe: pickText(parsed?.overallVibe, base?.overallVibe, 60),
    deepReading: pickText(parsed?.deepReading, base?.deepReading, 60),
    realityAndFuture: pickText(parsed?.realityAndFuture, base?.realityAndFuture, 60),
    relationshipMatrix: {
      ...baseMatrix,
      projectionGap: pickText(parsedMatrix?.projectionGap, baseMatrix?.projectionGap, 30),
      relationshipFrame: pickText(parsedMatrix?.relationshipFrame, baseMatrix?.relationshipFrame, 30),
      blockToOutcome: pickText(parsedMatrix?.blockToOutcome, baseMatrix?.blockToOutcome, 30),
      wholeStory: pickText(parsedMatrix?.wholeStory, baseMatrix?.wholeStory, 40),
      dominantSuit: pickText(parsedMatrix?.dominantSuit, baseMatrix?.dominantSuit, 10),
      majorArcanaSignal: pickText(parsedMatrix?.majorArcanaSignal, baseMatrix?.majorArcanaSignal, 10),
      reversedSignal: pickText(parsedMatrix?.reversedSignal, baseMatrix?.reversedSignal, 10),
      courtCardSignal: pickText(parsedMatrix?.courtCardSignal, baseMatrix?.courtCardSignal, 10),
      // sequenceFlow는 카드 나열 사실 정보이므로 로컬 값을 유지한다.
      sequenceFlow: cleanText(baseMatrix?.sequenceFlow),
    },
    finalAdvice,
    positionBreakdown,
  };

  merged.advice = [
    finalAdvice.instantMission,
    finalAdvice.conversationTip,
    finalAdvice.relationshipBoundary,
    finalAdvice.nextSevenDays,
  ].filter(Boolean);

  return merged;
}

// 로컬(정적) 리딩을 폴백 삼아 LLM 상담문으로 확장한다. 어떤 실패에서도 throw 하지 않고 폴백을 반환한다.
export async function enhanceLoveReadingWithLlm(baseReading, options = {}) {
  const locale = toText(options?.locale) || "ko";
  const env = options?.env || {};
  const fetchImpl = options?.fetchImpl || globalThis.fetch;
  const fallback = { reading: baseReading, source: "local_fallback" };

  const rows = Array.isArray(baseReading?.positionBreakdown) ? baseReading.positionBreakdown : [];
  if (!rows.length) return fallback;

  const apiKey = pickGeminiKey(env);
  if (!apiKey || typeof fetchImpl !== "function") {
    return { ...fallback, llmFailReason: "missing_config" };
  }

  const prompt = buildLoveReadingPrompt(baseReading, locale, { userQuestion: options?.userQuestion });
  const baseTokens = boundedNumber(env.LOVE_READING_GEMINI_MAX_OUTPUT_TOKENS, 12000, 3000, 24000);
  // 전체 LLM 생성 시간 상한. 초과 시 로컬 폴백으로 degrade해, 클라이언트 타임아웃보다 먼저 확정 응답을 돌려준다.
  const totalDeadlineMs = boundedNumber(env.LOVE_READING_TOTAL_TIMEOUT_MS, 42000, 8000, 120000);
  const startedAt = Date.now();
  let lastReason = "unknown";
  let truncationRetries = 0;
  // 잘림(MAX_TOKENS)일 때는 출력 토큰을 올려 재시도하고, 그래도 실패할 때만 로컬 폴백으로 내려간다.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const remainingMs = totalDeadlineMs - (Date.now() - startedAt);
    // 남은 예산이 한 번의 호출을 감당하기 어려우면 재시도를 멈추고 폴백으로 내려간다.
    if (remainingMs <= 1500) {
      if (lastReason === "unknown") lastReason = "deadline_exceeded";
      break;
    }
    const maxOutputTokens = Math.min(24000, Math.round(baseTokens * (1 + 0.4 * truncationRetries)));
    try {
      const result = await requestLoveReadingGeminiOnce({ prompt, env, fetchImpl, apiKey, maxOutputTokens, timeoutMs: remainingMs });
      if (result.ok) {
        return { reading: mergeLoveReading(baseReading, result.reading), source: "llm" };
      }
      lastReason = result.reason;
      if (/max_tokens|truncated/i.test(String(result.reason))) truncationRetries += 1;
    } catch (error) {
      lastReason = `fetch_error:${toText(error?.message) || "unknown"}`;
    }
  }
  // 폴백 사유를 남겨 침묵 회귀(LLM 경로 사망)를 조기에 발견할 수 있게 한다.
  console.warn(`[love-reading] gemini fallback: ${lastReason}`);
  return { ...fallback, llmFailReason: lastReason };
}
