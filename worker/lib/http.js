export class HttpError extends Error {
  constructor(status, message, payload = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.payload = payload;
  }
}

export function createHttpError(status, message, payload = {}) {
  return new HttpError(status, message, payload);
}

export function json(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  const requestedCacheControl = headers.get("Cache-Control") || "";
  const allowsPublicCache = /\bpublic\b/i.test(requestedCacheControl) && !/\bno-store\b/i.test(requestedCacheControl);
  const allowsPrivateCache = /\bprivate\b/i.test(requestedCacheControl) && !/\bno-store\b/i.test(requestedCacheControl);

  if (!allowsPublicCache && !allowsPrivateCache) {
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
  } else {
    headers.delete("Pragma");
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function redirect(location, status = 302) {
  return new Response(null, {
    status,
    headers: {
      Location: location,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

export async function readJson(request) {
  const text = await request.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch (e) {
    throw createHttpError(400, "Request body must be valid JSON.");
  }
}

export function getRoutePath(request, prefix) {
  const pathname = new URL(request.url).pathname;
  const rest = pathname.slice(prefix.length);
  if (!rest) return "/";
  const normalized = rest.replace(/\/+$/, "");
  return normalized || "/";
}

export function notFound() {
  return json({ ok: false, error: "not_found" }, { status: 404 });
}

export function methodNotAllowed() {
  return json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}

export function cookieValue(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const pairs = cookie.split(";").map((part) => part.trim()).filter(Boolean);

  for (const pair of pairs) {
    const index = pair.indexOf("=");
    if (index < 0) continue;
    const key = pair.slice(0, index).trim();
    if (key !== name) continue;

    try {
      return decodeURIComponent(pair.slice(index + 1));
    } catch (e) {
      return pair.slice(index + 1);
    }
  }

  return "";
}

export function getRequestMeta(request) {
  // cf-connecting-ip is set by Cloudflare's edge and can't be spoofed by the client, unlike
  // x-forwarded-for (client-supplied, checking it first let anyone rotate rate-limit buckets).
  const forwarded = String(request.headers.get("x-forwarded-for") || "")
    .split(",")[0]
    .trim();

  return {
    ip: request.headers.get("cf-connecting-ip") || forwarded || "unknown",
    userAgent: String(request.headers.get("user-agent") || "").slice(0, 300),
    requestId: String(request.headers.get("x-request-id") || request.headers.get("cf-ray") || "").slice(0, 120),
  };
}

function resolveErrorStage(error, context = {}) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || error || "");
  const trace = context?.trace || {};
  if (code === "MONGO_OPERATION_ADMISSION_TIMEOUT") return "db-op-admission";
  if (/operation timed out|timed out in Worker/i.test(message)) return "db-op-timeout";
  if (trace.paymentProviderFailed || /portone|payment provider/i.test(message)) return "payment-provider";
  if (trace.authPresent && !trace.authVerified) return "auth";
  if (isDbUnavailableError(error)) return "db";
  return "route";
}

function errorResponseHeaders(error, context = {}) {
  const requestMeta = context?.request ? getRequestMeta(context.request) : null;
  return {
    "X-Error-Code": "SERVICE_UNAVAILABLE",
    "X-Request-ID": String(requestMeta?.requestId || "unknown"),
    "X-CD-Error-Stage": resolveErrorStage(error, context),
    "Server-Timing": `cd-error;desc=\"${resolveErrorStage(error, context)}\"`,
    "Retry-After": "2",
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
    requestId: String(requestMeta?.requestId || ""),
  };
}

function retryableForHttpStatus(status) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function publicErrorContract({ code, status, message, requestId }) {
  return {
    code: String(code || "INTERNAL_SERVER_ERROR"),
    retryable: retryableForHttpStatus(status),
    message: String(message || "요청을 처리하지 못했습니다."),
    ...(requestId ? { requestId: String(requestId).slice(0, 120) } : {}),
  };
}

/* DB 일시 장애 판별의 단일 정의.
   handleRouteError 가 503을 낼지 결정하는 데 쓰고, 라우트가 "이 오류면 degraded 로 응답한다"를
   판단할 때도 같은 것을 쓴다 — 두 곳이 다른 기준을 갖고 있으면 어떤 오류는 degraded 로도,
   503 으로도 안 잡혀 500 으로 샌다.
   에러명(Mongo*)과 풀-클리어 메시지까지 보는 이유: MongoPoolClearedError 는 메시지에 "mongo" 가
   없을 수 있어 메시지 정규식만으로는 놓친다(과거 500으로 새던 원인).
   op-타임아웃("MongoDB operation timed out in Worker.")도 메시지에 mongodb 가 있어 여기 걸린다. */
/* 서버가 요청을 **확정적으로 거부한** MongoServerError 코드. 재시도해도 결과가 같으므로
   '일시 장애'로 분류하면 안 된다.
   🔴 이 allowlist 가 없으면 아래 `/^Mongo/` 가 모든 MongoServerError 를 삼켜, 영구 코드 버그가
   retryable 503("잠시 후 다시 시도")로 위장된다. 실제로 그래서 guardian ensureGuest 의
   ConflictingUpdateOperators(40)가 며칠 동안 'DB 일시 장애'로 보였고, 그동안 상담은 100% 죽어
   있었다(2026-08-09). 이건 인프라 신호가 아니라 코드 버그이므로 500 으로 나가야 눈에 띈다.
   13(Unauthorized)·11000(DuplicateKey)은 호출부 기존 동작을 건드리지 않으려고 일부러 뺐다 —
   여기 있는 넷은 전부 '요청 형태 자체가 틀렸다'는 뜻이다. */
const PERMANENT_MONGO_ERROR_CODES = new Set([
  2, // BadValue
  9, // FailedToParse
  40, // ConflictingUpdateOperators
  121, // DocumentValidationFailure
]);

export function isDbUnavailableError(error) {
  if (PERMANENT_MONGO_ERROR_CODES.has(Number(error?.code))) return false;
  const errorText = String(error?.message || error || "");
  return /mongo|mongoose|mongodb|server selection timed out|connection timed out|connection is not ready|connect ECONNREFUSED|ENOTFOUND/i.test(errorText)
    || /^Mongo/.test(String(error?.name || ""))
    || /pool .*was cleared|was cleared because|socket .*timed out|network (error|timeout)|ECONNRESET|EPIPE|ETIMEDOUT/i.test(errorText);
}

export async function handleRouteError(error, context = {}) {
  if (error instanceof HttpError) {
    const payloadDetails = error?.payload && typeof error.payload === "object"
      ? error.payload.errorDetails
      : undefined;
    const requestId = String(toPublicErrorDetails(error, context).requestId || "").trim();
    const code = String(error?.payload?.code || `HTTP_${error.status}`).trim();
    return json({
      ok: false,
      success: false,
      message: error.message,
      ...(requestId ? { requestId } : {}),
      ...error.payload,
      error: publicErrorContract({ code, status: error.status, message: error.message, requestId }),
      errorDetails: payloadDetails && typeof payloadDetails === "object"
        ? payloadDetails
        : toPublicErrorDetails(error, context),
    }, { status: error.status });
  }

  if (error?.name === "TokenExpiredError") {
    const details = toPublicErrorDetails(error, context);
    return json({
      ok: false,
      success: false,
      message: "Authentication has expired. Please sign in again.",
      code: "UNAUTHORIZED",
      error: publicErrorContract({ code: "UNAUTHORIZED", status: 401, message: "Authentication has expired. Please sign in again.", requestId: details.requestId }),
      ...(details.requestId ? { requestId: details.requestId } : {}),
      errorDetails: details,
    }, { status: 401 });
  }

  if (error?.name === "JsonWebTokenError") {
    const details = toPublicErrorDetails(error, context);
    return json({
      ok: false,
      success: false,
      message: "Invalid authentication token.",
      code: "UNAUTHORIZED",
      error: publicErrorContract({ code: "UNAUTHORIZED", status: 401, message: "Invalid authentication token.", requestId: details.requestId }),
      ...(details.requestId ? { requestId: details.requestId } : {}),
      errorDetails: details,
    }, { status: 401 });
  }

  const trace = context?.trace || {};
  const requestPath = resolveRequestPathFromContext(context);
  const requestMeta = context?.request ? getRequestMeta(context.request) : null;
  const exposeMessage = context?.exposeMessage === true || isDevelopmentLike(context?.env || {});
  const errorText = String(error?.message || "");
  const mongoQueryFailed = Boolean(trace.mongoQueryFailed)
    || /mongo|mongoose|cast to objectid|findbyid|findone|query/i.test(errorText);
  const paymentProviderFailed = Boolean(trace.paymentProviderFailed)
    || /portone|iamport|payment provider|merchant_uid|imp_uid/i.test(errorText);

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
    stack: error?.stack || null,
  };

  try {
    console.error("[worker-route-error]", JSON.stringify(logPayload));
  } catch (e) {
    console.error("[worker-route-error]", logPayload);
  }

  /* isConfigError 는 503/500 갈림과 reason 라벨에만 쓴다 — 절대 "원본 메시지를 내보낼 이유"로 쓰지 말 것.
     예전에는 (exposeMessage || isConfigError) 로 묶여 있어, 개발 모드가 아니어도 이 정규식에 걸리면
     errorText 가 그대로 응답 본문에 실렸다. 그런데 아래 `connection timed out` 은 Atlas 서버선택 실패
     메시지의 문구라, 리플리카셋 샤드 호스트명·해석된 IP·TLS/인증 실패 사유가 통째로 나갔다.
     DB 타임아웃은 인증 없는 요청으로도 유발할 수 있으므로 사실상 무인증 정보노출이었다.
     운영자용 원문은 이미 위 console.error("[worker-route-error]") 로 전량 남는다. */
  const isConfigError = /mongo_uri|mongodb_uri|required for worker-native|connection timed out/i.test(errorText);
  const isDbUnavailable = isDbUnavailableError(error);

  if (isDbUnavailable || isConfigError) {
    const details = toPublicErrorDetails(error, context);
    const publicMessage = exposeMessage && errorText ? errorText : "Database is temporarily unavailable.";
    return json({
      ok: false,
      success: false,
      code: "SERVICE_UNAVAILABLE",
      message: publicMessage,
      error: publicErrorContract({ code: isConfigError ? "DATABASE_CONFIG_INVALID" : "DATABASE_TEMPORARILY_UNAVAILABLE", status: 503, message: publicMessage, requestId: details.requestId }),
      ...(details.requestId ? { requestId: details.requestId } : {}),
      requestPath: exposeMessage ? requestPath : undefined,
      errorDetails: {
        ...details,
        code: "SERVICE_UNAVAILABLE",
        reason: isConfigError ? "CONFIG_ERROR" : "DB_UNAVAILABLE",
        message: exposeMessage && errorText ? errorText : "Database is temporarily unavailable.",
      },
    }, {
      status: 503,
      headers: errorResponseHeaders(error, context),
    });
  }

  return json({
    ok: false,
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: exposeMessage && errorText ? errorText : "Internal server error.",
    error: publicErrorContract({ code: "INTERNAL_SERVER_ERROR", status: 500, message: exposeMessage && errorText ? errorText : "Internal server error.", requestId: requestMeta?.requestId }),
    ...(requestMeta?.requestId ? { requestId: requestMeta.requestId } : {}),
    requestPath: exposeMessage ? requestPath : undefined,
    errorDetails: {
      ...toPublicErrorDetails(error, context),
      code: "INTERNAL_SERVER_ERROR",
      message: exposeMessage && errorText ? errorText : "Internal server error.",
    },
  }, {
    status: 500,
    headers: {
      "X-Error-Code": "INTERNAL_SERVER_ERROR",
    },
  });
}
