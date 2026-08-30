#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canLoadAdsense,
  canLoadAdsenseForCanonicalUrl,
} from "../app/components/adsense-route-policy.js";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const siteOrigin = "https://code-destiny.com";
const baseDir = process.argv[2] || "out";
const outputPath = process.argv[3] || "reports/adsense-route-audit.md";
const minimumVisibleTextLength = 1200;
const minimumSitemapTextLength = 900;
const generatedAt = "2026-06-21";

const requiredInfoRoutes = [
  "/saju/guide",
  "/saju/ten-gods",
  "/saju/five-elements",
  "/ziwei/guide",
  "/sukuyo/guide",
  "/astrology/guide",
  "/vedic/guide",
  "/tarot/guide",
  "/mayan-calendar/guide",
  "/calendar/guide",
  "/health-report/guide",
  "/music/guide",
  "/about",
  "/editorial-policy",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/contact",
];

function readRequired(path) {
  const absolutePath = resolve(rootDir, path);
  if (!existsSync(absolutePath)) {
    throw new Error(`[adsense-route-audit] missing required path: ${path}`);
  }
  return readFileSync(absolutePath, "utf8");
}

function collectIndexHtmlFiles(directory, files = []) {
  if (!existsSync(directory)) return files;

  for (const entry of readdirSync(directory)) {
    const entryPath = resolve(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      collectIndexHtmlFiles(entryPath, files);
    } else if (entry === "index.html") {
      files.push(entryPath);
    }
  }

  return files;
}

function routeFromHtmlPath(absolutePath) {
  const basePath = resolve(rootDir, baseDir);
  const relativePath = relative(basePath, absolutePath).replace(/\\/g, "/");
  return relativePath === "index.html" ? "/" : `/${relativePath.replace(/\/index\.html$/, "")}`;
}

function routeHtmlPath(route) {
  const trimmed = route.replace(/^\/+|\/+$/g, "");
  return trimmed ? `${baseDir}/${trimmed}/index.html` : `${baseDir}/index.html`;
}

function getMetaContent(html, name) {
  return (html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, "i")) || [])[1] || "";
}

function getTitleContent(html) {
  return (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
}

function getCanonical(html) {
  return (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) || [])[1] || "";
}

