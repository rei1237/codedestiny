// 타로 오라클 상담(구 "타로 프롬프트 라이브러리") 실제 LLM 호출 — love-reading-llm.mjs 와 동일 패턴.
// 클라이언트가 만든 프롬프트 원문은 신뢰하지 않는다: 카드 ID는 tarot-cards.mjs 로 검증하고
// 카드 해석의 안전장치(질문 영역 고정)는 topic-lock.mjs 를 그대로 재사용한다.
//
// 스코프: 타로(78장) 모드만 다룬다. 레노먼드(36장) 모드는 카드 카탈로그가 아직
// app/tarot/prompt-maker 클라이언트 쪽에만 있어(서버 검증 불가) 이번 전환에서 제외했다 —
// 기존처럼 프롬프트 생성 전용으로 계속 동작한다.

import { getTarotCardByAnyId } from "./tarot-cards.mjs";
import { buildCardTopicContext, buildTopicLockPromptBlock, getTopicProfile, resolveTopicKey } from "./topic-lock.mjs";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MAX_QUESTION_LENGTH = 400;
const MAX_TEXT_FIELD_LENGTH = 80;
const MIN_CARDS = 1;
const MAX_CARDS = 14;

// 분량 목표. 상수는 **추정이 아니라 실측 회귀선**이다 — 확대된 이 프롬프트가 실제로 뽑는 양에
// 맞춰 두어야 아래 미달 게이트가 안전막 구실을 한다(목표가 실제보다 낮으면 하한도 같이 낮아져
// 정작 짧은 응답을 못 잡고, 너무 높으면 매번 재요청이 돌아 시간과 비용만 늘어난다).
//
// 실측 2026-08-27 (gemini-2.5-flash, 이 프롬프트 그대로):
//   3카드  3,132자 / 2,426 출력토큰 / 15.2초
//   14카드 6,128자 / 4,960 출력토큰 / 25.3초
// 재현: node scripts/verify-oracle-consultation.mjs --live (🔴 실호출 — 사전 허락 필요)
const DEFAULT_TARGET_CHARS_BASE = 2300;
const DEFAULT_TARGET_CHARS_PER_CARD = 280;
// 목표의 이 비율에 못 미치면 보강 지시를 붙여 다시 받는다.
const SHORT_RESULT_RATIO = 0.7;

// 🔴 정본은 lib/llm-client.ts 의 isTransientGeminiError / GEMINI_RETRY_BACKOFF_MS 다. 여기서 값을
// 복제하는 이유는 이 모듈이 워커·node·Jest 세 런타임에서 그대로 로드돼 .ts 를 물 수 없기 때문이며,
// love-reading-llm.mjs 가 pickGeminiKey 를 복제한 것과 같은 사정이다.
const GEMINI_RETRY_BACKOFF_MS = [400, 900];

// 429(레이트리밋)와 5xx 만 다시 부른다. 400/403 은 같은 요청을 다시 보내도 같은 답이라
// 재시도가 지연만 만든다. 예전에는 전부 백오프 없이 즉시 3회 재시도해 429 에 특히 무력했다.
function isRetryableGeminiReason(reason) {
  const text = String(reason || "");
  const httpMatch = text.match(/^gemini_http_(\d{3})$/);
  if (httpMatch) {
    const status = Number(httpMatch[1]);
    return status === 429 || status >= 500;
  }
  return true;
}

function sleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

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

// 카드 수에 따른 목표 분량(공백 제외 문자수). env 로 덮을 수 있다.
export function resolveOracleConsultationTargetChars(cardCount, env = {}) {
  const base = boundedNumber(env.ORACLE_CONSULTATION_TARGET_CHARS_BASE, DEFAULT_TARGET_CHARS_BASE, 600, 6000);
  const perCard = boundedNumber(env.ORACLE_CONSULTATION_TARGET_CHARS_PER_CARD, DEFAULT_TARGET_CHARS_PER_CARD, 0, 1200);
  const count = Math.min(MAX_CARDS, Math.max(0, Number(cardCount) || 0));
  return Math.round(base + perCard * count);
}

