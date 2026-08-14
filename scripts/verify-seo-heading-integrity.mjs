#!/usr/bin/env node
/**
 * 색인 대상 라우트의 H1 무결성 가드.
 *
 * 왜 필요한가 (2026-08-14):
 *   손으로 고른 후보 목록으로 H1 중복을 찾다가 6개를 고쳤는데, 빌드 산출물을 **전수 스캔**하니
 *   목록에 없던 6개가 더 나왔다. `/life-book-ai` 는 H1 이 3개였고 `/yeon-star-hug` 는 0개였다.
 *   같은 결함이 반복해서 새로 생기는 이유는 하나다 — 라우트마다 SEO 소개 섹션(page.tsx)과
 *   기능 자체의 히어로가 **각각** h1 을 달고, 그걸 아무도 세지 않았기 때문이다.
 *
 * 그래서 이 가드는 목록을 갖지 않는다. 사이트맵(색인 대상의 정본)에서 라우트를 **발견**하고
 * 빌드 산출물에서 H1 을 센다. 새 라우트가 생기면 자동으로 검사 대상이 된다.
 *
 * fail-closed (guard-integrity G-2 의 교훈: 대상이 없을 때 통과시키는 가드는 가드가 아니다):
 *   ① out/ 이 없으면 실패한다 — 빌드 전에 돌리면 "검사할 게 없어서 통과"가 된다.
 *   ② 사이트맵에 있는데 HTML 산출물이 없으면 실패한다.
 *   ③ H1 이 정확히 1개가 아니면 실패한다.
 *
 * 한계: 서버 HTML 만 본다. `ssr:false` 클라이언트가 하이드레이션 후에 그리는 h1 은 여기서
 * 안 보인다(그건 브라우저를 띄워야 보인다). 크롤러가 먼저 읽는 것이 서버 HTML 이라 우선 이쪽을 막는다.
 *
 * 실행: npm run verify:seo-heading-integrity   (먼저 `npm run build:cf` 로 out/ 이 있어야 한다)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const outDir = process.env.SEO_HEADING_OUT_DIR || "out";
const sitemapPath = resolve(rootDir, "sitemap.xml");

/**
 * 의도적으로 H1 개수가 1이 아닌 라우트를 여기에 사유와 함께 선언한다.
 * 🔴 비우는 것이 정상이다. 채우기 전에 "정말 이 페이지는 H1 이 1개면 안 되는가"를 먼저 따질 것 —
 *    대개는 가드가 맞고 페이지가 틀리다.
 */
const DECLARED_EXCEPTIONS = new Map([
  // ["/some/route", { count: 2, reason: "왜 2개여야 하는지" }],
]);

function fail(message, details = []) {
  console.error(`[verify-seo-heading-integrity] FAIL: ${message}`);
  for (const line of details) console.error(`  ${line}`);
  process.exit(1);
}

if (!existsSync(sitemapPath)) {
  fail(`sitemap.xml 이 없다 → ${sitemapPath}`, ["`npm run sitemap:generate` 를 먼저 실행할 것."]);
}
if (!existsSync(resolve(rootDir, outDir))) {
  fail(`빌드 산출물이 없다 → ${outDir}/`, [
    "`npm run build:cf` 를 먼저 실행할 것.",
    "🔴 여기서 조용히 통과하면 이 가드는 아무것도 지키지 않는다(guard-integrity G-2).",
  ]);
}

const xml = readFileSync(sitemapPath, "utf8");
const routes = [
  ...new Set(
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
      .map((match) => {
        try {
          return new URL(match[1]).pathname.replace(/\/+$/, "") || "/";
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  ),
];

if (routes.length === 0) fail("사이트맵에서 라우트를 하나도 못 읽었다.");

const missingArtifacts = [];
const violations = [];

for (const route of routes) {
  const candidates = route === "/"
    ? [`${outDir}/index.html`]
    : [`${outDir}${route}/index.html`, `${outDir}${route}.html`];
  const file = candidates.find((candidate) => existsSync(resolve(rootDir, candidate)));
  if (!file) {
    missingArtifacts.push(route);
    continue;
  }

  const html = readFileSync(resolve(rootDir, file), "utf8");
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

  const expected = DECLARED_EXCEPTIONS.get(route)?.count ?? 1;
  if (headings.length !== expected) {
    violations.push({ route, found: headings.length, expected, headings });
  }
}

if (missingArtifacts.length > 0) {
  fail(`사이트맵에 있는데 빌드 산출물이 없는 라우트 ${missingArtifacts.length}개`, [
    ...missingArtifacts.slice(0, 10).map((route) => `- ${route}`),
    "색인 대상으로 제출하는데 실제로 만들어지지 않는다면 사이트맵이나 라우트 중 하나가 틀렸다.",
  ]);
}

if (violations.length > 0) {
  const details = [];
  for (const violation of violations) {
    details.push(`- ${violation.route}: H1 ${violation.found}개 (기대 ${violation.expected}개)`);
    for (const heading of violation.headings) details.push(`    "${heading.slice(0, 70)}"`);
  }
  details.push("");
  details.push("고치는 법: 페이지의 H1 은 page.tsx 의 ServiceIntroSection 이 소유한다(십수 개 페이지의 관례).");
  details.push("기능 히어로·로딩 셸의 헤딩은 h2 로 내린다.");
  details.push("🔴 헤딩이 className 없이 태그 선택자(`X h1 {}`)로 스타일링되는 경우가 많다.");
  details.push("   JSX 만 바꾸면 디자인이 깨지므로 CSS 선택자를 반드시 함께 옮길 것.");
  fail(`H1 개수가 잘못된 라우트 ${violations.length}개`, details);
}

console.log(
  `[verify-seo-heading-integrity] OK — 색인 라우트 ${routes.length}개 전부 H1 이 정확히 1개다`
  + (DECLARED_EXCEPTIONS.size > 0 ? ` (선언된 예외 ${DECLARED_EXCEPTIONS.size}개 제외)` : ""),
);
