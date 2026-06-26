// worker/lib/http.js
var HttpError = class extends Error {
  constructor(status, message, payload = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.payload = payload;
  }
};
function createHttpError(status, message, payload = {}) {
  return new HttpError(status, message, payload);
}
function json(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  return new Response(JSON.stringify(body), {
    ...init,
    headers
  });
}
async function readJson(request) {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    throw createHttpError(400, "Request body must be valid JSON.");
  }
}
function getRoutePath(request, prefix) {
  const pathname = new URL(request.url).pathname;
  const rest = pathname.slice(prefix.length);
  if (!rest) return "/";
  const normalized = rest.replace(/\/+$/, "");
  return normalized || "/";
}
function notFound() {
  return json({ ok: false, error: "not_found" }, { status: 404 });
}
function methodNotAllowed() {
  return json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
function getRequestMeta(request) {
  const forwarded = String(request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return {
    ip: forwarded || request.headers.get("cf-connecting-ip") || "unknown",
    userAgent: String(request.headers.get("user-agent") || "").slice(0, 300),
    requestId: String(request.headers.get("x-request-id") || request.headers.get("cf-ray") || "").slice(0, 120)
  };
}
function resolveRequestPathFromContext(context = {}) {
  const fromTrace = String(context?.trace?.requestPath || "").trim();
  if (fromTrace) return fromTrace;
  const rawUrl = context?.request?.url;
  if (!rawUrl) return "";
  try {
    return new URL(rawUrl).pathname;
  } catch (e) {
    return "";
  }
}
function isDevelopmentLike(env = {}) {
  const nodeEnv = String(env.NODE_ENV || env.ENV || "").trim().toLowerCase();
  return nodeEnv === "development" || nodeEnv === "dev" || nodeEnv === "local";
}
function toPublicErrorDetails(error, context = {}) {
  const requestPath = resolveRequestPathFromContext(context);
  const trace = context?.trace || {};
  const requestMeta = context?.request ? getRequestMeta(context.request) : null;
  return {
    name: error?.name || "Error",
    code: error?.code || "INTERNAL_SERVER_ERROR",
    route: trace.route || "unknown",
    method: trace.method || context?.request?.method || "",
    requestPath,
    requestId: String(requestMeta?.requestId || "")
  };
}
async function handleRouteError(error, context = {}) {
  if (error instanceof HttpError) {
    const payloadDetails = error?.payload && typeof error.payload === "object" ? error.payload.errorDetails : void 0;
    return json({
      ok: false,
      success: false,
      message: error.message,
      ...error.payload,
      errorDetails: payloadDetails && typeof payloadDetails === "object" ? payloadDetails : toPublicErrorDetails(error, context)
    }, { status: error.status });
  }
  if (error?.name === "TokenExpiredError") {
    return json({
      ok: false,
      success: false,
      message: "Authentication has expired. Please sign in again.",
      code: "UNAUTHORIZED",
      errorDetails: toPublicErrorDetails(error, context)
    }, { status: 401 });
  }
  if (error?.name === "JsonWebTokenError") {
    return json({
      ok: false,
      success: false,
      message: "Invalid authentication token.",
      code: "UNAUTHORIZED",
      errorDetails: toPublicErrorDetails(error, context)
    }, { status: 401 });
  }
  const trace = context?.trace || {};
  const requestPath = resolveRequestPathFromContext(context);
  const requestMeta = context?.request ? getRequestMeta(context.request) : null;
  const exposeMessage = context?.exposeMessage === true || isDevelopmentLike(context?.env || {});
  const errorText = String(error?.message || "");
  const mongoQueryFailed = Boolean(trace.mongoQueryFailed) || /mongo|mongoose|cast to objectid|findbyid|findone|query/i.test(errorText);
  const paymentProviderFailed = Boolean(trace.paymentProviderFailed) || /portone|iamport|payment provider|merchant_uid|imp_uid/i.test(errorText);
  const logPayload = {
    level: "error",
    route: trace.route || "unknown",
    requestPath,
    method: trace.method || context?.request?.method || "",
    authPresent: Boolean(trace.authPresent),
    authVerified: Boolean(trace.authVerified),
    dbConnected: Boolean(trace.dbConnected),
    env: trace.env || null,
    mongoQueryFailed,
    paymentProviderFailed,
    requestMeta,
    name: error?.name || "Error",
    code: error?.code || "INTERNAL_SERVER_ERROR",
    message: errorText || "Unknown error",
    stack: error?.stack || null
  };
  try {
    console.error("[worker-route-error]", JSON.stringify(logPayload));
  } catch (e) {
    console.error("[worker-route-error]", logPayload);
  }
  const isConfigError = /mongo_uri|mongodb_uri|required for worker-native|connection timed out/i.test(errorText);
  const isDbUnavailable = /mongo|mongoose|mongodb|server selection timed out|connection timed out|connection is not ready|connect ECONNREFUSED|ENOTFOUND/i.test(errorText);
  if (isDbUnavailable || isConfigError) {
    return json({
      ok: false,
      success: false,
      code: "SERVICE_UNAVAILABLE",
      message: (exposeMessage || isConfigError) && errorText ? errorText : "Database is temporarily unavailable.",
      requestPath: exposeMessage || isConfigError ? requestPath : void 0,
      errorDetails: {
        ...toPublicErrorDetails(error, context),
        code: "SERVICE_UNAVAILABLE",
        reason: isConfigError ? "CONFIG_ERROR" : "DB_UNAVAILABLE",
        message: (exposeMessage || isConfigError) && errorText ? errorText : "Database is temporarily unavailable."
      }
    }, {
      status: 503,
      headers: {
        "X-Error-Code": "SERVICE_UNAVAILABLE"
      }
    });
  }
  return json({
    ok: false,
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: (exposeMessage || isConfigError) && errorText ? errorText : "Internal server error.",
    requestPath: exposeMessage || isConfigError ? requestPath : void 0,
    errorDetails: {
      ...toPublicErrorDetails(error, context),
      code: "INTERNAL_SERVER_ERROR",
      message: (exposeMessage || isConfigError) && errorText ? errorText : "Internal server error."
    }
  }, {
    status: 500,
    headers: {
      "X-Error-Code": "INTERNAL_SERVER_ERROR"
    }
  });
}

// lib/llm-client.ts
var GEMINI_MODEL = "gemini-2.5-flash";
var GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
var DEFAULT_TIMEOUT_MS = 3e4;
var GEMINI_KEY_ORDER = [
  "GEMINIF_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY"
];
function readProcessGeminiKey() {
  if (typeof process === "undefined") return "";
  for (const key of GEMINI_KEY_ORDER) {
    const value = String(process.env?.[key] || "").trim();
    if (value) return value;
  }
  return "";
}
function getGeminiApiKey(env) {
  for (const key of GEMINI_KEY_ORDER) {
    const value = String(env?.[key] || "").trim();
    if (value) return value;
  }
  return readProcessGeminiKey();
}
function normalizeRequest(request) {
  return {
    ...request,
    prompt: String(request.prompt || "").trim(),
    taskType: request.taskType || "general"
  };
}
function resolveGeminiModel(request, env) {
  const requested = String(request.model || "").trim();
  if (requested) return requested;
  const envModel = String(
    env?.["GEMINI_MODEL"] || ""
  ).trim();
  if (envModel) return envModel;
  return GEMINI_MODEL;
}
function resolveGeminiEndpoint(request, model) {
  const providedEndpoint = String(request.apiEndpoint || request.endpoint || "").trim();
  if (!providedEndpoint) return `${GEMINI_ENDPOINT}`;
  const safeModel = encodeURIComponent(String(model || GEMINI_MODEL).trim() || GEMINI_MODEL);
  const endpointWithModel = providedEndpoint.includes("/models/") ? providedEndpoint.replace(/\/models\/[^/?#\:]+(?=:generateContent|$)/, `/models/${safeModel}`) : `${providedEndpoint.replace(/\/$/, "")}/models/${safeModel}:generateContent`;
  if (endpointWithModel.includes(":generateContent")) return endpointWithModel;
  return `${endpointWithModel}:generateContent`;
}
function createTimeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const safeTimeoutMs = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0 ? Number(timeoutMs) : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), safeTimeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
    timeoutMs: safeTimeoutMs
  };
}
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error || "Unknown error");
}
function extractGeminiText(payload) {
  const parts = payload.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => String(part.text || "").trim()).filter(Boolean).join("\n").trim();
}
function extractWorkersAiText(result) {
  if (!result) return "";
  if (typeof result === "string") return result.trim();
  const payload = result;
  const candidates = [
    payload.response,
    payload.text,
    typeof payload.content === "string" ? payload.content : "",
    payload.result?.response,
    payload.result?.text,
    payload.result?.content,
    payload.output_text
  ];
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text) return text;
  }
  if (Array.isArray(payload.content)) {
    return payload.content.map((part) => typeof part === "string" ? part : String(part?.text || "")).map((part) => part.trim()).filter(Boolean).join("\n").trim();
  }
  return "";
}
function pickWorkersAiModel(taskType) {
  if (taskType === "pdf") return "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  return "@cf/meta/llama-3.1-8b-instruct";
}
async function callGeminiPrimary(request, env) {
  const normalized = normalizeRequest(request);
  if (!normalized.prompt) throw new Error("LLM prompt is empty.");
  const apiKey = getGeminiApiKey(env);
  if (!apiKey) throw new Error("Gemini API key is not configured.");
  const model = resolveGeminiModel(normalized, env);
  const endpoint = resolveGeminiEndpoint(normalized, model);
  const parts = Array.isArray(normalized.geminiParts) && normalized.geminiParts.length ? normalized.geminiParts : [{ text: normalized.prompt }];
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      maxOutputTokens: normalized.maxTokens,
      temperature: normalized.temperature
    }
  };
  if (normalized.systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: normalized.systemPrompt }]
    };
  }
  const timeout = createTimeoutSignal(normalized.timeoutMs);
  try {
    const endpointUrl = endpoint.startsWith("https://") || endpoint.startsWith("http://") ? new URL(endpoint) : new URL(endpoint, "https://generativelanguage.googleapis.com");
    endpointUrl.searchParams.set("key", apiKey);
    const response = await fetch(endpointUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: timeout.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error?.message || `Gemini request failed (${response.status}).`);
    }
    const text = extractGeminiText(payload);
    if (!text) throw new Error("Gemini returned an empty response.");
    return {
      text,
      provider: "gemini",
      model
    };
  } catch (error) {
    if (timeout.signal.aborted) throw new Error(`Gemini request timed out after ${timeout.timeoutMs}ms.`);
    throw error;
  } finally {
    timeout.clear();
  }
}
async function callCloudflareWorkersAI(request, env) {
  const normalized = normalizeRequest(request);
  if (!normalized.prompt) throw new Error("LLM prompt is empty.");
  if (!env?.AI?.run) {
    throw new Error("Cloudflare Workers AI binding is not configured. Pass env.AI in Workers or Pages runtime.");
  }
  const model = pickWorkersAiModel(normalized.taskType);
  const messages = [
    ...normalized.systemPrompt ? [{ role: "system", content: normalized.systemPrompt }] : [],
    { role: "user", content: normalized.prompt }
  ];
  const result = await env.AI.run(model, {
    messages,
    max_tokens: normalized.maxTokens,
    temperature: normalized.temperature
  });
  const text = extractWorkersAiText(result);
  if (!text) throw new Error("Cloudflare Workers AI returned an empty response.");
  return {
    text,
    provider: "cloudflare",
    model
  };
}
async function callLLM(request, env) {
  const requestModel = resolveGeminiModel(request, env);
  try {
    return await callGeminiPrimary(request, env);
  } catch (geminiError) {
    console.warn("[llm-client] Gemini primary failed. Falling back to Cloudflare Workers AI.", {
      error: getErrorMessage(geminiError),
      model: requestModel,
      apiEndpoint: String(request?.apiEndpoint || request?.endpoint || ""),
      taskType: request.taskType || "general"
    });
    try {
      return await callCloudflareWorkersAI(request, env);
    } catch (cloudflareError) {
      throw new Error(
        `LLM request failed. Gemini: ${getErrorMessage(geminiError)}; Cloudflare Workers AI: ${getErrorMessage(
          cloudflareError
        )}`
      );
    }
  }
}

