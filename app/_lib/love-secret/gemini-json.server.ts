const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

type GenerateGeminiJsonInput = {
  systemPrompt: string;
  userPrompt: string;
  requestId: string;
  schemaName: string;
};

type GeminiCandidatePart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiCandidatePart[];
  };
};

type GeminiPayload = {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
    status?: string;
  };
};

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("Gemini JSON client is server-only.");
  }
}

function envText(name: string) {
  return String(process.env[name] || "").trim();
}

function getGeminiKeys() {
  return [
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINIF_API_KEY5,
    process.env.GEMINIF_API_KEY6,
    process.env.GEMINIF_API_KEY7,
    process.env.GEMINIF_API_KEY8,
  ]
    .map((key) => String(key || "").trim())
    .filter(Boolean);
}

function getGeminiModel() {
  return envText("LOVE_SECRET_GEMINI_MODEL")
    || envText("PREMIUM_GEMINI_MODEL")
    || envText("GEMINI_MODEL")
    || "gemini-2.5-flash";
}

function getTimeoutMs() {
  const value = Number(envText("LOVE_SECRET_GEMINI_TIMEOUT_MS") || envText("PREMIUM_GEMINI_TIMEOUT_MS") || 45000);
  return Number.isFinite(value) && value > 0 ? value : 45000;
}

function getRetryRounds() {
  const value = Number(envText("LOVE_SECRET_GEMINI_RETRIES") || envText("PREMIUM_GEMINI_RETRIES") || 2);
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.floor(value)) : 2;
}

function extractGeminiText(payload: GeminiPayload) {
  return String(payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("") || "").trim();
}

function stripJsonFence(text: string) {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseGeminiJson<T>(text: string, schemaName: string): T {
  const raw = stripJsonFence(text);
  const candidates = [
    raw,
    raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1),
    raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1),
  ].filter((candidate) => candidate && candidate.length > 1);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  throw new Error(`Gemini JSON parse failed for ${schemaName}.`);
}

async function fetchGeminiJsonOnce({
  key,
  model,
  systemPrompt,
  userPrompt,
  requestId,
  schemaName,
  timeoutMs,
}: GenerateGeminiJsonInput & {
  key: string;
  model: string;
  timeoutMs: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));

  try {
    const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: userPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          topP: 0.9,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as GeminiPayload;
    const text = extractGeminiText(payload);

    if (!response.ok) {
      const error = new Error(`Gemini request failed for ${schemaName} (${response.status}).`);
      Object.assign(error, { status: response.status, retryable: RETRYABLE_STATUS.has(response.status), requestId });
      throw error;
    }

    if (!text) {
      const error = new Error(`Gemini returned empty JSON for ${schemaName}.`);
      Object.assign(error, { retryable: true, requestId });
      throw error;
    }

    return text;
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      const timeoutError = new Error(`Gemini request timed out for ${schemaName}.`);
      Object.assign(timeoutError, { retryable: true, requestId });
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateGeminiJson<T>({
  systemPrompt,
  userPrompt,
  requestId,
  schemaName,
}: GenerateGeminiJsonInput): Promise<T> {
  assertServerRuntime();

  const keys = getGeminiKeys();
  if (keys.length === 0) {
    throw new Error("Gemini API keys are not configured on the server.");
  }

  const model = getGeminiModel();
  const timeoutMs = getTimeoutMs();
  const retryRounds = getRetryRounds();
  let lastError: unknown = null;

  for (let round = 0; round < retryRounds; round += 1) {
    for (const key of keys) {
      try {
        const text = await fetchGeminiJsonOnce({
          key,
          model,
          systemPrompt,
          userPrompt,
          requestId,
          schemaName,
          timeoutMs,
        });
        return parseGeminiJson<T>(text, schemaName);
      } catch (error) {
        lastError = error;
        if ((error as { retryable?: boolean })?.retryable !== true) {
          throw error;
        }
      }
    }
  }

  throw new Error(`Gemini JSON generation failed for ${schemaName}: ${lastError instanceof Error ? lastError.message : "unknown_error"}`);
}
