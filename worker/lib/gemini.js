const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
import { getEnv } from "./env.js";

function clean(value) {
  return String(value || "").trim();
}

function isUsable(value) {
  const normalized = clean(value).toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("change_me")) return false;
  if (normalized.includes("placeholder")) return false;
  if (normalized.includes("your_")) return false;
  if (normalized.includes("example")) return false;
  return true;
}

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const item = clean(value);
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function pickGeminiKeys(env, preferredEnvKeys = []) {
  const preferred = preferredEnvKeys.map((key) => getEnv(env, key));
  return unique([
    ...preferred,
    getEnv(env, "PREMIUM_GEMINI_API_KEY1"),
    getEnv(env, "PREMIUM_GEMINI_API_KEY2"),
    getEnv(env, "PREMIUM_GEMINI_API_KEY3"),
    getEnv(env, "PREMIUM_GEMINI_API_KEY4"),
    getEnv(env, "GEMINIF_API_KEY1"),
    getEnv(env, "GEMINIF_API_KEY2"),
    getEnv(env, "GEMINIF_API_KEY3"),
    getEnv(env, "GEMINIF_API_KEY4"),
    getEnv(env, "GEMINI_API_KEY"),
    getEnv(env, "GOOGLE_GEMINI_API_KEY"),
    getEnv(env, "GOOGLE_GENERATIVE_AI_API_KEY"),
    getEnv(env, "GOOGLE_AI_API_KEY"),
    getEnv(env, "GOOGLE_API_KEY"),
  ].filter(isUsable));
}

export function pickGeminiModels(env, preferredEnvKeys = []) {
  const preferred = preferredEnvKeys.map((key) => clean(getEnv(env, key))).filter(Boolean);
  const defaults = [
    clean(getEnv(env, "GEMINI_MODEL")),
    clean(getEnv(env, "VERTEX_GEMINI_MODEL")),
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];
  return unique([...preferred, ...defaults]);
}

export function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => clean(part?.text)).filter(Boolean).join("\n").trim();
}

function rotate(values, seed = 0) {
  if (!values.length) return values;
  const start = ((Number(seed) || 0) % values.length + values.length) % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}

