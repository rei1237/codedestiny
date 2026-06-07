const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
import { getEnv } from "./env.js";

const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
let vertexAccessTokenCache = {
  token: "",
  expiresAtMs: 0,
};
const geminiKeyHealthCache = new Map();
const GEMINI_KEY_TTL_OK_MS = 10 * 60 * 1000;
const GEMINI_KEY_TTL_RATE_LIMIT_MS = 45 * 1000;
const GEMINI_KEY_TTL_INVALID_MS = 60 * 60 * 1000;
const GEMINIF_PRIMARY_KEY_ENV_KEYS = Object.freeze([
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINIF_API_KEY5",
  "GEMINIF_API_KEY6",
  "GEMINIF_API_KEY7",
  "GEMINIF_API_KEY8",
]);

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
  const primary = GEMINIF_PRIMARY_KEY_ENV_KEYS.map((key) => getEnv(env, key));
  const preferred = preferredEnvKeys.map((key) => getEnv(env, key));
  return unique([
    ...primary,
    ...preferred,
    getEnv(env, "ZIWEI_GEMINI_API_KEY1"),
    getEnv(env, "ZIWEI_GEMINI_API_KEY2"),
    getEnv(env, "ZIWEI_GEMINI_API_KEY3"),
    getEnv(env, "ZIWEI_GEMINI_API_KEY4"),
    getEnv(env, "ZIWEI_GEMINI_API_KEY5"),
    getEnv(env, "ZIWEI_GEMINI_API_KEY"),
    getEnv(env, "PREMIUM_GEMINI_API_KEY1"),
    getEnv(env, "PREMIUM_GEMINI_API_KEY2"),
    getEnv(env, "PREMIUM_GEMINI_API_KEY3"),
    getEnv(env, "PREMIUM_GEMINI_API_KEY4"),
    getEnv(env, "PREMIUM_GEMINI_API_KEY5"),
    getEnv(env, "GEMINIF_API_KEY1"),
    getEnv(env, "GEMINIF_API_KEY2"),
    getEnv(env, "GEMINIF_API_KEY3"),
    getEnv(env, "GEMINIF_API_KEY4"),
    getEnv(env, "GEMINIF_API_KEY5"),
    getEnv(env, "GEMINIF_API_KEY6"),
    getEnv(env, "GEMINIF_API_KEY7"),
    getEnv(env, "GEMINIF_API_KEY8"),
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
    "gemini-1.5-flash",
    "gemini-1.5-pro",
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

function isTrueLike(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function readGeminiKeyCache(key) {
  const state = geminiKeyHealthCache.get(key);
  if (!state) return null;
  if (!Number.isFinite(state.untilMs) || state.untilMs <= Date.now()) {
    geminiKeyHealthCache.delete(key);
    return null;
  }
  return state;
}

function writeGeminiKeyCache(key, status, ttlMs, message = "") {
  geminiKeyHealthCache.set(key, {
    status,
    message: clean(message),
    untilMs: Date.now() + Math.max(1000, Number(ttlMs) || 1000),
  });
}

async function probeGeminiApiKeySequential(key, models = [], timeoutMs = 7000) {
  const modelCandidates = Array.isArray(models) && models.length ? models.slice(0, 3) : ["gemini-1.5-flash", "gemini-2.0-flash"];
  let lastStatus = 0;
  let lastMessage = "";

  for (const model of modelCandidates) {
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    try {
      const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "응답 가능 여부만 확인" }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8,
          },
        }),
        signal: buildSignal(Math.max(1500, Number(timeoutMs) || 7000)),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        return { ok: true, status: 200, message: "ok", model };
      }

      lastStatus = Number(response.status || 0) || 0;
      lastMessage = clean(payload?.error?.message || `Gemini request failed (${response.status})`);
      if (lastStatus === 401 || lastStatus === 403) {
        return { ok: false, status: lastStatus, message: lastMessage || "invalid_key", model };
      }
      if (lastStatus === 429) {
        return { ok: false, status: 429, message: lastMessage || "quota_exhausted", model };
      }
    } catch (error) {
      lastStatus = Number(error?.status || error?.code || 0) || 0;
      lastMessage = clean(error?.message || String(error));
    }
  }

  return {
    ok: false,
    status: lastStatus || 500,
    message: lastMessage || "probe_failed",
    model: modelCandidates[0] || "",
  };
}

