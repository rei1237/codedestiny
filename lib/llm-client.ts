import { withLLMCache } from "./llm-cache";
import type { LLMCacheConfig } from "./llm-cache";

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
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

const GEMINI_KEY_ORDER = [
  "GEMINIF_API_KEY",
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
  for (const key of GEMINI_KEY_ORDER) {
    const value = String(env?.[key] || "").trim();
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

function pickWorkersAiModel(taskType: LLMRequest["taskType"]): string {
  if (taskType === "pdf") return "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  return "@cf/meta/llama-3.1-8b-instruct";
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
      throw new Error(payload.error?.message || `Gemini request failed (${response.status}).`);
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

  const model = pickWorkersAiModel(normalized.taskType);
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

async function callLLMUncached(
  request: LLMRequest,
  env?: CloudflareEnv,
): Promise<LLMResponse> {
  const requestModel = resolveGeminiModel(request, env);
  try {
    return await callGeminiPrimary(request, env);
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

export async function callLLM(
  request: LLMRequest,
  env?: CloudflareEnv,
): Promise<LLMResponse> {
  if (request.cache?.store) {
    return withLLMCache(request, (req) => callLLMUncached(req, env), request.cache);
  }
  return callLLMUncached(request, env);
}
