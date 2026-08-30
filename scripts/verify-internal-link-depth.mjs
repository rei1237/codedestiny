#!/usr/bin/env node
/**
 * 색인 대상 라우트의 **내부 링크 도달 거리**(홈 기준 홉 수) 가드.
 *
 * 왜 필요한가 (2026-08-30 GSC 실측):
 *   사이트맵 439개를 전수 라이브 프로브했더니 기술적 색인성에는 결함이 없었다 —
 *   상태코드 200 439/439 · noindex 0 · canonical 불일치 0 · h1≠1 0 · X-Robots-Tag 0.
 *   그런데 GSC "색인 생성됨" 은 285(2026-08-21)뿐이었다. 미색인 사이트맵 URL ≥ 154 인데
 *   404 목록에 2개, "크롤됨-미색인" 목록에 7개만 매칭됐다. 나머지는 전부
 *   **"발견됨 - 현재 색인이 생성되지 않음"**, 즉 구글이 URL 은 알지만 한 번도 가 보지 않은 것이다.
 *
 *   그 하한 ≥145 와 링크 도달 거리가 먼 클러스터가 정확히 겹쳤다:
 *     /fortune/{기간}/{sign} 96개 — 홈에서 3홉, 노출 0 이 92개
 *     /stories/*             45개 — 홈에서 4홉, 노출 0 이 45개  (합 141)
 *   사이트맵에 넣는 것만으로는 크롤되지 않는다. 홈에서 몇 번 만에 닿느냐가 크롤 예산을 가른다.
 *
 * 그래서 이 가드는 목록을 갖지 않는다. 색인 대상(사이트맵)을 산출물에서 **발견**하고,
 * 홈 산출물에서 시작해 실제 <a href> 만 따라가며 BFS 로 홉 수를 잰다.
 * 새 라우트가 생기면 자동으로 검사 대상이 되고, 어디서도 링크되지 않으면 고아로 걸린다.
 *
 * 무엇을 따라가는가:
 *   ① 색인 대상 라우트끼리만 이동한다. noindex 라우트를 경유하는 경로는 크롤러에게
 *      신뢰할 수 있는 통로가 아니므로(장기적으로 nofollow 로 취급된다) 홉 수로 세지 않는다.
 *   ② 서버 HTML 의 <a href> 만 본다. 하이드레이션 후 JS 가 만드는 링크는 크롤러의 첫 방문에
 *      보이지 않으므로 여기서도 안 보이는 것이 맞다.
 *   ③ <link rel="alternate" hreflang> 도 간선으로 센다. 구글은 hreflang 주석을 **발견 경로로**
 *      쓰기 때문이다. 이걸 빼면 /en·/ja·/zh·/zh-tw 랜딩 4개와 그 하위가 전부 4~5홉으로 잡히는데,
 *      실제로는 홈 head 의 hreflang 12줄이 곧바로 가리키고 있다(2026-08-30 dist 실측).
 *   ④ 확장자 링크(`/x.html`)는 확장자 없는 색인 라우트(`/x`)와 같은 노드로 본다 — 같은 산출물
 *      파일이고 canonical 이 확장자 없는 쪽이다. 이 정규화가 없으면 `/destiny-poker` 가
 *      "도달 불가" 로 잡히는데, 실제로는 홈 타일이 `/destiny-poker.html` 로 링크하고 있다.
 *
 * fail-closed (guard-integrity G-2: 대상이 없을 때 통과시키는 가드는 가드가 아니다):
 *   ① dist/ 가 없으면 실패한다 — 빌드 전에 돌리면 "검사할 게 없어서 통과"가 된다.
 *   ② dist/sitemap.xml 이 없거나 라우트를 하나도 못 읽으면 실패한다.
 *   ③ 시작점(홈) 산출물이 없으면 실패한다.
 *   ④ 사이트맵에 있는데 HTML 산출물이 없으면 실패한다.
 *   ⑤ MAX_HOPS 초과나 도달 불가가 하나라도 있으면 실패한다.
 *
 * 🔴 사이트맵은 **산출물 안의 것**(dist/sitemap.xml)을 읽는다 — 리포 루트의 추적본은
 *    빌드가 다시 쓰기 전까지 낡아 있을 수 있고, 그러면 새 라우트가 통째로 빠진다.
 *
 * 실행: npm run verify:internal-link-depth   (먼저 `npm run build:cf` 로 dist/ 가 있어야 한다)
 *       --report 를 주면 실패시키지 않고 홉 수 분포만 출력한다.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const rootDir = process.cwd();
const baseDir = process.env.LINK_DEPTH_BASE_DIR || "dist";
const reportOnly = process.argv.includes("--report");

/**
 * 색인 대상 라우트가 홈에서 떨어져 있어도 되는 최대 홉 수.
 *
 * 왜 3 이 아니라 2 인가 (2026-08-30 실측): 홈에서 2홉 이내인 /insights/*·/nakshatra/codex/*
 * 140개는 크롤이 돌았는데, **정확히 3홉이던** /fortune/{기간}/{sign} 96개는 92개가 노출 0 이었다.
 * 즉 3 은 안전선이 아니라 이미 새고 있는 거리다. 4홉이던 /stories/* 45개는 전부 노출 0 이었다.
 * 🔴 이 값을 올려서 가드를 통과시키지 말 것 — 올린다는 것은 그 라우트를 크롤 예산 밖에 둔다는 뜻이다.
 */
