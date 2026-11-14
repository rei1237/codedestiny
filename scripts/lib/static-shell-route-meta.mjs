/**
 * 정적 셸 사본 라우트의 <head> 교체기 — prepare-cloudflare-dist 와
 * promote-static-shell-to-root 가 함께 쓰는 단일 정본.
 *
 * 🔴 왜 모듈로 뺐나 (2026-08-23): 같은 함수가 두 스크립트에 복사돼 있었고 서로 달랐다.
 *    - robots:    prepare = "index, follow"  /  promote = "noindex, follow"
 *    - canonical: prepare = 슬래시 없음      /  promote = 슬래시 있음
 *    run-postbuild.mjs 의 순서상 promote 가 나중에 같은 파일을 덮어써서 라이브에는
 *    promote 쪽 값만 나갔다 — 즉 prepare 쪽 값은 "틀린 채로 조용히 살아 있던" 코드다.
 *    단계 순서가 한 번만 바뀌면 index/슬래시 없는 canonical 이 그대로 배포된다.
 *    가드를 새로 놓는 대신 구현을 하나로 합쳐 드리프트 자체를 없앤다.
 *
 * 🔴 robots 는 noindex 다. 이 사본들은 body 가 루트 index.html 과 바이트 단위로 같고
 *    (제목·설명·canonical·소셜 카드만 교체) generate-sitemap.mjs 의 noindexPathPrefixes
 *    가 같은 이유로 사이트맵에서도 뺀다. follow 는 유지해 링크 자산은 통과시킨다.
 */

import { alternatesFor, HOME_HREFLANG_ROUTES } from "../../lib/seo/hreflang.mjs";

const SITE_ORIGIN = "https://code-destiny.com";

export function escapeHtmlAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// next.config.mjs 의 trailingSlash:true 때문에 이 셸 사본들은 /tarot/love/ 로 서빙된다.
// 슬래시 없는 canonical 은 자기 자신을 못 가리켜 self-canonical 이 성립하지 않는다.
export function toCanonicalUrl(pathname) {
  const normalized = String(pathname || "/").startsWith("/") ? String(pathname || "/") : `/${pathname}`;
  const withSlash = normalized === "/" ? "/" : `${normalized.replace(/\/+$/, "")}/`;
  return `${SITE_ORIGIN}${withSlash}`;
}

/**
 * 정적 셸 사본에서 hreflang alternate 를 걷어낸다.
 *
 * 이 사본들은 루트 셸의 `<head>` 만 갈아 끼우므로, 지우지 않으면 **홈의 alternate 12줄**
 * (ko·ko-KR·ja·ja-JP·zh-CN·zh·zh-Hans·zh-TW·zh-Hant·en·en-US·x-default)을 그대로 들고 나간다.
 * 즉 이 사본이 "이 사이트의 한국어판이자 x-default" 라고 주장하게 되고, 목적지들은 당연히
 * 되돌아 가리키지 않아 상호참조가 깨진 채로 남는다 — Google "Localized versions" 는
 * 역방향 링크가 없으면 주석이 무시되거나 잘못 해석될 수 있다고 명시한다.
 * noindex 라 실제로 처리되지는 않지만, 홈의 hreflang 클러스터에 잡음을 남길 이유가 없다.
 *
 * 2026-08-27 dist/ 실측: `/oracle/juyuk`·`/oracle/hwatu`·`/static` 이 각각 12줄을 내보내고 있었다.
 * 🔴 `rel="alternate"` 만 보고 지우지 말 것 — RSS 링크
 *    (`<link rel="alternate" type="application/rss+xml" ...>`)가 같은 rel 을 쓴다.
 *    반드시 `hreflang=` 이 함께 있는 태그만 지운다.
 */
function withoutHreflangLinks(html) {
  return html.replace(/\s*<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=["'][^"']*["'][^>]*>/gi, "");
}