async function resolveUsableGeminiKeys(env, options = {}, keys = [], models = []) {
  const shouldValidate = isTrueLike(options.validateKeysBeforeCall ?? getEnv(env, "GEMINI_VALIDATE_KEYS_BEFORE_CALL") ?? false);
  const stopAfterFirstUsable = isTrueLike(options.stopAfterFirstUsableKey ?? getEnv(env, "GEMINI_STOP_AFTER_FIRST_USABLE_KEY") ?? false);
  if (!shouldValidate) {
    const summary = [];
    const filtered = [];
    for (const key of keys) {
      const cached = readGeminiKeyCache(key);
      if (!cached) {
        filtered.push(key);
        continue;
      }

      summary.push({ source: "cache", status: cached.status, message: cached.message });
      if (cached.status === "invalid" || cached.status === "rate_limited" || cached.status === "error") {
        continue;
      }
      filtered.push(key);
    }

    const effective = filtered.length ? filtered : keys;
    return { keys: effective, checked: 0, usable: effective.length, summary };
  }

  const out = [];
  const summary = [];
  for (const key of keys) {
    const cached = readGeminiKeyCache(key);
    if (cached) {
      if (cached.status === "ok") out.push(key);
      summary.push({ source: "cache", status: cached.status, message: cached.message });
      continue;
    }

    const probe = await probeGeminiApiKeySequential(
      key,
      models,
      Number(options.keyProbeTimeoutMs || getEnv(env, "GEMINI_KEY_PROBE_TIMEOUT_MS") || 7000),
    );
    if (probe.ok) {
      writeGeminiKeyCache(key, "ok", GEMINI_KEY_TTL_OK_MS, "ok");
      out.push(key);
      summary.push({ source: "probe", status: "ok", message: probe.message });
      if (stopAfterFirstUsable) {
        break;
      }
      continue;
    }

    if (Number(probe.status) === 401 || Number(probe.status) === 403) {
      writeGeminiKeyCache(key, "invalid", GEMINI_KEY_TTL_INVALID_MS, probe.message);
      summary.push({ source: "probe", status: "invalid", message: probe.message });
      continue;
    }
    if (Number(probe.status) === 429) {
      writeGeminiKeyCache(key, "rate_limited", GEMINI_KEY_TTL_RATE_LIMIT_MS, probe.message);
      summary.push({ source: "probe", status: "rate_limited", message: probe.message });
      continue;
    }

    writeGeminiKeyCache(key, "error", GEMINI_KEY_TTL_RATE_LIMIT_MS, probe.message);
    summary.push({ source: "probe", status: "error", message: probe.message });
  }

  return { keys: out, checked: keys.length, usable: out.length, summary };
}

function sleep(ms) {
  const delay = Number(ms);
  if (!Number.isFinite(delay) || delay <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  const base64 = typeof btoa === "function"
    ? btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeJson(payload) {
  const raw = JSON.stringify(payload || {});
  return base64UrlEncodeBytes(new TextEncoder().encode(raw));
}

function decodeBase64ToBytes(raw) {
  const text = clean(raw).replace(/\s+/g, "");
  if (!text) return new Uint8Array();
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(text, "base64"));
  }
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function decodeBase64ToText(raw) {
  const text = clean(raw).replace(/\s+/g, "");
  if (!text) return "";
  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "base64").toString("utf8");
  }
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function parseServiceAccountJsonCandidate(rawValue) {
  const raw = clean(rawValue);
  if (!raw) return null;

  try {
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? parsed : null;
    }
  } catch {
    // Fall through to base64 decode path.
  }

  try {
    const decoded = decodeBase64ToText(raw);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    return typeof parsed === "object" && parsed ? parsed : null;
  } catch {
    return null;
  }
}

