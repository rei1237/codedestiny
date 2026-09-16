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

// 🔴 /fortune/** 레거시 리다이렉트가 _redirects 가 아니라 여기 있는 이유.
//
// Cloudflare Pages 는 `public/_redirects` 의 **첫 102개 규칙만** 적용하고 나머지는 에러도
// 경고도 없이 무시한다(2026-08-16 라이브 실측). 규칙 303개였을 때 #103 부터가 죽어
// `/fortune/{weekly,monthly}/*.html` 38개가 404 였고, 그게 네이버 서치어드바이저의
// "접근 불가 38건" 이었다. 여기에 필요한 규칙은 fortune 계열만 108개라 _redirects 예산
// (구조적 별칭·insights 통합과 나눠 써야 한다)에 들어갈 수 없다.
//
// 이 파일에는 개수 제한이 없다. 대신 `public/_routes.json` 의 include 에 그 경로가 있어야
// 이 코드가 실행된다. 아래 마커가 그 계약이고, scripts/verify-redirects-budget.mjs 가
// 마커와 _routes.json 의 드리프트를 fail-closed 로 막는다. 워커에서 리다이렉트를 하나 더
// 다루려면 마커를 한 줄 추가해야 하고, 안 하면 가드가 실패한다.
// @routes-include: /yeongnyangi/free-fortune*
// @routes-include: /fortune/*
// @routes-include: /insights/famous-saju/*
// @routes-include: /de-de/high-value*
// @routes-include: /es-es/high-value*
//
// 🔴 살아 있는 라우트를 삼키면 안 된다. `/fortune/`, `/fortune/{period}/`,
//    `/fortune/{period}/{sign}/` 96개는 사이트맵에 있는 200 페이지다. 아래 두 분기는
//    (a) `.html` 확장자 (b) 사인이 아닌 체계 세그먼트 만 매칭하므로 겹치지 않는다.
const FORTUNE_PERIODS = new Set(["today", "tomorrow", "weekly", "monthly"]);
// 2026-05-10 a38052ea6 이 삭제한 운세 시스템 페이지 204개(4기간 × 3체계). 체계별 정본 허브로
// 보내 주제 관련성을 유지한다(전부 /today 로 몰면 소프트404 위험).
const FORTUNE_LEGACY_SYSTEMS = new Map([
  ["sukuyo", "/sukuyo/"],
  ["vedic", "/vedic/"],
  ["ziwei", "/ziwei/"],
]);

// GSC 에 남은 비색인 로케일의 마지막 고가치 404 회수 경로.
// `high-value` 는 2026-08-30 에 `/guides/` 로 이름을 바꿨지만, 이미 색인된
// `/de-de/high-value`·`/es-es/high-value` 는 일반 locale fallback 으로 보내면
// `/high-value` → `/guides/` 2홉 체인이 된다. 확인된 두 URL만 직접 정본으로 보낸다.
const LEGACY_LOCALE_TARGETS = new Map([
  ["/de-de/high-value", "/guides/"],
  ["/es-es/high-value", "/guides/"],
]);

function legacyLocaleTarget(pathname) {
  const normalized = String(pathname || "").replace(/\/+$/, "") || "/";
  return LEGACY_LOCALE_TARGETS.get(normalized) || null;
}

// 유명인 사주 별칭 → 정본 리다이렉트.
//
// 2026-06-04 `9396dc8ce` 이전에는 인물 1명이 slug·이름·영문명·수동별칭만큼 URL 을 만들었다
// (134명 → 303 URL, 두 트리라 파일 606개). 정본만 프리렌더하도록 고치면서 구 URL 을 회수하지
// 않아 별칭 169개가 지금도 404 다. `/famous-saju/<별칭>` 은 _redirects 의 :slug 규칙을 타고
// 그 404 로 들어간다 — 리다이렉트 체인이 죽은 곳으로 가는 최악의 조합이다.
//
// 맵은 scripts/generate-famous-saju-aliases.mjs 가 celebrity-data.ts 에서 전수 파생해
// public/famous-saju-aliases.json 으로 굽는다. 이 파일은 lib/ 에서 import 할 수 없으므로
// 자산으로 읽는다. isolate 당 한 번만 읽고 재사용한다.
const FAMOUS_SAJU_PREFIX = "/insights/famous-saju/";
let famousSajuAliasesPromise = null;

function loadFamousSajuAliases(env, url) {
  if (!famousSajuAliasesPromise) {
    famousSajuAliasesPromise = env.ASSETS.fetch(new URL("/famous-saju-aliases.json", url).toString())
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}));
  }
  return famousSajuAliasesPromise;
}

async function famousSajuAliasTarget(pathname, env, url) {
  if (!pathname.startsWith(FAMOUS_SAJU_PREFIX)) return null;
  const rest = pathname.slice(FAMOUS_SAJU_PREFIX.length).replace(/\/+$/, "");
  if (!rest || rest.includes("/")) return null;

  let slug = rest;
  try {
    slug = decodeURIComponent(rest);
  } catch {
    // 잘못 인코딩된 경로는 그대로 자산 서빙에 넘긴다.
  }

  const aliases = await loadFamousSajuAliases(env, url);
  const canonical = aliases[slug];
  return canonical ? `${FAMOUS_SAJU_PREFIX}${canonical}/` : null;
}

