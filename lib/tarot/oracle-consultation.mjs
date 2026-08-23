// 타로 오라클 상담(구 "타로 프롬프트 라이브러리") 실제 LLM 호출 — love-reading-llm.mjs 와 동일 패턴.
// 클라이언트가 만든 프롬프트 원문은 신뢰하지 않는다: 카드 ID는 tarot-cards.mjs 로 검증하고
// 카드 해석의 안전장치(질문 영역 고정)는 topic-lock.mjs 를 그대로 재사용한다.
//
// 스코프: 타로(78장) 모드만 다룬다. 레노먼드(36장) 모드는 카드 카탈로그가 아직
// app/tarot/prompt-maker 클라이언트 쪽에만 있어(서버 검증 불가) 이번 전환에서 제외했다 —
// 기존처럼 프롬프트 생성 전용으로 계속 동작한다.

import { getTarotCardByAnyId } from "./tarot-cards.mjs";
import { buildCardTopicContext, buildTopicLockPromptBlock, resolveTopicKey } from "./topic-lock.mjs";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MAX_QUESTION_LENGTH = 400;
const MAX_TEXT_FIELD_LENGTH = 80;
const MIN_CARDS = 1;
const MAX_CARDS = 14;

const TONE_INSTRUCTIONS = {
  consult: "문체는 따뜻하고 신뢰감 있는 상담체로, 실제 상담사가 고객 앞에서 설명하듯 자연스럽게 쓴다.",
  practical: "문체는 담백하고 현실적인 조언 중심으로, 감상적인 표현보다 지금 할 수 있는 행동을 우선한다.",
  warm: "문체는 다정하고 공감적인 위로 중심으로, 불안을 낮추고 마음을 다독이는 표현을 우선한다.",
};

// 스프레드 카테고리(app/tarot/prompt-maker/types.ts 의 TarotSpreadCategory) → topic-lock 주제 매핑.
// 직접 대응이 없는 카테고리는 general 로 떨어진다(안전한 기본값).
const CATEGORY_TOPIC_MAP = {
  love: "love",
  reunion: "reunion",
  third_party: "love",
  daily: "daily",
  choice: "general",
  career: "career",
  money: "money",
  relationship: "people",
  self: "general",
  crisis: "general",
  future: "future",
  spiritual: "general",
  family: "people",
  power: "career",
  legal: "general",
  special: "general",
};

function toText(value) {
  return String(value ?? "").trim();
}

// 개행·탭만 걷어낸다 — 짧은 라벨/설명 필드에 가짜 프롬프트 구획을 끼워 넣는 것을 막는 목적이라
// 전체 제어문자 범위까지는 필요 없다.
function clampText(value, max) {
  const text = toText(value).replace(/[\r\n\t]/g, " ").replace(/\s{2,}/g, " ").trim();
  return text.length > max ? text.slice(0, max) : text;
}

function boundedNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function getGeminiModel(env = {}) {
  const source = [env.ORACLE_CONSULTATION_GEMINI_MODEL, env.GEMINI_MODEL, process?.env?.ORACLE_CONSULTATION_GEMINI_MODEL, process?.env?.GEMINI_MODEL]
    .map((value) => toText(value))
    .find(Boolean);
  return source || DEFAULT_GEMINI_MODEL;
}

// 공통 Gemini 키: 캐노니컬 GEMINIF_API_KEY 우선, 표준 이름 폴백(love-reading-llm.mjs 와 동일).
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

function outputLanguageLabel(locale) {
  if (locale === "ja") return "日本語";
  if (locale === "en") return "English";
  if (locale === "zh") return "中文";
  return "한국어";
}

// 클라이언트 원문을 신뢰하지 않고 서버가 카드ID·개수·텍스트 길이를 검증한다.
export function validateOracleConsultationInput(body = {}) {
  const spreadTitle = clampText(body?.spreadTitle, MAX_TEXT_FIELD_LENGTH);
  const category = toText(body?.category);
  const question = clampText(body?.question, MAX_QUESTION_LENGTH);
  const tone = TONE_INSTRUCTIONS[toText(body?.tone)] ? toText(body.tone) : "consult";
  const rawCards = Array.isArray(body?.cards) ? body.cards : [];

  if (!spreadTitle) return { ok: false, reason: "missing_spread_title" };
  if (rawCards.length < MIN_CARDS || rawCards.length > MAX_CARDS) {
    return { ok: false, reason: "invalid_card_count" };
  }

  const cards = [];
  for (let index = 0; index < rawCards.length; index += 1) {
    const row = rawCards[index] || {};
    const card = getTarotCardByAnyId(row?.cardId);
    if (!card) return { ok: false, reason: `unknown_card_id:${index}` };
    const orientation = row?.orientation === "reversed" ? "reversed" : "upright";
    cards.push({
      index: index + 1,
      card,
      orientation,
      positionLabel: clampText(row?.positionLabel, MAX_TEXT_FIELD_LENGTH) || `${index + 1}번째 카드`,
      positionDescription: clampText(row?.positionDescription, MAX_TEXT_FIELD_LENGTH * 2),
    });
  }

  return {
    ok: true,
    data: { spreadTitle, category, question, tone, cards },
  };
}

