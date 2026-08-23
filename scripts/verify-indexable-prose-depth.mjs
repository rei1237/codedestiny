#!/usr/bin/env node
/**
 * 색인 대상 라우트의 **문장급 본문** 깊이 가드.
 *
 * 왜 raw 글자수로는 부족한가 (2026-08-24 실측):
 *   기존 콘텐츠 게이트(`verify-adsense-readiness.mjs` 의 minimumBlockedIndexableVisibleTextLength
 *   = 1,800자)는 태그를 걷어낸 **모든** 글자를 센다. 그래서 두 방향으로 샌다.
 *
 *   ① 링크 라벨·배지·목록 항목이 본문으로 계산된다. 푸터에 링크를 열 개 걸면 게이트 수치가
 *      올라간다. 실제로 `/oracle/sikojen-povailu` 는 "겉보기 1,231자" 였는데 40자 넘는 조각을
 *      직접 찍어 보니 11개 중 10개가 **푸터 환불정책 문구**였다(#1072 에서 걷어냈다).
 *   ② 사이트 공용 문구(푸터·고지·편집 방침)가 페이지마다 다시 계산된다. 색인 페이지 372개 중
 *      278쪽에 똑같이 실리는 조각이 셋 있었다.
 *
 * 그래서 이 가드는 세 가지를 한다:
 *   ⓐ 태그 경계로 자른 조각 중 **40자 이상**만 센다 — 링크 라벨·버튼·배지는 자연히 빠진다.
 *   ⓑ 한 페이지 안에서 같은 조각은 한 번만 센다.
 *   ⓒ 색인 페이지 BOILERPLATE_MIN_DOCS 쪽 이상에 등장하는 조각은 **사이트 furniture** 로 보고
 *      전부 뺀다. 목록을 손으로 적지 않고 산출물에서 계산하므로(원칙 10) 새 공용 문구가
 *      생겨도 자동으로 잡힌다.
 *
 * 임계값 근거 (2026-08-24, dist/ 색인 372개 실측):
 *   최소 755(/destiny-poker) · p05 1,004 · 중앙 1,922.
 *   MIN_PROSE_LENGTH = 700 이면 오늘 색인 중인 라우트는 **0개** 가 실패한다.
 *   같은 기준으로 그때 noindex 였던 "JS 안에 갇힌" 라우트는 전부 걸린다 —
 *   /oracle/ifa 0 · /saju/love-simulation 0 · /neo-operation-room 45 · /saju-guardian 97 ·
 *   /saju/destiny-bias 173 · /tarot/healing 635.
 *   임계를 900 으로 올리려면 /destiny-poker(755) 본문을 먼저 채워야 한다.
 *
 * fail-closed (guard-integrity G-2: 대상이 없을 때 통과시키는 가드는 가드가 아니다):
 *   ① dist/ 가 없으면 실패한다 — 빌드 전에 돌리면 "검사할 게 없어서 통과"가 된다.
 *   ② dist/sitemap.xml 이 없거나 라우트를 하나도 못 읽으면 실패한다.
 *   ③ 사이트맵에 있는데 HTML 산출물이 없으면 실패한다.
 *   ④ 문장급 본문이 임계 미만이면 실패한다.
 *
 * 🔴 사이트맵은 **산출물 안의 것**(dist/sitemap.xml)을 읽는다. 리포 루트의 추적본을 읽으면
 *    그게 낡았을 때 새 라우트가 검사 대상에서 통째로 빠진다 — verify:seo-heading-integrity 가
 *    루트본을 읽는 탓에 2026-08-24 에 /tarot/self-esteem 의 H1 2개를 로컬에서 놓쳤다.
 *
 * 한계: 서버 HTML 만 본다. 하이드레이션 후 클라이언트가 그리는 본문은 여기서 안 보인다.
 *       크롤러가 먼저 읽는 것이 서버 HTML 이므로 우선 이쪽을 막는다.
 *
 * 실행: npm run verify:indexable-prose-depth   (먼저 `npm run build:cf` 로 dist/ 가 있어야 한다)
 *       --report 를 주면 실패시키지 않고 분포만 출력한다.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, relative, sep, join } from "node:path";

const rootDir = process.cwd();
const baseDir = process.env.PROSE_DEPTH_BASE_DIR || "dist";
const reportOnly = process.argv.includes("--report");

/** 본문 조각으로 인정하는 최소 길이. 이보다 짧으면 링크 라벨·배지·버튼으로 본다. */
const MIN_FRAGMENT_LENGTH = 40;
/** 색인 페이지 이만큼 이상에 등장하는 조각은 사이트 공용 문구로 보고 뺀다. */
const BOILERPLATE_MIN_DOCS = 20;
/** 색인 라우트가 가져야 할 최소 문장급 본문 길이. */
const MIN_PROSE_LENGTH = 700;

