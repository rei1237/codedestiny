/**
 * 빌드 산출물(dist/) 단일 SEO 검사기. 네트워크를 쓰지 않는다. postbuild 에서 verify-sitemap-canonical 뒤에 돈다.
 *
 * 규칙마다 등급이 있다(RULES). `fail` 규칙이 1건이라도 나오면 exit 1, `warn` 규칙은 개수만 보고한다.
 * 래칫이다: 현재 산출물에서 이미 깨끗한 결정적 불변식만 `fail` 로 둔다. 00:10 KST 일일 발행
 * (fortune-daily-publish)과 다른 세션 배포를 막지 않으려면, 0건이 아닌 규칙은 `warn` 으로 시작해야 한다.
 * 규칙은 사이트맵의 모든 페이지에 똑같이 돈다(사주·운세·인사이트·/ggulggul/·/yeongnyangi/·로케일). 구역을 빼지 않는다.
 *
 * 겹치는 기존 검사(verify-sitemap-canonical·verify-home-identity)는 그대로 두고, 그 함수를 가져다 쓴다.
 *
 * 실행: node scripts/seo/verify-dist.mjs [--dist=dist] [--json=<경로>]
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BRAND_FACTS } from "../../lib/brand/brand-facts.mjs";
import { renderRobotsTxt } from "../../lib/seo/robots-policy.mjs";
import { checkSitemapPage, htmlFileFor, redirectSources, sitemapLocs } from "../verify-sitemap-canonical.mjs";
import { robotsAllows, robotsSamples } from "../lib/robots-groups.mjs";
import { PAGES, verifyPage } from "../verify-home-identity.mjs";
import { distAssets, probeEdge } from "./edge-probe.mjs";
import {
  decodeHtml, getCanonical, getH1s, getHreflang, getInternalLinks, getJsonLd, getMeta, getTitle, parseJsonLdDate, parseSitemapAlternates, stripTags,
} from "./health-policy.mjs";

export const RULES = {
  "sitemap-page": "fail",
  // 함정 3: /sitemap.xml(빙이 읽음)과 sitemap-index 하위 합집합은 개수만 같다고 알려져 있었다. 기준선에서 깨끗하지 않으면 warn.
  "sitemap-set": "fail",
  "page-shape": "fail",
  // 함정 3: 깨끗하지 않으면 warn 으로 시작한다. 리디렉션 출발점을 가리키는 링크는 verify-sitemap-canonical 이 막는다.
  "internal-404": "fail",
  "home-identity": "fail",
  "duplicate-title": "warn",
  "duplicate-description": "warn",
  "og-url": "fail",
  // 루트 레이아웃의 og:title 이 하위 페이지로 상속되면 모든 쪽이 홈과 같은 제목으로 공유된다. 홈이 아닌 쪽의 og:title 이 홈과 같으면 1건.
  "og-home-title": "fail",
  "hreflang-sitemap": "warn",
  // dist/robots.txt 가 정본(lib/seo/robots-policy.mjs)과 표본 UA×경로 판정·Sitemap 경로가 모두 같아야 한다.
  "robots-policy": "fail",
  // 사이트 전체 JSON-LD 정체성. 같은 @id 는 어느 페이지에서나 같은 @type, #organization 은 같은 name 이어야 한다.
  // 브랜드 노드는 한 곳에서 정의하고 나머지는 { "@id": … } 로 참조한다.
  "jsonld-syntax": "fail",
  "jsonld-id-type": "fail",
  "organization-name": "fail",
  // 어느 노드든 datePublished·dateModified 가 있으면 ISO 8601 이고 검사 시각(now) 이하. 오프셋이 없으면 KST 로 읽는다.
  // 검사는 빌드 뒤에 돌므로 now ≥ 빌드 시각이다. 기준선 0건(2026-11-01 22:29 KST build:cf 산출물)이라 fail.
  "jsonld-dates": "fail",
  // 사전 없이 서버에서 렌더링된 useT 자리표시 문구("번역을 준비 중입니다" 등)가 사이트맵 페이지 HTML에 남으면 안 된다.
  // 기준선 0건(2026-11-03 build:cf 산출물)이라 fail. 사이트맵 밖 noindex /premium-unlock/ 은 범위 밖이다.
  "i18n-missing-text": "fail",
  // dist/_worker.js 를 Pages 정적 서빙 흉내 앞에서 돌린 결과(edge-probe.mjs). 같은 URL 은 국가·UA 와 무관하게 같은 응답이어야 한다.
  // 슬래시 없는 디렉터리 URL 의 308 이 그대로 나가면 안 되고(워커가 절대 URL 301 하나로 접는다), 국가 302 가 없어야 하며,
  // 크롤러 응답에 cd_geo_locale 쿠키나 no-store 가 없어야 한다(cd_geo_country·private 는 허용). 기준선 0건(2026-11-02 20:10 KST build:cf 산출물)이라 fail.
  "edge-slash-308": "fail",
  "edge-country-302": "fail",
  "edge-crawler-cookie": "fail",
};

const EDGE_RULES = ["edge-slash-308", "edge-country-302", "edge-crawler-cookie"];
const DETAIL_SAMPLE = 3;

function isFile(file) {
  return Boolean(file) && existsSync(file) && statSync(file).isFile();
}

function readText(file) {
  return isFile(file) ? readFileSync(file, "utf8") : null;
}

function xmlLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc.trim());
}

function sample(values) {
  const list = [...values];
  return list.slice(0, DETAIL_SAMPLE).join(", ") + (list.length > DETAIL_SAMPLE ? ", …" : "");
}

// 워커 CONSOLIDATED_PAGE_REDIRECTS 는 후행 슬래시를 떼고 찾으므로(public/_worker.js consolidatedPath) 두 꼴을 모두 출발점으로 본다.
// `_redirects` 정확 일치는 글자 그대로다: Cloudflare 문서 예시 `/trailing /trailing/ 301` 이 루프하지 않으려면
// `/trailing` 규칙이 `/trailing/` 에 맞으면 안 된다. 그래서 슬래시 제거는 워커 표에만 적용한다.
// redirectSources 는 `/x/*` 만 접두사로 바꾸고 `/insights/old-slug*` 같은 splat 은 글자 그대로 둔다.
// Pages 에서는 둘 다 접두사 규칙이므로 `*` 로 끝나는 항목도 접두사로 본다.
function isRedirectSource(pathname, { exact, prefixes, worker }) {
  if (exact.has(pathname) || worker.has(pathname.replace(/(.)\/$/, "$1"))) return true;
  if (prefixes.some((prefix) => pathname.startsWith(prefix))) return true;
  for (const source of exact) if (source.endsWith("*") && pathname.startsWith(source.slice(0, -1))) return true;
  return false;
}

function locFile(loc, distDir) {
  try {
    return htmlFileFor(loc, distDir);
  } catch {
    return null; // 디코드할 수 없는 퍼센트 인코딩
  }
}

// 페이지마다 HTML 을 한 번만 읽고 규칙이 쓸 사실만 남긴다(1,000쪽이 넘는 HTML 을 메모리에 들고 있지 않는다).
function pageFacts(html, loc, origin) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)(?:<\/body>|$)/i)?.[1] ?? "";
  return {
    sitemapIssues: checkSitemapPage(html, loc),
    title: getTitle(html),
    description: getMeta(html, "description")[0] || "",
    h1Count: getH1s(html).length,
    hasBodyText: stripTags(body).length > 0,
    canonical: getCanonical(html)[0],
    ogUrls: getMeta(html, "og:url"),
    ogTitles: getMeta(html, "og:title"),
    hreflang: getHreflang(html),
    links: getInternalLinks(html, origin),
    jsonLd: jsonLdFacts(html),
  };
}

// JSON-LD 에서 @id 와 @type 을 함께 선언한 노드(최상위·@graph·다른 노드 안에 중첩된 것 모두)만 남긴다.
// @type 이 없는 { "@id": … } 는 참조이므로 집계에서 뺀다. @type 배열은 정렬해 문자열로 만든다.
// 같은 순회에서 어느 노드든 datePublished·dateModified 값을 모은다(jsonld-dates).
function jsonLdFacts(html) {
  const { nodes, errors } = getJsonLd(html);
  const declarations = [];
  const dates = [];
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    for (const field of ["datePublished", "dateModified"]) if (Object.hasOwn(value, field)) dates.push({ field, value: value[field] });
    if (typeof value["@id"] === "string" && value["@type"] !== undefined) {
      const type = [value["@type"]].flat().map(String).sort().join(" + ");
      declarations.push({ id: value["@id"], type, name: typeof value.name === "string" ? value.name : undefined });
    }
    Object.values(value).forEach(visit);
  };
  nodes.forEach(visit);
  return { errors, declarations, dates };
}

// 정본은 lib/i18n/dictionary.ts 의 MISSING_TEXT 다. 형태가 바뀌어 일부만 읽히면 규칙이 조용히 약해지므로 던진다.
function readMissingTexts() {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../lib/i18n/dictionary.ts"), "utf8");
  const block = source.match(/const MISSING_TEXT\b[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "";
  const texts = [...block.matchAll(/:\s*"([^"]+)"/g)].map(([, text]) => text);
  if (texts.length < 12) throw new Error(`verify-dist: MISSING_TEXT ${texts.length}개만 읽음(12개 이상이어야 함)`);
  return texts;
}

const MISSING_TEXTS = readMissingTexts();
// 주석과 일반 인라인 스크립트의 설명 문구는 화면 문구가 아니다. React 스트리밍 데이터(__next_f)는 크롤러가 읽는 본문이라 남긴다.
const servedCopy = (html) => html
  .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (tag, body) => (/^\s*self\.__next_f\b/.test(body) ? tag : ""))
  .replace(/<!--[\s\S]*?-->/g, "");
const i18nMissingTexts = (html) => {
  const copy = servedCopy(html);
  return MISSING_TEXTS.filter((text) => copy.includes(text));
};

function loadSite(distDir, origin) {
  const { files, locs } = sitemapLocs(distDir);
  const pages = [...locs].map((loc) => {
    const file = locFile(loc, distDir);
    const html = readText(file);
    return { loc, path: safePathname(loc), file, facts: html == null ? null : { ...pageFacts(html, loc, origin), missingTexts: i18nMissingTexts(html) } };
  });
  return { files, pages };
}

function safePathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function checkSitemapPages(site, sources) {
  const details = [];
  if (site.pages.length === 0) details.push("sitemap*.xml 에 loc 이 없습니다");
  for (const page of site.pages) {
    if (!page.facts) details.push(`${page.loc}: dist 파일 없음`);
    else details.push(...page.facts.sitemapIssues);
    if (isRedirectSource(page.path, sources)) details.push(`${page.loc}: 리디렉션 출발점`);
  }
  return details;
}

// /sitemap.xml 의 loc 집합 == sitemap-index.xml 이 가리키는 하위 사이트맵 loc 합집합
function checkSitemapSet(distDir) {
  const details = [];
  const main = readText(join(distDir, "sitemap.xml"));
  const index = readText(join(distDir, "sitemap-index.xml"));
  if (main == null) details.push("sitemap.xml 없음");
  if (index == null) details.push("sitemap-index.xml 없음");
  if (main == null || index == null) return details;
  const children = new Set();
  for (const child of xmlLocs(index)) {
    let xml = null;
    try {
      xml = readText(join(distDir, decodeURIComponent(new URL(child).pathname)));
    } catch { /* 잘못된 하위 사이트맵 URL 은 없음으로 센다 */ }
    if (xml == null) details.push(`${child}: 하위 사이트맵 파일 없음`);
    else xmlLocs(xml).forEach((loc) => children.add(loc));
  }
  const mainLocs = new Set(xmlLocs(main));
  for (const loc of mainLocs) if (!children.has(loc)) details.push(`sitemap.xml 에만: ${loc}`);
  for (const loc of children) if (!mainLocs.has(loc)) details.push(`하위 사이트맵에만: ${loc}`);
  return details;
}

