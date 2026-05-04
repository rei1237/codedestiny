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
  headers.set("Cache-Control", "no-store");

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
      "Cache-Control": "no-store",
    },
  });
}

export async function readJson(request) {
  const text = await request.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw createHttpError(400, "Request body must be valid JSON.");
  }
}

export function getRoutePath(request, prefix) {
  const pathname = new URL(request.url).pathname;
  const rest = pathname.slice(prefix.length);
  return rest || "/";
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
    } catch {
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

export async function handleRouteError(error) {
  if (error instanceof HttpError) {
    return json({
      message: error.message,
      ...error.payload,
    }, { status: error.status });
  }

  if (error?.name === "TokenExpiredError") {
    return json({ message: "Authentication has expired. Please sign in again.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  if (error?.name === "JsonWebTokenError") {
    return json({ message: "Invalid authentication token.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  console.error(error);
  return json({ message: "Internal server error." }, { status: 500 });
}