function fortuneLegacyTarget(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "fortune" || segments.length < 3) return null;
  if (!FORTUNE_PERIODS.has(segments[1])) return null;

  const systemTarget = FORTUNE_LEGACY_SYSTEMS.get(segments[2]);
  if (systemTarget) return systemTarget;

  // 2026-08 이전의 정적 셸 96개. 본문을 브라우저에서 그려 크롤러가 받는 텍스트가 0자였고,
  // App Router 라우트로 이전하며 파일이 사라졌다. 구 URL 이 색인에 남아 있어 301 이 필요하다.
  if (segments.length === 3 && segments[2].endsWith(".html")) {
    const sign = segments[2].slice(0, -".html".length);
    if (/^[a-z]+$/.test(sign)) return `/fortune/${segments[1]}/${sign}/`;
  }

  return null;
}

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

// 🔴 /fortune/share/ 카카오 미리보기 카드.
//
// 이 사이트는 `output: "export"` 라 `/fortune/share/?shareId=x` 는 shareId 가 무엇이든
// **같은 HTML** 을 준다. 카카오는 **페이지 URL 을 캐시 키로** 스크랩하므로 공유마다 URL 은
// 다른데 카드 내용은 전부 같은 기본 문구가 된다 — 단톡방에서 클릭할 이유가 0이다.
// 여기서 스냅샷을 읽어 og 태그를 **교체**한다(추가가 아니다. og:image 가 둘이면 카카오가
// 정적 이미지를 고른다).
//
// 이 파일은 import 를 쓰지 않는다. `wrangler pages deploy dist` 가 이 파일을 정적 자산으로
// 올리므로 상대 import 는 런타임에서 깨진다. 순수 함수를 여기 두고
// __tests__/ui/guardian-share-og.static.test.js 가 소스를 잘라 vm 으로 검사한다
// (fortune-legacy-redirect.static.test.js 와 같은 방식).
//
// 🔴 오작동 반경이 크다. 이 파일은 사이트맵에 있는 /fortune/** 약 96개를 서빙한다. 그래서
// 경로와 shareId 정규식이 **동시에** 맞을 때만 들어오고, 무엇 하나라도 어긋나거나 예외가
// 나면 null 을 돌려 원래 자산 서빙으로 떨어뜨린다.
const GUARDIAN_SHARE_PATHS = new Set(["/fortune/share", "/fortune/share/"]);
const GUARDIAN_SHARE_ID_PATTERN = /^gf_[A-Za-z0-9_-]{24,80}$/;
const GUARDIAN_SHARE_CACHE_TTL_SECONDS = 600;
const GUARDIAN_SHARE_TITLE_LIMIT = 60;
const GUARDIAN_SHARE_DESC_LIMIT = 110;

function guardianShareIdFromUrl(url) {
  if (!GUARDIAN_SHARE_PATHS.has(String(url.pathname || ""))) return "";
  const shareId = url.searchParams.get("shareId") || "";
  return GUARDIAN_SHARE_ID_PATTERN.test(shareId) ? shareId : "";
}