const MAX_HOPS = 2;

/**
 * 로케일 변형(다른 라우트가 hreflang 으로 가리키는 라우트)에만 주는 추가 홉.
 * 한국어 정본이 2홉이면 그 변형은 hreflang 을 한 번 더 타므로 구조적으로 3홉이 된다.
 * 🔴 목록을 손으로 적지 않는다 — 산출물의 hreflang 주석에서 전수 발견한다(원칙 10).
 */
const LOCALE_VARIANT_BONUS_HOPS = 1;

/** 시작점. 크롤러가 확실히 매번 가져가는 유일한 페이지다. */
const START_ROUTE = "/";

/**
 * 의도적으로 상한을 넘거나 도달 불가인 라우트를 사유와 함께 선언한다.
 * 🔴 비어 있는 것이 정상이다. 채우기 전에 "이 페이지를 색인에 제출할 이유가 있는가" 를 먼저 따질 것 —
 *    어디서도 링크하지 않는 페이지를 사이트맵에만 넣는 것은 대개 사이트맵 쪽이 틀린 것이다.
 */
const DECLARED_EXCEPTIONS = new Map([
  [
    "/ja/tokushoho",
    {
      maxHops: 3,
      reason:
        "일본 특정상거래법 고지. 일본어 전용이라 한국어 정본이 없고, 그래서 hreflang 으로 " +
        "가리켜지지도 않아 로케일 변형 가산(+1)을 못 받는다. 실제 경로는 홈 → /ja → /ja/today → 여기로 " +
        "다른 로케일 정책 페이지와 같은 3홉이다. 법정 고지라 검색 유입을 늘릴 이유도 없다.",
    },
  ],
]);

function fail(message, details = []) {
  console.error(`[verify-internal-link-depth] FAIL: ${message}`);
  for (const line of details) console.error(`  ${line}`);
  process.exit(1);
}

/** trailingSlash: true 라 산출물의 href 는 "/x/" 로 나온다. 비교는 슬래시를 떼고 한다. */
function normalizeRoute(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

/** href 하나를 같은 사이트 라우트로 바꾼다. 외부·비HTTP·앵커면 null. */
function hrefToRoute(raw, siteHosts) {
  const value = raw.trim();
  if (!value || value.startsWith("#")) return null;
  let pathname;
  if (value.startsWith("/")) {
    if (value.startsWith("//")) return null; // 프로토콜 상대 = 외부
    pathname = value.split("?")[0].split("#")[0];
  } else if (/^https?:/i.test(value)) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (!siteHosts.has(url.host)) return null;
    pathname = url.pathname;
  } else {
    return null; // mailto:·tel:·상대경로 — 산출물에서 상대경로는 쓰지 않는다
  }
  try {
    return normalizeRoute(decodeURI(pathname));
  } catch {
    return normalizeRoute(pathname);
  }
}