function parseServiceAccountJsonFromEnv(env) {
  const candidates = [
    getEnv(env, "VERTEX_SA_JSON"),
    getEnv(env, "VERTEX_SA_JSON_BASE64"),
    getEnv(env, "GCP_SERVICE_ACCOUNT_JSON"),
    getEnv(env, "GCP_SERVICE_ACCOUNT_JSON_BASE64"),
    getEnv(env, "GOOGLE_SERVICE_ACCOUNT_JSON"),
    getEnv(env, "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64"),
  ];

  for (const candidate of candidates) {
    const parsed = parseServiceAccountJsonCandidate(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function pemToPkcs8Bytes(pem) {
  const normalized = clean(pem)
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .trim();
  return decodeBase64ToBytes(normalized);
}

async function importServiceAccountPrivateKey(privateKeyPem) {
  const keyData = pemToPkcs8Bytes(privateKeyPem);
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function getVertexServiceAccountConfig(env) {
  const serviceAccountJson = parseServiceAccountJsonFromEnv(env) || {};
  const projectId = clean(getEnv(env, "VERTEX_PROJECT_ID") || serviceAccountJson.project_id);
  const location = clean(getEnv(env, "VERTEX_LOCATION")) || "us-central1";
  const clientEmail = clean(getEnv(env, "VERTEX_SA_CLIENT_EMAIL") || serviceAccountJson.client_email);
  const privateKey = clean(getEnv(env, "VERTEX_SA_PRIVATE_KEY") || serviceAccountJson.private_key);
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, location, clientEmail, privateKey };
}

async function getVertexAccessToken(env) {
  if (vertexAccessTokenCache.token && (vertexAccessTokenCache.expiresAtMs - Date.now()) > 45000) {
    return { ok: true, accessToken: vertexAccessTokenCache.token };
  }

  const cfg = getVertexServiceAccountConfig(env);
  if (!cfg) {
    return {
      ok: false,
      message: "Vertex service account config is missing (VERTEX_PROJECT_ID, VERTEX_SA_CLIENT_EMAIL, VERTEX_SA_PRIVATE_KEY).",
    };
  }

  try {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const header = base64UrlEncodeJson({ alg: "RS256", typ: "JWT" });
    const payload = base64UrlEncodeJson({
      iss: cfg.clientEmail,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: GOOGLE_OAUTH_TOKEN_ENDPOINT,
      iat,
      exp,
    });
    const unsignedJwt = `${header}.${payload}`;

    const privateKey = await importServiceAccountPrivateKey(cfg.privateKey);
    const sig = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      privateKey,
      new TextEncoder().encode(unsignedJwt),
    );
    const signature = base64UrlEncodeBytes(new Uint8Array(sig));
    const assertion = `${unsignedJwt}.${signature}`;

    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    });

    const res = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.access_token) {
      const msg = clean(json?.error_description || json?.error || `OAuth token request failed (${res.status})`);
      return { ok: false, message: msg };
    }

    const expiresInSec = Number(json?.expires_in);
    const expiresAtMs = Date.now() + (Number.isFinite(expiresInSec) ? expiresInSec * 1000 : 3000 * 1000);
    vertexAccessTokenCache = { token: String(json.access_token), expiresAtMs };
    return { ok: true, accessToken: String(json.access_token) };
  } catch (error) {
    return { ok: false, message: clean(error?.message || String(error)) || "Failed to mint Vertex access token." };
  }
}

function getVertexGenerateEndpoint(env, model) {
  const cfg = getVertexServiceAccountConfig(env);
  if (!cfg) return "";
  return `https://${cfg.location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/locations/${encodeURIComponent(cfg.location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
}

async function callVertexGeminiText(env, prompt, options = {}) {
  const textPrompt = clean(prompt);
  if (!textPrompt) {
    return { ok: false, message: "Vertex prompt is empty." };
  }

  const cfg = getVertexServiceAccountConfig(env);
  if (!cfg) {
    return { ok: false, message: "Vertex service account env is not configured." };
  }

  const token = await getVertexAccessToken(env);
  if (!token.ok || !token.accessToken) {
    return { ok: false, message: token.message || "Failed to get Vertex access token." };
  }

  const models = Array.isArray(options.models) && options.models.length
    ? unique(options.models.map((item) => clean(item)).filter(Boolean))
    : pickGeminiModels(env, options.modelEnvKeys || []);
  const generationConfig = {
    temperature: Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.86,
    topP: Number.isFinite(Number(options.topP)) ? Number(options.topP) : 0.95,
    maxOutputTokens: Number.isFinite(Number(options.maxOutputTokens)) ? Number(options.maxOutputTokens) : 8192,
  };
  if (Number.isFinite(Number(options.frequencyPenalty))) {
    generationConfig.frequencyPenalty = Number(options.frequencyPenalty);
  }
  if (Number.isFinite(Number(options.presencePenalty))) {
    generationConfig.presencePenalty = Number(options.presencePenalty);
  }

  const maxAttemptsPerPair = Math.max(1, Math.min(3, Number(options.maxAttemptsPerPair) || 2));
  let lastError = "";
  let lastStatus = null;

  for (const model of models) {
    const endpoint = getVertexGenerateEndpoint(env, model);
    if (!endpoint) continue;

    for (let attempt = 1; attempt <= maxAttemptsPerPair; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.accessToken}`,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: textPrompt }] }],
            generationConfig,
          }),
          signal: buildSignal(Number(options.timeoutMs) || 0),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          lastStatus = Number(response.status || 0) || null;
          lastError = clean(payload?.error?.message || `Vertex Gemini request failed (${response.status})`);
          if (attempt < maxAttemptsPerPair && (isRetriableStatus(response.status) || isRetriableErrorMessage(lastError))) {
            await sleep(computeRetryDelayMs(attempt, response, lastError));
            continue;
          }
          break;
        }

        const text = extractGeminiText(payload);
        if (text) {
          return { ok: true, text, model: `vertex:${model}` };
        }

        lastError = "Vertex Gemini returned an empty response.";
        if (attempt < maxAttemptsPerPair) {
          await sleep(computeRetryDelayMs(attempt, null, lastError));
          continue;
        }
        break;
      } catch (error) {
        lastError = clean(error?.message || String(error));
        lastStatus = Number(error?.status || error?.code || 0) || null;
        if (attempt < maxAttemptsPerPair && isRetriableErrorMessage(lastError)) {
          await sleep(computeRetryDelayMs(attempt, null, lastError));
          continue;
        }
        break;
      }
    }
  }

  return {
    ok: false,
    status: lastStatus,
    error: "vertex_exhausted",
    message: lastError || "Vertex Gemini request failed for all configured models.",
  };
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

