const DEFAULT_API_WORKER_ORIGIN = "https://code-destiny-web.bulegyung.workers.dev";

function resolveApiWorkerOrigin(env = {}) {
  const raw = String(DEFAULT_API_WORKER_ORIGIN)
    .trim()
    .replace(/\/+$/, "");

  try {
    const parsed = new URL(raw);
    return parsed.origin;
  } catch {
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
      return proxyApiRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
