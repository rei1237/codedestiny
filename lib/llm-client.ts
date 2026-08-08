import { withLLMCache } from "./llm-cache.ts";
import type { LLMCacheConfig } from "./llm-cache.ts";
import { buildOutputLanguageDirective, toAiLocale } from "./i18n/ai-locale.js";

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  /**
   * 출력 언어. 비어 있으면 ko 로 간주해 프롬프트를 한 글자도 건드리지 않는다.
   * 워커 경로는 worker/lib/gemini.js 가 앰비언트 로케일을 채워 넣는다.
   */
  locale?: string;
  maxTokens?: number;
  temperature?: number;
  taskType?: "pdf" | "fortune" | "healing" | "general";
  model?: string;
  endpoint?: string;
  apiEndpoint?: string;
  timeoutMs?: number;
  fallbackToWorkersAI?: boolean;
  responseMimeType?: string;
  thinkingBudget?: number;
  geminiParts?: Array<{
    text?: string;
    inline_data?: {
      mime_type: string;
      data: string;
    };
  }>;
  logContext?: {
    requestId?: string;
    serviceId?: string;
    serviceType?: string;
    featureKey?: string;
    userIdHash?: string;
    profileIdPresent?: boolean;
    idempotencyKeyHash?: string;
    providerCallCount?: number;
    cacheHit?: boolean;
    duplicateBlocked?: boolean;
  };
  cache?: LLMCacheConfig;
}

/**
 * 한 번의 프로바이더 호출이 실제로 쓴 토큰. 비용은 출력이 입력의 8배 단가라
 * input/output 을 따로 봐야 어디를 줄일지 판단할 수 있다.
 * Workers AI 는 사용량을 안 주는 경우가 있어 그때는 문자수 기반 추정치에 estimated 를 세운다.
 */
export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  /** 프로바이더가 접두사 캐시로 할인해 준 입력 토큰(있을 때만). */
  cachedInputTokens?: number;
  /** thinking 토큰. 기본값 0(OFF)이라 평시 0이어야 한다 — 0이 아니면 어딘가 옵트인한 것이다. */
  thinkingTokens?: number;
  estimated?: boolean;
}

export interface LLMResponse {
  text: string;
  provider: "gemini" | "cloudflare";
  model: string;
  /** finishReason이 MAX_TOKENS면 true — 응답이 중간에 잘렸음을 의미. 호출부에서 재시도 판단. */
  truncated?: boolean;
  finishReason?: string;
  usage?: LLMUsage;
}

export interface CloudflareEnv {
  GEMINIF_API_KEY?: string;
  AI?: {
    run: (model: string, options: object) => Promise<unknown>;
  };
}

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const DEFAULT_TIMEOUT_MS = 30_000;

type GeminiPayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
  };
};

// 1순위는 캐노니컬 GEMINIF_API_KEY(문서 정책). 배포 시크릿이 표준 이름으로
// 남아 있어도 동작하도록 표준 키 이름을 폴백으로 함께 인식한다.
const GEMINI_KEY_ORDER = [
  "GEMINIF_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
] as const;