function sleep(ms) {
  const delay = Number(ms);
  if (!Number.isFinite(delay) || delay <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function buildSignal(timeoutMs) {
  const ms = Number(timeoutMs);
  if (!Number.isFinite(ms) || ms <= 0) return undefined;
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

function isRetriableStatus(status) {
  const code = Number(status);
  if (!Number.isFinite(code)) return false;
  return code === 408 || code === 429 || (code >= 500 && code <= 599);
}

function isRetriableErrorMessage(message) {
  const text = clean(message).toLowerCase();
  if (!text) return false;
  return (
    text.includes("timeout")
    || text.includes("timed out")
    || text.includes("deadline")
    || text.includes("network")
    || text.includes("econn")
    || text.includes("socket")
    || text.includes("fetch failed")
    || text.includes("temporarily")
    || text.includes("unavailable")
    || text.includes("overloaded")
    || text.includes("rate limit")
    || text.includes("quota")
  );
}

function parseRetryAfterMs(response) {
  const header = clean(response?.headers?.get?.("Retry-After") || "");
  if (!header) return 0;

  const sec = Number(header);
  if (Number.isFinite(sec) && sec > 0) {
    return Math.max(250, Math.min(sec * 1000, 15000));
  }

  const targetTime = Date.parse(header);
  if (!Number.isFinite(targetTime)) return 0;
  const delta = targetTime - Date.now();
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  return Math.max(250, Math.min(delta, 15000));
}

function computeRetryDelayMs(attempt, response, message = "") {
  const retryAfter = parseRetryAfterMs(response);
  if (retryAfter > 0) return retryAfter;

  const base = Math.min(8000, 450 * (2 ** Math.max(0, attempt - 1)));
  const bonus = isRetriableErrorMessage(message) ? 300 : 0;
  const jitter = Math.floor(Math.random() * 220);
  return base + bonus + jitter;
}

export async function callGeminiText(env, prompt, options = {}) {
  const textPrompt = clean(prompt);
  if (!textPrompt) {
    return { ok: false, error: "empty_prompt", message: "Gemini prompt is empty." };
  }

  const totalTimeoutMsRaw = Number(options.totalTimeoutMs);
  const totalTimeoutMs = Number.isFinite(totalTimeoutMsRaw) && totalTimeoutMsRaw > 0
    ? Math.max(1000, totalTimeoutMsRaw)
    : 0;
  const startedAt = Date.now();
  const deadlineAt = totalTimeoutMs > 0 ? startedAt + totalTimeoutMs : 0;

  function remainingBudgetMs() {
    if (!deadlineAt) return Infinity;
    return deadlineAt - Date.now();
  }

  function computeAttemptTimeoutMs() {
    const configured = Number(options.timeoutMs);
    const configuredMs = Number.isFinite(configured) && configured > 0 ? configured : 0;
    if (!deadlineAt) return configuredMs || undefined;

    const remaining = remainingBudgetMs();
    if (!Number.isFinite(remaining) || remaining <= 250) return 0;

    const budgetMs = Math.max(250, Math.floor(remaining - 120));
    if (!configuredMs) return budgetMs;
    return Math.max(250, Math.min(configuredMs, budgetMs));
  }

  const keys = pickGeminiKeys(env, options.keyEnvKeys || []);
  if (!keys.length) {
    return {
      ok: false,
      error: "gemini_keys_missing",
      message: "Gemini API 키가 설정되어 있지 않습니다. PREMIUM_GEMINI_API_KEY1~4, GEMINIF_API_KEY1~4 또는 GEMINI_API_KEY를 설정하세요.",
    };
  }

  const models = pickGeminiModels(env, options.modelEnvKeys || []);
  const rotatedKeys = rotate(keys, textPrompt.length);
  const generationConfig = {
    temperature: Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.86,
    topP: Number.isFinite(Number(options.topP)) ? Number(options.topP) : 0.95,
    maxOutputTokens: Number.isFinite(Number(options.maxOutputTokens)) ? Number(options.maxOutputTokens) : 8192,
  };

  const maxAttemptsPerPair = Math.max(1, Math.min(5, Number(options.maxAttemptsPerPair) || 2));
  let lastError = "";

  outer:
  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    for (const key of rotatedKeys) {
      for (let attempt = 1; attempt <= maxAttemptsPerPair; attempt += 1) {
        const attemptTimeoutMs = computeAttemptTimeoutMs();
        if (attemptTimeoutMs === 0) {
          lastError = `Gemini total timeout exceeded (${totalTimeoutMs}ms).`;
          break outer;
        }

        try {
          const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: textPrompt }] }],
              generationConfig,
            }),
            signal: buildSignal(attemptTimeoutMs),
          });

          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            lastError = payload?.error?.message || `Gemini request failed (${response.status})`;
            if (attempt < maxAttemptsPerPair && (isRetriableStatus(response.status) || isRetriableErrorMessage(lastError))) {
              const delayMs = computeRetryDelayMs(attempt, response, lastError);
              if (deadlineAt && (remainingBudgetMs() - delayMs) <= 150) {
                lastError = `Gemini total timeout exceeded (${totalTimeoutMs}ms).`;
                break outer;
              }
              await sleep(delayMs);
              continue;
            }
            break;
          }

          const text = extractGeminiText(payload);
          if (text) {
            return { ok: true, text, model };
          }

          lastError = "Gemini returned an empty response.";
          if (attempt < maxAttemptsPerPair) {
            const delayMs = computeRetryDelayMs(attempt, null, lastError);
            if (deadlineAt && (remainingBudgetMs() - delayMs) <= 150) {
              lastError = `Gemini total timeout exceeded (${totalTimeoutMs}ms).`;
              break outer;
            }
            await sleep(delayMs);
            continue;
          }
          break;
        } catch (error) {
          lastError = error?.message || String(error);
          if (attempt < maxAttemptsPerPair && isRetriableErrorMessage(lastError)) {
            const delayMs = computeRetryDelayMs(attempt, null, lastError);
            if (deadlineAt && (remainingBudgetMs() - delayMs) <= 150) {
              lastError = `Gemini total timeout exceeded (${totalTimeoutMs}ms).`;
              break outer;
            }
            await sleep(delayMs);
            continue;
          }
          break;
        }
      }
    }
  }

  return {
    ok: false,
    error: "gemini_exhausted",
    message: lastError || "Gemini request failed for all configured keys and models.",
  };
}
