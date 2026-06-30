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

  if (!allowsPublicCache) {
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
  const forwarded = String(request.headers.get("x-forwarded-for") || "")
    .split(",")[0]
    .trim();

  return {
    ip: forwarded || request.headers.get("cf-connecting-ip") || "unknown",
    userAgent: String(request.headers.get("user-agent") || "").slice(0, 300),
    requestId: String(request.headers.get("x-request-id") || request.headers.get("cf-ray") || "").slice(0, 120),
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

export async function handleRouteError(error, context = {}) {
  if (error instanceof HttpError) {
    const payloadDetails = error?.payload && typeof error.payload === "object"
      ? error.payload.errorDetails
      : undefined;
    return json({
      ok: false,
      success: false,
      message: error.message,
      ...error.payload,
      errorDetails: payloadDetails && typeof payloadDetails === "object"
        ? payloadDetails
        : toPublicErrorDetails(error, context),
    }, { status: error.status });
  }

  if (error?.name === "TokenExpiredError") {
    return json({
      ok: false,
      success: false,
      message: "Authentication has expired. Please sign in again.",
      code: "UNAUTHORIZED",
      errorDetails: toPublicErrorDetails(error, context),
    }, { status: 401 });
  }

  if (error?.name === "JsonWebTokenError") {
    return json({
      ok: false,
      success: false,
      message: "Invalid authentication token.",
      code: "UNAUTHORIZED",
      errorDetails: toPublicErrorDetails(error, context),
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

  const isConfigError = /mongo_uri|mongodb_uri|required for worker-native|connection timed out/i.test(errorText);
  const isDbUnavailable = /mongo|mongoose|mongodb|server selection timed out|connection timed out|connection is not ready|connect ECONNREFUSED|ENOTFOUND/i.test(errorText);

  if (isDbUnavailable || isConfigError) {
    return json({
      ok: false,
      success: false,
      code: "SERVICE_UNAVAILABLE",
      message: (exposeMessage || isConfigError) && errorText ? errorText : "Database is temporarily unavailable.",
      requestPath: (exposeMessage || isConfigError) ? requestPath : undefined,
      errorDetails: {
        ...toPublicErrorDetails(error, context),
        code: "SERVICE_UNAVAILABLE",
        reason: isConfigError ? "CONFIG_ERROR" : "DB_UNAVAILABLE",
        message: (exposeMessage || isConfigError) && errorText ? errorText : "Database is temporarily unavailable.",
      },
    }, {
      status: 503,
      headers: {
        "X-Error-Code": "SERVICE_UNAVAILABLE",
      },
    });
  }

  return json({
    ok: false,
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: (exposeMessage || isConfigError) && errorText ? errorText : "Internal server error.",
    requestPath: (exposeMessage || isConfigError) ? requestPath : undefined,
    errorDetails: {
      ...toPublicErrorDetails(error, context),
      code: "INTERNAL_SERVER_ERROR",
      message: (exposeMessage || isConfigError) && errorText ? errorText : "Internal server error.",
    },
  }, {
    status: 500,
    headers: {
      "X-Error-Code": "INTERNAL_SERVER_ERROR",
    },
  });
}
