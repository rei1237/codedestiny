const API_WORKER_ORIGIN = "https://code-destiny-web.bulegyung.workers.dev";

function copyRequestHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete("Host");
  headers.delete("Content-Length");
  return headers;
}

async function proxyApiRequest(request) {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(API_WORKER_ORIGIN);
  targetUrl.pathname = incomingUrl.pathname;
  targetUrl.search = incomingUrl.search;

  const method = request.method.toUpperCase();
  const init = {
    method,
    headers: copyRequestHeaders(request),
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body;
  }

  return fetch(targetUrl.toString(), init);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return proxyApiRequest(request);
    }

    return env.ASSETS.fetch(request);
  },
};
