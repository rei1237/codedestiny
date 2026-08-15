/**
 * Cloudflare Pages Function — API proxy to the backend Worker.
 *
 * All /api/* requests are proxied to the API Worker.
 * Everything else is served from Cloudflare Pages' own assets (dist/).
 */

const DEFAULT_API_WORKER_ORIGIN = "https://code-destiny-web.bulegyung.workers.dev";
// 🔴 `/sitemap.xml` 을 이 집합에 다시 넣지 말 것.
//
// 사이트맵 정본은 scripts/generate-sitemap.mjs 가 만드는 정적 종합 사이트맵이고 Pages 정적
// 자산으로 그대로 서빙된다. worker/index.js 의 같은 분기도 `/sitemap-insights.xml` 만 동적으로
// 만들고 `/sitemap.xml` 은 명시적으로 제외하며 그 이유를 주석으로 남기고 있다.
//
// 이 파일에는 2026-07-04 `a59451b69`("serve comprehensive static sitemap at /sitemap.xml")
// 이후로도 `/sitemap.xml` 이 남아 있었지만, `_routes.json` 의 include 에 그 경로가 없어
// 라우팅되지 않았다 — 죽은 선언이 살아 있는 결정과 정반대로 적혀 있던 셈이다.
//
// 되살리면 안 되는 이유는 취향이 아니다. 엣지에서 병합된 URL 은 빌드 게이트를 하나도 거치지
// 않는다 — verify-sitemap-integrity(리다이렉트·noindex 충돌) · verify-seo-heading-integrity(H1
// 단일) · verify-adsense-readiness(라우트별 렌더 텍스트 분량)는 전부 정적 산출물을 검사한다.
// 그 상태로 켜면 검증되지 않은 URL 이 색인 요청만 나가게 된다.
const DYNAMIC_FEED_PATHS = new Set(["/rss.xml", "/insights/rss.xml"]);

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

async function proxyApiRequest(request, env, pathOverride) {
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
  targetUrl.pathname = pathOverride || incomingUrl.pathname;
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

function extractXmlBlocks(xml, blockName) {
  const re = new RegExp(`<${blockName}\\b[\\s\\S]*?<\\/${blockName}>`, "gi");
  return String(xml || "").match(re) || [];
}

function extractFirstTagText(xml, tagName) {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = re.exec(String(xml || ""));
  return match ? String(match[1] || "").trim() : "";
}

function mergeRssXml(staticXml, dynamicXml) {
  const base = String(staticXml || "");
  if (!/<\/channel>/i.test(base)) return dynamicXml;

  const seen = new Set(
    extractXmlBlocks(base, "item")
      .map((block) => extractFirstTagText(block, "guid") || extractFirstTagText(block, "link"))
      .filter(Boolean),
  );
  const extraItems = extractXmlBlocks(dynamicXml, "item").filter((block) => {
    const key = extractFirstTagText(block, "guid") || extractFirstTagText(block, "link");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (extraItems.length === 0) return base;
  return base.replace(/<\/channel>/i, `${extraItems.join("\n")}\n  </channel>`);
}

async function serveDynamicFeed(request, env) {
  const url = new URL(request.url);
  const assetResponse = await env.ASSETS.fetch(request);
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: assetResponse.ok ? assetResponse.status : 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Code-Destiny-Feed": "merged",
      },
    });
  }

  const apiPath = `/api/content-feed${url.pathname}`;
  const apiResponse = await proxyApiRequest(request, env, apiPath);

  if (!apiResponse.ok) {
    return hardenResponse(request.url, assetResponse);
  }

  const [staticXml, dynamicXml] = await Promise.all([
    assetResponse.text().catch(() => ""),
    apiResponse.text().catch(() => ""),
  ]);
  const mergedXml = mergeRssXml(staticXml, dynamicXml);

  return new Response(mergedXml, {
    status: assetResponse.ok ? assetResponse.status : 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Code-Destiny-Feed": "merged",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const apiResponse = await proxyApiRequest(request, env);
      return hardenResponse(request.url, apiResponse, { api: true });
    }

    if (DYNAMIC_FEED_PATHS.has(url.pathname)) {
      return serveDynamicFeed(request, env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return hardenResponse(request.url, assetResponse);
  },
};