/**
 * 꽃돼지 홈 클러스터 셸(/ggulggul/·/en/·/ja/·/zh/·/zh-tw/)의 hreflang 을 사이트맵과 같은 집합으로 바꾼다(묶음 ③ T8).
 * 2026-11-14: 한국어 대표·x-default 는 `/` 다(HOME_HREFLANG_ROUTES). /ggulggul/ 셸은 빈 배열을 넘겨 hreflang 을 지운다.
 *
 * 이 셸들은 루트 index.html 의 hreflang 12줄(ko-KR·ja-JP·en-US 포함)을 그대로 들고 나온다. 설계상 index.html 은
 * 고치지 않으므로(다른 브랜치가 같은 파일을 만진다) 배포 산출물에서만 alternatesFor(HOME_HREFLANG_ROUTES) 로 갈아 끼운다.
 * 사이트맵(generate-sitemap.mjs)도 같은 지도·같은 함수라 HTML = 사이트맵이 된다.
 * 첫 hreflang 줄 자리에 새 묶음을 넣고 나머지는 지운다. hreflang 줄이 없으면 그대로 둔다(없는 클러스터를 만들지 않는다).
 * 🔴 RSS 링크(rel="alternate" type=rss)는 hreflang 이 없어 건드리지 않는다.
 */
export const HOME_CLUSTER_SHELL_FILES = Object.freeze([
  "ggulggul/index.html",
  "en/index.html",
  "ja/index.html",
  "zh/index.html",
  "zh-tw/index.html",
]);

export function withHomeClusterHreflang(html, alternates = alternatesFor(HOME_HREFLANG_ROUTES)) {
  const block = alternates
    .map((alt) => `<link rel="alternate" hreflang="${escapeHtmlAttr(alt.hreflang)}" href="${escapeHtmlAttr(alt.href)}">`)
    .join("\n");
  let first = true;
  return html.replace(/(\s*)<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=["'][^"']*["'][^>]*>/gi, (_, space) => {
    if (!first) return "";
    first = false;
    return block ? `${space}${block}` : "";
  });
}

function replaceMetaContent(html, matcher, replacement) {
  return html.replace(matcher, replacement);
}

export function injectStaticShellRouteMeta(html, route) {
  const canonicalUrl = toCanonicalUrl(route.canonical);
  const title = escapeHtmlAttr(route.title);
  const description = escapeHtmlAttr(route.description);
  const routeMeta = [
    `<meta name="cd-static-canonical-route" content="${escapeHtmlAttr(route.canonical)}">`,
    route.action ? `<meta name="cd-static-canonical-action" content="${escapeHtmlAttr(route.action)}">` : "",
  ].filter(Boolean).join("\n");

  let nextHtml = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta\s+name=["']description["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta name="description" content="${description}">`)
    .replace(/<link\s+rel=["']canonical["']\s+href=["'][\s\S]*?["']\s*\/?>/i, `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}">`)
    .replace(/<meta\s+name=["']robots["']\s+content=["'][\s\S]*?["']\s*\/?>/i, '<meta name="robots" content="noindex, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">')
    // robots 계열 meta 는 페이지당 1개(묶음 ③ T4). 원본 셸에 googlebot meta 가 섞여 들어와도 robots 하나만 남긴다.
    .replace(/\s*<meta\s+name=["']googlebot["'][^>]*>/gi, "");

  nextHtml = withoutHreflangLinks(nextHtml);

  /* 소셜 카드도 라우트 것으로 바꾼다. 예전에는 title/description/canonical 만 갈아 끼워서
     11개 사본 전부가 홈의 og:title·og:description 을 그대로 달고 있었고, og:url 은 아예
     홈 주소("https://code-destiny.com/")를 가리켰다 — 카카오톡·X 에 /oracle/juyuk 을
     공유하면 "무료 만세력·운세·타로·궁합…" 홈 카드가 뜨고 링크도 홈으로 보였다.
     색인은 막더라도 공유 유입은 이 사본들이 실제로 받는 트래픽이라 맞춰 준다. */
  nextHtml = replaceMetaContent(
    nextHtml,
    /<meta\s+property=["']og:title["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
    `<meta property="og:title" content="${title}">`,
  );
  nextHtml = replaceMetaContent(
    nextHtml,
    /<meta\s+property=["']og:description["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
    `<meta property="og:description" content="${description}">`,
  );
  nextHtml = replaceMetaContent(
    nextHtml,
    /<meta\s+property=["']og:url["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}">`,
  );
  nextHtml = replaceMetaContent(
    nextHtml,
    /<meta\s+name=["']twitter:title["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
    `<meta name="twitter:title" content="${title}">`,
  );
  nextHtml = replaceMetaContent(
    nextHtml,
    /<meta\s+name=["']twitter:description["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
    `<meta name="twitter:description" content="${description}">`,
  );

  if (nextHtml.includes("</head>")) {
    nextHtml = nextHtml.replace("</head>", `${routeMeta}\n</head>`);
  }

  return nextHtml;
}