function canUseNodeSdk() {
  return typeof process !== "undefined" && Boolean(process?.versions?.node);
}

function shouldUseGeminiSdk(env, options = {}) {
  if (!canUseNodeSdk()) return false;
  const explicit = String(options?.useSdk ?? getEnv(env, "GEMINI_USE_SDK") ?? getEnv(env, "PREMIUM_GEMINI_USE_SDK") ?? "false").trim().toLowerCase();
  return !(explicit === "0" || explicit === "false" || explicit === "no");
}

async function callGeminiTextViaSdk(env, prompt, options = {}) {
  const textPrompt = clean(prompt);
  if (!textPrompt) return { ok: false, error: "empty_prompt", message: "Gemini prompt is empty." };

  const keys = pickGeminiKeys(env, options.keyEnvKeys || []);
  if (!keys.length) {
    return {
      ok: false,
      error: "gemini_keys_missing",
      message: "Gemini API key is not configured for SDK path.",
    };
  }

  const models = Array.isArray(options.models) && options.models.length
    ? unique(options.models.map((item) => clean(item)).filter(Boolean))
    : pickGeminiModels(env, options.modelEnvKeys || []);
  const maxAttemptsPerPair = Math.max(1, Math.min(5, Number(options.maxAttemptsPerPair) || 2));
  let lastError = "";
  let lastStatus = null;

  for (const model of models) {
    for (const key of keys) {
      for (let attempt = 1; attempt <= maxAttemptsPerPair; attempt += 1) {
        try {
          const sdk = await import("@google/generative-ai");
          const GoogleGenerativeAI = sdk?.GoogleGenerativeAI;
          if (typeof GoogleGenerativeAI !== "function") {
            return {
              ok: false,
              error: "gemini_sdk_invalid",
              message: "@google/generative-ai loaded but GoogleGenerativeAI is unavailable.",
            };
          }

          const client = new GoogleGenerativeAI(key);
          const modelClient = client.getGenerativeModel({ model });
          const result = await modelClient.generateContent({
            contents: [{ role: "user", parts: [{ text: textPrompt }] }],
            generationConfig: {
              temperature: Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.86,
              topP: Number.isFinite(Number(options.topP)) ? Number(options.topP) : 0.95,
              maxOutputTokens: Number.isFinite(Number(options.maxOutputTokens)) ? Number(options.maxOutputTokens) : 8192,
            },
          });

          const text = clean(result?.response?.text?.() || "");
          if (text) return { ok: true, text, model };
          lastError = "Gemini SDK returned an empty response.";
        } catch (error) {
          lastError = clean(error?.message || String(error)) || "Gemini SDK call failed.";
          lastStatus = Number(error?.status || error?.code || 0) || null;
        }

        if (attempt < maxAttemptsPerPair) {
          await sleep(computeRetryDelayMs(attempt, null, lastError));
        }
      }
    }
  }

  return {
    ok: false,
    error: "gemini_sdk_exhausted",
    status: lastStatus,
    message: lastError || "Gemini SDK request failed for all configured models and keys.",
  };
}