function clampShareText(value, limit) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).replace(/\s+$/, "")}…`;
}

function buildGuardianShareOgMeta(snapshot, options) {
  const origin = String((options && options.origin) || "").replace(/\/+$/, "");
  const shareId = String((options && options.shareId) || "");
  if (!snapshot || !origin || !GUARDIAN_SHARE_ID_PATTERN.test(shareId)) return null;

  const title = clampShareText(snapshot.title, GUARDIAN_SHARE_TITLE_LIMIT);
  const description = clampShareText(snapshot.shareText || snapshot.openingLine, GUARDIAN_SHARE_DESC_LIMIT);
  if (!title || !description) return null;

  // 🔴 og:url 에는 shareId 만 남긴다. ref·utm 같은 추천 파라미터를 붙이면 수신자마다 URL 이
  // 달라져 카카오 캐시가 통째로 무력화된다. 그런 파라미터는 카카오 feed 의 link 에만 싣는다.
  const pageUrl = `${origin}/fortune/share/?shareId=${encodeURIComponent(shareId)}`;
  const imageParams = new URLSearchParams();
  imageParams.set("title", title);
  imageParams.set("desc", description);
  imageParams.set("badge", "fortune");
  return { title, description, url: pageUrl, image: `${origin}/api/og?${imageParams.toString()}` };
}

// 주입한 JSON 을 뷰어가 그대로 읽어 첫 화면에서 API 왕복을 없앤다.
// `<` 를 이스케이프해 본문에 `</script>` 가 섞여도 태그가 끊기지 않게 한다.
function guardianShareSnapshotScript(snapshot) {
  const json = JSON.stringify(snapshot).replace(/</g, "\\u003c");
  return `<script type="application/json" id="cd-share-snapshot">${json}</script>`;
}

function transformGuardianShareHtml(assetResponse, meta, snapshot) {
  const replaceContent = (value) => ({
    element(element) {
      element.setAttribute("content", value);
    },
  });
  return new HTMLRewriter()
    .on('meta[property="og:title"]', replaceContent(meta.title))
    .on('meta[property="og:description"]', replaceContent(meta.description))
    .on('meta[property="og:url"]', replaceContent(meta.url))
    .on('meta[property="og:image"]', replaceContent(meta.image))
    .on('meta[name="twitter:title"]', replaceContent(meta.title))
    .on('meta[name="twitter:description"]', replaceContent(meta.description))
    .on('meta[name="twitter:image"]', replaceContent(meta.image))
    .on("title", {
      element(element) {
        element.setInnerContent(meta.title);
      },
    })
    .on("head", {
      element(element) {
        element.append(guardianShareSnapshotScript(snapshot), { html: true });
      },
    })
    .transform(assetResponse);
}

async function serveGuardianShareCard(request, env, ctx, url, shareId) {
  const cache = globalThis.caches && globalThis.caches.default;
  // 캐시 키는 shareId 하나다. 실제 요청 URL 을 쓰면 utm 하나에 캐시가 갈라진다.
  const cacheKey = new Request(`https://cd-share-card.local/fortune/share/${shareId}`);

  try {
    if (cache) {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    }

    const apiOrigin = resolveApiWorkerOrigin(env);
    if (!apiOrigin) return null;
    // 공개 스냅샷이라 쿠키·인증 헤더를 넘기지 않는다.
    const snapshotResponse = await fetch(
      `${apiOrigin}/api/fortune/guardian/share/${encodeURIComponent(shareId)}`,
      { headers: { Accept: "application/json", "X-Code-Destiny-Proxy": "pages" } },
    );
    // 🔴 404·오류는 캐시하지 않는다. 만료 전 스냅샷이 잠깐 못 읽힌 것을 10분 굳히면
    // 그동안 공유된 링크가 전부 기본 카드로 나간다.
    if (!snapshotResponse.ok) return null;
    const snapshot = await snapshotResponse.json();
    const meta = buildGuardianShareOgMeta(snapshot, { origin: url.origin, shareId });
    if (!meta) return null;

    const assetResponse = await env.ASSETS.fetch(request);
    if (!assetResponse.ok) return null;

    const transformed = transformGuardianShareHtml(assetResponse, meta, snapshot);
    const headers = new Headers(transformed.headers);
    headers.set("Cache-Control", `public, max-age=60, s-maxage=${GUARDIAN_SHARE_CACHE_TTL_SECONDS}`);
    headers.set("X-Code-Destiny-Share-Card", "rendered");
    const response = hardenResponse(
      request.url,
      new Response(transformed.body, { status: assetResponse.status, headers }),
    );
    if (cache && ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error("[share-card] 카드 생성 실패 — 원본 자산으로 폴백:", (error && error.message) || error);
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const apiResponse = await proxyApiRequest(request, env);
      return hardenResponse(request.url, apiResponse, { api: true });
    }

    if (DYNAMIC_FEED_PATHS.has(url.pathname)) {
      return serveDynamicFeed(request, env);
    }

    // Retired SoulCat test entry points now use native Code Destiny pages.
    if (/^\/yeongnyangi\/free-fortune(?:\/|$)/.test(url.pathname)) {
      return Response.redirect(new URL('/today/', url), 302);
    }
    // /yeongnyangi/1000-won-fortune/ is now the static 천원사주 hub page, so it is not redirected.

    const legacyLocaleRedirect = legacyLocaleTarget(url.pathname);
    if (legacyLocaleRedirect) {
      const target = new URL(legacyLocaleRedirect, url);
      target.search = url.search;
      return Response.redirect(target.toString(), 301);
    }

    const legacyFortuneTarget = fortuneLegacyTarget(url.pathname);
    if (legacyFortuneTarget) {
      // 쿼리스트링은 유지한다 — Cloudflare 의 _redirects 기본 동작과 같게 두어야
      // 이 경로만 utm 파라미터를 잃는 일이 없다.
      const target = new URL(legacyFortuneTarget, url);
      target.search = url.search;
      return Response.redirect(target.toString(), 301);
    }

    const famousAliasTarget = await famousSajuAliasTarget(url.pathname, env, url);
    if (famousAliasTarget) {
      const target = new URL(famousAliasTarget, url);
      target.search = url.search;
      return Response.redirect(target.toString(), 301);
    }

    const guardianShareId = request.method.toUpperCase() === "GET" ? guardianShareIdFromUrl(url) : "";
    if (guardianShareId) {
      const shareCard = await serveGuardianShareCard(request, env, ctx, url, guardianShareId);
      if (shareCard) return shareCard;
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return hardenResponse(request.url, assetResponse);
  },
};