function readProcessGeminiKey(): string {
  if (typeof process === "undefined") return "";
  for (const key of GEMINI_KEY_ORDER) {
    const value = String(process.env?.[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function getGeminiApiKey(env?: CloudflareEnv): string {
  const envRecord = env as Record<string, unknown> | undefined;
  for (const key of GEMINI_KEY_ORDER) {
    const value = String(envRecord?.[key] || "").trim();
    if (value) return value;
  }
  return readProcessGeminiKey();
}

function normalizeRequest(request: LLMRequest): Required<Pick<LLMRequest, "prompt" | "taskType">> &
  Omit<LLMRequest, "prompt" | "taskType"> {
  return {
    ...request,
    prompt: String(request.prompt || "").trim(),
    taskType: request.taskType || "general",
  };
}

// 미지정=0(thinking OFF, 기본), -1=dynamic(Gemini가 결정), 그 외 음수=0, 양수=고정 예산.
function resolveThinkingBudget(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const floored = Math.floor(n);
  if (floored < 0) return -1;
  return floored;
}

function resolveGeminiModel(request: LLMRequest, env?: CloudflareEnv): string {
  const requested = String(request.model || "").trim();
  if (requested) return requested;

  const envModel = String(
    (env as Record<string, unknown> | undefined)?.["GEMINI_MODEL"] || "",
  ).trim();
  if (envModel) return envModel;

  return GEMINI_MODEL;
}

function resolveGeminiEndpoint(request: LLMRequest, model: string): string {
  const providedEndpoint = String(request.apiEndpoint || request.endpoint || "").trim();
  if (!providedEndpoint) return `${GEMINI_ENDPOINT}`;

  const safeModel = encodeURIComponent(String(model || GEMINI_MODEL).trim() || GEMINI_MODEL);
  const endpointWithModel = providedEndpoint.includes("/models/")
    ? providedEndpoint.replace(/\/models\/[^/?#\:]+(?=:generateContent|$)/, `/models/${safeModel}`)
    : `${providedEndpoint.replace(/\/$/, "")}/models/${safeModel}:generateContent`;

  if (endpointWithModel.includes(":generateContent")) return endpointWithModel;
  return `${endpointWithModel}:generateContent`;
}

function resolveTimeoutMs(timeoutMs: number | undefined): number {
  return Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0
    ? Number(timeoutMs)
    : DEFAULT_TIMEOUT_MS;
}

/**
 * 🔴 `env.AI.run` 은 AbortSignal 을 받는다는 보장이 없어 fetch 처럼 signal 로 끊을 수 없다.
 *    그래서 race 로 묶는다. 진 프라미스의 거부는 값으로 접어 unhandled rejection 을 막는다
 *    (Workers 런타임에서 처리되지 않은 거부는 요청을 통째로 죽일 수 있다).
 */
async function raceWithDeadline<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  const settled = promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ ok: "timeout" }>((resolve) => {
    timer = setTimeout(() => resolve({ ok: "timeout" }), timeoutMs);
  });
  try {
    const outcome = await Promise.race([settled, timeout]);
    if (outcome.ok === "timeout") {
      const timeoutError = new Error(timeoutMessage) as Error & { fallbackBudgetExhausted?: boolean };
      timeoutError.fallbackBudgetExhausted = true;
      throw timeoutError;
    }
    if (outcome.ok === false) throw outcome.error;
    return outcome.value;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function createTimeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS): {
  signal: AbortSignal;
  clear: () => void;
  timeoutMs: number;
} {
  const safeTimeoutMs = resolveTimeoutMs(timeoutMs);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), safeTimeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
    timeoutMs: safeTimeoutMs,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || "Unknown error");
}

function cleanLogValue(value: unknown, maxLength = 120): string {
  return String(value || "").trim().slice(0, maxLength);
}

function shouldLogProviderCall(env?: CloudflareEnv): boolean {
  const raw = String((env as Record<string, unknown> | undefined)?.["LLM_PROVIDER_CALL_LOG"] ?? "").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

function emitProviderCallLog(provider: LLMResponse["provider"], model: string, request: LLMRequest, env?: CloudflareEnv): void {
  if (!shouldLogProviderCall(env)) return;
  const context = request.logContext || {};
  console.info("[llm provider_call]", {
    action: "provider_call",
    provider,
    model: cleanLogValue(model, 120),
    taskType: cleanLogValue(request.taskType || "general", 40),
    requestId: cleanLogValue(context.requestId, 180),
    serviceId: cleanLogValue(context.serviceId || context.serviceType || context.featureKey, 80),
    userIdHash: cleanLogValue(context.userIdHash, 64),
    profileIdPresent: Boolean(context.profileIdPresent),
    idempotencyKeyHash: cleanLogValue(context.idempotencyKeyHash, 64),
    providerCallCount: Number(context.providerCallCount || 0) || undefined,
    cacheHit: Boolean(context.cacheHit),
    duplicateBlocked: Boolean(context.duplicateBlocked),
  });
}

function toTokenCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * 사용량을 안 주는 프로바이더(Workers AI 일부 모델)를 위한 보수적 추정.
 * 한국어는 대략 문자당 1토큰 안팎이라 4로 나누는 영어 기준 휴리스틱은 크게 과소평가한다.
 * 정확도가 목적이 아니라 "어느 라우트가 큰가"를 가르는 용도이므로 문자수/2 로 잡고 estimated 를 세운다.
 */
function estimateTokens(text: string): number {
  return Math.ceil(String(text || "").length / 2);
}

function extractGeminiUsage(payload: GeminiPayload): LLMUsage | undefined {
  const meta = payload.usageMetadata;
  if (!meta) return undefined;
  const inputTokens = toTokenCount(meta.promptTokenCount);
  const outputTokens = toTokenCount(meta.candidatesTokenCount);
  if (!inputTokens && !outputTokens) return undefined;
  const cachedInputTokens = toTokenCount(meta.cachedContentTokenCount);
  const thinkingTokens = toTokenCount(meta.thoughtsTokenCount);
  return {
    inputTokens,
    outputTokens,
    ...(cachedInputTokens ? { cachedInputTokens } : {}),
    ...(thinkingTokens ? { thinkingTokens } : {}),
  };
}

/**
 * 라우트별 토큰 사용량을 한 줄 구조화 로그로 남긴다.
 * scripts/report-llm-token-usage.mjs 가 이 줄을 파싱해 기능별 집계표를 만든다.
 * 로그 형식을 바꾸면 그 스크립트도 함께 고쳐야 한다.
 */
function emitTokenUsageLog(
  provider: LLMResponse["provider"],
  model: string,
  request: LLMRequest,
  usage: LLMUsage,
  env?: CloudflareEnv,
): void {
  if (!shouldLogProviderCall(env)) return;
  const context = request.logContext || {};
  console.info("[llm token_usage]", {
    action: "token_usage",
    provider,
    model: cleanLogValue(model, 120),
    taskType: cleanLogValue(request.taskType || "general", 40),
    serviceId: cleanLogValue(context.serviceId || context.serviceType || context.featureKey, 80),
    requestId: cleanLogValue(context.requestId, 180),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cachedInputTokens: usage.cachedInputTokens || 0,
    thinkingTokens: usage.thinkingTokens || 0,
    maxTokens: Number(request.maxTokens) || 0,
    estimated: Boolean(usage.estimated),
  });
}

function extractGeminiText(payload: GeminiPayload): string {
  const parts = payload.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => String(part.text || "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

type WorkersAiContent = string | Array<string | { text?: string }> | undefined;

function joinWorkersAiParts(content: WorkersAiContent): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (typeof part === "string" ? part : String(part?.text || "")))
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * Workers AI 응답 본문 추출.
 *
 * 🔴 모델 세대에 따라 응답 모양이 다르다. `@cf/meta/*` 는 `{ response: "..." }` 를 주지만
 *    `@cf/zai-org/*` 등 신세대 모델은 OpenAI 호환 `{ choices: [{ message: { content } }] }`
 *    를 준다. `choices` 경로가 없으면 그 모델의 응답은 전부 "빈 응답" 으로 실패한다.
 */
function extractWorkersAiText(result: unknown): string {
  if (!result) return "";
  if (typeof result === "string") return result.trim();
  const payload = result as {
    response?: string;
    text?: string;
    content?: WorkersAiContent;
    result?: { response?: string; text?: string; content?: string };
    output_text?: string;
    choices?: Array<{ message?: { content?: WorkersAiContent }; text?: string }>;
  };
  const choice = payload.choices?.[0];
  const choiceContent = choice?.message?.content;
  const candidates = [
    payload.response,
    typeof choiceContent === "string" ? choiceContent : "",
    choice?.text,
    payload.text,
    typeof payload.content === "string" ? payload.content : "",
    payload.result?.response,
    payload.result?.text,
    payload.result?.content,
    payload.output_text,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text) return text;
  }
  return joinWorkersAiParts(choiceContent) || joinWorkersAiParts(payload.content);
}

/**
 * Workers AI 폴백 모델 체인. 앞에서부터 시도해 첫 성공을 쓴다.
 *
 * 🔴 모델은 예고 없이 폐기된다. `@cf/meta/llama-3.1-8b-instruct` 와
 *    `@cf/moonshotai/kimi-k2.5` 는 **같은 날(2026-05-30) 폐기**됐고, 호출하면
 *    `5028: This model was deprecated` 로 즉시 실패한다. Gemini 가 살아 있는 동안은
 *    폴백이 안 쓰여서 아무도 모르다가, Gemini 가 죽는 순간 안전망이 통째로 없다는 게
 *    드러난다. 그래서 단일 모델이 아니라 **체인**으로 둔다 — 하나가 폐기돼도 다음이 받는다.
 *
 * 1차 `@cf/zai-org/glm-4.7-flash`: 컨텍스트 131k, `response_format` 지원,
 *    출력 단가 $0.40/M (2차 70B 의 $2.25/M 대비 5.6배 저렴).
 * 2차 `@cf/meta/llama-3.3-70b-instruct-fp8-fast`: 종전 기본값. 검증된 최후 안전망이지만
 *    컨텍스트가 24k 라 장문 프롬프트는 못 받고, 장문 지시에도 840 토큰에서 스스로 멈춘다.
 *
 * env 로 덮을 수 있게 둔다 — 다음에 또 폐기되면 배포 없이 vars 로 넘길 수 있어야 한다.
 * 쉼표로 여러 개를 주면 그 순서가 체인이 된다.
 */
const DEFAULT_WORKERS_AI_MODELS = [
  "@cf/zai-org/glm-4.7-flash",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
];

function pickWorkersAiModels(taskType: LLMRequest["taskType"], env?: CloudflareEnv): string[] {
  const envRecord = env as Record<string, unknown> | undefined;
  const key = taskType === "pdf" ? "WORKERS_AI_PDF_MODEL" : "WORKERS_AI_MODEL";
  const override = String(envRecord?.[key] || envRecord?.["WORKERS_AI_MODEL"] || "").trim();
  const overrideModels = override
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return overrideModels.length ? overrideModels : DEFAULT_WORKERS_AI_MODELS;
}

/**
 * Workers AI 는 모델마다 입력 스키마가 다르다.
 *
 * `@cf/meta/*` 의 JSON Mode 는 `response_format: { type: "json_schema", json_schema }` 로
 * **스키마를 요구**하는데 우리 라우트에는 스키마가 없다. 그래서 meta 계열에는 붙이지 않고
 * 종전대로 프롬프트에만 의존한다(코드펜스 정화는 structured-consultation.js 가 담당).
 * OpenAI 호환 스키마를 쓰는 모델에는 `json_object` 를 붙여 애초에 순수 JSON 을 받는다.
 */
function buildWorkersAiInput(
  model: string,
  normalized: ReturnType<typeof normalizeRequest>,
  messages: Array<{ role: string; content: string }>,
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    messages,
    max_tokens: normalized.maxTokens,
    temperature: normalized.temperature,
  };
  if (normalized.responseMimeType === "application/json" && !model.startsWith("@cf/meta/")) {
    input.response_format = { type: "json_object" };
  }
  return input;
}

async function callGeminiPrimary(
  request: LLMRequest,
  env?: CloudflareEnv,
  attemptTimeoutMs?: number,
): Promise<LLMResponse> {
  const normalized = normalizeRequest(request);
  if (!normalized.prompt) throw new Error("LLM prompt is empty.");

  const apiKey = getGeminiApiKey(env);
  if (!apiKey) throw new Error("Gemini API key is not configured.");
  const model = resolveGeminiModel(normalized, env);
  const endpoint = resolveGeminiEndpoint(normalized, model);

  const parts = Array.isArray(normalized.geminiParts) && normalized.geminiParts.length
    ? normalized.geminiParts
    : [{ text: normalized.prompt }];

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      maxOutputTokens: normalized.maxTokens,
      temperature: normalized.temperature,
      ...(normalized.responseMimeType ? { responseMimeType: normalized.responseMimeType } : {}),
      // gemini-2.5는 thinking이 기본 ON이라 thinking 토큰이 maxOutputTokens를 잠식해
      // 긴 JSON/프로즈가 잘리거나 빈 응답이 된다. 공통 경로 기본값을 OFF(0)로 둔다.
      // 호출부에서 thinkingBudget:-1(dynamic) 또는 양수로 옵트인 가능.
      thinkingConfig: { thinkingBudget: resolveThinkingBudget(normalized.thinkingBudget) },
    },
  };

  if (normalized.systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: normalized.systemPrompt }],
    };
  }

  const timeout = createTimeoutSignal(
    Number.isFinite(attemptTimeoutMs) ? attemptTimeoutMs : normalized.timeoutMs,
  );
  try {
    const endpointUrl = endpoint.startsWith("https://") || endpoint.startsWith("http://")
      ? new URL(endpoint)
      : new URL(endpoint, "https://generativelanguage.googleapis.com");
    endpointUrl.searchParams.set("key", apiKey);

    emitProviderCallLog("gemini", model, normalized, env);
    const response = await fetch(endpointUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: timeout.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as GeminiPayload;
    if (!response.ok) {
      const requestError = new Error(payload.error?.message || `Gemini request failed (${response.status}).`);
      (requestError as { status?: number }).status = response.status;
      throw requestError;
    }

    const text = extractGeminiText(payload);
    if (!text) throw new Error("Gemini returned an empty response.");

    const finishReason = String(payload.candidates?.[0]?.finishReason || "").trim();
    const truncated = finishReason === "MAX_TOKENS";
    if (truncated) {
      console.warn("[llm truncated]", {
        model,
        taskType: normalized.taskType,
        maxTokens: normalized.maxTokens,
        serviceId: normalized.logContext?.serviceId,
        requestId: normalized.logContext?.requestId,
      });
    }

    const usage = extractGeminiUsage(payload)
      || { inputTokens: estimateTokens(normalized.prompt), outputTokens: estimateTokens(text), estimated: true };
    emitTokenUsageLog("gemini", model, normalized, usage, env);

    return {
      text,
      provider: "gemini",
      model,
      truncated,
      ...(finishReason ? { finishReason } : {}),
      usage,
    };
  } catch (error) {
    if (timeout.signal.aborted) throw new Error(`Gemini request timed out after ${timeout.timeoutMs}ms.`);
    throw error;
  } finally {
    timeout.clear();
  }
}