function checkPageShape(site) {
  const details = [];
  for (const { loc, facts } of site.pages) {
    if (!facts) continue; // 파일 없음은 sitemap-page 가 센다
    if (facts.h1Count !== 1) details.push(`${loc}: H1 ${facts.h1Count}개`);
    if (!facts.hasBodyText) details.push(`${loc}: <body> 텍스트 없음`);
  }
  return details;
}

// 워커가 정적 파일 없이 직접 응답하는 경로: `/api`·`/api/*` 프록시와 DYNAMIC_FEED_PATHS 피드(dist/_worker.js 에서 읽는다).
// 표를 못 찾으면 피드는 빈 집합이다 — 그 링크는 dist 파일로만 판정되므로 거짓 통과가 아니라 거짓 실패 쪽으로 기운다.
function workerDynamicPath(distDir) {
  const source = readText(join(distDir, "_worker.js")) ?? "";
  const feeds = source.match(/const DYNAMIC_FEED_PATHS = new Set\((\[[^\]]*\])\)/);
  const feedPaths = new Set(feeds ? JSON.parse(feeds[1]) : []);
  return (pathname) => pathname === "/api" || pathname.startsWith("/api/") || feedPaths.has(pathname);
}

// 쿼리·fragment 를 뗀 pathname 이 dist 파일, 디렉터리 index, `_redirects`·워커 리디렉션 출발점, 워커 동적 경로 중 어디에도 없으면 404.
// 리디렉션 출발점은 redirectSources 가 읽는 표(_redirects 301 규칙 + 워커 CONSOLIDATED_PAGE_REDIRECTS + /index.html)로만 본다.
// edge-probe 의 distAssets 는 _redirects 를 적용하지 않으므로 여기에 쓰지 않는다.
function checkInternal404(site, distDir, origin, sources) {
  const resolved = new Map();
  const isDynamic = workerDynamicPath(distDir);
  const exists = (pathname) => {
    if (isRedirectSource(pathname, sources) || isDynamic(pathname)) return true;
    let file;
    let rel;
    try {
      file = htmlFileFor(origin + pathname, distDir);
      rel = decodeURIComponent(pathname).replace(/^\/+/, "");
    } catch {
      return false;
    }
    return isFile(file) || isFile(join(distDir, rel, "index.html"));
  };
  const missing = new Map();
  for (const { path, facts } of site.pages) {
    if (!facts) continue;
    for (const link of facts.links) {
      const pathname = link.split("?")[0];
      if (!resolved.has(pathname)) resolved.set(pathname, exists(pathname));
      if (resolved.get(pathname)) continue;
      if (!missing.has(pathname)) missing.set(pathname, new Set());
      missing.get(pathname).add(path);
    }
  }
  return [...missing].map(([pathname, pages]) => `${pathname} ← ${pages.size}쪽 (예: ${sample(pages)})`);
}

