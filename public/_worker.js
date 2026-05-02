/**
 * Cloudflare Pages Function — unified proxy to the API Worker.
 *
 * Routes ALL requests (static assets + API) through the Worker so that
 * the content served at code-destiny.com always reflects the latest Worker
 * deployment (public/ directory), eliminating the Pages-build vs Worker
 * content divergence that caused stale cache issues.
 *
 * Fallback: if the Worker responds with X-CF-Worker-Error: backend_only
 * (path not found in public/ and not an API route), we fall back to
 * Pages' own env.ASSETS — this covers Next.js routes that live in dist/
 * but not in public/.
 */

const DEFAULT_WORKER_ORIGIN = "https://code-destiny-web.bulegyung.workers.dev";

function resolveWorkerOrigin(env) {
  const raw = String((env && env.API_WORKER_ORIGIN) || DEFAULT_WORKER_ORIGIN)
    .trim()
    .replace(/\/+$/, "");
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

function copyRequestHeaders(request) {
  const headers = new Headers();
  const passThrough = [
    "Accept",
    "Accept-Encoding",
    "Accept-Language",
    "Authorization",
    "Content-Type",
    "Cookie",
    "If-Modified-Since",
    "If-None-Match",
    "Range",
    "User-Agent",
  ];
  for (const name of passThrough) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("X-Code-Destiny-Proxy", "pages");
  return headers;
}

export default {
  async fetch(request, env) {
    const origin = resolveWorkerOrigin(env);

    // If Worker origin is not resolvable, serve directly from Pages assets.
    if (!origin) {
      return env.ASSETS.fetch(request);
    }

    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, origin);
    const method = request.method.toUpperCase();
    const init = {
      method,
      headers: copyRequestHeaders(request),
      redirect: "manual",
    };

    if (method !== "GET" && method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    let workerResponse;
    try {
      workerResponse = await fetch(targetUrl.toString(), init);
    } catch {
      // Network error reaching Worker — fall back to Pages assets.
      return env.ASSETS.fetch(request);
    }

    // Worker signals that the path is not an asset and not an API route.
    // Fall back to Pages assets (e.g. Next.js routes in dist/ not in public/).
    if (
      workerResponse.status === 404 &&
      workerResponse.headers.get("X-CF-Worker-Error") === "backend_only"
    ) {
      return env.ASSETS.fetch(request);
    }

    return workerResponse;
  },
};
