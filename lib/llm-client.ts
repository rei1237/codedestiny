export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  taskType?: "pdf" | "fortune" | "healing" | "general";
  geminiParts?: Array<{
    text?: string;
    inline_data?: {
      mime_type: string;
      data: string;
    };
  }>;
}

export interface LLMResponse {
  text: string;
  provider: "gemini" | "cloudflare";
  model: string;
}

export interface CloudflareEnv {
  GEMINIF_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_GEMINI_API_KEY?: string;
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
  }>;
  error?: {
    message?: string;
  };
};

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

function createTimeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS): {
  signal: AbortSignal;
  clear: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || "Unknown error");
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

  const parts = Array.isArray(normalized.geminiParts) && normalized.geminiParts.length
    ? normalized.geminiParts
    : [{ text: normalized.prompt }];

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      maxOutputTokens: normalized.maxTokens,
      temperature: normalized.temperature,
    },
  };

  if (normalized.systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: normalized.systemPrompt }],
    };
  }

  const timeout = createTimeoutSignal();
  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
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

    return {
      text,
      provider: "gemini",
      model: GEMINI_MODEL,
    };
  } catch (error) {
    if (timeout.signal.aborted) throw new Error("Gemini request timed out after 30000ms.");
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

export async function callLLM(
  request: LLMRequest,
  env?: CloudflareEnv,
): Promise<LLMResponse> {
  try {
    return await callGeminiPrimary(request, env);
  } catch (geminiError) {
    console.warn("[llm-client] Gemini primary failed. Falling back to Cloudflare Workers AI.", {
      error: getErrorMessage(geminiError),
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