function checkHomeIdentity(distDir) {
  return PAGES.flatMap((page) => {
    const file = join(distDir, page.file);
    const html = readText(file);
    return html == null ? [`${page.path}: ${file} 없음`] : verifyPage(html, page);
  });
}

function checkDuplicates(site, field) {
  const groups = new Map();
  for (const { path, facts } of site.pages) {
    const value = facts?.[field]?.trim();
    if (!value) continue;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(path);
  }
  return [...groups].filter(([, paths]) => paths.length > 1).map(([value, paths]) => `"${value}" ← ${paths.length}쪽 (예: ${sample(paths)})`);
}

function checkI18nMissingText(site) {
  return site.pages.flatMap(({ loc, facts }) => (facts?.missingTexts.length ? [`${loc}: ${facts.missingTexts.join(", ")}`] : []));
}

function checkOgUrl(site) {
  const details = [];
  for (const { loc, facts } of site.pages) {
    if (!facts || facts.ogUrls.length === 0) continue;
    const canonical = facts.canonical ?? loc;
    if (facts.ogUrls.some((value) => value !== canonical)) details.push(`${loc}: og:url ${facts.ogUrls.join(", ")} ≠ canonical ${canonical}`);
  }
  return details;
}

function checkOgHomeTitle(site, origin) {
  const homePath = safePathname(`${origin}/`);
  const homeTitle = site.pages.find((page) => page.path === homePath)?.facts?.ogTitles[0]?.trim();
  if (!homeTitle) return [];
  return site.pages
    .filter((page) => page.path !== homePath && page.facts?.ogTitles.some((title) => title.trim() === homeTitle))
    .map((page) => `${page.loc}: og:title 이 홈과 같다 "${homeTitle}"`);
}

