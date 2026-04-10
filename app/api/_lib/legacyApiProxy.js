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

function getLegacyApiBase() {
  // AUTH_API_BASE_URL 만 사용: CODE_DESTINY_API_URL 등 프론트엔드 도메인 변수를
  // fallback으로 사용하면 동일 도메인 루프 오류가 발생하므로 제거함.
  const normalized = normalizeBaseUrl(process.env.AUTH_API_BASE_URL);
  return normalized;
}

export async function proxyLegacyApi(request) {
  const base = getLegacyApiBase();
  if (!base) {
    return NextResponse.json(
      {
        ok: false,
        error: "legacy_api_base_missing",
        message: "AUTH_API_BASE_URL or CODE_DESTINY_API_URL must be configured.",
      },
      { status: 503 },
    );
  }

  const incomingUrl = new URL(request.url);
  const incomingOrigin = incomingUrl.origin.replace(/\/$/, "");
  if (incomingOrigin === base) {
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
  const base = getLegacyApiBase();
  if (!base) {
    return new Response(
      JSON.stringify({ ok: false, error: "legacy_api_base_missing" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const incomingUrl = new URL(request.url);
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