/**
 * 의도적으로 임계 미만인 라우트를 사유와 함께 선언한다.
 * 🔴 비어 있는 것이 정상이다. 채우기 전에 "이 페이지는 정말 본문이 없어도 되는가"를 먼저 따질 것 —
 *    본문이 없는 페이지를 색인에 제출하는 것 자체가 대개 틀린 선택이다. 색인에서 빼면 그만이다.
 */
const DECLARED_EXCEPTIONS = new Map([
  // ["/some/route", { min: 400, reason: "왜 이 페이지는 본문이 짧아도 되는지" }],
]);

function fail(message, details = []) {
  console.error(`[verify-indexable-prose-depth] FAIL: ${message}`);
  for (const line of details) console.error(`  ${line}`);
  process.exit(1);
}

function normalizeRoute(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

/** 태그 경계로 자른 뒤 MIN_FRAGMENT_LENGTH 이상인 조각만, 페이지 안에서 중복 없이 모은다. */
function collectFragments(html) {
  const stripped = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const fragments = new Set();
  for (const chunk of stripped.split(/<[^>]*>/)) {
    const text = chunk
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length >= MIN_FRAGMENT_LENGTH) fragments.add(text);
  }
  return fragments;
}

function collectHtmlFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectHtmlFiles(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
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

const indexedRoutes = new Set(
  [...readFileSync(sitemapPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => {
      try {
        return normalizeRoute(new URL(match[1]).pathname);
      } catch {
        return "";
      }
    })
    .filter(Boolean),
);

if (indexedRoutes.size === 0) fail(`${baseDir}/sitemap.xml 에서 라우트를 하나도 못 읽었다.`);

// ── 1차 통과: 색인 라우트의 HTML 을 찾아 조각을 모으고 문서빈도를 센다 ──────────
const pages = new Map(); // route -> Set(fragment)
const missingArtifacts = [];

for (const route of indexedRoutes) {
  const candidates = route === "/"
    ? [join(absoluteBase, "index.html")]
    : [join(absoluteBase, route, "index.html"), join(absoluteBase, `${route}.html`)];
  const file = candidates.find((candidate) => existsSync(candidate));
  if (!file) {
    missingArtifacts.push(route);
    continue;
  }
  pages.set(route, collectFragments(readFileSync(file, "utf8")));
}

if (missingArtifacts.length > 0) {
  fail(`사이트맵에 있는데 빌드 산출물이 없는 라우트 ${missingArtifacts.length}개`, [
    ...missingArtifacts.slice(0, 10).map((route) => `- ${route}`),
    "색인 대상으로 제출하는데 실제로 만들어지지 않는다면 사이트맵이나 라우트 중 하나가 틀렸다.",
  ]);
}

const documentFrequency = new Map();
for (const fragments of pages.values()) {
  for (const fragment of fragments) {
    documentFrequency.set(fragment, (documentFrequency.get(fragment) || 0) + 1);
  }
}
const boilerplate = new Set(
  [...documentFrequency.entries()].filter(([, count]) => count >= BOILERPLATE_MIN_DOCS).map(([text]) => text),
);

// ── 2차 통과: 보일러플레이트를 뺀 문장급 본문 길이를 잰다 ─────────────────────────
const measured = [];
for (const [route, fragments] of pages) {
  let prose = 0;
  for (const fragment of fragments) {
    if (!boilerplate.has(fragment)) prose += fragment.length;
  }
  measured.push({ route, prose });
}
measured.sort((a, b) => a.prose - b.prose);

const violations = measured.filter(({ route, prose }) => {
  const min = DECLARED_EXCEPTIONS.get(route)?.min ?? MIN_PROSE_LENGTH;
  return prose < min;
});

const thinnest = measured.slice(0, 10)
  .map(({ route, prose }) => `- ${String(prose).padStart(6)}자  ${route}`);

if (reportOnly) {
  console.log(`[verify-indexable-prose-depth] REPORT — ${baseDir}/ 색인 ${measured.length}개`);
  console.log(`  보일러플레이트 조각 ${boilerplate.size}개 제외(${BOILERPLATE_MIN_DOCS}쪽 이상 등장)`);
  console.log("  문장급 본문 하위 10개:");
  for (const line of thinnest) console.log(`  ${line}`);
  const at = (ratio) => measured[Math.floor((measured.length - 1) * ratio)].prose;
  console.log(`  최소 ${measured[0].prose} · p05 ${at(0.05)} · 중앙 ${at(0.5)} · 최대 ${measured[measured.length - 1].prose}`);
  console.log(`  현재 임계 ${MIN_PROSE_LENGTH}자 기준 위반 ${violations.length}개`);
  process.exit(0);
}

if (violations.length > 0) {
  const details = violations.slice(0, 20).map(({ route, prose }) => {
    const min = DECLARED_EXCEPTIONS.get(route)?.min ?? MIN_PROSE_LENGTH;
    return `- ${route}: 문장급 본문 ${prose}자 (최소 ${min}자)`;
  });
  if (violations.length > 20) details.push(`... 외 ${violations.length - 20}개`);
  details.push("");
  details.push("무엇을 세는가: 태그 경계로 자른 조각 중 40자 이상, 페이지 안 중복 제거,");
  details.push(`               색인 ${BOILERPLATE_MIN_DOCS}쪽 이상에 등장하는 공용 문구 제외.`);
  details.push("→ 링크·배지·푸터를 늘려도 이 수치는 오르지 않는다. 본문 문장을 늘려야 오른다.");
  details.push("");
  details.push("고치는 법 두 가지 중 하나를 고를 것:");
  details.push("  ① 서버에서 렌더되는 고유 본문을 채운다. 기능이 클라이언트에만 있는 라우트라면");
  details.push("     page.tsx 에 서버 섹션을 두는 것이 관례다(예: app/tarot/self-esteem/page.tsx).");
  details.push("     🔴 본문은 구현에서 뽑을 것 — 효능·보장을 지어내지 않는다.");
  details.push("  ② 색인 대상에서 뺀다. scripts/generate-sitemap.mjs 와 lib/seo/siteSeo.ts 의");
  details.push("     noindexPathPrefixes 는 **짝**이므로 한쪽만 고치면 「제출된 URL에 noindex」가 된다.");
  fail(`문장급 본문이 얇은 색인 라우트 ${violations.length}개`, details);
}

console.log(
  `[verify-indexable-prose-depth] OK — ${baseDir}/ 색인 ${measured.length}개 전부 문장급 본문 ${MIN_PROSE_LENGTH}자 이상`
  + ` (최소 ${measured[0].prose}자: ${measured[0].route}, 공용 문구 ${boilerplate.size}개 제외)`
  + (DECLARED_EXCEPTIONS.size > 0 ? ` · 선언된 예외 ${DECLARED_EXCEPTIONS.size}개` : ""),
);