function checkJsonLdSyntax(site) {
  return site.pages.flatMap(({ loc, facts }) => (facts?.jsonLd.errors ?? []).map((message) => `${loc}: JSON-LD 파싱 실패 — ${message}`));
}

// @id 마다 선언된 @type 종류를 모은다. 서로 다른 @type 이 둘 이상이면 @id 마다 1건.
// 중첩 노드도 센다 — fail 유지(2026-11-02 판단). Article @id=url 에 mainEntityOfPage {WebPage, @id=url} 처럼
// 같은 @id 에 다른 타입이 붙으면 JSON-LD 상 한 노드가 두 정체성을 갖는 실제 충돌이다. 지금 dist 에는 0건이라
// 새 출력이 이것을 만들면 빌드에서 바로 막는다.
function checkJsonLdIdType(site) {
  const byId = new Map();
  for (const { loc, facts } of site.pages) {
    for (const { id, type } of facts?.jsonLd.declarations ?? []) {
      const types = byId.get(id) ?? new Map();
      types.set(type, [...(types.get(type) ?? []), loc]);
      byId.set(id, types);
    }
  }
  return [...byId]
    .filter(([, types]) => types.size > 1)
    .map(([id, types]) => `${id}: ${[...types].map(([type, locs]) => `${type} (${sample(locs)})`).join(" ≠ ")}`);
}

