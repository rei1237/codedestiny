const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

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
  const preferred = preferredEnvKeys.map((key) => env?.[key]);
  return unique([
    ...preferred,
    env.GEMINIF_API_KEY1,
    env.GEMINIF_API_KEY2,
    env.GEMINIF_API_KEY3,
    env.GEMINIF_API_KEY4,
    env.GEMINI_API_KEY,
    env.GOOGLE_GEMINI_API_KEY,
    env.GOOGLE_API_KEY,
  ].filter(isUsable));
}

export function pickGeminiModels(env, preferredEnvKeys = []) {
  const preferred = preferredEnvKeys.map((key) => clean(env[key])).filter(Boolean);
  const defaults = [
    clean(env.GEMINI_MODEL),
    clean(env.VERTEX_GEMINI_MODEL),
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

export async function callGeminiText(env, prompt, options = {}) {
  const textPrompt = clean(prompt);
  if (!textPrompt) {
    return { ok: false, error: "empty_prompt", message: "Gemini prompt is empty." };
  }

  const keys = pickGeminiKeys(env, options.keyEnvKeys || []);
  if (!keys.length) {
    return {
      ok: false,
      error: "gemini_keys_missing",
      message: "GEMINIF_API_KEY1~4 Worker secrets are not configured.",
    };
  }

  const models = pickGeminiModels(env, options.modelEnvKeys || []);
  const rotatedKeys = rotate(keys, textPrompt.length);
  const generationConfig = {
    temperature: Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.86,
    topP: Number.isFinite(Number(options.topP)) ? Number(options.topP) : 0.95,
    maxOutputTokens: Number.isFinite(Number(options.maxOutputTokens)) ? Number(options.maxOutputTokens) : 8192,
  };

  const maxAttemptsPerPair = Math.max(1, Math.min(3, Number(options.maxAttemptsPerPair) || 2));
  let lastError = "";
  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    for (const key of rotatedKeys) {
      for (let attempt = 1; attempt <= maxAttemptsPerPair; attempt += 1) {
        try {
          const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: textPrompt }] }],
              generationConfig,
            }),
            signal: buildSignal(options.timeoutMs),
          });

          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            lastError = payload?.error?.message || `Gemini request failed (${response.status})`;
            if (attempt < maxAttemptsPerPair && (isRetriableStatus(response.status) || isRetriableErrorMessage(lastError))) {
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
            continue;
          }
          break;
        } catch (error) {
          lastError = error?.message || String(error);
          if (attempt < maxAttemptsPerPair && isRetriableErrorMessage(lastError)) {
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