/** 한 페이지의 서버 HTML 에서 <a href> 링크와 hreflang 대체를 따로 뽑는다. */
function collectLinks(html, siteHosts) {
  const anchors = new Set();
  const alternates = new Set();
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*("[^"]*"|'[^']*')/gi)) {
    const route = hrefToRoute(match[1].slice(1, -1), siteHosts);
    if (route) anchors.add(route);
  }
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\brel\s*=\s*("alternate"|'alternate')/i.test(tag)) continue;
    if (!/\bhreflang\s*=/i.test(tag)) continue;
    const href = tag.match(/\bhref\s*=\s*("[^"]*"|'[^']*')/i);
    if (!href) continue;
    const route = hrefToRoute(href[1].slice(1, -1), siteHosts);
    if (route) alternates.add(route);
  }
  return { anchors, alternates };
}

const absoluteBase = resolve(rootDir, baseDir);
if (!existsSync(absoluteBase)) {
  fail(`빌드 산출물이 없다 → ${baseDir}/`, [
    "`npm run build:cf` 를 먼저 실행할 것.",
    "🔴 여기서 조용히 통과하면 이 가드는 아무것도 지키지 않는다(guard-integrity G-2).",
  ]);
}

const sitemapPath = resolve(absoluteBase, "sitemap.xml");
if (!existsSync(sitemapPath)) {
  fail(`사이트맵이 없다 → ${baseDir}/sitemap.xml`, [
    "빌드가 사이트맵을 산출물로 승격하지 못했다. `npm run build:cf` 를 다시 볼 것.",
  ]);
}

const sitemapXml = readFileSync(sitemapPath, "utf8");
const siteHosts = new Set();
const indexedRoutes = new Set();
for (const match of sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
  let url;
  try {
    url = new URL(match[1].trim());
  } catch {
    continue;
  }
  siteHosts.add(url.host);
  indexedRoutes.add(normalizeRoute(url.pathname));
}

if (indexedRoutes.size === 0) fail(`${baseDir}/sitemap.xml 에서 라우트를 하나도 못 읽었다.`);
if (!indexedRoutes.has(START_ROUTE)) {
  fail(`시작점 ${START_ROUTE} 이 사이트맵에 없다.`, [
    "홈이 색인 대상이 아니면 이 가드의 거리 기준 자체가 성립하지 않는다.",
  ]);
}

/** 라우트 → 산출물 HTML 경로. prose-depth 가드와 같은 후보 규칙을 쓴다. */
function artifactFor(route) {
  const candidates =
    route === "/"
      ? [join(absoluteBase, "index.html")]
      : [join(absoluteBase, route, "index.html"), join(absoluteBase, `${route}.html`)];
  return candidates.find((candidate) => existsSync(candidate));
}

const artifacts = new Map();
const missingArtifacts = [];
for (const route of indexedRoutes) {
  const file = artifactFor(route);
  if (!file) missingArtifacts.push(route);
  else artifacts.set(route, file);
}

if (missingArtifacts.length > 0) {
  fail(`사이트맵에 있는데 빌드 산출물이 없는 라우트 ${missingArtifacts.length}개`, [
    ...missingArtifacts.slice(0, 10).map((route) => `- ${route}`),
    "색인 대상으로 제출하는데 실제로 만들어지지 않는다면 사이트맵이나 라우트 중 하나가 틀렸다.",
  ]);
}

// ── 간선 수집: 산출물을 한 번씩만 읽는다 ────────────────────────────────────────
/** `/x.html` 링크는 색인 라우트 `/x` 와 같은 산출물이다(위 ④). 색인 밖이면 null. */
function resolveTarget(raw) {
  if (artifacts.has(raw)) return raw;
  const stripped = raw.endsWith(".html") ? raw.slice(0, -".html".length) : null;
  return stripped && artifacts.has(stripped) ? stripped : null;
}