function canonicalPathnameFromUrl(canonical) {
  try {
    return new URL(canonical, siteOrigin).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
}

function removeElementBlocks(html, tagName) {
  return html.replace(new RegExp(`<${tagName}\\b[\\s\\S]*?</${tagName}>`, "gi"), " ");
}

function getVisibleText(html) {
  const htmlWithoutBlocks = ["script", "style", "svg"].reduce(
    (content, tagName) => removeElementBlocks(content, tagName),
    html,
  );

  return htmlWithoutBlocks
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getSitemapPaths() {
  const sitemap = readRequired(`${baseDir}/sitemap.xml`);
  return new Set(
    [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)]
      .map((match) => {
        try {
          return new URL(match[1]).pathname.replace(/\/+$/, "") || "/";
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  );
}

function loadXRobotsNoindexPatterns() {
  const patterns = new Set();

  for (const headersPath of ["_headers", `${baseDir}/_headers`]) {
    const absolutePath = resolve(rootDir, headersPath);
    if (!existsSync(absolutePath)) continue;

    const lines = readFileSync(absolutePath, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line || /^\s/.test(line)) continue;

      const ruleLines = [];
      let cursor = index + 1;
      while (cursor < lines.length && /^\s/.test(lines[cursor])) {
        ruleLines.push(lines[cursor]);
        cursor += 1;
      }

      if (ruleLines.some((ruleLine) => /X-Robots-Tag:\s*noindex/i.test(ruleLine))) {
        patterns.add(line.trim());
      }
    }
  }

  return [...patterns];
}

function matchesPrefix(route, prefix) {
  return route === prefix || route.startsWith(`${prefix}/`);
}

function matchesHeaderPattern(route, pattern) {
  if (pattern.endsWith("/*")) return matchesPrefix(route, pattern.slice(0, -2));
  return route === pattern;
}

function hasXRobotsNoindexHeader(route, patterns) {
  return patterns.some((pattern) => matchesHeaderPattern(route, pattern));
}

function classifyRoute(route, indexable) {
  if (matchesPrefix(route, "/admin")) return "관리자";
  if (matchesPrefix(route, "/api")) return "API/액션";
  if (matchesPrefix(route, "/auth") || matchesPrefix(route, "/login") || matchesPrefix(route, "/signup")) return "계정/인증";
  if (matchesPrefix(route, "/me") || matchesPrefix(route, "/my") || matchesPrefix(route, "/profile")) return "프로필/개인 영역";
  if (matchesPrefix(route, "/payment") || matchesPrefix(route, "/payments") || matchesPrefix(route, "/checkout")) return "결제";
  if (matchesPrefix(route, "/premium") || matchesPrefix(route, "/pdf") || matchesPrefix(route, "/points")) return "유료/개인 리포트";
  if (matchesPrefix(route, "/result") || matchesPrefix(route, "/results") || matchesPrefix(route, "/report/progress")) return "결과/생성 상태";
  if (route.includes("/guide") || route === "/about" || route === "/faq" || route === "/methodology") return "공개 정보/가이드";
  if (matchesPrefix(route, "/insights") || matchesPrefix(route, "/guides") || matchesPrefix(route, "/famous-saju")) return "블로그/매거진형 정보";
  if (route === "/privacy" || route === "/terms" || route === "/disclaimer" || route === "/editorial-policy" || route === "/contact") return "정책/신뢰 고지";
  if (!indexable) return "검색 제외 페이지";
  return "기능/도구 소개";
}

function describeContentAmount(visibleLength) {
  if (visibleLength < minimumSitemapTextLength) return `${visibleLength}자 (부족)`;
  if (visibleLength < minimumVisibleTextLength) return `${visibleLength}자 (보강 권장)`;
  return `${visibleLength}자 (충분)`;
}

function summarizeProblems({ route, indexable, routePolicyAllows, canonicalAllowsAdsense, inSitemap, visibleLength, pageType }) {
  const problems = [];

  if (!indexable) problems.push("noindex 또는 비공개/중복 처리");
  if (indexable && !routePolicyAllows && route !== "/") problems.push("광고 제외 정책 대상");
  if (routePolicyAllows && !canonicalAllowsAdsense) problems.push("canonical 또는 도메인 정책상 광고 차단");
  if (indexable && !inSitemap) problems.push("indexable 페이지가 sitemap에 없음");
  if (visibleLength < minimumSitemapTextLength) problems.push("본문 부족");
  if (visibleLength >= minimumSitemapTextLength && visibleLength < minimumVisibleTextLength) problems.push("본문 보강 권장");
  if (/계정|결제|유료|개인|결과|관리자|API/.test(pageType)) problems.push("광고 제외 대상 화면");
  if (route === "/") problems.push("정적 메인 셸은 광고 직접 삽입 제외");

  return problems.length ? problems.join(", ") : "현재 검증 기준 통과";
}

function suggestDirection({ adsenseStatus, pageType, visibleLength, indexable, inSitemap }) {
  if (adsenseStatus === "가능") return "본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지";
  if (/계정|결제|유료|개인|결과|관리자|API/.test(pageType)) return "광고 차단 유지, sitemap/noindex 정책 유지";
  if (!indexable) return "canonical/noindex 의도 유지, 중복 alias는 광고 제외";
  if (!inSitemap) return "공개 색인 의도가 있으면 sitemap 반영, 아니면 noindex 명확화";
  if (visibleLength < minimumVisibleTextLength) return "정보성 본문, FAQ, 주의사항, 내부 링크 보강 후 재평가";
  return "공개 정보 가치 확인 후 보수적으로 광고 제외 유지";
}

function escapeCell(value) {
  return String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function toRouteTable(rows) {
  if (!rows.length) return ["| Route | Page Type | Content Amount | AdSense | Problem | Direction |", "|---|---|---:|---:|---|---|", "| - | - | - | - | 해당 없음 | - |"];

  return [
    "| Route | Page Type | Content Amount | AdSense | Problem | Direction |",
    "|---|---|---:|---:|---|---|",
    ...rows.map((row) =>
      `| ${escapeCell(row.route)} | ${escapeCell(row.pageType)} | ${escapeCell(row.contentAmount)} | ${escapeCell(row.adsenseStatus)} | ${escapeCell(row.problem)} | ${escapeCell(row.direction)} |`,
    ),
  ];
}

function buildContentExampleRows() {
  return [
    ["/saju/guide", "사주가 보는 네 기둥의 범위, 입력값 의미, 해석 순서, 무료/유료 리포트 차이를 한 페이지에서 먼저 안내"],
    ["/saju/ten-gods", "십성별 관계·일·재물 해석을 단정 대신 경향과 참고점으로 설명하고 예시 리딩과 FAQ 연결"],
    ["/saju/five-elements", "오행 균형을 건강 진단처럼 쓰지 않도록 주의 문구와 생활 참고 예시를 함께 제공"],
    ["/ziwei/guide", "명반 궁위 읽는 순서, 주요 별의 역할, 결과에서 확인할 항목과 자미두수 한계를 설명"],
    ["/sukuyo/guide", "27숙 구조와 궁합 해석 흐름을 소개하고 관계 판단의 유일한 근거로 쓰지 말라는 고지 포함"],
    ["/astrology/guide", "하우스·사인·행성의 기본 구조와 샘플 차트 읽기 흐름, 현실 판단 병행 안내"],
    ["/vedic/guide", "라그나·나크샤트라·다샤의 기초를 입문형으로 설명하고 투자/건강 결정 대체 금지 고지"],
    ["/tarot/guide", "카드 질문법, 스프레드 예시, 결과를 자기성찰 참고로 읽는 방식과 FAQ 제공"],
    ["/mayan-calendar/guide", "마야 달력의 주기 해석과 사용 예시, 문화적 상징을 단순 예언처럼 오해하지 않는 안내"],
    ["/calendar/guide", "일진/운세 달력 사용법, 좋은 날 선택의 참고 범위, 결혼·계약 결정 대체 금지 안내"],
    ["/health-report/guide", "명리 헬스 리포트가 의료 진단이 아님을 명확히 하고 병원 진료 우선 원칙 강조"],
    ["/music/guide", "명상 음악 콘텐츠의 감상 목적, 운세 테마별 활용 예시, 치료 효과 단정 금지 고지"],
  ];
}

function buildRows() {
  const sitemapPaths = getSitemapPaths();
  const xRobotsNoindexPatterns = loadXRobotsNoindexPatterns();
  const htmlFiles = collectIndexHtmlFiles(resolve(rootDir, baseDir));

  return htmlFiles
    .map((absolutePath) => {
      const route = routeFromHtmlPath(absolutePath);
      const html = readFileSync(absolutePath, "utf8");
      const robots = getMetaContent(html, "robots").toLowerCase();
      const googleBot = getMetaContent(html, "googlebot").toLowerCase();
      const canonical = getCanonical(html);
      const canonicalPath = canonicalPathnameFromUrl(canonical);
      const visibleText = getVisibleText(html);
      const title = getTitleContent(html);
      const currentHref = `${siteOrigin}${route === "/" ? "" : route}/`;
      const routePolicyAllows = canLoadAdsense(route);
      const canonicalAllowsAdsense = canLoadAdsenseForCanonicalUrl(route, canonical, currentHref);
      const xRobotsNoindex = hasXRobotsNoindexHeader(route, xRobotsNoindexPatterns);
      const indexable = !robots.includes("noindex") && !googleBot.includes("noindex") && !xRobotsNoindex;
      const inSitemap = sitemapPaths.has(route) || sitemapPaths.has(canonicalPath);
      const pageType = classifyRoute(route, indexable);
      const adsenseStatus = routePolicyAllows && canonicalAllowsAdsense && indexable ? "가능" : "제외";
      const context = {
        route,
        indexable,
        routePolicyAllows,
        canonicalAllowsAdsense,
        inSitemap,
        visibleLength: visibleText.length,
        pageType,
        adsenseStatus,
      };

      return {
        route,
        title,
        pageType,
        contentAmount: describeContentAmount(visibleText.length),
        visibleLength: visibleText.length,
        adsenseStatus,
        problem: summarizeProblems(context),
        direction: suggestDirection(context),
        indexable,
        inSitemap,
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route, "ko"));
}

function buildReport(rows) {
  const total = rows.length;
  const adsenseAllowed = rows.filter((row) => row.adsenseStatus === "가능").length;
  const adsenseBlocked = total - adsenseAllowed;
  const noindex = rows.filter((row) => !row.indexable).length;
  const sitemapMissing = rows.filter((row) => row.indexable && !row.inSitemap).length;
  const thin = rows.filter((row) => row.visibleLength < minimumVisibleTextLength).length;
  const risky = rows.filter((row) => row.problem !== "현재 검증 기준 통과").slice(0, 80);
  const adBlockedReviewRows = rows
    .filter((row) => row.adsenseStatus === "제외")
    .filter((row) => /계정|결제|유료|개인|결과|관리자|API|정적|noindex|광고 제외 정책 대상/.test(row.problem))
    .slice(0, 80);
  const contentReinforcementRows = rows
    .filter((row) => row.indexable && row.visibleLength < minimumVisibleTextLength)
    .slice(0, 80);

  const requiredRouteRows = requiredInfoRoutes.map((route) => {
    const row = rows.find((item) => item.route === route);
    return {
      route,
      status: row ? "존재" : "누락",
      adsenseStatus: row?.adsenseStatus || "검토 필요",
      contentAmount: row?.contentAmount || "-",
      note: row?.problem || "라우트 없음",
    };
  });
  const missingRequiredRoutes = requiredRouteRows.filter((row) => row.status === "누락");

  const lines = [
    "# AdSense Route Audit",
    "",
    `Generated: ${generatedAt}`,
    `Source: ${baseDir}`,
    "",
    "## Summary",
    "",
    `- Total routes scanned: ${total}`,
    `- AdSense eligible candidates: ${adsenseAllowed}`,
    `- AdSense blocked/excluded routes: ${adsenseBlocked}`,
    `- Noindex or non-indexable routes: ${noindex}`,
    `- Indexable routes missing sitemap entry: ${sitemapMissing}`,
    `- Routes below ${minimumVisibleTextLength} visible chars: ${thin}`,
    "",
    "## 핵심 문제 요약",
    "",
    `- 현재 ${baseDir} 산출물 기준 전체 ${total}개 라우트 중 광고 가능 후보는 ${adsenseAllowed}개, 광고 제외 라우트는 ${adsenseBlocked}개입니다.`,
    `- indexable 라우트의 sitemap 누락은 ${sitemapMissing}개입니다.`,
    `- ${minimumVisibleTextLength}자 미만 라우트는 ${thin}개이며, 대부분 noindex/오류/관리자/액션성 페이지로 광고 제외 상태를 유지합니다.`,
    "- AdSense 코드는 허용 라우트에서도 정적 광고 슬롯으로 직접 삽입하지 않고, canonical/robots/route policy를 통과한 경우에만 조건부 로딩하도록 관리합니다.",
    "",
    "## 애드센스 정책상 위험한 페이지 목록",
    "",
    ...toRouteTable(risky.slice(0, 40)),
    "",
    "## 광고를 제거하거나 차단해야 할 페이지 목록",
    "",
    ...toRouteTable(adBlockedReviewRows.slice(0, 40)),
    "",
    "## 콘텐츠를 보강해야 할 페이지 목록",
    "",
    ...toRouteTable(contentReinforcementRows),
    "",
    "## 새로 추가할 정보성 페이지 목록",
    "",
    missingRequiredRoutes.length
      ? "- 아래 필수 정보 페이지가 누락되어 추가가 필요합니다."
      : "- 필수 정보성 페이지는 현재 모두 존재합니다. 신규 대량 생성보다 기존 페이지의 고유성, 예시, FAQ, 내부 링크 유지가 우선입니다.",
    ...(missingRequiredRoutes.length ? missingRequiredRoutes.map((row) => `- ${row.route}`) : []),
    "",
    "## 수정한 파일 목록",
    "",
    "- app/components/adsense-route-policy.js: 광고 가능/불가 라우트와 민감 쿼리 차단 정책",
    "- app/components/DeferredAdsense.tsx: canonical/robots 기준 AdSense 조건부 lazy 로딩",
    "- scripts/verify-adsense-route-policy.mjs: 유료/개인/결제 라우트 광고 차단 회귀 검증",
    "- scripts/verify-adsense-readiness.mjs: 콘텐츠 품질, 중복, sitemap/robots, 광고 슬롯 삽입 방지 검증",
    "- scripts/generate-adsense-route-audit.mjs: 빌드 산출물 기준 전체 라우트 광고 감사 보고서 생성",
    "- reports/adsense-route-audit.md: 현재 산출물 감사 결과",
    "",
    "## 주요 코드 변경 요약",
    "",
    "- 광고 허용은 allowlist 기반으로 제한하고, 로그인/결제/유료/개인 결과/민감 입력 라우트는 기본 차단합니다.",
    "- `premiumIntent`, `payment`, `resultId`, `birthDate`, `email`, `token` 등 유료·개인화 쿼리는 공개 라우트에서도 광고를 차단합니다.",
    "- 승인 전 정적 HTML에 `adsbygoogle` 광고 슬롯이 직접 들어가면 readiness 검증이 실패합니다.",
    "- AdSense 가능 self-canonical 페이지는 sitemap 포함, noindex 미충돌, 충분한 본문, 중복 fingerprint 없음 조건을 통과해야 합니다.",
    "",
    "## 각 페이지별 콘텐츠 보강 예시",
    "",
    "| Route | Example Reinforcement |",
    "|---|---|",
    ...buildContentExampleRows().map(([route, example]) => `| ${escapeCell(route)} | ${escapeCell(example)} |`),
    "",
    "## 개인정보/면책/쿠키 고지 반영 여부",
    "",
    "| Page | Status | Evidence |",
    "|---|---:|---|",
    `| /privacy | ${rows.some((row) => row.route === "/privacy") ? "존재" : "누락"} | Google, 쿠키, IP, 생년월일, 결제, 이메일, 14세, 삭제 안내 marker를 readiness에서 검증 |`,
    `| /disclaimer | ${rows.some((row) => row.route === "/disclaimer") ? "존재" : "누락"} | 의료, 법률, 투자, 결제, 불안 조장 관련 고지 marker를 readiness에서 검증 |`,
    `| /advertising-policy | ${rows.some((row) => row.route === "/advertising-policy") ? "존재" : "누락"} | Google AdSense, 쿠키, 웹 비콘, IP, 광고 식별자, 파트너 사이트 링크 marker를 readiness에서 검증 |`,
    `| /editorial-policy | ${rows.some((row) => row.route === "/editorial-policy") ? "존재" : "누락"} | AI 활용, 광고, 결제, 문의 관련 marker를 readiness에서 검증 |`,
    "",
    "## sitemap/robots/metadata 점검 결과",
    "",
    `- sitemap 누락 indexable 라우트: ${sitemapMissing}`,
    `- 광고 가능 self-canonical 라우트: ${adsenseAllowed}`,
    `- noindex 또는 비색인 라우트: ${noindex}`,
    "- robots.txt의 Mediapartners-Google 허용, canonical, title/description 고유성은 `verify:adsense-readiness`에서 검증합니다.",
    "- sitemap 내 private/action route, 중복 title/description, 얇은 본문은 readiness 실패 조건입니다.",
    "",
    "## 애드센스 재심사 전 체크리스트",
    "",
    "- `npm run build` 통과",
    "- `npm run verify:adsense-route-policy` 통과",
    "- `npm run verify:adsense-readiness` 통과",
    "- `npm run adsense:route-audit` 재생성",
    "- 결제/로그인/프로필/관리자/개인 결과/오류/로딩 라우트에 광고 없음 확인",
    "- 공개 정보 페이지가 광고 없이도 독립적인 설명, 예시, 주의사항, FAQ, 내부 링크를 갖는지 확인",
    "- 개인정보처리방침, 면책, 이용약관, 광고정책, 문의 페이지가 header/footer 또는 신뢰 링크에서 접근 가능한지 확인",
    "- 광고 클릭 유도, 승인 보장, 공포 마케팅, 건강/투자/법률 단정 표현이 없는지 확인",
    "",
    "## Required Public Information Pages",
    "",
    "| Route | Status | AdSense | Content Amount | Note |",
    "|---|---:|---:|---:|---|",
    ...requiredRouteRows.map((row) =>
      `| ${escapeCell(row.route)} | ${escapeCell(row.status)} | ${escapeCell(row.adsenseStatus)} | ${escapeCell(row.contentAmount)} | ${escapeCell(row.note)} |`,
    ),
    "",
    "## High-Risk Or Needs-Review Routes",
    "",
    "| Route | Page Type | Content Amount | AdSense | Problem | Direction |",
    "|---|---|---:|---:|---|---|",
    ...risky.map((row) =>
      `| ${escapeCell(row.route)} | ${escapeCell(row.pageType)} | ${escapeCell(row.contentAmount)} | ${escapeCell(row.adsenseStatus)} | ${escapeCell(row.problem)} | ${escapeCell(row.direction)} |`,
    ),
    "",
    "## Full Route Classification",
    "",
    "| Route | Page Type | Content Amount | AdSense | Problem | Direction |",
    "|---|---|---:|---:|---|---|",
    ...rows.map((row) =>
      `| ${escapeCell(row.route)} | ${escapeCell(row.pageType)} | ${escapeCell(row.contentAmount)} | ${escapeCell(row.adsenseStatus)} | ${escapeCell(row.problem)} | ${escapeCell(row.direction)} |`,
    ),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function main() {
  readRequired(`${baseDir}/sitemap.xml`);
  const rows = buildRows();
  const report = buildReport(rows);
  const absoluteOutputPath = resolve(rootDir, outputPath);
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, report, "utf8");

  console.log(`[adsense-route-audit] wrote ${outputPath}`);
  console.log(`[adsense-route-audit] routes=${rows.length}, adsense=${rows.filter((row) => row.adsenseStatus === "가능").length}`);
}

main();
