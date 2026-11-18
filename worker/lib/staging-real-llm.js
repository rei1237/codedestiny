/**
 * 스테이징 허용 계정 실호출 라우팅 (2026-11-18 사용자 결정).
 *
 * 왜: 스테이징은 LLM 을 전부 mock 으로 막아 두어서, 실제 생성 경로의 결함이 운영에 올라간 뒤에야 드러났다.
 *     사용자 결정 원문 — "허용 계정만 실호출 (추천)", "운영과 같은 키". 그래서 스테이징 워커에 운영과 같은
 *     GEMINIF_API_KEY 를 `--only-key` 로만 올리고, 그 키는 **허용 계정 요청에만** 보이게 한다.
 *
 * 동작 (스테이징에서만, 프로덕션은 같은 env 객체를 그대로 넘기는 no-op):
 *   - 허용 계정(STAGING_REAL_LLM_USER_IDS 시크릿, 24자리 hex ObjectId CSV) → 운영과 같은 LLM 플래그 view.
 *     실제 Gemini + Workers AI 폴백. APP_ENV 는 staging 그대로라 결제 1,000원 테스트 금액 등은 유지된다.
 *   - 그 밖의 모든 요청(게스트·비허용 계정·토스 네이티브 토큰·OPTIONS·queue·scheduled) → 키를 지운 view.
 *     오늘과 똑같이 mock 이다.
 *
 * 🔴 fail-closed 규칙
 *   - 허용목록에 형식이 틀린 항목이 하나라도 있으면 목록 전체를 무효로 본다(전원 mock).
 *   - 기반 env 에 Gemini 키가 없으면 허용 계정도 mock 이다. 키 없이 운영 플래그를 주면 lib/llm-client.ts
 *     폴백이 모든 호출을 과금 Workers AI 로 내려보낸다.
 *   - 사용자 식별(peek)이 실패하거나 던지면 mock 이다. peek 은 공급자 선택에만 쓰고 권한 판정에는 쓰지 않는다.
 *   - nodejs_compat 은 시크릿을 isolate 전역 process.env 에도 채운다. getEnv·llm-client·타로 키 리더가 env 에
 *     값이 없으면 process.env 로 넘어가므로, 스테이징에서는 진입마다 process.env 의 LLM 키를 "" 로 덮는다.
 *     "" 는 db.js installProcessEnv(undefined 일 때만 채움)가 허용 view 의 키를 다시 전역에 심는 것도 막는다.
 *     허용 view 는 env 바인딩에서 직접 키를 읽으므로 전역을 지워도 동작한다.
 *
 * 범위 밖(보고만): 영냥이 큐(worker/yeongnyangi/queue.js)는 배치 전체를 mock view 로 받는다. 행마다
 * stagingLlmEnvForUser(env, row.userId) 를 쓰도록 바꾸면 허용 계정의 장(chapter) 생성도 실호출이 된다.
 */

export const STAGING_REAL_LLM_ALLOWLIST_KEY = "STAGING_REAL_LLM_USER_IDS";