// 날짜 값마다 1건: ISO 8601 이 아니거나(없는 날짜 포함) KST 날짜가 now 의 KST 날짜보다 뒤.
// 날 단위로 본다: 날짜만 있는 원본을 toISOString() 으로 내보낸 값은 그날 09:00 KST 라서,
// 시각으로 비교하면 00:00~09:00 KST 빌드(00:10 일일 발행 포함)가 정상 콘텐츠로 실패한다.
// 운세 Article 의 시각 단위 검사는 fortune-date-contract 가 맡는다.
// 2026-11-02 검토: SeoJsonLd·generate-page-metadata·famous-saju 는 날짜 문자열로 바꿨지만 /insights/* 113쪽이
// 아직 `T00:00:00.000Z` 를 내보내므로(실측 dist) 날 단위를 유지한다.
const kstDay = (ms) => new Date(ms + 9 * 3_600_000).toISOString().slice(0, 10);
function checkJsonLdDates(site, now) {
  const today = kstDay(now.getTime());
  const details = [];
  for (const { loc, facts } of site.pages) {
    for (const { field, value } of facts?.jsonLd.dates ?? []) {
      const ms = parseJsonLdDate(value);
      if (ms === null) details.push(`${loc}: ${field} ${JSON.stringify(value)} 를 ISO 8601 로 읽을 수 없다`);
      else if (kstDay(ms) > today) details.push(`${loc}: ${field} ${value} 가 검사일 ${today}(KST) 보다 뒤`);
    }
  }
  return details;
}

// '#organization' 으로 끝나는 @id 의 name 종류가 n 개면 (n − 1)건: 가장 많은 name 을 기준으로 나머지 name 마다 1건.
function checkOrganizationName(site) {
  const byName = new Map();
  for (const { loc, facts } of site.pages) {
    for (const { id, name } of facts?.jsonLd.declarations ?? []) {
      if (!id.endsWith("#organization") || name === undefined) continue;
      byName.set(name, [...(byName.get(name) ?? []), loc]);
    }
  }
  const [[majority, majorityLocs] = [], ...rest] = [...byName].sort((a, b) => b[1].length - a[1].length);
  return rest.map(([name, locs]) => `${sample(locs)}: #organization name "${name}" ≠ 최다 "${majority}" (${majorityLocs.length}쪽)`);
}