// worker/lib/gemini.js
function clean(value, maxLength = 0) {
  const text = String(value || "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}
function normalizeTaskType(options = {}) {
  const taskType = clean(options.taskType).toLowerCase();
  if (taskType === "pdf" || taskType === "fortune" || taskType === "healing" || taskType === "general") {
    return taskType;
  }
  return "fortune";
}
function normalizeProvider(provider) {
  return provider === "cloudflare" ? "workers-ai" : provider;
}
function toFailure(error, fallbackError = "llm_failed") {
  return {
    ok: false,
    error: clean(error?.code || fallbackError),
    status: Number(error?.status || 0) || null,
    message: clean(error?.message || error || fallbackError, 500)
  };
}
async function callGeminiText(env, prompt, options = {}) {
  const textPrompt = clean(prompt);
  if (!textPrompt) {
    return { ok: false, error: "empty_prompt", message: "Gemini prompt is empty." };
  }
  try {
    const result = await callLLM({
      prompt: textPrompt,
      systemPrompt: clean(options.systemPrompt),
      maxTokens: Number(options.maxOutputTokens || options.maxTokens) || void 0,
      temperature: Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : void 0,
      taskType: normalizeTaskType(options)
    }, env);
    return {
      ok: true,
      text: result.text,
      model: result.model,
      provider: normalizeProvider(result.provider)
    };
  } catch (error) {
    return toFailure(error);
  }
}

// worker/routes/dream.js
var DREAM_PSYCHO_GEMINI_MODEL_KEYS = Object.freeze([
  "DREAM_PSYCHO_GEMINI_MODEL",
  "PSYCHO_DREAM_GEMINI_MODEL",
  "GEMINI_MODEL"
]);
var dreamGeminiCaller = callGeminiText;
function __setDreamGeminiCallerForTest(fn) {
  dreamGeminiCaller = typeof fn === "function" ? fn : callGeminiText;
}
function __resetDreamGeminiCallerForTest() {
  dreamGeminiCaller = callGeminiText;
}
function normalizeDreamText(payload) {
  const text = String(payload?.dreamText || payload?.dreamContent || "").trim();
  if (!text) return { ok: false, message: "\uAFC8\uC758 \uC7A5\uBA74\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694." };
  if (text.length < 8) return { ok: false, message: "\uAFC8\uC758 \uC7A5\uBA74\uC744 \uC870\uAE08 \uB354 \uC790\uC138\uD788 \uC801\uC5B4 \uC8FC\uC138\uC694. \uCD5C\uC18C 8\uC790 \uC774\uC0C1\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." };
  if (text.length > 6e3) return { ok: false, message: "\uAFC8\uC758 \uC7A5\uBA74\uC774 \uB108\uBB34 \uAE41\uB2C8\uB2E4. 6000\uC790 \uC774\uB0B4\uB85C \uC801\uC5B4 \uC8FC\uC138\uC694." };
  return { ok: true, text };
}
var DREAM_TAROT_CARDS = [
  { id: 0, name: "The Fool", nameKo: "\uBC14\uBCF4", arcana: "major", keywords: ["\uC2DC\uC791", "\uC790\uC720", "\uB3C4\uC57D"], dreamMeaning: "\uC775\uC219\uD55C \uACBD\uACC4 \uBC16\uC73C\uB85C \uB098\uAC00\uB824\uB294 \uB9C8\uC74C\uC774 \uB5A0\uC624\uB985\uB2C8\uB2E4. \uB450\uB824\uC6C0\uBCF4\uB2E4 \uAC00\uB2A5\uC131\uC758 \uBB38\uC774 \uBA3C\uC800 \uC5F4\uB9BD\uB2C8\uB2E4.", uprightMeaning: "\uC0C8 \uCD9C\uBC1C, \uBAA8\uD5D8, \uC21C\uC218\uD55C \uAC00\uB2A5\uC131", reversedMeaning: "\uCDA9\uB3D9, \uC900\uBE44 \uBD80\uC871, \uBC29\uD5A5 \uC0C1\uC2E4" },
  { id: 1, name: "The Magician", nameKo: "\uB9C8\uBC95\uC0AC", arcana: "major", keywords: ["\uC758\uC9C0", "\uCC3D\uC870", "\uC2E4\uD589"], dreamMeaning: "\uD769\uC5B4\uC9C4 \uC7AC\uB8CC\uB97C \uD558\uB098\uC758 \uC758\uC2DD\uC73C\uB85C \uBB36\uC73C\uB824\uB294 \uD798\uC774 \uAC15\uD558\uAC8C \uB5A0\uC624\uB985\uB2C8\uB2E4. \uB9C8\uC74C\uC18D \uB3C4\uAD6C\uAC00 \uAE68\uC5B4\uB098\uB294 \uC9D5\uC870\uC785\uB2C8\uB2E4.", uprightMeaning: "\uB2A5\uB825 \uBC1C\uD604, \uC9D1\uC911, \uAD6C\uD604", reversedMeaning: "\uBD84\uC0B0, \uC18D\uC784\uC218, \uC7A0\uC7AC\uB825 \uC9C0\uC5F0" },
  { id: 2, name: "The High Priestess", nameKo: "\uC5EC\uC0AC\uC81C", arcana: "major", keywords: ["\uC9C1\uAC10", "\uBE44\uBC00", "\uBB34\uC758\uC2DD"], dreamMeaning: "\uAC89\uC73C\uB85C \uB4DC\uB7EC\uB098\uC9C0 \uC54A\uC740 \uAC10\uC815\uACFC \uAE30\uC5B5\uC774 \uBB3C\uBC11\uC5D0\uC11C \uC6C0\uC9C1\uC785\uB2C8\uB2E4. \uCE68\uBB35 \uC18D\uC758 \uC2E0\uD638\uAC00 \uC120\uBA85\uD574\uC9C0\uB294 \uB54C\uC785\uB2C8\uB2E4.", uprightMeaning: "\uC9C1\uAD00, \uB0B4\uBA74\uC758 \uC9C0\uD61C, \uC740\uBC00\uD55C \uC9C4\uC2E4", reversedMeaning: "\uC5B5\uB20C\uB9B0 \uC9C1\uAC10, \uD63C\uB780, \uB2EB\uD78C \uB0B4\uBA74" },
  { id: 3, name: "The Empress", nameKo: "\uC5EC\uD669\uC81C", arcana: "major", keywords: ["\uB3CC\uBD04", "\uD48D\uC694", "\uAC10\uAC01"], dreamMeaning: "\uBAB8\uACFC \uAC10\uC815\uC774 \uB354 \uBD80\uB4DC\uB7EC\uC6B4 \uC548\uC2DD\uCC98\uB97C \uCC3E\uACE0 \uC788\uC2B5\uB2C8\uB2E4. \uAD00\uACC4\uC640 \uCC3D\uC870\uC131\uC758 \uC628\uAE30\uAC00 \uD750\uB985\uB2C8\uB2E4.", uprightMeaning: "\uD48D\uC694, \uC591\uC721, \uCC3D\uC870\uC801 \uC131\uC7A5", reversedMeaning: "\uACFC\uC789\uBCF4\uD638, \uACB0\uD54D\uAC10, \uB3CC\uBD04\uC758 \uACE0\uAC08" },
  { id: 4, name: "The Emperor", nameKo: "\uD669\uC81C", arcana: "major", keywords: ["\uC9C8\uC11C", "\uD1B5\uC81C", "\uCC45\uC784"], dreamMeaning: "\uD754\uB4E4\uB9AC\uB294 \uC0C1\uD669\uC744 \uBD99\uB4E4\uACE0 \uC2F6\uC740 \uC758\uC9C0\uAC00 \uB4DC\uB7EC\uB0A9\uB2C8\uB2E4. \uACBD\uACC4\uC640 \uAD6C\uC870\uB97C \uB2E4\uC2DC \uC138\uC6B0\uB824\uB294 \uB9C8\uC74C\uC785\uB2C8\uB2E4.", uprightMeaning: "\uC548\uC815, \uAD8C\uC704, \uCC45\uC784 \uC788\uB294 \uACB0\uC815", reversedMeaning: "\uACBD\uC9C1, \uD1B5\uC81C \uBD88\uC548, \uAD8C\uC704\uC640\uC758 \uAE34\uC7A5" },
  { id: 5, name: "The Hierophant", nameKo: "\uAD50\uD669", arcana: "major", keywords: ["\uADDC\uBC94", "\uAC00\uB974\uCE68", "\uC758\uC2DD"], dreamMeaning: "\uC624\uB798\uB41C \uBBFF\uC74C\uACFC \uC0AC\uD68C\uC801 \uC57D\uC18D\uC774 \uAFC8\uC758 \uBC30\uACBD\uC5D0 \uBA38\uBB34\uB985\uB2C8\uB2E4. \uBC30\uC6B4 \uAC83\uACFC \uC9C4\uC9DC \uB9C8\uC74C \uC0AC\uC774\uC758 \uBB38\uD131\uC774 \uBE44\uCE69\uB2C8\uB2E4.", uprightMeaning: "\uC804\uD1B5, \uC870\uC5B8, \uC81C\uB3C4\uC801 \uC9C0\uD61C", reversedMeaning: "\uAD00\uC2B5 \uC800\uD56D, \uB0B4\uBA74\uC758 \uC2E0\uB150 \uC7AC\uC815\uB9BD" },
  { id: 6, name: "The Lovers", nameKo: "\uC5F0\uC778", arcana: "major", keywords: ["\uC120\uD0DD", "\uACB0\uD569", "\uAD00\uACC4"], dreamMeaning: "\uB204\uAD70\uAC00\uC640\uC758 \uC5F0\uACB0, \uD639\uC740 \uC790\uAE30 \uC548\uC758 \uB450 \uAC08\uB798 \uB9C8\uC74C\uC774 \uC11C\uB85C\uB97C \uBD80\uB985\uB2C8\uB2E4. \uC911\uC694\uD55C \uC120\uD0DD\uC758 \uC628\uB3C4\uAC00 \uD750\uB985\uB2C8\uB2E4.", uprightMeaning: "\uC0AC\uB791, \uC870\uD654, \uAC00\uCE58 \uC120\uD0DD", reversedMeaning: "\uBD88\uC77C\uCE58, \uB9DD\uC124\uC784, \uAD00\uACC4\uC758 \uADE0\uC5F4" },
  { id: 7, name: "The Chariot", nameKo: "\uC804\uCC28", arcana: "major", keywords: ["\uC804\uC9C4", "\uC758\uC9C0", "\uBC29\uD5A5"], dreamMeaning: "\uC6C0\uC9C1\uC774\uACE0 \uB3CC\uD30C\uD558\uB824\uB294 \uD798\uC774 \uAC15\uD569\uB2C8\uB2E4. \uC18D\uB3C4\uC640 \uD1B5\uC81C \uC0AC\uC774\uC758 \uADE0\uD615\uC774 \uAFC8\uC18D\uC5D0\uC11C \uC2DC\uD5D8\uBC1B\uC2B5\uB2C8\uB2E4.", uprightMeaning: "\uC2B9\uB9AC, \uCD94\uC9C4\uB825, \uC790\uAE30 \uD1B5\uC81C", reversedMeaning: "\uD3ED\uC8FC, \uC9C0\uC5F0, \uBC29\uD5A5 \uD63C\uC120" },
  { id: 8, name: "Strength", nameKo: "\uD798", arcana: "major", keywords: ["\uC6A9\uAE30", "\uC808\uC81C", "\uB0B4\uBA74"], dreamMeaning: "\uAC70\uCE5C \uAC10\uC815\uACFC \uBCF8\uB2A5\uC744 \uBD80\uB4DC\uB7FD\uAC8C \uB2E4\uB8E8\uB824\uB294 \uD798\uC774 \uB5A0\uC624\uB985\uB2C8\uB2E4. \uC5B5\uB204\uB984\uBCF4\uB2E4 \uB2E4\uC815\uD55C \uD1B5\uC81C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.", uprightMeaning: "\uC6A9\uAE30, \uC778\uB0B4, \uB530\uB73B\uD55C \uD1B5\uC81C", reversedMeaning: "\uC704\uCD95, \uBD84\uB178, \uC790\uC2E0\uAC10 \uC800\uD558" },
  { id: 9, name: "The Hermit", nameKo: "\uC740\uB454\uC790", arcana: "major", keywords: ["\uD0D0\uC0C9", "\uACE0\uB3C5", "\uC131\uCC30"], dreamMeaning: "\uD63C\uC790\uB9CC\uC758 \uAE38\uC5D0\uC11C \uB2F5\uC744 \uCC3E\uC73C\uB824\uB294 \uB9C8\uC74C\uC774 \uBE44\uCE69\uB2C8\uB2E4. \uC678\uBD80\uBCF4\uB2E4 \uB0B4\uBA74\uC758 \uB4F1\uBD88\uC774 \uAC00\uAE4C\uC6CC\uC9D1\uB2C8\uB2E4.", uprightMeaning: "\uB0B4\uBA74 \uD0D0\uAD6C, \uC2E0\uC911\uD568, \uC9C0\uD61C", reversedMeaning: "\uACE0\uB9BD, \uD68C\uD53C, \uB2EB\uD78C \uC0AC\uC720" },
  { id: 10, name: "Wheel of Fortune", nameKo: "\uC6B4\uBA85\uC758 \uC218\uB808\uBC14\uD034", arcana: "major", keywords: ["\uC804\uD658", "\uD750\uB984", "\uBC18\uBCF5"], dreamMeaning: "\uBC18\uBCF5\uB418\uB358 \uD750\uB984\uC774 \uB2E4\uB978 \uAD6D\uBA74\uC73C\uB85C \uB3CC\uC544\uC11C\uB824 \uD569\uB2C8\uB2E4. \uC6B0\uC5F0\uCC98\uB7FC \uBCF4\uC774\uB294 \uBCC0\uD654\uAC00 \uBB38\uD131\uC5D0 \uBA38\uBB34\uB985\uB2C8\uB2E4.", uprightMeaning: "\uBCC0\uD654, \uAE30\uD68C, \uC21C\uD658\uC758 \uC804\uD658", reversedMeaning: "\uC815\uCCB4, \uBC18\uBCF5, \uD750\uB984 \uC800\uD56D" },
  { id: 11, name: "Justice", nameKo: "\uC815\uC758", arcana: "major", keywords: ["\uADE0\uD615", "\uD310\uB2E8", "\uCC45\uC784"], dreamMeaning: "\uB9C8\uC74C\uC774 \uC5B4\uB5A4 \uC120\uD0DD\uC758 \uBB34\uAC8C\uB97C \uC7AC\uACE0 \uC788\uC2B5\uB2C8\uB2E4. \uACF5\uC815\uD568\uACFC \uC8C4\uCC45\uAC10\uC758 \uC800\uC6B8\uC774 \uAFC8\uC18D\uC5D0 \uB193\uC785\uB2C8\uB2E4.", uprightMeaning: "\uADE0\uD615, \uC9C4\uC2E4, \uCC45\uC784 \uC788\uB294 \uD310\uB2E8", reversedMeaning: "\uBD88\uADE0\uD615, \uD68C\uD53C, \uC5B5\uC6B8\uD568" },
  { id: 12, name: "The Hanged Man", nameKo: "\uB9E4\uB2EC\uB9B0 \uC0AC\uB78C", arcana: "major", keywords: ["\uC815\uC9C0", "\uD76C\uC0DD", "\uAD00\uC810"], dreamMeaning: "\uBA48\uCDA4 \uC18D\uC5D0\uC11C \uB2E4\uB978 \uC2DC\uC57C\uAC00 \uC5F4\uB9BD\uB2C8\uB2E4. \uB2F9\uC7A5 \uC6C0\uC9C1\uC774\uAE30\uBCF4\uB2E4 \uAC70\uAFB8\uB85C \uBC14\uB77C\uBCFC \uC2DC\uAC04\uC774 \uB2E4\uAC00\uC635\uB2C8\uB2E4.", uprightMeaning: "\uAD00\uC810 \uC804\uD658, \uC218\uC6A9, \uAE30\uB2E4\uB9BC", reversedMeaning: "\uBB34\uAE30\uB825, \uC9C0\uC5F0, \uC5B5\uC9C0 \uD76C\uC0DD" },
  { id: 13, name: "Death", nameKo: "\uC8FD\uC74C", arcana: "major", keywords: ["\uC885\uACB0", "\uBCC0\uD654", "\uD0C8\uD53C"], dreamMeaning: "\uB05D\uB09C \uAC83\uC744 \uB193\uACE0 \uC0C8 \uAECD\uC9C8\uB85C \uAC74\uB108\uAC00\uB824\uB294 \uD750\uB984\uC785\uB2C8\uB2E4. \uC0C1\uC2E4\uBCF4\uB2E4 \uBCC0\uD615\uC758 \uAE30\uC6B4\uC774 \uAE4A\uC2B5\uB2C8\uB2E4.", uprightMeaning: "\uC885\uB8CC, \uC804\uD658, \uC7AC\uC0DD", reversedMeaning: "\uBBF8\uB828, \uBCC0\uD654 \uAC70\uBD80, \uC624\uB798\uB41C \uC9D1\uCC29" },
  { id: 14, name: "Temperance", nameKo: "\uC808\uC81C", arcana: "major", keywords: ["\uC870\uC728", "\uD68C\uBCF5", "\uADE0\uD615"], dreamMeaning: "\uC11C\uB85C \uB2E4\uB978 \uAC10\uC815\uC758 \uBB3C\uC904\uAE30\uAC00 \uD55C \uADF8\uB987 \uC548\uC5D0\uC11C \uC11E\uC785\uB2C8\uB2E4. \uCE58\uC720\uC640 \uC870\uC808\uC758 \uB9AC\uB4EC\uC774 \uD750\uB985\uB2C8\uB2E4.", uprightMeaning: "\uC870\uD654, \uC808\uC81C, \uD68C\uBCF5", reversedMeaning: "\uACFC\uC789, \uBD88\uADE0\uD615, \uC870\uAE09\uD568" },
  { id: 15, name: "The Devil", nameKo: "\uC545\uB9C8", arcana: "major", keywords: ["\uC9D1\uCC29", "\uC695\uB9DD", "\uC18D\uBC15"], dreamMeaning: "\uB04A\uAE30 \uC5B4\uB824\uC6B4 \uC720\uD639\uC774\uB098 \uB450\uB824\uC6C0\uC774 \uADF8\uB9BC\uC790\uCC98\uB7FC \uBD99\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uBB36\uC778 \uACF3\uC744 \uC54C\uC544\uCC28\uB9AC\uB294 \uAFC8\uC785\uB2C8\uB2E4.", uprightMeaning: "\uC9D1\uCC29, \uC695\uB9DD, \uC5BD\uB9E4\uC784", reversedMeaning: "\uD574\uBC29\uC758 \uC2DC\uC791, \uC18D\uBC15 \uC778\uC2DD, \uC720\uD639\uC5D0\uC11C \uBC97\uC5B4\uB0A8" },
  { id: 16, name: "The Tower", nameKo: "\uD0D1", arcana: "major", keywords: ["\uBD95\uAD34", "\uCDA9\uACA9", "\uAC01\uC131"], dreamMeaning: "\uBD99\uB4E4\uACE0 \uC788\uB358 \uAD6C\uC870\uAC00 \uD754\uB4E4\uB9AC\uBA70 \uC228\uC740 \uC9C4\uC2E4\uC774 \uB4DC\uB7EC\uB0A9\uB2C8\uB2E4. \uCD94\uB77D\uACFC \uD3ED\uBC1C\uC740 \uAC11\uC791\uC2A4\uB7EC\uC6B4 \uAC01\uC131\uC744 \uAC00\uB9AC\uD0B5\uB2C8\uB2E4.", uprightMeaning: "\uAE09\uBCC0, \uBD95\uAD34, \uAE68\uB2EC\uC74C", reversedMeaning: "\uBCC0\uD654 \uC9C0\uC5F0, \uB0B4\uBD80 \uADE0\uC5F4, \uCDA9\uACA9 \uD68C\uD53C" },
  { id: 17, name: "The Star", nameKo: "\uBCC4", arcana: "major", keywords: ["\uD76C\uB9DD", "\uD68C\uBCF5", "\uC601\uAC10"], dreamMeaning: "\uC5B4\uB450\uC6B4 \uC7A5\uBA74 \uC18D\uC5D0\uC11C\uB3C4 \uD68C\uBCF5\uC758 \uBE5B\uC774 \uB0A8\uC544 \uC788\uC2B5\uB2C8\uB2E4. \uC18C\uB9DD\uACFC \uBBF8\uB798\uC758 \uAC10\uAC01\uC774 \uC870\uC6A9\uD788 \uBE44\uCE69\uB2C8\uB2E4.", uprightMeaning: "\uD76C\uB9DD, \uCE58\uC720, \uC601\uAC10", reversedMeaning: "\uB099\uB2F4, \uBBFF\uC74C \uC57D\uD654, \uD68C\uBCF5 \uC9C0\uC5F0" },
  { id: 18, name: "The Moon", nameKo: "\uB2EC", arcana: "major", keywords: ["\uBB34\uC758\uC2DD", "\uD658\uC0C1", "\uBD88\uC548"], dreamMeaning: "\uBAA8\uD638\uD55C \uAC10\uC815\uACFC \uC0C1\uC9D5\uC774 \uAE4A\uC740 \uBC24\uC758 \uBB3C\uACB0\uCC98\uB7FC \uCD9C\uB801\uC785\uB2C8\uB2E4. \uBD88\uC548\uC740 \uC228\uC740 \uC9C1\uAC10\uC758 \uBB38\uC744 \uB450\uB4DC\uB9BD\uB2C8\uB2E4.", uprightMeaning: "\uBB34\uC758\uC2DD, \uAFC8, \uC9C1\uAD00, \uBD88\uD655\uC2E4\uC131", reversedMeaning: "\uD63C\uB780\uC758 \uD574\uC18C, \uB450\uB824\uC6C0 \uC9C1\uBA74, \uC9C4\uC2E4\uC758 \uC724\uACFD" },
  { id: 19, name: "The Sun", nameKo: "\uD0DC\uC591", arcana: "major", keywords: ["\uBA85\uB8CC\uD568", "\uD65C\uB825", "\uAE30\uC068"], dreamMeaning: "\uC5B4\uB460 \uB4A4\uC5D0 \uBC1D\uC544\uC9C0\uB294 \uC774\uD574\uAC00 \uB5A0\uC624\uB985\uB2C8\uB2E4. \uBAB8\uACFC \uB9C8\uC74C\uC774 \uB354 \uB2E8\uC21C\uD55C \uC9C4\uC2E4\uC744 \uD5A5\uD569\uB2C8\uB2E4.", uprightMeaning: "\uAE30\uC068, \uC131\uACF5, \uBA85\uB8CC\uD568", reversedMeaning: "\uD65C\uB825 \uC800\uD558, \uACFC\uD55C \uB099\uAD00, \uD750\uB9B0 \uD655\uC2E0" },
  { id: 20, name: "Judgement", nameKo: "\uC2EC\uD310", arcana: "major", keywords: ["\uAC01\uC131", "\uBD80\uB984", "\uC7AC\uD3C9\uAC00"], dreamMeaning: "\uACFC\uAC70\uC758 \uC7A5\uBA74\uC774 \uB2E4\uC2DC \uB5A0\uC62C\uB77C \uC0C8\uB85C\uC6B4 \uC751\uB2F5\uC744 \uC694\uAD6C\uD569\uB2C8\uB2E4. \uC624\uB798 \uBBF8\uB904\uB454 \uBD80\uB984\uC774 \uC120\uBA85\uD574\uC9D1\uB2C8\uB2E4.", uprightMeaning: "\uAC01\uC131, \uC18C\uBA85, \uC7AC\uD0C4\uC0DD", reversedMeaning: "\uC790\uAE30\uBE44\uD310, \uD68C\uD53C, \uBD80\uB984\uC744 \uBBF8\uB8F8" },
  { id: 21, name: "The World", nameKo: "\uC138\uACC4", arcana: "major", keywords: ["\uC644\uC131", "\uD1B5\uD569", "\uC21C\uD658"], dreamMeaning: "\uD769\uC5B4\uC9C4 \uACBD\uD5D8\uC774 \uD558\uB098\uC758 \uC6D0\uC73C\uB85C \uBB36\uC774\uB824 \uD569\uB2C8\uB2E4. \uB9C8\uCE68\uACFC \uC2DC\uC791\uC774 \uAC19\uC740 \uBB38\uC5D0\uC11C \uB9CC\uB0A9\uB2C8\uB2E4.", uprightMeaning: "\uC644\uC131, \uC131\uCDE8, \uD1B5\uD569", reversedMeaning: "\uBBF8\uC644\uC131, \uC9C0\uC5F0, \uB9C8\uBB34\uB9AC \uBD80\uC871" }
];
var DREAM_THEME_RULES = [
  { pattern: /(떨어|추락|낙하|무너|붕괴|폭발|지진)/i, cards: [16, 18, 12], themes: ["\uCD94\uB77D", "\uD1B5\uC81C \uC0C1\uC2E4", "\uAC01\uC131"] },
  { pattern: /(날|비행|하늘|구름|새|공중)/i, cards: [0, 17, 19], themes: ["\uC790\uC720", "\uB3C4\uC57D", "\uAC00\uB2A5\uC131"] },
  { pattern: /(물|바다|강|호수|비|홍수|파도|잠수)/i, cards: [18, 14, 2], themes: ["\uAC10\uC815", "\uBB34\uC758\uC2DD", "\uC815\uD654"] },
  { pattern: /(쫓|도망|괴물|귀신|공포|위협|숨)/i, cards: [15, 18, 7], themes: ["\uB450\uB824\uC6C0", "\uADF8\uB9BC\uC790", "\uD68C\uD53C"] },
  { pattern: /(죽|장례|무덤|끝|헤어|이별|사라)/i, cards: [13, 20, 10], themes: ["\uC885\uACB0", "\uBCC0\uD615", "\uC7AC\uD0C4\uC0DD"] },
  { pattern: /(집|방|문|계단|학교|회사|사무실|건물)/i, cards: [4, 5, 9], themes: ["\uAD6C\uC870", "\uC5ED\uD560", "\uB0B4\uBA74\uC758 \uBC29"] },
  { pattern: /(가족|엄마|아빠|아이|아기|연인|친구|결혼)/i, cards: [6, 3, 11], themes: ["\uAD00\uACC4", "\uC560\uCC29", "\uC120\uD0DD"] },
  { pattern: /(시험|지각|실패|점수|판단|혼남)/i, cards: [11, 5, 9], themes: ["\uD3C9\uAC00", "\uCC45\uC784", "\uBD88\uC548"] },
  { pattern: /(차|기차|버스|길|여행|운전|역|공항)/i, cards: [7, 10, 0], themes: ["\uC774\uB3D9", "\uC804\uD658", "\uC9C4\uB85C"] },
  { pattern: /(동물|개|고양이|뱀|사자|말|새)/i, cards: [8, 18, 15], themes: ["\uBCF8\uB2A5", "\uAC10\uAC01", "\uADF8\uB9BC\uC790"] },
  { pattern: /(거울|얼굴|알몸|몸|피부|머리|눈)/i, cards: [2, 11, 18], themes: ["\uC790\uAE30\uC0C1", "\uBE44\uBC00", "\uBBFC\uAC10\uD568"] },
  { pattern: /(불|화재|태양|빛|번개|뜨거)/i, cards: [19, 16, 1], themes: ["\uC5F4\uB9DD", "\uD3ED\uB85C", "\uD65C\uB825"] }
];
function clampDreamCardCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(5, parsed));
}
function compactDreamText(text, limit = 260) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  return compact.length > limit ? `${compact.slice(0, limit - 1)}\u2026` : compact;
}
function uniqueList(items, limit = 8) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of items || []) {
    const value = String(item || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}
function seededIndex(text, offset, modulo) {
  let hash = 17 + offset * 31;
  const source = String(text || "");
  for (let i = 0; i < source.length; i += 1) {
    hash = hash * 33 + source.charCodeAt(i) + offset >>> 0;
  }
  return modulo > 0 ? hash % modulo : 0;
}
function inferDreamThemes(dreamText) {
  const themes = [];
  for (const rule of DREAM_THEME_RULES) {
    if (rule.pattern.test(dreamText)) themes.push(...rule.themes);
  }
  return uniqueList(themes.length ? themes : ["\uBB34\uC758\uC2DD", "\uAC10\uC815\uC758 \uC794\uD5A5", "\uB0B4\uBA74\uC758 \uC804\uD658"], 5);
}
function chooseFallbackDreamCards(dreamText, requestedCount = 3) {
  const cardCount = clampDreamCardCount(requestedCount);
  const scores = new Map(DREAM_TAROT_CARDS.map((card) => [card.id, 0]));
  const themes = [];
  for (const rule of DREAM_THEME_RULES) {
    if (!rule.pattern.test(dreamText)) continue;
    themes.push(...rule.themes);
    rule.cards.forEach((id, idx) => scores.set(id, (scores.get(id) || 0) + 12 - idx * 2));
  }
  if (/(불안|무서|두려|긴장|혼란|이상)/i.test(dreamText)) scores.set(18, (scores.get(18) || 0) + 8);
  if (/(기쁨|편안|따뜻|행복|웃)/i.test(dreamText)) scores.set(19, (scores.get(19) || 0) + 8);
  if (/(선택|갈림|고민|결정)/i.test(dreamText)) scores.set(6, (scores.get(6) || 0) + 8);
  if (/(반복|계속|또|다시)/i.test(dreamText)) scores.set(10, (scores.get(10) || 0) + 8);
  const ranked = DREAM_TAROT_CARDS.map((card) => ({ id: card.id, score: scores.get(card.id) || 0 })).sort((a, b) => b.score - a.score || a.id - b.id).map((entry) => entry.id);
  const selected = [];
  for (const id of ranked) {
    if ((scores.get(id) || 0) <= 0) break;
    selected.push(id);
    if (selected.length >= cardCount) break;
  }
  const fallbackIds = [18, 2, 16, 17, 10, 13, 6, 7, 14, 21, 0, 11];
  let offset = 0;
  while (selected.length < cardCount) {
    const id = fallbackIds[seededIndex(dreamText, offset, fallbackIds.length)];
    if (!selected.includes(id)) selected.push(id);
    offset += 1;
  }
  const selectedCardIds = selected.slice(0, cardCount);
  return {
    cardCount,
    selectedCardIds,
    dreamThemes: uniqueList(themes.length ? themes : inferDreamThemes(dreamText), 5),
    analysisNote: buildDreamAnalysisNote(dreamText, selectedCardIds),
    cards: selectedCardIds.map((id) => DREAM_TAROT_CARDS.find((card) => card.id === id)).filter(Boolean)
  };
}
function buildDreamAnalysisNote(dreamText, selectedCardIds) {
  const names = selectedCardIds.map((id) => DREAM_TAROT_CARDS.find((card) => card.id === id)?.nameKo).filter(Boolean).join(", ");
  if (/(떨어|추락|무너)/i.test(dreamText)) return `${names}\uC758 \uC870\uD569\uC740 \uD754\uB4E4\uB9AC\uB294 \uD1B5\uC81C\uAC10\uACFC \uC0C8\uB86D\uAC8C \uC5F4\uB9AC\uB294 \uAC01\uC131\uC758 \uBB38\uC744 \uAC00\uB9AC\uD0B5\uB2C8\uB2E4.`;
  if (/(물|바다|비|강|파도)/i.test(dreamText)) return `${names}\uC758 \uC870\uD569\uC740 \uAE4A\uC740 \uAC10\uC815\uC758 \uBB3C\uACB0\uACFC \uBB34\uC758\uC2DD\uC758 \uC751\uB2F5\uC744 \uBE44\uCDA5\uB2C8\uB2E4.`;
  if (/(쫓|도망|공포|괴물)/i.test(dreamText)) return `${names}\uC758 \uC870\uD569\uC740 \uD53C\uD558\uACE0 \uC2F6\uC740 \uADF8\uB9BC\uC790\uC640 \uB9C8\uC8FC\uD560 \uD798\uC744 \uAC00\uB9AC\uD0B5\uB2C8\uB2E4.`;
  return `${names}\uC758 \uC870\uD569\uC740 \uAFC8\uC18D \uC0C1\uC9D5\uC774 \uB0A8\uAE34 \uC815\uC11C\uC640 \uC804\uD658\uC758 \uD750\uB984\uC744 \uBE44\uCDA5\uB2C8\uB2E4.`;
}
function normalizeDreamPromptCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards.slice(0, 5).map((entry, idx) => {
    const id = Number.parseInt(entry?.id, 10);
    const base = DREAM_TAROT_CARDS.find((card) => card.id === id) || DREAM_TAROT_CARDS.find((card) => card.nameKo === entry?.nameKo) || DREAM_TAROT_CARDS[idx % DREAM_TAROT_CARDS.length];
    return {
      id: base.id,
      name: base.name,
      nameKo: String(entry?.nameKo || base.nameKo).trim(),
      isReversed: Boolean(entry?.isReversed || entry?.reversed || entry?.orientation === "reversed"),
      keywords: uniqueList(Array.isArray(entry?.keywords) && entry.keywords.length ? entry.keywords : base.keywords, 4),
      dreamMeaning: String(entry?.dreamMeaning || base.dreamMeaning).trim(),
      uprightMeaning: base.uprightMeaning,
      reversedMeaning: base.reversedMeaning
    };
  });
}
function buildDreamPromptFallback({ dreamText, dreamThemes, cards }) {
  const compact = compactDreamText(dreamText, 260);
  const themeLine = uniqueList(dreamThemes, 5).join(", ") || "\uBB34\uC758\uC2DD, \uAC10\uC815\uC758 \uC794\uD5A5";
  const cardLine = cards.map((card) => {
    const orientation = card.isReversed ? "\uC5ED\uBC29\uD5A5" : "\uC815\uBC29\uD5A5";
    const keywords = uniqueList(card.keywords, 3).join(", ");
    return `${card.nameKo}(${orientation}: ${keywords})`;
  }).join(" / ");
  return [
    `\uB2E4\uC74C \uAFC8\uC744 \uD0C0\uB85C\uC640 \uAFC8 \uC2EC\uB9AC\uD559\uC758 \uAD00\uC810\uC73C\uB85C \uAE4A\uC774 \uD574\uC11D\uD574 \uC8FC\uC138\uC694. \uAFC8\uC758 \uC6D0\uBB38\uC740 "${compact}"\uC785\uB2C8\uB2E4.`,
    `\uC911\uC2EC \uC8FC\uC81C\uB294 ${themeLine}\uC774\uBA70, \uBF51\uD78C \uCE74\uB4DC\uB294 ${cardLine}\uC785\uB2C8\uB2E4.`,
    "\uAC01 \uCE74\uB4DC\uAC00 \uAFC8\uC758 \uC7A5\uBA74, \uAC10\uC815, \uC778\uBB3C, \uC7A5\uC18C\uC640 \uC5B4\uB5BB\uAC8C \uB9DE\uBB3C\uB9AC\uB294\uC9C0 \uC0B4\uD53C\uACE0, \uC815\uBC29\uD5A5\uACFC \uC5ED\uBC29\uD5A5\uC758 \uACB0\uC744 \uAD6C\uBD84\uD574 \uC8FC\uC138\uC694.",
    "\uC735\uC758 \uBB34\uC758\uC2DD, \uADF8\uB9BC\uC790, \uC0C1\uC9D5 \uC6D0\uD615\uC758 \uAD00\uC810\uC744 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC5EE\uC5B4 \uD604\uC7AC \uB0B4\uBA74\uC5D0\uC11C \uAC15\uD558\uAC8C \uB5A0\uC624\uB974\uB294 \uBA54\uC2DC\uC9C0\uB97C \uC9DA\uC5B4 \uC8FC\uC138\uC694.",
    "\uB9C8\uC9C0\uB9C9\uC5D0\uB294 \uC81C\uAC00 \uC624\uB298 \uBD99\uB4E4\uC5B4\uC57C \uD560 \uD55C \uBB38\uC7A5, \uD604\uC2E4\uC5D0\uC11C \uC2E4\uCC9C\uD560 \uC791\uC740 \uC758\uC2DD, \uADF8\uB9AC\uACE0 \uC2A4\uC2A4\uB85C\uC5D0\uAC8C \uB358\uC9C8 \uC9C8\uBB38 3\uAC00\uC9C0\uB97C \uB0A8\uACA8 \uC8FC\uC138\uC694."
  ].join(" ");
}
async function handleDreamTarotSelection(request) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }
  const selection = chooseFallbackDreamCards(normalized.text, body?.cardCount || body?.count || 3);
  return json({
    ok: true,
    cached: false,
    ...selection,
    source: "local",
    model: "local-symbol-matcher",
    message: "ok"
  });
}
async function handleDreamPrompt(request) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }
  let cards = normalizeDreamPromptCards(body?.cards);
  if (!cards.length) {
    cards = chooseFallbackDreamCards(normalized.text, body?.cardCount || 3).cards.map((card) => ({
      ...card,
      isReversed: false
    }));
  }
  const dreamThemes = uniqueList(body?.dreamThemes || inferDreamThemes(normalized.text), 5);
  const dreamPrompt = buildDreamPromptFallback({ dreamText: normalized.text, dreamThemes, cards });
  return json({
    ok: true,
    cached: false,
    dreamPrompt,
    promptText: dreamPrompt,
    source: "local",
    model: "local-prompt-weaver",
    message: "ok"
  });
}
function normalizeConsultTone(value) {
  const tone = String(value || "comfort").trim().toLowerCase();
  if (tone === "motivation" || tone === "coaching") return tone;
  return "comfort";
}
function normalizeConsultCards(cards) {
  const list = Array.isArray(cards) ? cards : [];
  const normalized = list.slice(0, 3).map((item, idx) => {
    const name = String(item?.name || item?.card_name || `\uCE74\uB4DC ${idx + 1}`).trim();
    const orientation = String(item?.orientation || "upright").toLowerCase() === "reversed" ? "reversed" : "upright";
    const keywords = Array.isArray(item?.keywords) ? item.keywords.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 5) : [];
    return { name, orientation, keywords };
  }).filter((item) => item.name);
  if (!normalized.length) {
    return { ok: false, message: "\uCE74\uB4DC \uC815\uBCF4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." };
  }
  return { ok: true, cards: normalized };
}
function fallbackTarotConsultMarkdown({ dreamText, cards }) {
  const compact = String(dreamText || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const cardLine = cards.map((card) => card.name).join(" \xB7 ");
  return [
    "## \uAFC8\uC758 \uBB38\uC744 \uC5EC\uB294 \uCE74\uB4DC",
    `${cardLine || "\uC624\uB298\uC758 \uCE74\uB4DC"} \uC870\uD569\uC740 \uAFC8\uC18D \uC7A5\uBA74("${compact}")\uC774 \uB2E8\uC21C\uD55C \uC794\uC0C1\uC774 \uC544\uB2C8\uB77C, \uC9C0\uAE08 \uB9C8\uC74C\uC774 \uBD99\uC7A1\uACE0 \uC788\uB294 \uBB38\uC744 \uBE44\uCD94\uACE0 \uC788\uC74C\uC744 \uB4DC\uB7EC\uB0C5\uB2C8\uB2E4. \uC774 \uBB38\uC740 \uBD88\uC548\uC744 \uD0A4\uC6B0\uAE30 \uC704\uD55C \uAC83\uC774 \uC544\uB2C8\uB77C, \uC544\uC9C1 \uC774\uB984 \uBD99\uC774\uC9C0 \uBABB\uD55C \uAC10\uC815\uACFC \uD544\uC694\uB97C \uC870\uC6A9\uD788 \uB4DC\uB7EC\uB0B4\uB294 \uD1B5\uB85C\uC5D0 \uAC00\uAE5D\uC2B5\uB2C8\uB2E4.`,
    "\uB2F9\uC7A5 \uACB0\uB860\uC744 \uB0B4\uB9AC\uAE30\uBCF4\uB2E4, \uC624\uB298 \uB2E4\uB8F0 \uC218 \uC788\uB294 \uD55C \uC7A5\uBA74\uB9CC \uACE8\uB77C \uD604\uC2E4\uC758 \uC791\uC740 \uD589\uB3D9\uC73C\uB85C \uC62E\uAE38 \uB54C \uAFC8\uC758 \uD30C\uC7A5\uC774 \uC548\uC815\uB429\uB2C8\uB2E4.",
    "",
    "## \uB9C8\uC74C \uC544\uB798 \uD750\uB974\uB294 \uAC10\uC815",
    "\uC9C0\uAE08 \uAC10\uC815\uC758 \uC911\uC2EC\uC5D0\uB294 \uB450\uB824\uC6C0 \uC790\uCCB4\uBCF4\uB2E4, \uB0B4\uAC00 \uB193\uCE58\uACE0 \uC2F6\uC9C0 \uC54A\uC740 \uC548\uC815\uACFC \uD655\uC778\uBC1B\uACE0 \uC2F6\uC740 \uB9C8\uC74C\uC774 \uD568\uAED8 \uD750\uB985\uB2C8\uB2E4. \uADF8\uB798\uC11C \uC0DD\uAC01\uC740 \uB9CE\uC544\uC9C0\uC9C0\uB9CC, \uC2E4\uC81C \uD589\uB3D9\uC740 \uB2A6\uC5B4\uC9C0\uB294 \uD328\uD134\uC774 \uB098\uD0C0\uB0A0 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    "\uC9C0\uAE08 \uD544\uC694\uD55C \uAC83\uC740 \uC644\uBCBD\uD55C \uD574\uB2F5\uC774 \uC544\uB2C8\uB77C, \uAE68\uC5B4\uB09C \uB4A4 \uB0A8\uC740 \uAC10\uC815\uC744 \uC0AC\uC2E4\uACFC \uBD84\uB9AC\uD574 \uC801\uC5B4\uBCF4\uB294 \uC9E7\uC740 \uC815\uB9AC\uC785\uB2C8\uB2E4. \uAC10\uC815\uC758 \uC774\uB984\uC744 \uBD99\uC774\uB294 \uC21C\uAC04 \uAFC8\uC740 \uB9C9\uC5F0\uD55C \uC608\uAC10\uC774 \uC544\uB2C8\uB77C \uB098\uB97C \uB3CC\uBCF4\uB294 \uC5B8\uC5B4\uAC00 \uB429\uB2C8\uB2E4.",
    "",
    "## \uC624\uB298\uC758 \uC791\uC740 \uC120\uD0DD 3\uAC00\uC9C0",
    "- \uAFC8\uC5D0\uC11C \uAC00\uC7A5 \uC120\uBA85\uD588\uB358 \uC7A5\uBA74 \uD558\uB098\uB97C \uC801\uACE0, \uADF8\uB54C\uC758 \uAC10\uC815\uC744 \uD55C \uB2E8\uC5B4\uB85C \uBD09\uC778\uD558\uAE30",
    "- \uAD00\uACC4\uB098 \uC77C\uC5D0\uC11C \uBBF8\uB904 \uB454 \uD655\uC778 \uD558\uB098\uB97C \uC624\uB298 \uAC00\uB2A5\uD55C \uAC00\uC7A5 \uC791\uC740 \uBC29\uC2DD\uC73C\uB85C \uC815\uB9AC\uD558\uAE30",
    "- \uC7A0\uB4E4\uAE30 \uC804 5\uBD84 \uB3D9\uC548 \uC870\uBA85\uC744 \uB0AE\uCD94\uACE0, \uC624\uB298\uC758 \uAC10\uC815\uC744 \uC138 \uBB38\uC7A5\uC73C\uB85C \uB0B4\uB824\uB193\uAE30",
    "",
    "## \uAD00\uACC4/\uC77C/\uD68C\uBCF5\uC758 \uAE38",
    "- \uAD00\uACC4: \uC0C1\uB300\uC758 \uB9C8\uC74C\uC744 \uB2E8\uC815\uD558\uAE30\uBCF4\uB2E4, \uB0B4\uAC00 \uBC14\uB77C\uB294 \uC548\uC815\uACFC \uAC70\uB9AC\uAC10\uC744 \uBA3C\uC800 \uD55C \uBB38\uC7A5\uC73C\uB85C \uC815\uB9AC\uD558\uC138\uC694.",
    "- \uC77C/\uB3C8: \uD070 \uACB0\uC815\uBCF4\uB2E4 \uC774\uBC88 \uC8FC \uBD80\uB2F4\uC744 \uC904\uC774\uB294 \uC791\uC740 \uC2E4\uD589\uC744 \uC6B0\uC120\uD558\uBA74 \uD750\uB984\uC774 \uB9D1\uC544\uC9D1\uB2C8\uB2E4.",
    "- \uD68C\uBCF5: \uD68C\uBCF5 \uB8E8\uD2F4\uC740 \uAE38\uC774\uBCF4\uB2E4 \uBC18\uBCF5\uC774 \uC911\uC694\uD569\uB2C8\uB2E4. \uC9E7\uC740 \uAE30\uB85D\uACFC \uD638\uD761\uB9CC\uC73C\uB85C\uB3C4 \uBC24\uC758 \uD30C\uC7A5\uC774 \uB0AE\uC544\uC9D1\uB2C8\uB2E4.",
    "",
    "## \uBD09\uC778 \uBB38\uC7A5",
    "\uB098\uB294 \uAFC8\uC774 \uB0A8\uAE34 \uC794\uD5A5\uC744 \uC624\uB298\uC758 \uC791\uACE0 \uC548\uC804\uD55C \uC120\uD0DD\uC73C\uB85C \uBD09\uC778\uD55C\uB2E4."
  ].join("\n");
}
function sectionText(markdown, heading) {
  const source = String(markdown || "");
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`##\\s*${escaped}\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const found = source.match(pattern);
  return found ? String(found[1] || "").trim() : "";
}
function firstMeaningfulLine(text) {
  return String(text || "").split(/\n+/).map((line) => String(line || "").replace(/^[-*]\s*/, "").trim()).find(Boolean) || "";
}
function extractActionPlan(markdown) {
  const section = sectionText(markdown, "\uC624\uB298\uC758 \uC791\uC740 \uC120\uD0DD 3\uAC00\uC9C0");
  const lines = section.split(/\n+/).map((line) => String(line || "").trim()).filter((line) => /^[-*]\s+/.test(line)).map((line) => line.replace(/^[-*]\s+/, "").trim()).filter(Boolean);
  return lines.slice(0, 3);
}
function cleanPromptText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}
function uniquePromptItems(items, limit = 8) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const text = cleanPromptText(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}
function normalizeDreamPromptContext(context) {
  return (Array.isArray(context) ? context : []).slice(0, 5).map((entry) => {
    const keyword = cleanPromptText(entry?.keyword || entry?.title || entry?.name);
    const meaning = cleanPromptText(entry?.meaning || entry?.summary || entry?.tip || entry?.text);
    if (!keyword && !meaning) return "";
    return keyword && meaning ? `${keyword}: ${meaning}` : keyword || meaning;
  }).filter(Boolean);
}
function collectDreamPromptKeywords(dreamText, localReading, dreamLibraryContext) {
  const localKeywords = Array.isArray(localReading?.keywords) ? localReading.keywords : [];
  const cardKeywords = Array.isArray(localReading?.cards) ? localReading.cards.map((card) => card?.keyword || card?.energy_keyword || card?.card_name) : [];
  const contextKeywords = normalizeDreamPromptContext(dreamLibraryContext).map((line) => line.split(":")[0]);
  const dreamTokens = cleanPromptText(dreamText).split(/\s+/).filter((token) => token.length >= 2).slice(0, 5);
  return uniquePromptItems([...localKeywords, ...cardKeywords, ...contextKeywords, ...dreamTokens], 10);
}
function dreamPromptToneLine(tone) {
  if (tone === "motivation") return "\uBB38\uCCB4\uB294 \uB530\uB73B\uD558\uC9C0\uB9CC \uD798 \uC788\uAC8C \uD750\uB974\uACE0, \uC0AC\uC6A9\uC790\uAC00 \uC624\uB298 \uBC14\uB85C \uBD99\uC7A1\uC744 \uC218 \uC788\uB294 \uC9C8\uBB38\uC744 \uB0A8\uAE41\uB2C8\uB2E4.";
  if (tone === "coaching") return "\uBB38\uCCB4\uB294 \uC9C8\uBB38\uC744 \uC120\uBA85\uD558\uAC8C \uC9DA\uB294 \uC0C1\uB2F4 \uD1A4\uC73C\uB85C \uD750\uB974\uACE0, \uAC10\uC815\uACFC \uD604\uC2E4 \uD589\uB3D9\uC758 \uACBD\uACC4\uB97C \uCC28\uBD84\uD788 \uB098\uB215\uB2C8\uB2E4.";
  return "\uBB38\uCCB4\uB294 \uCC28\uBD84\uD558\uACE0 \uC548\uC804\uD558\uAC8C \uD750\uB974\uBA70, \uBD88\uC548\uC744 \uD0A4\uC6B0\uB294 \uB2E8\uC815 \uB300\uC2E0 \uB9C8\uC74C\uC744 \uC815\uB3C8\uD558\uB294 \uBB38\uC7A5\uC744 \uB0A8\uAE41\uB2C8\uB2E4.";
}
function buildDreamPromptCards(keywords) {
  return [
    { card_name: "\uC7A5\uBA74 \uCE74\uB4DC", symbol: "\u{1F319}", energy_keyword: keywords[0] || "\uAFC8 \uC6D0\uBB38" },
    { card_name: "\uC0C1\uC9D5 \uCE74\uB4DC", symbol: "\u2726", energy_keyword: keywords[1] || "\uC0C1\uC9D5 \uB2E8\uC11C" },
    { card_name: "\uC9C8\uBB38 \uCE74\uB4DC", symbol: "\u{1FA84}", energy_keyword: keywords[2] || "\uC0C1\uB2F4 \uC9C8\uBB38" }
  ];
}
function buildDreamPromptText({ dreamText, tone, keywords, dreamLibraryContext }) {
  const keywordLine = keywords.length ? keywords.slice(0, 8).join(" \xB7 ") : "\uAFC8 \uC7A5\uBA74 \xB7 \uAC10\uC815 \uC794\uD5A5 \xB7 \uB2E4\uC74C \uC9C8\uBB38";
  const contextLines = normalizeDreamPromptContext(dreamLibraryContext);
  const contextBlock = contextLines.length ? contextLines.map((line) => `- ${line}`).join("\n") : "- \uAFC8 \uC6D0\uBB38 \uC548\uC5D0\uC11C \uBC18\uBCF5\uB418\uB294 \uC7A5\uBA74\uACFC \uAC10\uC815\uC758 \uACB0\uC744 \uC6B0\uC120 \uC0B4\uD54D\uB2C8\uB2E4.";
  return [
    "\uB2F9\uC2E0\uC740 \uAFC8 \uC0C1\uC9D5 \uD574\uC11D\uAC00\uC785\uB2C8\uB2E4.",
    "\uC544\uB798 \uAFC8\uC744 \uD655\uC815 \uC608\uC5B8\uC73C\uB85C \uBAB0\uC544\uAC00\uC9C0 \uB9D0\uACE0, \uAFC8\uC18D \uC7A5\uBA74\uACFC \uAE68\uC5B4\uB09C \uB4A4\uC758 \uAC10\uC815\uC774 \uC5B4\uB514\uC5D0 \uBA38\uBB34\uB294\uC9C0 \uC804\uBB38\uC801\uC778 \uC0C1\uB2F4 \uBB38\uC7A5\uC73C\uB85C \uD480\uC5B4 \uC8FC\uC138\uC694.",
    dreamPromptToneLine(tone),
    "",
    "[\uAFC8 \uC6D0\uBB38]",
    dreamText,
    "",
    "[\uD575\uC2EC \uB2E8\uC11C]",
    keywordLine,
    "",
    "[\uC0C1\uC9D5 \uCC38\uACE0]",
    contextBlock,
    "",
    "[\uC751\uB2F5\uC758 \uADF8\uB987]",
    "1. \uAFC8\uC758 \uCCAB\uBE5B: \uAC00\uC7A5 \uC120\uBA85\uD55C \uC7A5\uBA74 \uD558\uB098\uB97C \uACE0\uB974\uACE0, \uADF8 \uC7A5\uBA74\uC774 \uB9C8\uC74C \uC548\uC5D0\uC11C \uC5B4\uB5A4 \uBB38\uC744 \uC5F4\uC5C8\uB294\uC9C0 \uB4DC\uB7EC\uB0B4 \uC8FC\uC138\uC694.",
    "2. \uAC10\uC815\uC758 \uC794\uD5A5: \uAE68\uC5B4\uB09C \uB4A4 \uB0A8\uC740 \uAC10\uC815\uC744 \uC774\uB984 \uBD99\uC774\uACE0, \uADF8 \uAC10\uC815\uC774 \uAD00\uACC4\xB7\uC77C\xB7\uD68C\uBCF5 \uC911 \uC5B4\uB514\uC5D0 \uAE30\uC6B8\uC5B4 \uC788\uB294\uC9C0 \uBE44\uCDB0 \uC8FC\uC138\uC694.",
    "3. \uC228\uC740 \uC0C1\uC9D5: \uBC18\uBCF5\uB418\uB294 \uC874\uC7AC, \uC7A5\uC18C, \uC0AC\uBB3C\uC758 \uC0C1\uC9D5\uC744 \uD558\uB098\uC758 \uD750\uB984\uC73C\uB85C \uC5EE\uC5B4 \uC8FC\uC138\uC694.",
    "4. \uC624\uB298\uC758 \uC9C8\uBB38: \uC0AC\uC6A9\uC790\uAC00 \uC2A4\uC2A4\uB85C\uC5D0\uAC8C \uB358\uC9C8 \uC9C8\uBB38 3\uAC00\uC9C0\uB97C \uBD80\uB4DC\uB7FD\uAC8C \uB0A8\uACA8 \uC8FC\uC138\uC694.",
    "5. \uC791\uC740 \uC758\uC2DD: \uC7A0\uB4E4\uAE30 \uC804 5\uBD84 \uC548\uC5D0 \uD560 \uC218 \uC788\uB294 \uAE30\uB85D\xB7\uD638\uD761\xB7\uC815\uB9AC \uB8E8\uD2F4\uC744 \uC81C\uC548\uD574 \uC8FC\uC138\uC694.",
    "6. \uBD09\uC778 \uBB38\uC7A5: \uAFC8\uC774 \uB0A8\uAE34 \uBE5B\uC744 \uC624\uB298\uC758 \uC120\uD0DD\uC73C\uB85C \uC62E\uAE30\uB294 \uD55C \uBB38\uC7A5\uC73C\uB85C \uB9C8\uBB34\uB9AC\uD574 \uC8FC\uC138\uC694.",
    "",
    "[\uBD09\uC778\uD560 \uACBD\uACC4]",
    "- \uC8FD\uC74C, \uC9C8\uBCD1, \uC784\uC2E0, \uD569\uACA9, \uD22C\uC790, \uC774\uBCC4 \uC5EC\uBD80\uB97C \uD655\uC815\uD558\uC9C0 \uB9C8\uC138\uC694.",
    "- \uACF5\uD3EC\uB97C \uD0A4\uC6B0\uB294 \uACBD\uACE0\uBB38\uC774\uB098 \uC6B4\uBA85 \uB2E8\uC815\uC740 \uD53C\uD558\uC138\uC694.",
    "- \uC81C\uC791 \uACFC\uC815\uACFC \uB3C4\uAD6C \uC774\uB984\uC740 \uC7A5\uB9C9 \uB4A4\uC5D0 \uB450\uC138\uC694."
  ].join("\n");
}
function buildDreamPromptRecord({ dreamText, tone, localReading, dreamLibraryContext }) {
  const keywords = collectDreamPromptKeywords(dreamText, localReading, dreamLibraryContext);
  const cards = buildDreamPromptCards(keywords);
  const promptText = buildDreamPromptText({ dreamText, tone, keywords, dreamLibraryContext });
  return {
    id: `dream-prompt-${Date.now()}`,
    kind: "dream_prompt",
    title: "\uAFC8 \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131\uC11C",
    summary: "\uAFC8\uC758 \uC7A5\uBA74\uACFC \uAC10\uC815\uC758 \uC794\uD5A5\uC774 ?? ??\uC5D0\uAC8C \uAC74\uB12C \uC9C8\uBB38\uC758 \uC911\uC2EC\uC73C\uB85C \uBAA8\uC600\uC2B5\uB2C8\uB2E4.",
    stageReadings: {
      scene: "\uAFC8 \uC6D0\uBB38\uC5D0\uC11C \uAC00\uC7A5 \uC120\uBA85\uD55C \uC7A5\uBA74\uC744 \uBA3C\uC800 \uBD99\uC7A1\uC2B5\uB2C8\uB2E4. \uC774 \uC7A5\uBA74\uC740 \uD504\uB86C\uD504\uD2B8\uC758 \uCCAB \uBB38\uC744 \uC5F4\uACE0, \uC0C1\uB2F4\uC774 \uB9C9\uC5F0\uD55C \uD574\uBABD\uC73C\uB85C \uD769\uC5B4\uC9C0\uC9C0 \uC54A\uB3C4\uB85D \uC911\uC2EC\uC744 \uC7A1\uC2B5\uB2C8\uB2E4.",
      symbol: "\uBC18\uBCF5\uB418\uB294 \uC874\uC7AC\uC640 \uAC10\uC815\uC758 \uC794\uD5A5\uC744 \uD568\uAED8 \uBB36\uC2B5\uB2C8\uB2E4. \uC0C1\uC9D5\uC740 \uB2E8\uB3C5\uC73C\uB85C \uACE0\uC815\uB418\uC9C0 \uC54A\uACE0, \uAE68\uC5B4\uB09C \uB4A4 \uB0A8\uC740 \uB290\uB08C\uACFC \uD568\uAED8 \uD504\uB86C\uD504\uD2B8 \uC548\uC5D0\uC11C \uC0B4\uC544\uB0A9\uB2C8\uB2E4.",
      echo: "\uB9C8\uC9C0\uB9C9 \uC7A5\uC740 ?? ??\uC5D0\uAC8C \uAC74\uB12C \uC9C8\uBB38\uC758 \uBB38\uC744 \uAC00\uB9AC\uD0B5\uB2C8\uB2E4. \uAD00\uACC4, \uC77C, \uD68C\uBCF5 \uC911 \uC5B4\uB290 \uBB38\uC744 \uC5F4\uC9C0 \uC815\uD558\uBA74 \uAFC8\uC758 \uC5B8\uC5B4\uAC00 \uB354 \uB610\uB837\uD558\uAC8C \uD750\uB985\uB2C8\uB2E4."
    },
    goldenAdvice: "\uBD09\uC778 \uCE74\uB4DC \uC544\uB798 \uC644\uC131\uB41C \uD504\uB86C\uD504\uD2B8\uB97C \uADF8\uB300\uB85C \uC62E\uAE30\uBA74, \uAFC8\uC758 \uC794\uD5A5\uC774 \uC0C1\uB2F4 \uAC00\uB2A5\uD55C \uC9C8\uBB38\uC73C\uB85C \uC5F4\uB9BD\uB2C8\uB2E4.",
    actionPlan: [
      "\uAFC8 \uC6D0\uBB38\uC744 \uC904\uC774\uC9C0 \uC54A\uACE0 \uADF8\uB300\uB85C \uBD99\uC5EC \uB123\uAE30",
      "\uAE68\uC5B4\uB09C \uB4A4 \uB0A8\uC740 \uAC10\uC815\uC744 \uD55C \uB2E8\uC5B4\uB85C \uB367\uBD99\uC774\uAE30",
      "\uAD00\uACC4\xB7\uC77C\xB7\uD68C\uBCF5 \uC911 \uAC00\uC7A5 \uC54C\uACE0 \uC2F6\uC740 \uBB38 \uD558\uB098 \uACE0\uB974\uAE30"
    ],
    cards,
    keywords,
    promptText,
    consultingText: promptText,
    usedDreamText: dreamText,
    goldenCardName: "\uCD5C\uC885 \uD504\uB86C\uD504\uD2B8",
    goldenCardSymbol: "\u2736",
    source: "worker/local",
    model: "prompt-maker/local",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function handleDreamPromptMaker(request) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }
  const tone = normalizeConsultTone(body?.tone);
  const record = buildDreamPromptRecord({
    dreamText: normalized.text,
    tone,
    localReading: body?.localReading || {},
    dreamLibraryContext: body?.dreamLibraryContext || []
  });
  return json({
    ok: true,
    cached: false,
    record,
    message: "ok"
  });
}
async function handleTarotConsult(request) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }
  const cards = normalizeConsultCards(body?.cards);
  if (!cards.ok) {
    return json({ ok: false, message: cards.message }, { status: 400 });
  }
  const markdown = fallbackTarotConsultMarkdown({ dreamText: normalized.text, cards: cards.cards });
  const formatWarning = true;
  const summary = firstMeaningfulLine(sectionText(markdown, "\uAFC8\uC758 \uBB38\uC744 \uC5EC\uB294 \uCE74\uB4DC"));
  const goldenAdvice = firstMeaningfulLine(sectionText(markdown, "\uB9C8\uC74C \uC544\uB798 \uD750\uB974\uB294 \uAC10\uC815"));
  const actionPlan = extractActionPlan(markdown);
  return json({
    ok: true,
    cached: false,
    formatWarning,
    record: {
      id: `dream-tarot-consult-${Date.now()}`,
      consultingText: markdown,
      summary,
      goldenAdvice,
      actionPlan,
      source: "local",
      model: "fallback/local",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    message: "ok"
  });
}
var PSYCHO_DREAM_REQUIRED_HEADERS = Object.freeze([
  "Chapter 1. \uAFC8\uC758 \uC7A5\uBA74\uACFC \uD575\uC2EC \uC0C1\uC9D5",
  "Chapter 2. \uC815\uC2E0\uBD84\uC11D\uC801 \uD574\uC11D \u2014 \uBB34\uC758\uC2DD\uC758 \uC18C\uB9DD\uACFC \uAC08\uB4F1",
  "Chapter 3. \uC735 \uC2EC\uB9AC\uD559\uC801 \uD574\uC11D \u2014 \uB0B4\uBA74\uC758 \uC6D0\uD615\uACFC \uD1B5\uD569",
  "Chapter 4. \uC601\uC801 \uC0C1\uC9D5 \uD574\uBABD \u2014 \uAFC8\uC774 \uC804\uD558\uB294 \uC2E0\uBE44\uD55C \uBA54\uC2DC\uC9C0",
  "Chapter 5. \uD604\uC2E4 \uC870\uC5B8\uACFC \uCE58\uC720\uC758 \uBC29\uD5A5"
]);
var PSYCHO_DREAM_REQUIRED_PHRASES = Object.freeze([
  "\uAFC8\uC758 \uD575\uC2EC \uC7A5\uBA74 \uC694\uC57D",
  "\uD504\uB85C\uC774\uD2B8\uC2DD \uC18C\uB9DD \uCDA9\uC871 \uAD00\uC810",
  "\uADF8\uB9BC\uC790\uC640 \uC544\uB2C8\uB9C8/\uC544\uB2C8\uBB34\uC2A4\uC758 \uC791\uC6A9",
  "\uC774 \uAFC8\uC774 \uAC74\uB124\uB294 \uC2E0\uBE44\uB85C\uC6B4 \uBB38\uC7A5",
  "\uC624\uB298 \uD560 \uC218 \uC788\uB294 \uC791\uC740 \uD589\uB3D9"
]);
var PSYCHO_DREAM_POSITIVE_MARKERS = Object.freeze([
  "\uD589\uBCF5",
  "\uAE30\uC068",
  "\uCD95\uBCF5",
  "\uC0AC\uB791",
  "\uC548\uB3C4",
  "\uD3C9\uC628",
  "\uD3B8\uC548",
  "\uB530\uB73B",
  "\uD68C\uBCF5",
  "\uCE58\uC720",
  "\uC548\uC815",
  "\uD76C\uB9DD",
  "\uD654\uD574",
  "\uAE30\uB300"
]);
var PSYCHO_DREAM_HEALING_MARKERS = Object.freeze([
  "\uC704\uB85C",
  "\uB3CC\uBD04",
  "\uB2E4\uC815",
  "\uD3EC\uADFC",
  "\uD734\uC2DD",
  "\uC228",
  "\uC815\uB9AC",
  "\uBD80\uB4DC\uB7FD",
  "\uC548\uC2DD",
  "\uC870\uC728"
]);
var PSYCHO_DREAM_ANXIOUS_MARKERS = Object.freeze([
  "\uBD88\uC548",
  "\uACF5\uD3EC",
  "\uB3C4\uB9DD",
  "\uCD94\uB77D",
  "\uC8FD\uC74C",
  "\uC0C1\uC2E4",
  "\uBD84\uB178",
  "\uC8C4\uCC45\uAC10",
  "\uC555\uBC15",
  "\uC704\uAE30",
  "\uD63C\uB780",
  "\uBD95\uAD34",
  "\uD30C\uAD6D",
  "\uACBD\uACE0",
  "\uC545\uBABD"
]);
var PSYCHO_DREAM_LEAK_MARKERS = Object.freeze([
  /fallback/i,
  /payload/i,
  /json/i,
  /llm/i,
  /api/i
]);
function cleanPsychoText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}
function parseJsonCandidate(text) {
  const source = cleanPsychoText(text);
  if (!source) return null;
  const candidates = [source];
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(cleanPsychoText(fenced[1]));
  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(source.slice(firstBrace, lastBrace + 1));
  }
  const firstBracket = source.indexOf("[");
  const lastBracket = source.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    candidates.push(source.slice(firstBracket, lastBracket + 1));
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {
    }
  }
  return null;
}
function firstPsychoText(values) {
  for (const value of Array.isArray(values) ? values : []) {
    const text = cleanPsychoText(value);
    if (text) return text;
  }
  return "";
}
function countPsychoMarkerHits(text, markers) {
  const source = String(text || "");
  return (Array.isArray(markers) ? markers : []).reduce((count, marker) => {
    if (!marker) return count;
    return count + (source.includes(marker) ? 1 : 0);
  }, 0);
}
function normalizePsychoTone(body, dreamText) {
  const intake = body?.intake && typeof body.intake === "object" ? body.intake : {};
  const source = [
    dreamText,
    body?.emotion,
    body?.relationshipContext,
    body?.recurringConcern,
    body?.recentStressContext,
    body?.desiredOutcome,
    intake?.emotionalState,
    intake?.relationshipContext,
    intake?.recurringConcern,
    intake?.recentStressContext,
    intake?.desiredOutcome,
    Array.isArray(body?.peopleInDream) ? body.peopleInDream.join(" ") : body?.peopleInDream
  ].map((value) => cleanPsychoText(value)).join(" ");
  const happyScore = countPsychoMarkerHits(source, PSYCHO_DREAM_POSITIVE_MARKERS);
  const healingScore = countPsychoMarkerHits(source, PSYCHO_DREAM_HEALING_MARKERS);
  const anxiousScore = countPsychoMarkerHits(source, PSYCHO_DREAM_ANXIOUS_MARKERS);
  let primary = "neutral";
  if (happyScore > 0 || healingScore > 0) {
    if (anxiousScore === 0) {
      primary = happyScore >= healingScore ? "happy" : "healing";
    } else if (anxiousScore > happyScore + healingScore) {
      primary = "anxious";
    } else {
      primary = "mixed";
    }
  } else if (anxiousScore > 0) {
    primary = "anxious";
  }
  const signals = uniqueList([
    ...PSYCHO_DREAM_POSITIVE_MARKERS.filter((marker) => source.includes(marker)),
    ...PSYCHO_DREAM_HEALING_MARKERS.filter((marker) => source.includes(marker)),
    ...PSYCHO_DREAM_ANXIOUS_MARKERS.filter((marker) => source.includes(marker))
  ], 8);
  return {
    primary,
    signals,
    scores: {
      happy: happyScore,
      healing: healingScore,
      anxious: anxiousScore
    }
  };
}
function buildPsychoPrompt(body, dreamText, tone) {
  const intake = body?.intake && typeof body.intake === "object" ? body.intake : {};
  const people = Array.isArray(body?.peopleInDream) ? uniqueList(body.peopleInDream, 8).join(", ") : cleanPsychoText(body?.peopleInDream);
  const places = Array.isArray(body?.placesInDream) ? uniqueList(body.placesInDream, 8).join(", ") : cleanPsychoText(body?.placesInDream);
  const symbols = Array.isArray(body?.symbolsInDream) ? uniqueList(body.symbolsInDream, 8).join(", ") : cleanPsychoText(body?.symbolsInDream);
  return [
    "\uD504\uB85C\uC774\uD2B8\uC640 \uC735\uC758 \uC2DC\uC120\uC744 \uD568\uAED8 \uC0B4\uB824, \uAFC8\uC758 \uC7A5\uBA74\uC744 \uB2E4\uC815\uD558\uACE0 \uC815\uBC00\uD558\uAC8C \uC77D\uC5B4\uC8FC\uC138\uC694.",
    "\uD589\uBCF5\uD55C \uAFC8\uC774\uB77C\uBA74 \uBD88\uC548\uACFC \uACBD\uACE0\uB97C \uC5B5\uC9C0\uB85C \uB367\uC50C\uC6B0\uC9C0 \uB9D0\uACE0, \uAE34\uC7A5\uB41C \uAFC8\uC774\uB77C\uBA74 \uBB34\uC758\uC2DD\uC758 \uC18C\uB9DD\uACFC \uBC29\uC5B4\uB97C \uADE0\uD615 \uC788\uAC8C \uBE44\uCD94\uC138\uC694.",
    "",
    "[\uC0C1\uB2F4 \uBA54\uD0C0]",
    "- \uC11C\uBE44\uC2A4: \uC815\uC2E0\uBD84\uC11D \uD574\uBABD",
    "- \uCD9C\uB825 \uD615\uC2DD: Markdown 5\uC7A5 \uAD6C\uC870",
    `- \uD575\uC2EC \uD1A4: ${tone.primary}`,
    "- \uD574\uC11D \uC6D0\uCE59: \uC0C1\uC9D5\uC744 \uC5B5\uC9C0\uB85C \uACFC\uC7A5\uD558\uC9C0 \uB9D0\uACE0, \uAFC8\uC774 \uC8FC\uB294 \uC815\uC11C\uC758 \uACB0\uC744 \uBA3C\uC800 \uC874\uC911\uD558\uC138\uC694.",
    "",
    "[\uAFC8 \uAC10\uC815 \uCD94\uC815]",
    `- primary: ${tone.primary}`,
    `- signals: ${tone.signals.length ? tone.signals.join(", ") : "\uC5C6\uC74C"}`,
    "",
    "[\uC785\uB825 \uC815\uBCF4]",
    `- dreamText: ${dreamText}`,
    `- emotion: ${firstPsychoText([body?.emotion, intake.emotionalState])}`,
    `- recurringConcern: ${firstPsychoText([body?.recurringConcern, intake.recurringConcern])}`,
    `- recentStressContext: ${firstPsychoText([body?.recentStressContext, intake.recentStressContext])}`,
    `- desiredOutcome: ${firstPsychoText([body?.desiredOutcome, intake.desiredOutcome])}`,
    `- relationshipContext: ${firstPsychoText([body?.relationshipContext, intake.relationshipContext])}`,
    `- peopleInDream: ${people}`,
    `- placesInDream: ${places}`,
    `- symbolsInDream: ${symbols}`,
    "",
    "[\uCD9C\uB825 \uADDC\uCE59]",
    "- \uBC18\uB4DC\uC2DC \uB2E4\uC12F \uC7A5\uC73C\uB85C \uB098\uB204\uC5B4 \uC4F0\uC138\uC694.",
    "- Chapter 1\uBD80\uD130 Chapter 5\uAE4C\uC9C0 \uC21C\uC11C\uC640 \uC81C\uBAA9\uC744 \uC9C0\uD0A4\uC138\uC694.",
    "- \uAC01 \uC7A5\uC5D0\uB294 \uC9E7\uC740 \uC18C\uC81C\uBAA9\uACFC \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uD574\uC11D \uBB38\uC7A5\uC744 \uD568\uAED8 \uC801\uC73C\uC138\uC694.",
    "- \uB9C8\uC9C0\uB9C9 \uC7A5\uC5D0\uB294 \uC624\uB298 \uBC14\uB85C \uD560 \uC218 \uC788\uB294 \uC791\uC740 \uD589\uB3D9\uC744 \uBC18\uB4DC\uC2DC \uB123\uC73C\uC138\uC694.",
    "- \uACB0\uACFC\uC5D0\uB294 \uC2DC\uC2A4\uD15C \uBA54\uC2DC\uC9C0, JSON, API, LLM, payload, fallback \uAC19\uC740 \uB9D0\uC774 \uC11E\uC774\uC9C0 \uC54A\uAC8C \uD558\uC138\uC694."
  ].join("\n");
}
function buildPsychoFallbackMarkdown({ dreamText, tone, body }) {
  const intake = body?.intake && typeof body.intake === "object" ? body.intake : {};
  const snippet = cleanPsychoText(dreamText).slice(0, 180);
  const relationContext = firstPsychoText([body?.relationshipContext, intake.relationshipContext]);
  const peopleText = firstPsychoText([Array.isArray(body?.peopleInDream) ? body.peopleInDream.join(", ") : body?.peopleInDream]);
  const desireText = firstPsychoText([body?.desiredOutcome, intake.desiredOutcome]);
  const toneLabelMap = {
    happy: "\uBC1D\uC740 \uD655\uC2E0",
    healing: "\uD68C\uBCF5\uC758 \uD750\uB984",
    mixed: "\uACB9\uCCD0 \uC788\uB294 \uAC10\uC815",
    anxious: "\uBD88\uC548\uACFC \uACBD\uACC4",
    neutral: "\uC870\uC6A9\uD55C \uAD00\uCC30"
  };
  const openingMap = {
    happy: "\uC774 \uAFC8\uC740 \uAE30\uC068\uACFC \uAD00\uACC4\uC758 \uD655\uC2E0\uC774 \uBD80\uB4DC\uB7FD\uAC8C \uB5A0\uC624\uB974\uB294 \uC7A5\uBA74\uC785\uB2C8\uB2E4.",
    healing: "\uC774 \uAFC8\uC740 \uC9C0\uCE5C \uB9C8\uC74C\uC774 \uC2A4\uC2A4\uB85C\uB97C \uB3CC\uBCF4\uB824\uB294 \uD68C\uBCF5\uC758 \uD750\uB984\uC744 \uD488\uACE0 \uC788\uC2B5\uB2C8\uB2E4.",
    mixed: "\uC774 \uAFC8\uC740 \uB04C\uB9BC\uACFC \uB9DD\uC124\uC784\uC774 \uD568\uAED8 \uC5BD\uD600 \uC788\uB294 \uD63C\uD569\uB41C \uAC10\uC815\uC758 \uC7A5\uBA74\uC785\uB2C8\uB2E4.",
    anxious: "\uC774 \uAFC8\uC740 \uBD88\uC548\uACFC \uACBD\uACC4\uAC00 \uBA3C\uC800 \uC62C\uB77C\uC624\uC9C0\uB9CC, \uADF8 \uC544\uB798\uC5D0\uB294 \uC9C0\uD0A4\uACE0 \uC2F6\uC740 \uB9C8\uC74C\uC774 \uD568\uAED8 \uC788\uC2B5\uB2C8\uB2E4.",
    neutral: "\uC774 \uAFC8\uC740 \uC544\uC9C1 \uB9D0\uB85C \uB2E4 \uB2FF\uC9C0 \uC54A\uC740 \uC0C1\uC9D5\uC774 \uC870\uC6A9\uD788 \uC6C0\uC9C1\uC774\uACE0 \uC788\uC2B5\uB2C8\uB2E4."
  };
  const closingMap = {
    happy: "\uC774 \uAFC8\uC740 \uB9C8\uC74C\uC774 \uC774\uBBF8 \uC54C\uACE0 \uC788\uB294 \uC0AC\uB791\uACFC \uAE30\uC068\uC744 \uB2E4\uC2DC \uD655\uC778\uD558\uB824\uB294 \uD750\uB984\uC73C\uB85C \uC77D\uD799\uB2C8\uB2E4.",
    healing: "\uC774 \uAFC8\uC740 \uB9C8\uC74C\uC774 \uC790\uC2E0\uC744 \uB2E4\uC2DC \uD488\uACE0, \uCC9C\uCC9C\uD788 \uD68C\uBCF5\uC758 \uC228\uC744 \uACE0\uB974\uB824\uB294 \uC2E0\uD638\uB85C \uC77D\uD799\uB2C8\uB2E4.",
    mixed: "\uC774 \uAFC8\uC740 \uB04C\uB9BC\uACFC \uC8FC\uC800\uD568\uC774 \uD568\uAED8 \uC788\uC5B4, \uB458 \uC0AC\uC774\uC758 \uADE0\uD615\uC744 \uB2E4\uC2DC \uB9DE\uCD94\uB77C\uB294 \uB73B\uC73C\uB85C \uC77D\uD799\uB2C8\uB2E4.",
    anxious: "\uC774 \uAFC8\uC740 \uBD88\uC548\uC744 \uBC00\uC5B4\uB0B4\uAE30\uBCF4\uB2E4, \uADF8 \uC544\uB798\uC758 \uD544\uC694\uB97C \uC870\uC6A9\uD788 \uB4E4\uC5B4\uBCF4\uB77C\uB294 \uC2E0\uD638\uB85C \uC77D\uD799\uB2C8\uB2E4.",
    neutral: "\uC774 \uAFC8\uC740 \uC0C1\uC9D5\uC744 \uC870\uAE08 \uB354 \uC9C0\uCF1C\uBCF4\uBA74, \uB0B4\uBA74\uC758 \uBC29\uD5A5\uC774 \uC11C\uC11C\uD788 \uB4DC\uB7EC\uB0A0 \uD750\uB984\uC785\uB2C8\uB2E4."
  };
  const toneLabel = toneLabelMap[tone?.primary] || toneLabelMap.neutral;
  const opening = openingMap[tone?.primary] || openingMap.neutral;
  const closing = closingMap[tone?.primary] || closingMap.neutral;
  return [
    "# \uC815\uC2E0\uBD84\uC11D \uD574\uBABD \uBCF4\uACE0\uC11C",
    "",
    `\uB2F9\uC2E0\uC758 \uAFC8\uC740 ${toneLabel}\uC758 \uACB0\uB85C \uD758\uB7EC\uAC11\uB2C8\uB2E4. ${snippet ? `\uC801\uC5B4\uC8FC\uC2E0 "${snippet}" \uC7A5\uBA74\uC744 \uB530\uB77C` : "\uAFC8\uC758 \uACB0\uC744 \uB530\uB77C"} \uBB34\uC758\uC2DD\uC774 \uAC74\uB124\uB294 \uBA54\uC2DC\uC9C0\uB97C \uC870\uC6A9\uD788 \uC815\uB9AC\uD569\uB2C8\uB2E4.`,
    "\uBB34\uC758\uC2DD\uC740 \uC9C0\uAE08, \uB9D0\uBCF4\uB2E4 \uBA3C\uC800 \uB9C8\uC74C\uC758 \uC628\uB3C4\uC640 \uAD00\uACC4\uC758 \uAC70\uB9AC\uB97C \uC870\uC2EC\uC2A4\uB7FD\uAC8C \uBE44\uCD94\uACE0 \uC788\uC2B5\uB2C8\uB2E4.",
    "",
    "## Chapter 1. \uAFC8\uC758 \uC7A5\uBA74\uACFC \uD575\uC2EC \uC0C1\uC9D5",
    "### 1. \uAFC8\uC758 \uD575\uC2EC \uC7A5\uBA74 \uC694\uC57D",
    `${snippet || "\uAFC8\uC758 \uC7A5\uBA74\uC774 \uB610\uB837\uC774 \uB0A8\uC544 \uC788\uC2B5\uB2C8\uB2E4."} ${opening}`,
    "### 2. \uBC18\uBCF5\uB418\uB294 \uC774\uBBF8\uC9C0",
    "\uBC18\uBCF5\uB418\uB294 \uC7A5\uBA74, \uC0AC\uB78C, \uACF5\uAC04, \uAC10\uC815\uC740 \uC9C0\uAE08 \uB9C8\uC74C\uC774 \uAC00\uC7A5 \uC624\uB798 \uBD99\uB4E4\uACE0 \uC788\uB294 \uC8FC\uC81C\uB97C \uAC00\uB9AC\uD0B5\uB2C8\uB2E4. \uAC19\uC740 \uC18C\uC7AC\uAC00 \uB418\uD480\uC774\uB418\uBA74 \uADF8\uAC83\uC740 \uC6B0\uC5F0\uBCF4\uB2E4 \uB354 \uC9C4\uD55C \uC2E0\uD638\uC77C \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    "### 3. \uC0C1\uC9D5\uC758 \uCCAB \uC778\uC0C1",
    `\uCCAB \uC778\uC0C1\uC740 \uB300\uAC1C \uBB34\uC758\uC2DD\uC774 \uAC00\uC7A5 \uBA3C\uC800 \uAC74\uB124\uB294 \uBB38\uC7A5\uC785\uB2C8\uB2E4. ${toneLabel}\uC758 \uACB0\uC774 \uAC15\uD558\uB2E4\uBA74 \uADF8 \uC0C1\uC9D5\uC740 \uC9C0\uD0A4\uACE0 \uC2F6\uC740 \uAC83, \uB2E4\uC2DC \uB2FF\uACE0 \uC2F6\uC740 \uAC83, \uD639\uC740 \uC544\uC9C1 \uC815\uB9AC\uB418\uC9C0 \uC54A\uC740 \uAC10\uC815\uC744 \uD568\uAED8 \uB2F4\uACE0 \uC788\uC744 \uAC00\uB2A5\uC131\uC774 \uD07D\uB2C8\uB2E4.`,
    "",
    "## Chapter 2. \uC815\uC2E0\uBD84\uC11D\uC801 \uD574\uC11D \u2014 \uBB34\uC758\uC2DD\uC758 \uC18C\uB9DD\uACFC \uAC08\uB4F1",
    "### 1. \uD504\uB85C\uC774\uD2B8\uC2DD \uC18C\uB9DD \uCDA9\uC871 \uAD00\uC810",
    "\uD504\uB85C\uC774\uD2B8\uC2DD \uC18C\uB9DD \uCDA9\uC871 \uAD00\uC810\uC5D0\uC11C\uB294, \uAFC8\uC774 \uAC89\uC73C\uB85C \uB4DC\uB7EC\uB09C \uC7A5\uBA74\uBCF4\uB2E4 \uB354 \uAE4A\uC740 \uBC14\uB78C\uC744 \uB300\uC2E0 \uB9D0\uD574\uC90D\uB2C8\uB2E4. \uC0AC\uB791, \uC778\uC815, \uC548\uC804, \uD1B5\uC81C, \uD574\uBC29 \uAC19\uC740 \uC695\uAD6C\uAC00 \uC0C1\uC9D5\uC758 \uC637\uC744 \uC785\uACE0 \uB098\uD0C0\uB0A9\uB2C8\uB2E4.",
    "### 2. \uC5B5\uB20C\uB9B0 \uAC10\uC815\uC758 \uACB0",
    relationContext ? `\uC5B5\uB20C\uB9B0 \uAC10\uC815\uC740 \uB300\uAC1C \uC11C\uD230 \uBB38\uC7A5\uC73C\uB85C \uAFC8\uC18D\uC5D0 \uB0A8\uC2B5\uB2C8\uB2E4. \uAD00\uACC4 \uB9E5\uB77D\uC774 "${relationContext}"\uC774\uB77C\uBA74, \uADF8 \uAC10\uC815\uC740 \uB354 \uC548\uC804\uD558\uAC8C \uB2FF\uACE0 \uC2F6\uC740 \uB9C8\uC74C\uACFC \uC544\uC9C1 \uB9D0\uD558\uC9C0 \uBABB\uD55C \uB450\uB824\uC6C0 \uC0AC\uC774\uC5D0\uC11C \uD754\uB4E4\uB9AC\uACE0 \uC788\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.` : "\uC5B5\uB20C\uB9B0 \uAC10\uC815\uC740 \uB300\uAC1C \uC11C\uD230 \uBB38\uC7A5\uC73C\uB85C \uAFC8\uC18D\uC5D0 \uB0A8\uC2B5\uB2C8\uB2E4. \uB9D0\uD558\uC9C0 \uBABB\uD55C \uC695\uAD6C\uC640 \uB9DD\uC124\uC784\uC774 \uD568\uAED8 \uC788\uC744\uC218\uB85D, \uAFC8\uC740 \uB354 \uC9C4\uD55C \uC7A5\uBA74\uC73C\uB85C \uAC10\uC815\uC744 \uB300\uC2E0 \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.",
    "### 3. \uBC18\uBCF5 \uAC15\uBC15\uACFC \uBC29\uC5B4",
    "\uBC18\uBCF5 \uAC15\uBC15\uACFC \uBC29\uC5B4\uB294 \uAC19\uC740 \uC7A5\uBA74\uC744 \uB2E4\uC2DC \uBD88\uB7EC\uC640, \uC544\uC9C1 \uB05D\uB0B4\uC9C0 \uBABB\uD55C \uC9C8\uBB38\uC744 \uBD99\uC7A1\uAC8C \uB9CC\uB4ED\uB2C8\uB2E4. \uADF8 \uBC29\uC5B4\uAC00 \uC11C \uC788\uB2E4\uACE0 \uD574\uB3C4, \uB9C8\uC74C\uC774 \uC548\uC804\uC744 \uCC3E\uC73C\uB824\uB294 \uBC29\uC2DD\uC774\uB77C\uACE0 \uC774\uD574\uD558\uBA74 \uD574\uC11D\uC774 \uD6E8\uC52C \uBD80\uB4DC\uB7EC\uC6CC\uC9D1\uB2C8\uB2E4.",
    "",
    "## Chapter 3. \uC735 \uC2EC\uB9AC\uD559\uC801 \uD574\uC11D \u2014 \uB0B4\uBA74\uC758 \uC6D0\uD615\uACFC \uD1B5\uD569",
    "### 1. \uADF8\uB9BC\uC790\uC640 \uC544\uB2C8\uB9C8/\uC544\uB2C8\uBB34\uC2A4\uC758 \uC791\uC6A9",
    peopleText ? `\uADF8\uB9BC\uC790\uC640 \uC544\uB2C8\uB9C8/\uC544\uB2C8\uBB34\uC2A4\uC758 \uC791\uC6A9\uC740 \uB0B4\uAC00 \uC544\uC9C1 \uCDA9\uBD84\uD788 \uBC1B\uC544\uB4E4\uC774\uC9C0 \uBABB\uD55C \uB0B4\uBA74\uC758 \uC5BC\uAD74\uC744 \uB4DC\uB7EC\uB0C5\uB2C8\uB2E4. "${peopleText}" \uAC19\uC740 \uC874\uC7AC\uAC00 \uB098\uC628\uB2E4\uBA74, \uADF8 \uC778\uBB3C\uC740 \uAD00\uACC4\uC758 \uAC70\uB9AC\uBFD0 \uC544\uB2C8\uB77C \uB0B4 \uC548\uC758 \uBBF8\uCC98 \uB9D0\uD558\uC9C0 \uBABB\uD55C \uAC10\uC815\uB3C4 \uD568\uAED8 \uBE44\uCD94\uACE0 \uC788\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.` : "\uADF8\uB9BC\uC790\uC640 \uC544\uB2C8\uB9C8/\uC544\uB2C8\uBB34\uC2A4\uC758 \uC791\uC6A9\uC740 \uB0B4\uAC00 \uC544\uC9C1 \uCDA9\uBD84\uD788 \uBC1B\uC544\uB4E4\uC774\uC9C0 \uBABB\uD55C \uB0B4\uBA74\uC758 \uC5BC\uAD74\uC744 \uB4DC\uB7EC\uB0C5\uB2C8\uB2E4. \uAD00\uACC4\uC758 \uAFC8\uC77C\uC218\uB85D \uC774 \uC791\uC6A9\uC740 \uB354 \uBD84\uBA85\uD574\uC838, \uB04C\uB9BC\uACFC \uAC70\uB9AC, \uC774\uC0C1\uD654\uC640 \uB450\uB824\uC6C0\uC774 \uD568\uAED8 \uB5A0\uC624\uB985\uB2C8\uB2E4.",
    "### 2. \uC790\uC544\uC640 \uC804\uCCB4\uC131",
    "\uC790\uC544\uC640 \uC804\uCCB4\uC131\uC758 \uAD00\uC810\uC5D0\uC11C \uBCF4\uBA74, \uAFC8\uC740 \uD558\uB098\uC758 \uACB0\uB860\uBCF4\uB2E4 \uD1B5\uD569\uC758 \uBC29\uD5A5\uC744 \uBCF4\uC5EC\uC90D\uB2C8\uB2E4. \uB0B4\uAC00 \uBC00\uC5B4\uB0B8 \uBD80\uBD84\uACFC \uC18C\uC911\uD788 \uC5EC\uAE30\uB294 \uBD80\uBD84\uC774 \uB2E4\uC2DC \uB9CC\uB098\uC57C \uBE44\uB85C\uC18C \uB9C8\uC74C\uC774 \uB113\uAC8C \uC228\uC744 \uC27D\uB2C8\uB2E4.",
    "### 3. \uB0B4\uBA74\uC758 \uB300\uD654",
    "\uB0B4\uBA74\uC758 \uB300\uD654\uB294 \uC11C\uB85C \uB2E4\uB978 \uBAA9\uC18C\uB9AC\uAC00 \uC2F8\uC6B0\uB294 \uC790\uB9AC\uAC00 \uC544\uB2C8\uB77C, \uAC01\uC790\uC758 \uD544\uC694\uB97C \uC54C\uC544\uB4E3\uB294 \uC790\uB9AC\uC785\uB2C8\uB2E4. \uC774 \uAFC8\uC740 \uC9C0\uAE08 \uB2F9\uC2E0 \uC548\uC758 \uC5EC\uB7EC \uCE35\uC774 \uC870\uC6A9\uD788 \uD569\uC758\uC810\uC744 \uCC3E\uC73C\uB824\uB294 \uC21C\uAC04\uC77C \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    "",
    "## Chapter 4. \uC601\uC801 \uC0C1\uC9D5 \uD574\uBABD \u2014 \uAFC8\uC774 \uC804\uD558\uB294 \uC2E0\uBE44\uD55C \uBA54\uC2DC\uC9C0",
    "### 1. \uC774 \uAFC8\uC774 \uAC74\uB124\uB294 \uC2E0\uBE44\uB85C\uC6B4 \uBB38\uC7A5",
    `\uC774 \uAFC8\uC774 \uAC74\uB124\uB294 \uC2E0\uBE44\uB85C\uC6B4 \uBB38\uC7A5\uC740 "${closing}"\uC5D0 \uAC00\uAE5D\uC2B5\uB2C8\uB2E4. \uC0C1\uC9D5\uC740 \uB298 \uC815\uB2F5\uC744 \uC678\uCE58\uAE30\uBCF4\uB2E4, \uB9C8\uC74C\uC774 \uB193\uC744 \uC218 \uC788\uB294 \uBC29\uD5A5\uC744 \uC870\uC6A9\uD788 \uAC00\uB9AC\uD0B5\uB2C8\uB2E4.`,
    "### 2. \uAD00\uACC4\uC640 \uC6B4\uC758 \uACB0",
    "\uAD00\uACC4\uC640 \uC6B4\uC758 \uACB0\uC740 \uC9C0\uAE08\uC758 \uAFC8\uC774 \uB204\uAD70\uAC00\uC640\uC758 \uAC70\uB9AC, \uD639\uC740 \uB098\uC640 \uB0B4 \uAC10\uC815 \uC0AC\uC774\uC758 \uAC04\uACA9\uC744 \uB2E4\uC2DC \uC7AC\uACE0 \uC788\uC74C\uC744 \uBCF4\uC5EC\uC90D\uB2C8\uB2E4. \uAC00\uAE4C\uC6CC\uC9C0\uACE0 \uC2F6\uC740 \uB9C8\uC74C\uC774 \uC788\uB2E4\uBA74 \uC11C\uB450\uB974\uC9C0 \uB9D0\uACE0, \uC228\uC744 \uACE0\uB974\uBA70 \uAC04\uACA9\uC744 \uC0B4\uD3B4\uBCF4\uC138\uC694.",
    "### 3. \uC0C1\uC9D5\uC774 \uAC00\uB9AC\uD0A4\uB294 \uBC29\uD5A5",
    "\uC0C1\uC9D5\uC774 \uAC00\uB9AC\uD0A4\uB294 \uBC29\uD5A5\uC740 \uB300\uAC1C \uB2E8 \uD558\uB098\uC758 \uACB0\uB860\uC774 \uC544\uB2C8\uB77C, \uC9C0\uAE08 \uC190\uC5D0 \uC958 \uC218 \uC788\uB294 \uB2E4\uC74C \uAC78\uC74C\uC785\uB2C8\uB2E4. \uAFC8\uC774 \uBC1D\uAC8C \uD750\uB97C\uC218\uB85D \uADF8 \uBC29\uD5A5\uC740 \uB354 \uB2E4\uC815\uD558\uACE0 \uBA85\uB8CC\uD558\uAC8C \uC5F4\uB9BD\uB2C8\uB2E4.",
    "",
    "## Chapter 5. \uD604\uC2E4 \uC870\uC5B8\uACFC \uCE58\uC720\uC758 \uBC29\uD5A5",
    "### 1. \uC624\uB298 \uD560 \uC218 \uC788\uB294 \uC791\uC740 \uD589\uB3D9",
    "- \uAFC8\uC5D0\uC11C \uAC00\uC7A5 \uB610\uB837\uD588\uB358 \uC7A5\uBA74\uC744 3\uC904\uB85C \uC801\uC5B4 \uB450\uC138\uC694.",
    "- \uADF8 \uC7A5\uBA74\uC5D0\uC11C \uAC00\uC7A5 \uAC15\uD588\uB358 \uAC10\uC815\uC744 \uD55C \uB2E8\uC5B4\uB85C \uBD99\uC5EC \uBCF4\uC138\uC694.",
    "- \uC624\uB298 \uD55C \uC0AC\uB78C\uC5D0\uAC8C\uB9CC, \uB108\uBB34 \uBB34\uAC81\uC9C0 \uC54A\uC740 \uB9D0\uB85C \uB9C8\uC74C\uC744 \uAC74\uB124\uC138\uC694.",
    "### 2. \uC9C0\uAE08\uC758 \uB9C8\uC74C\uC5D0 \uAC74\uB12C \uBB38\uC7A5",
    desireText ? `${toneLabel}\uC758 \uAFC8\uC740 \uB098\uB97C \uBAB0\uC544\uBD99\uC774\uAE30\uBCF4\uB2E4, ${desireText}\uC5D0 \uAC00\uAE4C\uC6B4 \uB9C8\uC74C\uC744 \uB2E4\uC2DC \uB9CC\uC9C0\uAC8C \uD569\uB2C8\uB2E4. \uB098\uB294 \uC11C\uB450\uB974\uC9C0 \uC54A\uC544\uB3C4 \uB418\uACE0, \uC9C0\uAE08\uC758 \uACB0\uC744 \uADF8\uB300\uB85C \uBC14\uB77C\uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.` : `${toneLabel}\uC758 \uAFC8\uC740 \uB098\uB97C \uBAB0\uC544\uBD99\uC774\uAE30\uBCF4\uB2E4, \uB0B4\uAC00 \uC774\uBBF8 \uC54C\uACE0 \uC788\uB358 \uB9C8\uC74C\uC744 \uB2E4\uC2DC \uB9CC\uC9C0\uAC8C \uD569\uB2C8\uB2E4. \uB098\uB294 \uC11C\uB450\uB974\uC9C0 \uC54A\uC544\uB3C4 \uB418\uACE0, \uC9C0\uAE08\uC758 \uACB0\uC744 \uADF8\uB300\uB85C \uBC14\uB77C\uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.`,
    "### 3. \uB2E4\uC74C 3\uC77C\uC758 \uD750\uB984",
    "\uB2E4\uC74C 3\uC77C\uC740 \uACB0\uB860\uC744 \uC11C\uB458\uAE30\uBCF4\uB2E4, \uBC18\uBCF5\uB418\uB294 \uC7A5\uBA74\uACFC \uAC10\uC815\uC758 \uBCC0\uD654\uB97C \uAC00\uBCCD\uAC8C \uAE30\uB85D\uD558\uB294 \uB370 \uC4F0\uC138\uC694. \uAE30\uB85D\uC740 \uBB34\uC758\uC2DD\uC758 \uBB38\uC7A5\uC744 \uD604\uC2E4\uB85C \uC62E\uACA8 \uC624\uB294 \uAC00\uC7A5 \uBD80\uB4DC\uB7EC\uC6B4 \uB2E4\uB9AC\uC785\uB2C8\uB2E4.",
    "",
    `\uB2F9\uC2E0\uC758 \uAFC8\uC740 ${opening} ${closing}`
  ].join("\n");
}
function evaluatePsychoMarkdownQuality(markdown, tone) {
  const text = String(markdown || "").trim();
  const warnings = [];
  if (!text) warnings.push("empty_output");
  if ((text.match(/Chapter\s+\d+\./g) || []).length < 5) warnings.push("chapter_count");
  const missingHeaders = PSYCHO_DREAM_REQUIRED_HEADERS.filter((header) => !text.includes(header));
  if (missingHeaders.length) warnings.push("missing_headers");
  const missingPhrases = PSYCHO_DREAM_REQUIRED_PHRASES.filter((phrase) => !text.includes(phrase));
  if (missingPhrases.length) warnings.push("missing_phrases");
  if (PSYCHO_DREAM_LEAK_MARKERS.some((pattern) => pattern.test(text))) warnings.push("system_leak");
  if (text.replace(/\s+/g, " ").length < 450) warnings.push("too_short");
  const positiveHits = countPsychoMarkerHits(text, PSYCHO_DREAM_POSITIVE_MARKERS);
  const healingHits = countPsychoMarkerHits(text, PSYCHO_DREAM_HEALING_MARKERS);
  const anxiousHits = countPsychoMarkerHits(text, PSYCHO_DREAM_ANXIOUS_MARKERS);
  if ((tone?.primary === "happy" || tone?.primary === "healing" || tone?.primary === "mixed") && anxiousHits >= 2 && positiveHits + healingHits < 2) {
    warnings.push("tone_mismatch");
  }
  return {
    ok: warnings.length === 0,
    warnings,
    positiveHits,
    healingHits,
    anxiousHits
  };
}
function extractPsychoMarkdownCandidate(aiResult) {
  if (!aiResult || !aiResult.ok) return "";
  const direct = cleanPsychoText(aiResult.text);
  if (!direct) return "";
  const parsed = parseJsonCandidate(direct);
  if (!parsed) return direct;
  const candidate = firstPsychoText([
    parsed.markdown,
    parsed.report,
    parsed.analysis,
    parsed.content,
    parsed.text,
    parsed.result,
    parsed.message
  ]);
  return candidate || direct;
}
async function handlePsychoAnalysis(request, env = {}) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }
  const tone = normalizePsychoTone(body, normalized.text);
  const prompt = buildPsychoPrompt(body, normalized.text, tone);
  const systemPrompt = [
    "\uB2F9\uC2E0\uC740 \uC815\uC2E0\uBD84\uC11D \uD574\uBABD\uAC00\uC785\uB2C8\uB2E4.",
    "\uB9D0\uD22C\uB294 \uC804\uBB38\uC801\uC774\uB418 \uC9C0\uB098\uCE58\uAC8C \uAE30\uC220\uC801\uC774\uC9C0 \uC54A\uAC8C \uC720\uC9C0\uD558\uACE0, \uAFC8\uC758 \uC815\uC11C\uB97C \uBA3C\uC800 \uC77D\uC73C\uC138\uC694.",
    "\uD589\uBCF5\uD55C \uAFC8\uC740 \uBD88\uC548 \uD15C\uD50C\uB9BF\uC73C\uB85C \uBC00\uC5B4 \uB123\uC9C0 \uB9D0\uACE0, \uAE34\uC7A5\uB41C \uAFC8\uC740 \uC18C\uB9DD\uACFC \uBC29\uC5B4\uB97C \uADE0\uD615 \uC788\uAC8C \uB2E4\uB8E8\uC138\uC694.",
    "\uCD9C\uB825\uC740 5\uC7A5 \uAD6C\uC870\uC758 Markdown\uC73C\uB85C \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC815\uB9AC\uD558\uC138\uC694."
  ].join(" ");
  const aiResult = await dreamGeminiCaller(env, prompt, {
    systemPrompt,
    modelEnvKeys: DREAM_PSYCHO_GEMINI_MODEL_KEYS,
    temperature: 0.72,
    maxOutputTokens: 6144,
    timeoutMs: Number(env.DREAM_PSYCHO_PROVIDER_TIMEOUT_MS || env.DREAM_PROVIDER_TIMEOUT_MS || 55e3),
    totalTimeoutMs: Number(env.DREAM_PSYCHO_TOTAL_TIMEOUT_MS || 3e4)
  });
  let markdown = extractPsychoMarkdownCandidate(aiResult);
  const aiUsed = Boolean(aiResult?.ok && cleanPsychoText(aiResult?.text));
  const aiSource = aiUsed ? "gemini" : "fallback";
  const aiMessage = cleanPsychoText(aiResult?.message || aiResult?.error || "");
  const qualityBeforeRepair = aiUsed ? evaluatePsychoMarkdownQuality(markdown, tone) : { ok: false, warnings: ["llm_unavailable"] };
  const fallbackUsed = !aiUsed || !qualityBeforeRepair.ok;
  if (fallbackUsed) {
    markdown = buildPsychoFallbackMarkdown({
      dreamText: normalized.text,
      tone,
      body
    });
  }
  const finalQuality = evaluatePsychoMarkdownQuality(markdown, tone);
  return json({
    ok: true,
    cached: false,
    formatWarning: fallbackUsed,
    llm: {
      used: aiUsed,
      source: aiSource,
      model: cleanPsychoText(aiResult?.model) || null,
      error: aiUsed ? "" : aiMessage || "gemini_unavailable"
    },
    tone,
    quality: {
      ok: true,
      originalOk: qualityBeforeRepair.ok,
      fallbackUsed,
      warnings: fallbackUsed ? qualityBeforeRepair.warnings : finalQuality.warnings
    },
    record: {
      id: `psycho-${Date.now()}`,
      markdown,
      source: aiUsed ? "gemini" : "fallback",
      model: cleanPsychoText(aiResult?.model) || (aiUsed ? "gemini" : "fallback/local"),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    message: aiUsed ? "ok" : "\uD574\uBABD \uACB0\uACFC\uB97C \uC644\uC131\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
  });
}
async function handleDreamRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/dream");
    if (path === "/psycho-analysis") {
      return await handlePsychoAnalysis(request, env);
    }
    if (path === "/dream-tarot") {
      return await handleDreamTarotSelection(request);
    }
    if (path === "/dream-prompt") {
      return await handleDreamPrompt(request);
    }
    if (path === "/prompt-maker") {
      return await handleDreamPromptMaker(request);
    }
    if (path === "/tarot-consult") {
      return await handleTarotConsult(request, env);
    }
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
export {
  __resetDreamGeminiCallerForTest,
  __setDreamGeminiCallerForTest,
  handleDreamRoutes
};