async function callCloudflareWorkersAI(
  request: LLMRequest,
  env?: CloudflareEnv,
  deadlineAt?: number,
): Promise<LLMResponse> {
  const normalized = normalizeRequest(request);
  if (!normalized.prompt) throw new Error("LLM prompt is empty.");

  if (!env?.AI?.run) {
    throw new Error("Cloudflare Workers AI binding is not configured. Pass env.AI in Workers or Pages runtime.");
  }

  const models = pickWorkersAiModels(normalized.taskType, env);
  const messages = [
    ...(normalized.systemPrompt
      ? [{ role: "system", content: normalized.systemPrompt }]
      : []),
    { role: "user", content: normalized.prompt },
  ];

  const failures: string[] = [];
  // 🔴 폴백 체인에도 시간 상한을 준다. 이게 없던 동안 한 호출의 실제 상한은 "timeoutMs"가 아니라
  //    "timeoutMs(Gemini) + 무제한(폴백 모델 2개 순차)"이었고, Gemini 가 죽는 순간에만 드러나
  //    평소 계측으로는 잡히지 않았다. 엣지(100초)가 요청을 끊으면 라우트의 실패 처리·정리 코드가
  //    아예 돌지 못한다. 예산은 호출자가 준 timeoutMs 를 **체인 전체**에 배분한다 — 폐기 모델은
  //    빠르게 실패하므로(5028) 체인의 목적인 폐기 대응은 그대로 유지된다.
  // deadlineAt 은 callLLMUncached 가 Gemini 단계와 공유해서 넘긴다 — 여기서 새로 시계를
  // 만들면 Gemini 재시도가 이미 쓴 시간을 무시하고 timeoutMs 를 통째로 다시 배정하게 된다.
  const chainDeadlineAt = Number.isFinite(deadlineAt)
    ? (deadlineAt as number)
    : Date.now() + resolveTimeoutMs(normalized.timeoutMs);
  let fallbackBudgetExhausted = false;
  for (const model of models) {
    const remainingMs = chainDeadlineAt - Date.now();
    if (fallbackBudgetExhausted || remainingMs <= 0) {
      failures.push(`${model}: skipped (fallback budget exhausted)`);
      continue;
    }
    try {
      emitProviderCallLog("cloudflare", model, normalized, env);
      const result = await raceWithDeadline(
        Promise.resolve(env.AI.run(model, buildWorkersAiInput(model, normalized, messages))),
        remainingMs,
        `Cloudflare Workers AI (${model}) timed out after ${remainingMs}ms.`,
      );

      const text = extractWorkersAiText(result);
      if (!text) throw new Error("Cloudflare Workers AI returned an empty response.");

      // Workers AI 는 사용량 필드를 안 주는 모델이 있어 문자수 기반 추정으로 통일한다.
      const usage: LLMUsage = {
        inputTokens: estimateTokens(normalized.systemPrompt || "") + estimateTokens(normalized.prompt),
        outputTokens: estimateTokens(text),
        estimated: true,
      };
      emitTokenUsageLog("cloudflare", model, normalized, usage, env);

      return {
        text,
        provider: "cloudflare",
        model,
        usage,
      };
    } catch (error) {
      // 폐기(5028)·스키마 거부·빈 응답 — 사유를 가리지 않고 다음 모델로 넘긴다.
      // 마지막 모델까지 실패하면 사유를 전부 합쳐 올린다.
      failures.push(`${model}: ${getErrorMessage(error)}`);
      if ((error as Error & { fallbackBudgetExhausted?: boolean }).fallbackBudgetExhausted) {
        fallbackBudgetExhausted = true;
      }
    }
  }

  throw new Error(`Cloudflare Workers AI failed. ${failures.join(" | ")}`);
}