export async function callGeminiText(env, prompt, options = {}) {
  const textPrompt = clean(prompt);
  if (!textPrompt) {
    return { ok: false, error: "empty_prompt", message: "Gemini prompt is empty." };
  }

  const totalTimeoutMsRaw = Number(options.totalTimeoutMs);
  const preferVertexFirst = String(options.preferVertexFirst ?? getEnv(env, "VERTEX_PREFER_FIRST") ?? "").trim().toLowerCase();
  const vertexOnly = String(options.vertexOnly ?? getEnv(env, "VERTEX_ONLY") ?? "").trim().toLowerCase();
  const shouldPreferVertexFirst = preferVertexFirst === "1" || preferVertexFirst === "true" || preferVertexFirst === "yes";
  const shouldUseVertexOnly = vertexOnly === "1" || vertexOnly === "true" || vertexOnly === "yes";
  const disableVertexFallbackRaw = String(options.disableVertexFallback ?? getEnv(env, "GEMINI_DISABLE_VERTEX_FALLBACK") ?? "").trim().toLowerCase();
  const disableVertexFallback = disableVertexFallbackRaw === "1" || disableVertexFallbackRaw === "true" || disableVertexFallbackRaw === "yes";
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

  async function tryVertexFirst() {
    const vertexAttemptTimeoutMs = computeAttemptTimeoutMs();
    const vertexResult = await callVertexGeminiText(env, textPrompt, {
      ...options,
      timeoutMs: vertexAttemptTimeoutMs > 0 ? vertexAttemptTimeoutMs : options.timeoutMs,
    });
    if (vertexResult?.ok && clean(vertexResult.text)) {
      return {
        ok: true,
        text: clean(vertexResult.text),
        model: clean(vertexResult.model) || "vertex",
      };
    }
    return vertexResult || { ok: false, error: "vertex_exhausted", message: "Vertex request failed." };
  }

  if (shouldPreferVertexFirst || shouldUseVertexOnly) {
    const vertexFirstResult = await tryVertexFirst();
    if (vertexFirstResult?.ok) {
      return vertexFirstResult;
    }
    if (shouldUseVertexOnly) {
      return {
        ok: false,
        error: clean(vertexFirstResult?.error || "vertex_exhausted") || "vertex_exhausted",
        status: Number(vertexFirstResult?.status || 0) || null,
        message: clean(vertexFirstResult?.message || "Vertex request failed."),
      };
    }
  }

  const keys = pickGeminiKeys(env, options.keyEnvKeys || []);
  const processGeminiKeyConfigured = Boolean(
    canUseNodeSdk()
      ? clean(
        process?.env?.ZIWEI_GEMINI_API_KEY1
          || process?.env?.ZIWEI_GEMINI_API_KEY2
          || process?.env?.ZIWEI_GEMINI_API_KEY3
          || process?.env?.ZIWEI_GEMINI_API_KEY4
          || process?.env?.ZIWEI_GEMINI_API_KEY5
          || process?.env?.ZIWEI_GEMINI_API_KEY
          || process?.env?.PREMIUM_GEMINI_API_KEY1
          || process?.env?.PREMIUM_GEMINI_API_KEY2
          || process?.env?.PREMIUM_GEMINI_API_KEY3
          || process?.env?.PREMIUM_GEMINI_API_KEY4
          || process?.env?.PREMIUM_GEMINI_API_KEY5
          || process?.env?.GEMINIF_API_KEY1
          || process?.env?.GEMINIF_API_KEY2
          || process?.env?.GEMINIF_API_KEY3
          || process?.env?.GEMINIF_API_KEY4
          || process?.env?.GEMINIF_API_KEY5
          || process?.env?.GEMINIF_API_KEY6
          || process?.env?.GEMINIF_API_KEY7
          || process?.env?.GEMINIF_API_KEY8
          || process?.env?.GEMINI_API_KEY
          || process?.env?.GOOGLE_GEMINI_API_KEY
          || "",
      )
      : "",
  );
  if (!keys.length) {
    console.error("[Gemini] Key missing", {
      keyConfigured: false,
      processEnvKeyConfigured: processGeminiKeyConfigured,
      preferredKeyEnvKeys: Array.isArray(options.keyEnvKeys) ? options.keyEnvKeys : [],
    });
    return {
      ok: false,
      error: "gemini_keys_missing",
      status: 401,
      message: "Gemini API 키가 설정되어 있지 않습니다. PREMIUM_GEMINI_API_KEY1~5, GEMINIF_API_KEY1~8 또는 GEMINI_API_KEY를 설정하세요.",
    };
  }

  if (shouldUseGeminiSdk(env, options)) {
    const sdkResult = await callGeminiTextViaSdk(env, textPrompt, options);
    if (sdkResult?.ok) {
      return sdkResult;
    }
    console.warn("[Gemini] SDK path failed, falling back to REST", {
      error: clean(sdkResult?.error || "gemini_sdk_failed"),
      status: Number(sdkResult?.status || 0) || null,
      message: clean(sdkResult?.message || ""),
      keyConfigured: keys.length > 0,
      processEnvKeyConfigured: processGeminiKeyConfigured,
    });
  }

  const models = Array.isArray(options.models) && options.models.length
    ? unique(options.models.map((item) => clean(item)).filter(Boolean))
    : pickGeminiModels(env, options.modelEnvKeys || []);
  const usableKeyResult = await resolveUsableGeminiKeys(env, options, keys, models);
  const effectiveKeys = usableKeyResult.keys;
  if (!effectiveKeys.length) {
    const digest = usableKeyResult.summary
      .map((row, idx) => `${idx + 1}:${row.status}`)
      .join(",");
    return {
      ok: false,
      error: "gemini_keys_unusable",
      status: 429,
      message: `유효한 Gemini 키가 없습니다. keyCheck=${usableKeyResult.checked}, usable=${usableKeyResult.usable}, summary=${digest || "none"}`,
    };
  }
  const rotatedKeys = rotate(effectiveKeys, textPrompt.length);
  const keyPoolSize = rotatedKeys.length;
  const generationConfig = {
    temperature: Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.86,
    topP: Number.isFinite(Number(options.topP)) ? Number(options.topP) : 0.95,
    maxOutputTokens: Number.isFinite(Number(options.maxOutputTokens)) ? Number(options.maxOutputTokens) : 8192,
  };
  if (Number.isFinite(Number(options.frequencyPenalty))) {
    generationConfig.frequencyPenalty = Number(options.frequencyPenalty);
  }
  if (Number.isFinite(Number(options.presencePenalty))) {
    generationConfig.presencePenalty = Number(options.presencePenalty);
  }

  const maxAttemptsPerPair = Math.max(1, Math.min(5, Number(options.maxAttemptsPerPair) || 2));
  let lastError = "";
  let lastStatus = null;

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
            lastStatus = Number(response.status || 0) || null;
            if (response.status === 401 || response.status === 403) {
              writeGeminiKeyCache(key, "invalid", GEMINI_KEY_TTL_INVALID_MS, lastError);
              break;
            }
            if (response.status === 429) {
              writeGeminiKeyCache(key, "rate_limited", GEMINI_KEY_TTL_RATE_LIMIT_MS, lastError);
              break;
            }
            if (response.status === 400) {
              break outer;
            }
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
            writeGeminiKeyCache(key, "ok", GEMINI_KEY_TTL_OK_MS, "ok");
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
          lastStatus = Number(error?.status || error?.code || 0) || null;
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

  if (disableVertexFallback) {
    console.error("[Gemini] Exhausted all attempts (Vertex fallback disabled)", {
      status: lastStatus,
      keyPoolSize,
      keyConfigured: keys.length > 0,
      processEnvKeyConfigured: processGeminiKeyConfigured,
      modelCandidates: models,
      message: clean(lastError),
    });
    return {
      ok: false,
      error: "gemini_exhausted",
      status: lastStatus,
      message: `${lastError || "Gemini request failed for all configured keys and models."} (keyPool=${keyPoolSize})`,
    };
  }

  const vertexResult = await callVertexGeminiText(env, textPrompt, options);
  if (vertexResult?.ok && clean(vertexResult.text)) {
    return {
      ok: true,
      text: clean(vertexResult.text),
      model: clean(vertexResult.model) || "vertex",
    };
  }
  if (clean(vertexResult?.message)) {
    lastError = `${lastError ? `${lastError} | ` : ""}Vertex fallback failed: ${clean(vertexResult.message)}`;
  }

  console.error("[Gemini] Exhausted all attempts", {
    status: lastStatus,
    keyPoolSize,
    keyConfigured: keys.length > 0,
    processEnvKeyConfigured: processGeminiKeyConfigured,
    modelCandidates: models,
    message: clean(lastError),
  });

  return {
    ok: false,
    error: "gemini_exhausted",
    status: lastStatus,
    message: `${lastError || "Gemini request failed for all configured keys and models."} (keyPool=${keyPoolSize})`,
  };
}
