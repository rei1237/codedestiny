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
    .replace(/<meta\s+name=["']robots["']\s+content=["'][\s\S]*?["']\s*\/?>/i, '<meta name="robots" content="noindex, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">');

  /* 소셜 카드도 라우트 것으로 바꾼다. 예전에는 title/description/canonical 만 갈아 끼워서
     11개 사본 전부가 홈의 og:title·og:description 을 그대로 달고 있었고, og:url 은 아예
     홈 주소("https://code-destiny.com/")를 가리켰다 — 카카오톡·X 에 /oracle/juyuk 을
     공유하면 "무료 사주·운세·타로·궁합…" 홈 카드가 뜨고 링크도 홈으로 보였다.
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
