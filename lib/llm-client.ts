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

export interface LLMResponse {
  text: string;
  provider: "gemini" | "cloudflare";
  model: string;
  /** finishReason이 MAX_TOKENS면 true — 응답이 중간에 잘렸음을 의미. 호출부에서 재시도 판단. */
  truncated?: boolean;
  finishReason?: string;
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

function createTimeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS): {
  signal: AbortSignal;
  clear: () => void;
  timeoutMs: number;
} {
  const safeTimeoutMs = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0
    ? Number(timeoutMs)
    : DEFAULT_TIMEOUT_MS;
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

function extractGeminiText(payload: GeminiPayload): string {
  const parts = payload.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => String(part.text || "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractWorkersAiText(result: unknown): string {
  if (!result) return "";
  if (typeof result === "string") return result.trim();
  const payload = result as {
    response?: string;
    text?: string;
    content?: string | Array<string | { text?: string }>;
    result?: { response?: string; text?: string; content?: string };
    output_text?: string;
  };
  const candidates = [
    payload.response,
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
  if (Array.isArray(payload.content)) {
    return payload.content
      .map((part) => (typeof part === "string" ? part : String(part?.text || "")))
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

/**
 * Workers AI 폴백 모델.
 *
 * 🔴 `@cf/meta/llama-3.1-8b-instruct` 는 2026-05-30 자로 Cloudflare 에서 **폐기**됐다.
 *    호출하면 `5028: This model was deprecated on 2026-05-30.` 로 즉시 실패한다.
 *    Gemini 가 살아 있을 때는 폴백이 안 쓰여서 아무도 몰랐고, Gemini 가 죽는 순간
 *    안전망이 통째로 없다는 게 드러났다.
 *
 * 모델 이름을 코드에 못 박지 않고 env 로 덮을 수 있게 둔다 — 다음에 또 폐기되면
 * 배포 없이 `wrangler secret`/vars 로 넘길 수 있어야 한다.
 */
const DEFAULT_WORKERS_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

function pickWorkersAiModel(taskType: LLMRequest["taskType"], env?: CloudflareEnv): string {
  const envRecord = env as Record<string, unknown> | undefined;
  const key = taskType === "pdf" ? "WORKERS_AI_PDF_MODEL" : "WORKERS_AI_MODEL";
  const override = String(envRecord?.[key] || envRecord?.["WORKERS_AI_MODEL"] || "").trim();
  return override || DEFAULT_WORKERS_AI_MODEL;
}

async function callGeminiPrimary(
  request: LLMRequest,
  env?: CloudflareEnv,
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

  const timeout = createTimeoutSignal(normalized.timeoutMs);
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

    return {
      text,
      provider: "gemini",
      model,
      truncated,
      ...(finishReason ? { finishReason } : {}),
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
): Promise<LLMResponse> {
  const normalized = normalizeRequest(request);
  if (!normalized.prompt) throw new Error("LLM prompt is empty.");

  if (!env?.AI?.run) {
    throw new Error("Cloudflare Workers AI binding is not configured. Pass env.AI in Workers or Pages runtime.");
  }

  const model = pickWorkersAiModel(normalized.taskType, env);
  const messages = [
    ...(normalized.systemPrompt
      ? [{ role: "system", content: normalized.systemPrompt }]
      : []),
    { role: "user", content: normalized.prompt },
  ];

  emitProviderCallLog("cloudflare", model, normalized, env);
  const result = await env.AI.run(model, {
    messages,
    max_tokens: normalized.maxTokens,
    temperature: normalized.temperature,
  });

  const text = extractWorkersAiText(result);
  if (!text) throw new Error("Cloudflare Workers AI returned an empty response.");

  return {
    text,
    provider: "cloudflare",
    model,
  };
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

async function callGeminiWithRetry(
  request: LLMRequest,
  env?: CloudflareEnv,
): Promise<LLMResponse> {
  const maxAttempts = GEMINI_RETRY_BACKOFF_MS.length + 1;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await callGeminiPrimary(request, env);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isTransientGeminiError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_BACKOFF_MS[attempt - 1]));
    }
  }
  throw lastError;
}

async function callLLMUncached(
  request: LLMRequest,
  env?: CloudflareEnv,
): Promise<LLMResponse> {
  const requestModel = resolveGeminiModel(request, env);
  try {
    return await callGeminiWithRetry(request, env);
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
      return await callCloudflareWorkersAI(request, env);
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
