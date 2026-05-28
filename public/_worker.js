/**
 * Cloudflare Pages Function — API proxy to the backend Worker.
 *
 * All /api/* requests are proxied to the API Worker.
 * Everything else is served from Cloudflare Pages' own assets (dist/).
 */

const DEFAULT_API_WORKER_ORIGIN = "https://code-destiny-web.bulegyung.workers.dev";

function ensureUtf8Charset(contentType, fallbackType) {
  const value = String(contentType || "").trim();
  if (!value) return `${fallbackType}; charset=utf-8`;
  if (/charset=/i.test(value)) return value;
  return `${value}; charset=utf-8`;
}

function hardenResponse(requestUrl, response, options = {}) {
  const headers = new Headers(response.headers);
  const contentType = headers.get("Content-Type") || "";
  const pathname = (() => {
    try {
      return new URL(requestUrl).pathname;
    } catch (e) {
      return "";
    }
  })();

  if (!headers.has("X-Content-Type-Options")) {
    headers.set("X-Content-Type-Options", "nosniff");
  }
  if (!headers.has("Referrer-Policy")) {
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  if (options.api) {
    if (/^application\/json\b/i.test(contentType) || pathname === "/api" || pathname.startsWith("/api/")) {
      headers.set("Content-Type", ensureUtf8Charset(contentType, "application/json"));
    }
  } else {
    const isHtmlLikePath = pathname === "/"
      || pathname.endsWith(".html")
      || pathname === "/static"
      || pathname === "/static/";
    if (!contentType && isHtmlLikePath) {
      headers.set("Content-Type", "text/html; charset=utf-8");
    } else if (/^text\/html\b/i.test(contentType)) {
      headers.set("Content-Type", ensureUtf8Charset(contentType, "text/html"));
    } else if (/^application\/json\b/i.test(contentType)) {
      headers.set("Content-Type", ensureUtf8Charset(contentType, "application/json"));
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function resolveApiWorkerOrigin(env) {
  const raw = String((env && env.API_WORKER_ORIGIN) || DEFAULT_API_WORKER_ORIGIN)
    .trim()
    .replace(/\/+$/, "");
  try {
    return new URL(raw).origin;
  } catch (e) {
    return "";
  }
}

function copyRequestHeaders(request) {
  const headers = new Headers();
  const passThrough = [
    "Accept",
    "Authorization",
    "Content-Type",
    "Cookie",
    "User-Agent",
  ];
  for (const name of passThrough) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("X-Code-Destiny-Proxy", "pages");
  return headers;
}

async function proxyApiRequest(request, env) {
  const origin = resolveApiWorkerOrigin(env);
  if (!origin) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "api_origin_missing",
        message: "API_WORKER_ORIGIN is not configured for Pages proxy.",
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(origin);
  targetUrl.pathname = incomingUrl.pathname;
  targetUrl.search = incomingUrl.search;

  const method = request.method.toUpperCase();
  const init = {
    method,
    headers: copyRequestHeaders(request),
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl.toString(), init);
  const headers = new Headers(response.headers);
  headers.set("X-Code-Destiny-Api-Origin", origin);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const apiResponse = await proxyApiRequest(request, env);
      return hardenResponse(request.url, apiResponse, { api: true });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return hardenResponse(request.url, assetResponse);
  },
};
