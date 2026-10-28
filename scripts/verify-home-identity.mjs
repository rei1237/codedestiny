/**
 * 대표 페이지 정체성 검사(빌드 산출물 dist/ 기준). postbuild 에서 verify-adsense-readiness 뒤에 돈다.
 *
 * 브랜드 검색과 AI 답변이 읽는 대표 페이지가 서로 다른 이름이나 정본을 말하지 않게 막는다.
 *   - title 1개, rel=canonical 1개(자기 URL)
 *   - `/` 는 hreflang 없음(/ggulggul/ 로케일 클러스터와 섞지 않는다)
 *   - JSON-LD WebSite·Organization 각 1개, 이름은 lib/brand/brand-facts.mjs 와 같다
 *   - og:site_name·application-name 은 공식 서비스명
 *   - 과거 이름은 이력 블록([data-brand-history])과 FAQ 이력 문항에만 있다
 *
 * dist/ 가 없으면 실패한다. 이 검사는 빌드 뒤에만 의미가 있다.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { BRAND_FACTS, findFormerBrandNames } from "../lib/brand/brand-facts.mjs";

const DIST = process.argv.find((arg) => arg.startsWith("--dist="))?.slice(7) || "dist";
const PAGES = [
  { path: "/", file: "index.html", hreflang: false },
  { path: "/ggulggul/", file: "ggulggul/index.html", hreflang: true },
  { path: "/about/", file: "about/index.html", hreflang: true },
  { path: "/faq/", file: "faq/index.html", hreflang: true },
];
const PAGE_TYPES = new Set(["WebPage", "AboutPage", "FAQPage", "CollectionPage", "ItemPage"]);

function types(node) {
  return [].concat(node?.["@type"] || []);
}

function jsonLdNodes(document, failures, label) {
  return [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((script) => {
    try {
      const data = JSON.parse(script.textContent);
      return [].concat(data).flatMap((item) => item?.["@graph"] || [item]);
    } catch (error) {
      failures.push(`${label}: JSON-LD 파싱 실패 — ${error.message}`);
      return [];
    }
  });
}

// FAQ 의 질문·답은 이력 문항("예전 이름이 무엇이었나요?")을 담을 수 있어 이름 검사에서 뺀다.
function brandSignalStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => brandSignalStrings(item, out));
  else if (value && typeof value === "object" && !types(value).some((type) => type === "Question" || type === "Answer")) {
    Object.values(value).forEach((item) => brandSignalStrings(item, out));
  }
  return out;
}

export function verifyPage(html, page) {
  const failures = [];
  const label = page.path;
  const { document } = new JSDOM(html).window;
  const expectedUrl = `${BRAND_FACTS.service.siteUrl}${page.path}`;

  const titles = document.querySelectorAll("title");
  if (titles.length !== 1) failures.push(`${label}: <title> ${titles.length}개`);
  const canonicals = [...document.querySelectorAll('link[rel="canonical"]')].map((link) => link.getAttribute("href"));
  if (canonicals.length !== 1 || canonicals[0] !== expectedUrl) failures.push(`${label}: canonical ${JSON.stringify(canonicals)} (기대 ${expectedUrl})`);
  const hreflangs = document.querySelectorAll('link[rel="alternate"][hreflang]').length;
  if (!page.hreflang && hreflangs) failures.push(`${label}: hreflang ${hreflangs}개 — 대표 홈은 로케일 클러스터에 넣지 않는다`);

  const meta = (selector) => document.querySelector(selector)?.getAttribute("content");
  const siteName = meta('meta[property="og:site_name"]');
  if (siteName !== BRAND_FACTS.service.name) failures.push(`${label}: og:site_name "${siteName}"`);
  const applicationName = meta('meta[name="application-name"]');
  if (applicationName && applicationName !== BRAND_FACTS.service.name) failures.push(`${label}: application-name "${applicationName}"`);

  const nodes = jsonLdNodes(document, failures, label);
  const websites = nodes.filter((node) => types(node).includes("WebSite"));
  const organizations = nodes.filter((node) => types(node).includes("Organization"));
  if (websites.length !== 1) failures.push(`${label}: WebSite ${websites.length}개`);
  if (organizations.length !== 1) failures.push(`${label}: Organization ${organizations.length}개`);
  if (!nodes.some((node) => types(node).some((type) => PAGE_TYPES.has(type)))) failures.push(`${label}: WebPage 계열 노드 없음`);
  for (const website of websites) {
    if (website.name !== BRAND_FACTS.service.name) failures.push(`${label}: WebSite.name "${website.name}"`);
    if (JSON.stringify(website.alternateName || []) !== JSON.stringify(BRAND_FACTS.service.alternateNames)) {
      failures.push(`${label}: WebSite.alternateName ${JSON.stringify(website.alternateName)}`);
    }
  }
  for (const organization of organizations) {
    if (organization.name !== BRAND_FACTS.operator.name) failures.push(`${label}: Organization.name "${organization.name}"`);
  }

  const signalText = [
    document.title,
    ...[...document.querySelectorAll("meta[content]")].map((node) => node.getAttribute("content")),
    ...brandSignalStrings(nodes),
  ].join("\n");
  const signalFormer = findFormerBrandNames(signalText);
  if (signalFormer.length) failures.push(`${label}: 제목·메타·구조화 데이터에 과거 이름 ${signalFormer.join(", ")}`);

  // 본문: 스크립트(RSC 페이로드 포함)와 이력 블록을 뺀 나머지에 과거 이름이 없어야 한다.
  document.querySelectorAll("script, style, template, [data-brand-history]").forEach((node) => node.remove());
  const bodyFormer = findFormerBrandNames(document.body?.textContent || "");
  if (bodyFormer.length) failures.push(`${label}: 이력 블록 밖 본문에 과거 이름 ${bodyFormer.join(", ")}`);
  return failures;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!existsSync(DIST)) {
    console.error(`[verify-home-identity] ${DIST}/ 가 없습니다. 빌드 뒤에 실행하세요.`);
    process.exit(1);
  }
  const failures = PAGES.flatMap((page) => {
    const file = join(DIST, page.file);
    if (!existsSync(file)) return [`${page.path}: ${file} 없음`];
    return verifyPage(readFileSync(file, "utf8"), page);
  });
  if (failures.length) {
    console.error(`[verify-home-identity] 실패 ${failures.length}건`);
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exit(1);
  }
  console.log(`[verify-home-identity] OK — ${PAGES.map((page) => page.path).join(" ")}`);
}