// 🔴 렌더러(app/tarot/prompt-maker/TarotPromptMakerClient.tsx)가 실제로 그리는 문자열만 센다.
// 화면에 안 나오는 키까지 세면 게이트는 통과하는데 사용자가 읽는 글은 그대로 짧다.
export function measureConsultationChars(consultation) {
  if (!consultation || typeof consultation !== "object") return 0;
  const parts = [
    consultation.coreQuestion,
    consultation.bigPicture,
    consultation.tension,
    consultation.categoryFocus,
    consultation.caution,
    consultation.closingLine,
  ];
  for (const row of Array.isArray(consultation.positionReadings) ? consultation.positionReadings : []) {
    parts.push(row?.headline, row?.reading, row?.positionAdvice);
  }
  for (const row of Array.isArray(consultation.cardSynergies) ? consultation.cardSynergies : []) {
    parts.push(row?.pairLabel, row?.insight);
  }
  const timeline = consultation.timeline;
  if (timeline && typeof timeline === "object") parts.push(timeline.now, timeline.near, timeline.turning);
  for (const action of Array.isArray(consultation.actions) ? consultation.actions : []) parts.push(action);
  return parts.map((value) => toText(value)).join("").replace(/\s+/g, "").length;
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

export function buildOracleConsultationPrompt({ spreadTitle, category, question, tone, cards, locale = "ko", env = {} }) {
  const topicKey = resolveTopicKey(CATEGORY_TOPIC_MAP[category] || category);
  const language = outputLanguageLabel(locale);
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.consult;
  const targetChars = resolveOracleConsultationTargetChars(cards.length, env);
  // 대형 스프레드에서 조합 해석이 폭주하지 않게 상한을 둔다. 2장 이하면 조합 자체가 없다.
  const synergyCount = cards.length < 3 ? 0 : Math.min(3, cards.length - 1);
  const adviceLength = cards.length >= 10 ? "1문장" : "1~2문장";
  // categoryFocus 를 "이 카테고리에서만 의미 있는 조언"으로 묶는 근거. topic-lock 프로파일이 정본이다.
  const topicProfileLabel = getTopicProfile(topicKey).label;

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
      coreQuestion: "질문자가 지금 묻고 있는 진짜 주제 2~3문장",
      bigPicture: "스프레드 전체에서 먼저 보이는 큰 흐름 5~7문장",
      positionReadings: [{
        positionOrder: 1,
        headline: "이 포지션의 핵심 신호 한 줄",
        reading: "포지션 의미 + 카드 상징 + 방향을 엮은 해석 6~8문장",
        positionAdvice: `이 자리에서 질문자가 지금 취할 태도 ${adviceLength}`,
      }],
      cardSynergies: [{
        pairLabel: "예: 1번 정의 × 3번 심판",
        insight: "두 카드가 함께 있을 때만 생기는 의미 3~4문장",
      }],
      timeline: {
        now: "지금 국면에서 실제로 일어나고 있는 것 2~3문장",
        near: "이 흐름대로 갔을 때 다가오는 국면 2~3문장",
        turning: "흐름이 갈리는 분기점과 그 신호 2~3문장",
      },
      tension: "카드들이 서로 만드는 긴장과 조화 4~5문장",
      categoryFocus: `${topicProfileLabel} 질문에서만 의미가 있는 심화 조언 4~5문장`,
      caution: "질문자가 조심해야 할 착각 또는 과잉 기대 3~4문장",
      actions: ["오늘부터 가능한 현실 행동", "4~5개, 각각 두 문장"],
      closingLine: "마음을 정리하는 마지막 한마디 2~3문장",
    }, null, 2),
    "",
    `[분량] 위 JSON 안 모든 문자열의 합이 공백을 빼고 ${targetChars}자 이상이 되도록 쓴다. 분량을 채우려고 같은 말을 다르게 반복하지 말고, 카드와 포지션에서 실제로 읽히는 내용을 더 깊이 풀어 쓴다.`,
    synergyCount > 0
      ? `[조합 개수] cardSynergies 는 정확히 ${synergyCount}개만 쓴다. 서로 가장 강하게 얽히는 카드 쌍을 고른다.`
      : "[조합 개수] 카드가 3장 미만이므로 cardSynergies 는 빈 배열로 둔다.",
  ].join("\n");

  return { systemPrompt, userPrompt, topicKey, targetChars };
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

  // 🔴 안전 차단은 candidates 를 통째로 비워 보내므로, 이걸 안 보면 아래에서 "JSON 깨짐"으로
  // 접혀 같은 입력으로 3번 더 재시도한다(결과는 매번 같다). 차단은 차단이라고 말해야 한다.
  const blockReason = toText(payload?.promptFeedback?.blockReason);
  if (blockReason) return { ok: false, reason: `blocked_${blockReason}`, permanent: true };

  const candidate = payload?.candidates?.[0];
  if (!candidate) return { ok: false, reason: "empty_candidates" };

  const finishReason = toText(candidate.finishReason);
  if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT" || finishReason === "BLOCKLIST") {
    return { ok: false, reason: `blocked_${finishReason}`, permanent: true };
  }

  const rawText = (candidate?.content?.parts || [])
    .map((part) => toText(part?.text))
    .filter(Boolean)
    .join("\n")
    .trim();
  const parsed = parseJsonFromText(rawText);
  if (!parsed) {
    return { ok: false, reason: finishReason && finishReason !== "STOP" ? `invalid_json_${finishReason}` : "invalid_json" };
  }
  if (finishReason === "MAX_TOKENS") {
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

  const { systemPrompt, userPrompt, targetChars } = buildOracleConsultationPrompt({
    ...validated.data,
    locale: options?.locale || "ko",
    env,
  });
  const minChars = Math.round(targetChars * SHORT_RESULT_RATIO);
  // maxOutputTokens 기본 10,000 은 그대로 둔다 — 가장 큰 스프레드(14카드)가 실측 4,960 토큰으로 절반이다.
  const baseTokens = boundedNumber(env.ORACLE_CONSULTATION_GEMINI_MAX_OUTPUT_TOKENS, 10000, 3000, 20000);
  // 🔴 데드라인은 **한 번의 생성 시간이 아니라 재시도까지의 예산**이다. 14카드 실측이 25.3초인데
  // 예전 기본값 38초로는 첫 시도 뒤 12.7초만 남아 전송 재시도도 분량 미달 재요청도 못 들어갔다
  // (아래 `remainingMs <= 1500` 에서 곧바로 빠져나온다). 60초면 25초짜리 시도를 두 번 담는다.
  const totalDeadlineMs = boundedNumber(env.ORACLE_CONSULTATION_TOTAL_TIMEOUT_MS, 60000, 8000, 100000);
  const startedAt = Date.now();
  let lastReason = "unknown";
  let truncationRetries = 0;
  let shortRetries = 0;
  // 분량 미달이라 다시 받아 보는 중이라도 손에 쥔 결과는 버리지 않는다(아래 참조).
  let shortConsultation = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const remainingMs = totalDeadlineMs - (Date.now() - startedAt);
    if (remainingMs <= 1500) {
      if (lastReason === "unknown") lastReason = "deadline_exceeded";
      break;
    }
    const maxOutputTokens = Math.min(20000, Math.round(baseTokens * (1 + 0.4 * truncationRetries)));
    const prompt = shortRetries > 0
      ? `${userPrompt}\n\n[재작성] 직전 응답이 목표 분량 ${targetChars}자에 크게 못 미쳤다. 같은 JSON 형식과 키를 그대로 유지하되, 각 필드의 근거와 사례를 더 구체적으로 풀어 다시 작성한다.`
      : userPrompt;
    try {
      const result = await requestOracleConsultationGeminiOnce({
        prompt,
        systemPrompt,
        env,
        fetchImpl,
        apiKey,
        maxOutputTokens,
        timeoutMs: remainingMs,
      });
      if (result.ok) {
        const chars = measureConsultationChars(result.consultation);
        if (chars >= minChars) return { ok: true, consultation: result.consultation, source: "llm" };
        // 목표에 못 미치면 보강 지시를 붙여 한 번 더 받아 본다. 매번 더 긴 쪽을 들고 간다.
        if (!shortConsultation || chars > measureConsultationChars(shortConsultation)) {
          shortConsultation = result.consultation;
        }
        lastReason = `too_short_${chars}_of_${minChars}`;
        shortRetries += 1;
        continue;
      }
      lastReason = result.reason;
      if (result.permanent || !isRetryableGeminiReason(result.reason)) break;
      if (/max_tokens|truncated/i.test(String(result.reason))) truncationRetries += 1;
      await sleep(GEMINI_RETRY_BACKOFF_MS[attempt] || 0);
    } catch (error) {
      lastReason = `fetch_error:${toText(error?.message) || "unknown"}`;
      await sleep(GEMINI_RETRY_BACKOFF_MS[attempt] || 0);
    }
  }

  // 🔴 짧아도 결과는 준다. 이미 결제가 끝난 사용자에게 "생성 실패" 화면보다 짧은 상담이 낫다.
  // source 로 구분해 두어 분량 미달이 실제로 얼마나 나는지 로그에 남는다.
  if (shortConsultation) {
    console.warn(`[oracle-consultation] short result kept: ${lastReason}`);
    return { ok: true, consultation: shortConsultation, source: "llm_short" };
  }

  console.warn(`[oracle-consultation] gemini fallback: ${lastReason}`);
  return { ok: false, reason: lastReason };
}