// 일시적 장애(429/5xx/overloaded/빈 응답)만 재시도 대상. 타임아웃은 이미 시간
// 예산을 소진했고 장문 생성은 재시도 시 런타임 한도를 넘길 수 있어 제외한다.
// 키 미설정/400·403·404는 재시도해도 성공하지 않으므로 제외한다.
function isTransientGeminiError(error: unknown): boolean {
  const status = Number((error as { status?: number })?.status || 0);
  if (status === 429 || (status >= 500 && status <= 599)) return true;
  const message = getErrorMessage(error).toLowerCase();
  if (message.includes("timed out")) return false;
  return message.includes("overloaded") || message.includes("empty response") || message.includes("try again later");
}

const GEMINI_RETRY_BACKOFF_MS = [400, 900] as const;

// deadlineAt 이 없으면(직접 호출 등) request.timeoutMs 기준으로 새로 계산한다 — callLLMUncached
// 를 거치는 정상 경로에서는 항상 공유 deadlineAt 이 전달되므로 이 분기는 방어적 기본값이다.
async function callGeminiWithRetry(
  request: LLMRequest,
  env?: CloudflareEnv,
  deadlineAt?: number,
): Promise<LLMResponse> {
  const effectiveDeadlineAt = Number.isFinite(deadlineAt)
    ? (deadlineAt as number)
    : Date.now() + resolveTimeoutMs(request.timeoutMs);
  const maxAttempts = GEMINI_RETRY_BACKOFF_MS.length + 1;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remainingMs = effectiveDeadlineAt - Date.now();
    if (remainingMs <= 0) {
      throw lastError || new Error("Gemini call skipped: timeout budget exhausted before attempt.");
    }
    try {
      return await callGeminiPrimary(request, env, remainingMs);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isTransientGeminiError(error)) throw error;
      const backoffMs = GEMINI_RETRY_BACKOFF_MS[attempt - 1];
      if (effectiveDeadlineAt - Date.now() - backoffMs <= 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw lastError;
}

async function callLLMUncached(
  request: LLMRequest,
  env?: CloudflareEnv,
): Promise<LLMResponse> {
  const requestModel = resolveGeminiModel(request, env);
  // Gemini 시도(재시도 포함) + Workers AI 폴백 전체가 이 하나의 시계를 공유한다 — 각 단계가
  // timeoutMs 를 독자적으로 다시 배정하면 총 소요시간이 호출자가 준 예산을 넘어 엣지 실행
  // 한도에 걸리고, 그 경우 앱 자체 에러 응답도 환불 처리도 돌지 못한 채 연결이 끊긴다.
  const deadlineAt = Date.now() + resolveTimeoutMs(request.timeoutMs);
  try {
    return await callGeminiWithRetry(request, env, deadlineAt);
  } catch (geminiError) {
    if (request.fallbackToWorkersAI === false) {
      throw geminiError;
    }

    console.warn("[llm-client] Gemini primary failed. Falling back to Cloudflare Workers AI.", {
      error: getErrorMessage(geminiError),
      model: requestModel,
      apiEndpoint: String(request?.apiEndpoint || request?.endpoint || ""),
      taskType: request.taskType || "general",
    });

    try {
      return await callCloudflareWorkersAI(request, env, deadlineAt);
    } catch (cloudflareError) {
      throw new Error(
        `LLM request failed. Gemini: ${getErrorMessage(geminiError)}; Cloudflare Workers AI: ${getErrorMessage(
          cloudflareError,
        )}`,
      );
    }
  }
}

/**
 * 출력 언어 지시를 프롬프트에 심는다.
 *
 * 🔴 systemPrompt 에 넣는 것이 핵심이다. llm-cache 의 buildCacheKey 가 systemPrompt 를
 *    해시에 포함하므로 캐시가 언어별로 자동 분리된다(스토어 스키마 변경 0). 프롬프트 밖
 *    옵션으로만 두면 ko 응답이 en 사용자에게 캐시 히트한다.
 *    또 callCloudflareWorkersAI 가 systemPrompt 를 role:"system" 으로 넘기므로 폴백도 함께 커버된다.
 *
 * 🔴 prompt 꼬리에도 붙인다. 기존 "한국어로 작성하세요" 지시문 다수가 user 프롬프트 본문
 *    안에 있고, 모델은 user 턴의 마지막 지시를 강하게 가중한다.
 */
function applyOutputLocale(request: LLMRequest): LLMRequest {
  const directive = buildOutputLanguageDirective(toAiLocale(request.locale));
  if (!directive) return request; // ko — 기존 트래픽 100% 보존
  return {
    ...request,
    systemPrompt: [request.systemPrompt || "", directive].filter(Boolean).join("\n\n"),
    prompt: `${request.prompt}\n\n${directive}`,
  };
}

export async function callLLM(
  request: LLMRequest,
  env?: CloudflareEnv,
): Promise<LLMResponse> {
  const localized = applyOutputLocale(request);
  if (localized.cache?.store) {
    return withLLMCache(localized, (req) => callLLMUncached(req, env), localized.cache);
  }
  return callLLMUncached(localized, env);
}