export function buildOracleConsultationPrompt({ spreadTitle, category, question, tone, cards, locale = "ko" }) {
  const topicKey = resolveTopicKey(CATEGORY_TOPIC_MAP[category] || category);
  const language = outputLanguageLabel(locale);
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.consult;

  const cardBlocks = cards.map((row) => {
    const context = buildCardTopicContext(row.card, row.orientation, topicKey);
    return {
      positionOrder: row.index,
      positionLabel: row.positionLabel,
      positionDescription: row.positionDescription,
      ...context,
    };
  });

  const systemPrompt = [
    "당신은 실제 고객을 상담하는 전문 타로 리더입니다.",
    "카드의 일반적인 의미보다 해당 카드가 놓인 포지션의 의미를 우선합니다.",
    "각 카드를 따로 설명하는 데서 끝내지 말고 전체 배열의 흐름을 하나의 상담 이야기로 연결합니다.",
    "법률, 의료, 투자, 생명·사망, 임신, 합격 여부 등은 확정적으로 말하지 말고 참고용 조언으로만 표현합니다.",
    "고객에게 공포를 주거나 운명을 단정하지 않습니다.",
    toneInstruction,
    `모든 문자열은 ${language}로만 작성합니다. 출력은 JSON 한 개만 반환하고, 설명 문장이나 코드블록을 절대 섞지 마세요.`,
  ].join("\n");

  const userPrompt = [
    `[스프레드] ${spreadTitle} (${cards.length}장)`,
    "",
    buildTopicLockPromptBlock(topicKey, { userQuestion: question }),
    "",
    "[배열 위치와 카드]",
    JSON.stringify(cardBlocks, null, 2),
    "",
    "[출력 형식] 아래 키 이름을 그대로 유지한 JSON 하나만 반환하세요.",
    JSON.stringify({
      coreQuestion: "질문자가 지금 묻고 있는 진짜 주제 1~2문장",
      bigPicture: "스프레드 전체에서 먼저 보이는 큰 흐름 2~4문장",
      positionReadings: [{
        positionOrder: 1,
        headline: "이 포지션의 핵심 신호 한 줄",
        reading: "포지션 의미 + 카드 상징 + 방향을 엮은 해석 3~5문장",
      }],
      tension: "카드들이 서로 만드는 긴장과 조화 2~3문장",
      caution: "질문자가 조심해야 할 착각 또는 과잉 기대 1~2문장",
      actions: ["오늘부터 가능한 현실 행동", "2~3개, 각각 한 문장"],
      closingLine: "마음을 정리하는 마지막 한마디 1문장",
    }, null, 2),
  ].join("\n");

  return { systemPrompt, userPrompt, topicKey };
}

async function requestOracleConsultationGeminiOnce({ prompt, systemPrompt, env, fetchImpl, apiKey, maxOutputTokens, timeoutMs }) {
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
          systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: boundedNumber(env.ORACLE_CONSULTATION_GEMINI_TEMPERATURE, 0.68, 0.2, 1),
            topP: boundedNumber(env.ORACLE_CONSULTATION_GEMINI_TOP_P, 0.92, 0.5, 1),
            maxOutputTokens: Number(maxOutputTokens) || boundedNumber(env.ORACLE_CONSULTATION_GEMINI_MAX_OUTPUT_TOKENS, 10000, 3000, 20000),
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: boundedNumber(env.ORACLE_CONSULTATION_GEMINI_THINKING_BUDGET, 0, 0, 8192) },
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
  return { ok: true, consultation: parsed };
}

// 실패해도 throw 하지 않는다 — 호출자가 "프롬프트만 보여주기"로 저하할 수 있게 사유만 반환한다.
export async function generateOracleConsultation(input, options = {}) {
  const validated = validateOracleConsultationInput(input);
  if (!validated.ok) return { ok: false, reason: validated.reason };

  const env = options?.env || {};
  const fetchImpl = options?.fetchImpl || globalThis.fetch;
  const apiKey = pickGeminiKey(env);
  if (!apiKey || typeof fetchImpl !== "function") {
    return { ok: false, reason: "missing_config" };
  }

  const { systemPrompt, userPrompt } = buildOracleConsultationPrompt({ ...validated.data, locale: options?.locale || "ko" });
  const baseTokens = boundedNumber(env.ORACLE_CONSULTATION_GEMINI_MAX_OUTPUT_TOKENS, 10000, 3000, 20000);
  const totalDeadlineMs = boundedNumber(env.ORACLE_CONSULTATION_TOTAL_TIMEOUT_MS, 38000, 8000, 100000);
  const startedAt = Date.now();
  let lastReason = "unknown";
  let truncationRetries = 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const remainingMs = totalDeadlineMs - (Date.now() - startedAt);
    if (remainingMs <= 1500) {
      if (lastReason === "unknown") lastReason = "deadline_exceeded";
      break;
    }
    const maxOutputTokens = Math.min(20000, Math.round(baseTokens * (1 + 0.4 * truncationRetries)));
    try {
      const result = await requestOracleConsultationGeminiOnce({
        prompt: userPrompt,
        systemPrompt,
        env,
        fetchImpl,
        apiKey,
        maxOutputTokens,
        timeoutMs: remainingMs,
      });
      if (result.ok) return { ok: true, consultation: result.consultation, source: "llm" };
      lastReason = result.reason;
      if (/max_tokens|truncated/i.test(String(result.reason))) truncationRetries += 1;
    } catch (error) {
      lastReason = `fetch_error:${toText(error?.message) || "unknown"}`;
    }
  }

  console.warn(`[oracle-consultation] gemini fallback: ${lastReason}`);
  return { ok: false, reason: lastReason };
}