const edges = new Map();
/** 다른 라우트가 hreflang 으로 가리키는 라우트 = 로케일 변형. */
const localeVariants = new Set();
for (const [route, file] of artifacts) {
  const { anchors, alternates } = collectLinks(readFileSync(file, "utf8"), siteHosts);
  const targets = new Set();
  for (const raw of anchors) {
    const target = resolveTarget(raw);
    if (target && target !== route) targets.add(target);
  }
  for (const raw of alternates) {
    const target = resolveTarget(raw);
    if (!target || target === route) continue;
    targets.add(target);
    localeVariants.add(target);
  }
  edges.set(route, targets);
}

// ── 홈에서 BFS. 색인 대상 라우트끼리만 이동한다. ────────────────────────────────
const hops = new Map([[START_ROUTE, 0]]);
const parent = new Map();
let frontier = [START_ROUTE];
while (frontier.length > 0) {
  const next = [];
  for (const route of frontier) {
    for (const target of edges.get(route) ?? []) {
      if (hops.has(target)) continue;
      hops.set(target, hops.get(route) + 1);
      parent.set(target, route);
      next.push(target);
    }
  }
  frontier = next;
}

/** 이 라우트에 허용되는 홉 상한. 로케일 변형은 hreflang 을 한 번 더 타므로 +1. */
function limitFor(route) {
  const declared = DECLARED_EXCEPTIONS.get(route)?.maxHops;
  if (declared !== undefined) return declared;
  return MAX_HOPS + (localeVariants.has(route) ? LOCALE_VARIANT_BONUS_HOPS : 0);
}

const measured = [...indexedRoutes].map((route) => ({ route, hops: hops.has(route) ? hops.get(route) : Infinity }));
measured.sort((a, b) => b.hops - a.hops || a.route.localeCompare(b.route));

const distribution = new Map();
for (const { hops: depth } of measured) {
  const key = Number.isFinite(depth) ? String(depth) : "도달 불가";
  distribution.set(key, (distribution.get(key) || 0) + 1);
}

const violations = measured.filter(({ route, hops: depth }) => !(depth <= limitFor(route)));

const summary = [...distribution.entries()]
  .sort((a, b) => (a[0] === "도달 불가" ? 1 : b[0] === "도달 불가" ? -1 : Number(a[0]) - Number(b[0])))
  .map(([depth, count]) => `${depth}홉 ${count}개`)
  .join(" · ");

if (reportOnly) {
  console.log(`[verify-internal-link-depth] ${baseDir}/ 색인 ${indexedRoutes.size}개 — ${summary}`);
  for (const { route, hops: depth } of measured.slice(0, 25)) {
    const trail = Number.isFinite(depth) ? ` ← ${parent.get(route) ?? "(시작점)"}` : "";
    console.log(`  ${Number.isFinite(depth) ? `${depth}홉` : "도달 불가"}  ${route}${trail}`);
  }
  process.exit(0);
}

if (violations.length > 0) {
  fail(`홈에서 상한(${MAX_HOPS}홉, 로케일 변형 ${MAX_HOPS + LOCALE_VARIANT_BONUS_HOPS}홉) 안에 닿지 않는 색인 라우트 ${violations.length}개`, [
    ...violations.slice(0, 20).map(({ route, hops: depth }) => {
      const via = Number.isFinite(depth) ? ` (경유: ${parent.get(route) ?? "-"})` : " (어디서도 링크되지 않음)";
      return `- ${Number.isFinite(depth) ? `${depth}홉` : "도달 불가"}  ${route}  상한 ${limitFor(route)}홉${via}`;
    }),
    violations.length > 20 ? `  … 외 ${violations.length - 20}개` : "",
    "",
    "사이트맵에 넣는 것만으로는 크롤되지 않는다. 허브 페이지에서 링크를 걸어 거리를 줄일 것.",
    "🔴 MAX_HOPS 를 올려서 통과시키지 말 것 — 그건 그 라우트를 크롤 예산 밖에 두겠다는 뜻이다.",
  ].filter(Boolean));
}

console.log(
  `[verify-internal-link-depth] OK — 색인 ${indexedRoutes.size}개 전부 상한 이내 ` +
    `(${MAX_HOPS}홉, 로케일 변형 ${localeVariants.size}개는 ${MAX_HOPS + LOCALE_VARIANT_BONUS_HOPS}홉) — ${summary}`,
);