// lib/llm-client.ts GEMINI_KEY_ORDER 와 같은 순서. 허용 계정 실호출의 전제(키 존재) 판정에 쓴다.
const GEMINI_KEY_NAMES = Object.freeze(["GEMINIF_API_KEY", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"]);

/**
 * 비허용 스테이징 요청에서 지우는 과금 LLM 자격증명 이름. 정규화 이름(대소문자·구분자 무시)으로 비교한다 —
 * worker/lib/env.js 의 getEnv 가 정규화 이름으로도 찾기 때문이다.
 * 출처: llm-client GEMINI_KEY_ORDER · config/env.contract.json aliases(GOOGLE_API_KEY) ·
 *       worker/routes/sukuyo.js hasSukyoAIProviderEnv · scripts/lib/staging-secret-policy.mjs(ANTHROPIC).
 */
export const STAGING_MASKED_LLM_KEY_NAMES = Object.freeze([
  ...GEMINI_KEY_NAMES,
  "GOOGLE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "AI_GATEWAY_TOKEN",
]);

/**
 * 허용 계정 view 가 덮어쓰는 값 = 프로덕션 worker/wrangler.toml 의 값. 스테이징 [vars] 에서 LLM 에 영향을 주는
 * 차이는 이 넷이 전부다(scripts/verify-staging-llm-mock.mjs 가 두 toml 을 대조해 미분류 차이를 실패시킨다).
 * STAGING_LLM_MOCK_ENABLED 는 프로덕션에 없는 키라 "false"(꺼짐)로 둔다.
 */
export const PRODUCTION_LLM_FLAGS = Object.freeze({
  STAGING_LLM_MOCK_ENABLED: "false",
  WORKERS_AI_ENABLED: "true",
  GUARDIAN_FORTUNE_LLM_PROVIDER: "gemini",
  ENABLE_FUSION_FORTUNE_MOCK_FLOW: "false",
});

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/;

function normalizeKeyName(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

const MASKED_NORMALIZED = new Set(STAGING_MASKED_LLM_KEY_NAMES.map(normalizeKeyName));
const ALLOWLIST_NORMALIZED = normalizeKeyName(STAGING_REAL_LLM_ALLOWLIST_KEY);

function isMaskedKeyName(name) {
  const normalized = normalizeKeyName(name);
  return MASKED_NORMALIZED.has(normalized) || normalized === ALLOWLIST_NORMALIZED;
}

// view → 기반 env. view 를 다시 넘겨받아도 기반에서 판정해야 키가 없는 view 로 운영 플래그를 만들지 않는다.
const viewBase = new WeakMap();
const maskedViews = new WeakMap();
const productionViews = new WeakMap();

function baseOf(env) {
  return (env && typeof env === "object" && viewBase.get(env)) || env;
}

/** APP_ENV 가 staging 인 워커인가. 프로덕션 워커에는 APP_ENV 자체가 없다. */
export function isStagingWorkerEnv(env) {
  const base = baseOf(env);
  if (!base || typeof base !== "object") return false;
  return String(base.APP_ENV || "").trim().toLowerCase() === "staging";
}

function hasGeminiKey(base) {
  return GEMINI_KEY_NAMES.some((name) => String(base?.[name] ?? "").trim().length > 0);
}

let warnedRaw = null;
let parsedRaw = null;
let parsedSet = new Set();

/**
 * 허용목록 CSV(쉼표·공백 구분)를 소문자 ObjectId 집합으로 읽는다. 항목 하나라도 형식이 틀리면 빈 집합(fail-closed).
 */
export function parseStagingRealLlmAllowlist(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text === parsedRaw) return parsedSet;
  const tokens = text ? text.split(/[\s,]+/).filter(Boolean).map((token) => token.toLowerCase()) : [];
  const valid = tokens.every((token) => OBJECT_ID_PATTERN.test(token));
  parsedRaw = text;
  parsedSet = valid ? new Set(tokens) : new Set();
  if (!valid && warnedRaw !== text) {
    warnedRaw = text;
    // 값은 찍지 않는다(계정 식별자). 개수만 남긴다.
    console.warn("[staging-real-llm] STAGING_REAL_LLM_USER_IDS 형식 오류 — 목록 전체를 무시하고 전원 mock 으로 둔다.", { entries: tokens.length });
  }
  return parsedSet;
}

function allowlistOf(base) {
  return parseStagingRealLlmAllowlist(base?.[STAGING_REAL_LLM_ALLOWLIST_KEY]);
}

/** 스테이징이고 userId 가 허용목록에 있는가. 프로덕션·게스트·형식 오류는 전부 false. */
export function isStagingRealLlmUser(env, userId) {
  const base = baseOf(env);
  if (!isStagingWorkerEnv(base)) return false;
  const id = String(userId ?? "").trim().toLowerCase();
  if (!OBJECT_ID_PATTERN.test(id)) return false;
  return allowlistOf(base).has(id);
}

function copyWithout(base) {
  const view = {};
  for (const [name, value] of Object.entries(base)) {
    if (isMaskedKeyName(name)) continue;
    view[name] = value;
  }
  return view;
}

/** 비허용 스테이징 view: 과금 LLM 키와 허용목록을 뺀 사본(오늘의 스테이징과 같다). 프로덕션은 그대로 돌려준다. */
export function maskStagingLlmEnv(env) {
  const base = baseOf(env);
  if (!isStagingWorkerEnv(base)) return env;
  let view = maskedViews.get(base);
  if (!view) {
    view = copyWithout(base);
    maskedViews.set(base, view);
    viewBase.set(view, base);
  }
  return view;
}

/**
 * 허용 계정 view: 기반 env(키 포함)에 운영 LLM 플래그를 덮는다. 허용목록 값은 뺀다.
 * 프로덕션은 그대로, 기반에 Gemini 키가 없으면 mock view 를 돌려준다(fail-closed).
 */
export function withProductionLlmEnv(env) {
  const base = baseOf(env);
  if (!isStagingWorkerEnv(base)) return env;
  if (!hasGeminiKey(base)) return maskStagingLlmEnv(base);
  let view = productionViews.get(base);
  if (!view) {
    view = { ...base, ...PRODUCTION_LLM_FLAGS };
    delete view[STAGING_REAL_LLM_ALLOWLIST_KEY];
    productionViews.set(base, view);
    viewBase.set(view, base);
  }
  return view;
}

/** 사용자 한 명에 맞는 env. 큐 행처럼 진입 뒤에 사용자를 알게 되는 곳에서 쓴다(넘겨받은 view 도 받는다). */
export function stagingLlmEnvForUser(env, userId) {
  const base = baseOf(env);
  if (!isStagingWorkerEnv(base)) return env;
  return isStagingRealLlmUser(base, userId) ? withProductionLlmEnv(base) : maskStagingLlmEnv(base);
}

/** process.env(isolate 전역)의 LLM 키를 "" 로 덮는다. 스테이징에서만. */
export function scrubStagingProcessEnvLlmKeys(env) {
  if (!isStagingWorkerEnv(env)) return;
  const processEnv = globalThis.process?.env;
  if (!processEnv || typeof processEnv !== "object") return;
  for (const name of STAGING_MASKED_LLM_KEY_NAMES) processEnv[name] = "";
  for (const name of Object.keys(processEnv)) {
    if (isMaskedKeyName(name) && processEnv[name] !== "") processEnv[name] = "";
  }
  processEnv[STAGING_REAL_LLM_ALLOWLIST_KEY] = "";
}

async function defaultPeekUserId(request, env) {
  const { peekAccessTokenUserId } = await import("./auth.js");
  return peekAccessTokenUserId(request, env);
}

async function routeStagingEntry(name, handler, handlers, input, env, rest, peekUserId) {
  scrubStagingProcessEnvLlmKeys(env);
  let routed = maskStagingLlmEnv(env);
  const isFetch = name === "fetch" && input && typeof input === "object";
  const method = isFetch ? String(input.method || "").toUpperCase() : "";
  if (isFetch && method !== "OPTIONS" && allowlistOf(baseOf(env)).size > 0 && hasGeminiKey(baseOf(env))) {
    try {
      routed = stagingLlmEnvForUser(env, await peekUserId(input, env));
    } catch {
      routed = maskStagingLlmEnv(env);
    }
  }
  return handler.call(handlers, input, routed, ...rest);
}

/**
 * 워커 진입(fetch·queue·scheduled) 전부를 감싼다. 프로덕션은 같은 env 를 동기로 그대로 넘긴다.
 * fetch 만 사용자별로 고르고 queue·scheduled 는 항상 mock view 다.
 * ctx.waitUntil 작업과 스트리밍 본문도 핸들러가 받은 env(view)를 그대로 잡으므로 같은 판정을 따른다.
 */
export function withStagingLlmRouting(handlers, options = {}) {
  const peekUserId = typeof options.peekUserId === "function" ? options.peekUserId : defaultPeekUserId;
  return Object.fromEntries(Object.entries(handlers).map(([name, handler]) => {
    if (typeof handler !== "function") return [name, handler];
    return [name, (input, env, ...rest) => {
      if (!isStagingWorkerEnv(env)) return handler.call(handlers, input, env, ...rest);
      return routeStagingEntry(name, handler, handlers, input, env, rest, peekUserId);
    }];
  }));
}
