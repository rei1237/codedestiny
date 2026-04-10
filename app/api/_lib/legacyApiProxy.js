import { NextResponse } from "next/server";

function normalizeBaseUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return parsed.origin.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function isLocalHostName(hostname) {
  const normalized = String(hostname || "").toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function parseUrlSafe(rawValue) {
  try {
    return new URL(String(rawValue || ""));
  } catch {
    return null;
  }
}

function isEquivalentOrigin(a, b) {
  const urlA = parseUrlSafe(a);
  const urlB = parseUrlSafe(b);
  if (!urlA || !urlB) return false;

  const sameProtocol = urlA.protocol === urlB.protocol;
  const samePort = urlA.port === urlB.port;
  const sameHost = urlA.hostname === urlB.hostname;
  if (sameProtocol && samePort && sameHost) return true;

  // localhost, 127.0.0.1, ::1 은 개발환경에서 같은 로컬 호스트로 취급
  if (!sameProtocol || !samePort) return false;
  return isLocalHostName(urlA.hostname) && isLocalHostName(urlB.hostname);
}

function resolveLegacyApiBase(request) {
  const incomingUrl = new URL(request.url);
  const incomingOrigin = incomingUrl.origin.replace(/\/$/, "");
  const configuredBase = normalizeBaseUrl(process.env.AUTH_API_BASE_URL);

  if (!configuredBase) {
    if (isLocalHostName(incomingUrl.hostname) && incomingUrl.port !== "4000") {
      return "http://localhost:4000";
    }
    return "";
  }

  if (!isEquivalentOrigin(incomingOrigin, configuredBase)) {
    return configuredBase;
  }

  // 로컬에서 AUTH_API_BASE_URL이 현재 Next origin으로 잘못 설정된 경우 자동 보정
  if (isLocalHostName(incomingUrl.hostname) && incomingUrl.port !== "4000") {
    return "http://localhost:4000";
  }

  return "";
}

export async function proxyLegacyApi(request) {
  const base = resolveLegacyApiBase(request);
  if (!base) {
    return NextResponse.json(
      {
        ok: false,
        error: "legacy_api_base_missing",
        message: "AUTH_API_BASE_URL must be configured to external API host (example: http://localhost:4000).",
      },
      { status: 503 },
    );
  }

  const incomingUrl = new URL(request.url);
  const incomingOrigin = incomingUrl.origin.replace(/\/$/, "");
  if (isEquivalentOrigin(incomingOrigin, base)) {
    return NextResponse.json(
      {
        ok: false,
        error: "legacy_api_base_loop",
        message: "Legacy API base resolves to current origin. Please set AUTH_API_BASE_URL to external API host.",
      },
      { status: 500 },
    );
  }

  const upstream = `${base}${incomingUrl.pathname}${incomingUrl.search}`;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const method = String(request.method || "GET").toUpperCase();
  const init = {
    method,
    headers,
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    const bodyBuffer = await request.arrayBuffer();
    init.body = bodyBuffer;
  }

  const response = await fetch(upstream, init);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * proxyLegacyApi와 동일하지만 pathname을 rewriteFn으로 변환한 뒤 전송.
 * CF Worker 번들에서 무거운 의존성(mongoose 등)을 제거할 때 사용.
 *
 * @param {Request} request - 원본 Next.js Request
 * @param {(path: string) => string} rewriteFn - pathname 변환 함수
 */
export async function proxyLegacyApiWithRewrite(request, rewriteFn) {
  const base = resolveLegacyApiBase(request);
  if (!base) {
    return new Response(
      JSON.stringify({ ok: false, error: "legacy_api_base_missing" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const incomingUrl = new URL(request.url);
  if (isEquivalentOrigin(incomingUrl.origin.replace(/\/$/, ""), base)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "legacy_api_base_loop",
        message: "Legacy API base resolves to current origin. Please set AUTH_API_BASE_URL to external API host.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const newPath = rewriteFn(incomingUrl.pathname);
  const upstream = `${base}${newPath}${incomingUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const method = String(request.method || "GET").toUpperCase();
  const init = { method, headers, redirect: "manual" };

  if (method !== "GET" && method !== "HEAD") {
    const bodyBuffer = await request.arrayBuffer();
    init.body = bodyBuffer;
  }

  const response = await fetch(upstream, init);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
