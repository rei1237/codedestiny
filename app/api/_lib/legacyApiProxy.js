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
  const candidates = [
    process.env.AUTH_API_BASE_URL,
    process.env.CODE_DESTINY_API_URL,
    process.env.NEXT_PUBLIC_CODE_DESTINY_API_URL,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate);
    if (normalized) return normalized;
  }
  return "";
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