// HTML hreflang 집합과 사이트맵 alternates 집합을 (언어 코드 소문자, href) 쌍으로 비교한다.
//   xdefault-sitemap-only  사이트맵에만 x-default 가 있다
//   code-sitemap-only      사이트맵에만 있는 언어 코드가 있다
//   href-mismatch          같은 언어 코드가 양쪽에 있는데 href 가 다르다(code-sitemap-only·html-only 로 두 번 세지 않는다)
//   html-only              HTML 에만 있는 쌍이 있다(위 셋으로 분류되지 않는 차이를 놓치지 않으려고 둔다)
//   one-way                사이트맵에서 A→B 가 있는데 B 의 alternates 에 A 가 없다(쌍마다 1건)
// 같은 loc 이 sitemap.xml 과 하위 사이트맵에 다 있으면 alternates 를 합친다.
function checkHreflangSitemap(site, distDir) {
  const alternates = new Map();
  for (const name of site.files) {
    for (const [loc, list] of parseSitemapAlternates(readFileSync(join(distDir, name), "utf8"))) {
      const merged = alternates.get(loc) || new Map();
      for (const alt of list) merged.set(`${alt.lang.toLowerCase()} ${alt.href}`, alt);
      alternates.set(loc, merged);
    }
  }
  const details = [];
  for (const { loc, facts } of site.pages) {
    if (!facts) continue;
    const inSitemap = alternates.get(decodeHtml(loc)) || new Map();
    const inHtml = new Set(facts.hreflang.map((alt) => `${alt.lang.toLowerCase()} ${alt.href}`));
    const sitemapOnly = [...inSitemap.keys()].filter((key) => !inHtml.has(key)).map((key) => key.split(" ")[0]);
    const htmlOnly = [...inHtml].filter((key) => !inSitemap.has(key)).map((key) => key.split(" ")[0]);
    const mismatched = [...new Set(sitemapOnly.filter((code) => htmlOnly.includes(code)))];
    if (sitemapOnly.includes("x-default") && !mismatched.includes("x-default")) details.push(`xdefault-sitemap-only ${loc}`);
    const codes = sitemapOnly.filter((code) => code !== "x-default" && !mismatched.includes(code));
    if (codes.length) details.push(`code-sitemap-only ${loc} [${codes.join(", ")}]`);
    if (mismatched.length) details.push(`href-mismatch ${loc} [${mismatched.join(", ")}]`);
    const htmlOnlyCodes = htmlOnly.filter((code) => !mismatched.includes(code));
    if (htmlOnlyCodes.length) details.push(`html-only ${loc} [${htmlOnlyCodes.join(", ")}]`);
  }
  for (const [from, list] of alternates) {
    for (const to of new Set([...list.values()].map((alt) => alt.href))) {
      if (to === from) continue;
      if (![...(alternates.get(to)?.values() || [])].some((alt) => alt.href === from)) details.push(`one-way ${from} → ${to}`);
    }
  }
  return details;
}

// robots-policy: dist/robots.txt 와 정본(renderRobotsTxt)의 판정을 표본 UA×경로마다 견준다. 호스트는 보지 않는다
// (스테이징 빌드의 siteUrl 이 다를 수 있다). 표에 없는 봇은 '*' 그룹 상속을, 소문자 googlebot 은 UA 대소문자
// 무시를 본다. 경로는 서비스 구역마다 하나씩과 쿼리 규칙(/*?auth= 등)을 밟는 쪽을 고정으로 두고,
// 양쪽 파일의 User-agent 이름과 Allow/Disallow 값(`*` → x)을 모두 더한다.
const ROBOTS_SAMPLE_AGENTS = ["googlebot", "SomeUnlistedBot"];
const ROBOTS_SAMPLE_PATHS = [
  "/", "/saju/", "/fortune/today/aries/", "/insights/", "/ggulggul/", "/yeongnyangi/", "/en/faq/", "/ja/faq/",
  "/?auth=1", "/insights/x/?session=1", "/saju/?token=1", "/api/og?title=x",
];

function robotsSitemapPaths(text) {
  return [...new Set([...text.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map(([, url]) => safePathname(url)))].sort();
}

function checkRobotsPolicy(distDir, origin) {
  const dist = readText(join(distDir, "robots.txt"));
  if (dist == null) return [`${join(distDir, "robots.txt")} 없음`];
  const policy = renderRobotsTxt(origin);
  const { agents, paths } = robotsSamples([policy, dist], { agents: ROBOTS_SAMPLE_AGENTS, paths: ROBOTS_SAMPLE_PATHS });
  const verdict = (allowed) => (allowed ? "허용" : "차단");
  const details = [];
  for (const agent of agents) {
    for (const path of paths) {
      const want = robotsAllows(policy, path, agent);
      const got = robotsAllows(dist, path, agent);
      if (want !== got) details.push(`${agent} ${path}: dist ${verdict(got)}, 정본 ${verdict(want)}`);
    }
  }
  const [want, got] = [robotsSitemapPaths(policy), robotsSitemapPaths(dist)];
  if (want.join(" ") !== got.join(" ")) details.push(`Sitemap 경로: dist [${got.join(", ")}], 정본 [${want.join(", ")}]`);
  return details;
}

// 엣지 규칙은 dist/_worker.js 를 vm 에서 돌리고 그 뒤에 Pages 정적 서빙 흉내(distAssets)를 둔다.
// 흉내의 한계 — 개수를 읽을 때 감안할 것:
//   - `_redirects`·`_headers` 를 적용하지 않는다(리디렉션·헤더 규칙은 다른 검사가 본다).
//   - `/x.html` 은 200 이지만 실제 Pages 는 `/x` 로 308 한다. `/dir/index.html` 도 200 이다.
// 그래서 이 수치는 "워커가 무엇을 하는가"이고, 운영 응답 전체를 재현하지 않는다.
async function checkEdge(distDir) {
  const workerSource = readFileSync(join(distDir, "_worker.js"), "utf8");
  const { slash308, country302, crawlerCookie } = await probeEdge({ workerSource, assets: distAssets(distDir) });
  return { "edge-slash-308": slash308, "edge-country-302": country302, "edge-crawler-cookie": crawlerCookie };
}

/**
 * @param {{ distDir: string, origin?: string, edge?: boolean, rules?: string[], now?: Date }} options
 * `now` 는 jsonld-dates 의 기준 시각(기본: 지금). `rules` 를 주면 그 규칙만 돈다(테스트용). `edge=false` 이거나 dist/_worker.js 가 없으면 엣지 규칙은 건너뛰고
 * `details.edge = ['skipped']` 이며, 건너뛴 규칙은 counts 에 없다. 탐침이 던지면 `details.edge = ['error: …']`·경고 1줄이고
 * 엣지 규칙은 같은 방식으로 건너뛴다(실패로 올리지 않는다).
 */
export async function inspectDist({ distDir, origin = BRAND_FACTS.service.siteUrl, edge = true, rules, now = new Date() } = {}) {
  const selected = rules ? [...rules] : Object.keys(RULES);
  const unknown = selected.filter((rule) => !Object.hasOwn(RULES, rule));
  if (unknown.length) throw new Error(`verify-dist: 알 수 없는 규칙 ${unknown.join(", ")}`);
  const wants = (rule) => selected.includes(rule);

  const details = {};
  const needsSite = selected.some((rule) => !EDGE_RULES.includes(rule) && !["sitemap-set", "home-identity", "robots-policy"].includes(rule));
  const site = needsSite ? loadSite(distDir, origin) : null;
  const needsSources = wants("sitemap-page") || wants("internal-404");
  // `_redirects`·`_worker.js` 가 없거나 워커 표를 못 읽으면 스택 트레이스 대신 두 규칙의 실패 1줄로 보고한다.
  let sources = null;
  let sourcesError = null;
  if (needsSources) {
    try {
      sources = redirectSources(distDir);
    } catch (error) {
      sourcesError = `리디렉션 표를 읽지 못함 — ${String(error?.message || error).split("\n")[0]}`;
    }
  }

  if (wants("sitemap-page")) details["sitemap-page"] = sourcesError ? [sourcesError] : checkSitemapPages(site, sources);
  if (wants("sitemap-set")) details["sitemap-set"] = checkSitemapSet(distDir);
  if (wants("page-shape")) details["page-shape"] = checkPageShape(site);
  if (wants("internal-404")) details["internal-404"] = sourcesError ? [sourcesError] : checkInternal404(site, distDir, origin, sources);
  if (wants("home-identity")) details["home-identity"] = checkHomeIdentity(distDir);
  if (wants("duplicate-title")) details["duplicate-title"] = checkDuplicates(site, "title");
  if (wants("duplicate-description")) details["duplicate-description"] = checkDuplicates(site, "description");
  if (wants("og-url")) details["og-url"] = checkOgUrl(site);
  if (wants("og-home-title")) details["og-home-title"] = checkOgHomeTitle(site, origin);
  if (wants("hreflang-sitemap")) details["hreflang-sitemap"] = checkHreflangSitemap(site, distDir);
  if (wants("robots-policy")) details["robots-policy"] = checkRobotsPolicy(distDir, origin);
  if (wants("jsonld-syntax")) details["jsonld-syntax"] = checkJsonLdSyntax(site);
  if (wants("jsonld-id-type")) details["jsonld-id-type"] = checkJsonLdIdType(site);
  if (wants("organization-name")) details["organization-name"] = checkOrganizationName(site);
  if (wants("jsonld-dates")) details["jsonld-dates"] = checkJsonLdDates(site, now);
  if (wants("i18n-missing-text")) details["i18n-missing-text"] = checkI18nMissingText(site);
  let edgeError = null;
  if (EDGE_RULES.some(wants)) {
    if (edge && isFile(join(distDir, "_worker.js"))) {
      // 엣지 규칙은 모두 warn 이다. 워커 모양이 바뀌어 탐침이 못 돌아도 postbuild(일일 발행·배포)를 세우지 않고
      // 경고로만 남기며, 엣지 규칙은 건너뛴 것으로 본다.
      try {
        const edgeDetails = await checkEdge(distDir);
        for (const rule of EDGE_RULES.filter(wants)) details[rule] = edgeDetails[rule];
      } catch (error) {
        edgeError = String(error?.message || error).split("\n")[0];
        details.edge = [`error: ${edgeError}`];
      }
    } else {
      details.edge = ["skipped"];
    }
  }

  const counts = {};
  const failures = [];
  const warnings = [];
  for (const rule of selected) {
    if (!details[rule]) continue;
    counts[rule] = details[rule].length;
    if (counts[rule] === 0) continue;
    const message = `${rule} ${counts[rule]}건 — ${details[rule][0]}`;
    (RULES[rule] === "fail" ? failures : warnings).push(message);
  }
  if (edgeError) warnings.push(`edge 탐침 실패(엣지 규칙 건너뜀) — ${edgeError}`);
  return { counts, details, failures, warnings };
}

function printTable(result) {
  const breakdown = (rule) => {
    if (rule !== "hreflang-sitemap" || !result.counts[rule]) return "";
    const kinds = {};
    for (const line of result.details[rule]) kinds[line.split(" ")[0]] = (kinds[line.split(" ")[0]] || 0) + 1;
    return `  (${Object.entries(kinds).map(([kind, n]) => `${kind} ${n}`).join(" · ")})`;
  };
  console.log("[verify-dist] 규칙별 건수");
  for (const [rule, grade] of Object.entries(RULES)) {
    const count = Object.hasOwn(result.counts, rule) ? String(result.counts[rule]) : "skipped";
    console.log(`  ${rule.padEnd(22)} ${grade.padEnd(4)} ${count.padStart(7)}${breakdown(rule)}`);
    if (grade === "fail" && result.counts[rule]) {
      for (const line of result.details[rule].slice(0, 20)) console.log(`      ✗ ${line}`);
      if (result.details[rule].length > 20) console.log(`      … ${result.details[rule].length - 20}건 더`);
    }
  }
  if (result.details.edge?.[0]?.startsWith("error: ")) console.log(`  ⚠ 엣지 탐침 ${result.details.edge[0]}`);
}

async function main() {
  const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const dist = arg("dist") || "dist";
  const jsonPath = arg("json");
  if (!existsSync(dist)) {
    console.error(`[verify-dist] ${dist}/ 가 없습니다. 빌드 뒤에 실행하세요.`);
    process.exit(1);
  }
  const result = await inspectDist({ distDir: dist });
  printTable(result);
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify({ dist, rules: RULES, ...result }, null, 2)}\n`);
    console.log(`[verify-dist] 결과 → ${jsonPath}`);
  }
  if (result.failures.length) {
    console.error(`[verify-dist] 실패 ${result.failures.length}개 규칙`);
    for (const failure of result.failures) console.error(`  ✗ ${failure}`);
    process.exit(1);
  }
  console.log(`[verify-dist] OK — 실패 규칙 0 · 경고 규칙 ${result.warnings.length}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
