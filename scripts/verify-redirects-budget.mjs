#!/usr/bin/env node
/**
 * `public/_redirects` 예산·정합성 가드 (fail-closed).
 *
 * 왜 필요한가 (2026-08-16 라이브 실측):
 *   Cloudflare Pages 는 `_redirects` 의 **첫 102개 규칙만** 적용하고 나머지는 에러도 경고도
 *   없이 무시한다. 규칙이 303개였을 때 #103 부터가 통째로 죽어 있었고, 그중
 *   `/fortune/{weekly,monthly}/*.html` 38개가 404 가 되어 네이버 서치어드바이저의
 *   "접근 불가 38건" 으로 잡혔다. `/blog/*` 55개와 insights 통합 104개도 같이 죽어 있었다.
 *
 *   이 실패는 조용하다 — 로컬에서 확인할 수단이 없고 배포돼도 신호가 없다. 규칙을 추가한
 *   사람은 작동한다고 믿는다. 그래서 개수를 세는 가드가 필요하다.
 *
 * 🔴 상한의 정확한 근거(규칙 수 100 vs 바이트)는 **미확정**이다. 이 가드는 개수만 세므로
 *    상한이 더 낮아지는 변화를 잡지 못한다. 배포 후 `npm run verify:redirects:live` 로
 *    **파일 마지막 규칙**이 실제 적용되는지 확인하는 절차가 이 가드와 한 쌍이다.
 *
 * fail-closed: 규칙이 0개거나, 사이트맵이 없거나, 워커 마커가 0개면 실패한다.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const rootDir = process.cwd();
const RULE_BUDGET = 95; // 실측 상한 102 - 마진 7
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  const full = resolve(rootDir, relativePath);
  if (!existsSync(full)) return null;
  return readFileSync(full, "utf8");
}

// ── 1. _redirects 파싱 ────────────────────────────────────────────────────
const redirectsText = read("public/_redirects");
if (redirectsText === null) {
  console.error("[redirects-budget] public/_redirects 가 없다.");
  process.exit(1);
}

const rules = [];
redirectsText.split(/\r?\n/).forEach((line, index) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    fail(`public/_redirects:${index + 1} 규칙 형식이 아니다: ${trimmed}`);
    return;
  }
  rules.push({ line: index + 1, from: parts[0], to: parts[1], status: parts[2] || "302" });
});

if (rules.length === 0) {
  console.error("[redirects-budget] 규칙이 0개다 — 검사 대상이 없는 가드는 가드가 아니다.");
  process.exit(1);
}

if (rules.length > RULE_BUDGET) {
  fail(
    `규칙 ${rules.length}개 > 예산 ${RULE_BUDGET}개. Cloudflare Pages 는 첫 102개만 적용하므로 ` +
      `${RULE_BUDGET}개를 넘기면 아래쪽 규칙이 조용히 404 가 된다. 압축하거나 public/_worker.js 로 옮길 것.`,
  );
}

// ── 2. 중복 from ─────────────────────────────────────────────────────────
const seen = new Map();
for (const rule of rules) {
  if (seen.has(rule.from)) {
    fail(`public/_redirects:${rule.line} 중복 from "${rule.from}" (먼저 선언: :${seen.get(rule.from)}). 뒤쪽은 죽은 줄이다.`);
    continue;
  }
  seen.set(rule.from, rule.line);
}

// ── 3. 목적지 후행 슬래시 (301 → 308 2홉 체인 방지) ───────────────────────
// 예외: `:splat` 을 쓰는 목적지 / 확장자 없는 레거시 정적 파일(public/<name>.html 실재)
function targetIsChainFree(to) {
  if (to.includes(":splat") || to.includes(":")) return true;
  if (to.endsWith("/")) return true;
  const withoutLeadingSlash = to.replace(/^\//, "");
  return existsSync(resolve(rootDir, "public", `${withoutLeadingSlash}.html`))
    || existsSync(resolve(rootDir, "public", withoutLeadingSlash));
}

for (const rule of rules) {
  if (!targetIsChainFree(rule.to)) {
    fail(
      `public/_redirects:${rule.line} 목적지 "${rule.to}" 에 후행 슬래시가 없다. ` +
        `trailingSlash:true 가 308 을 한 번 더 붙여 301→308 2홉 체인이 된다.`,
    );
  }
}

// ── 4. 사이트맵(살아 있는 라우트)을 삼키지 않는가 ─────────────────────────
// 🔴 _redirects 규칙은 정적 에셋을 이긴다(실측). 넓은 splat 하나가 사이트맵 라우트를
//    통째로 리다이렉트로 지워버릴 수 있어 여기서 교집합을 강제로 검사한다.
const sitemapText = read("sitemap.xml") ?? read("public/sitemap.xml");
if (sitemapText === null) {
  console.error("[redirects-budget] sitemap.xml 이 없다. `npm run sitemap:generate` 뒤에 실행할 것.");
  process.exit(1);
}
const sitemapPaths = [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => match[1].replace(/^https?:\/\/[^/]+/, ""))
  .filter(Boolean);
if (sitemapPaths.length === 0) {
  console.error("[redirects-budget] sitemap.xml 에서 URL 을 하나도 못 읽었다.");
  process.exit(1);
}

function ruleMatchesPath(from, path) {
  if (from.endsWith("*")) return path.startsWith(from.slice(0, -1));
  if (from.includes(":")) {
    const pattern = new RegExp(`^${from.replace(/:[a-zA-Z]+/g, "[^/]+").replace(/[.]/g, "\\.")}$`);
    return pattern.test(path);
  }
  return from === path;
}

for (const rule of rules) {
  const swallowed = sitemapPaths.filter((path) => ruleMatchesPath(rule.from, path));
  if (swallowed.length > 0) {
    fail(
      `public/_redirects:${rule.line} 규칙 "${rule.from}" 이 사이트맵에 있는 살아 있는 라우트 ` +
        `${swallowed.length}개를 삼킨다 (예: ${swallowed.slice(0, 3).join(", ")}).`,
    );
  }
}

// ── 5. 워커 리다이렉트 ↔ _routes.json 드리프트 ────────────────────────────
// _redirects 예산에 못 들어간 리다이렉트는 public/_worker.js 가 처리한다. 그 코드는
// _routes.json 의 include 에 해당 경로가 있어야만 실행되므로, 워커의 `@routes-include:`
// 마커와 _routes.json 이 어긋나면 리다이렉트가 조용히 사라진다.
const workerText = read("public/_worker.js");
if (workerText === null) {
  console.error("[redirects-budget] public/_worker.js 가 없다.");
  process.exit(1);
}
const workerIncludes = [...workerText.matchAll(/@routes-include:\s*(\S+)/g)].map((match) => match[1]);
if (workerIncludes.length === 0) {
  console.error("[redirects-budget] public/_worker.js 에 `@routes-include:` 마커가 없다 — 검사 대상 0.");
  process.exit(1);
}

const routesText = read("public/_routes.json");
if (routesText === null) {
  console.error("[redirects-budget] public/_routes.json 이 없다.");
  process.exit(1);
}
let routesInclude = [];
try {
  routesInclude = JSON.parse(routesText).include || [];
} catch (error) {
  console.error(`[redirects-budget] public/_routes.json 파싱 실패: ${error.message}`);
  process.exit(1);
}
for (const marker of workerIncludes) {
  if (!routesInclude.includes(marker)) {
    fail(`public/_worker.js 가 "${marker}" 를 처리한다고 선언했는데 public/_routes.json 의 include 에 없다. 그 리다이렉트는 실행되지 않는다.`);
  }
}

// ── 6. 워커의 기간 목록이 정본과 같은가 ──────────────────────────────────
// 워커는 public/ 아래 단일 파일이라 lib/ 에서 import 할 수 없다. 손으로 복제한 목록이므로
// 정본(lib/fortune/periods.ts)과의 드리프트를 여기서 막는다.
const periodsSource = read("lib/fortune/periods.ts");
if (periodsSource === null) {
  console.error("[redirects-budget] lib/fortune/periods.ts 가 없다.");
  process.exit(1);
}
const canonicalPeriods = (periodsSource.match(/FORTUNE_PERIOD_IDS[^=]*=\s*\[([^\]]+)\]/) || [])[1];
const workerPeriods = (workerText.match(/const FORTUNE_PERIODS = new Set\(\[([^\]]+)\]\)/) || [])[1];
if (!canonicalPeriods || !workerPeriods) {
  console.error("[redirects-budget] 기간 목록을 읽지 못했다(정본 또는 워커 선언이 바뀌었다).");
  process.exit(1);
}
const normalize = (value) => value.match(/"[^"]+"/g).map((token) => token.slice(1, -1)).sort().join(",");
if (normalize(canonicalPeriods) !== normalize(workerPeriods)) {
  fail(
    `public/_worker.js 의 FORTUNE_PERIODS [${normalize(workerPeriods)}] 가 ` +
      `lib/fortune/periods.ts 의 FORTUNE_PERIOD_IDS [${normalize(canonicalPeriods)}] 와 다르다.`,
  );
}

// ── 6-b. 유명인 사주 별칭 맵이 정본 데이터와 어긋나지 않는가 ──────────────
// 워커는 public/famous-saju-aliases.json 을 자산으로 읽어 301 한다. 그 파일이 낡으면
// 새로 추가된 인물의 별칭이 조용히 404 로 남는다(지금 고치고 있는 그 결함 그대로다).
const aliasFile = read("public/famous-saju-aliases.json");
if (aliasFile === null) {
  console.error("[redirects-budget] public/famous-saju-aliases.json 이 없다. `node scripts/generate-famous-saju-aliases.mjs` 를 돌릴 것.");
  process.exit(1);
}
const { buildAliasMap, readSource, serialize } = await import("./generate-famous-saju-aliases.mjs");
const regenerated = serialize(buildAliasMap(readSource(rootDir)).map);
if (regenerated !== aliasFile) {
  fail("public/famous-saju-aliases.json 이 lib/famous-saju/celebrity-data.ts 와 어긋난다. `node scripts/generate-famous-saju-aliases.mjs` 로 재생성해 같은 커밋에 담을 것.");
}
const aliasMap = JSON.parse(aliasFile);
const aliasCount = Object.keys(aliasMap).length;
if (aliasCount === 0) fail("유명인 사주 별칭이 0개다 — 검사 대상이 없다.");
for (const [alias, canonicalSlug] of Object.entries(aliasMap)) {
  if (aliasMap[canonicalSlug]) {
    fail(`별칭 "${alias}" 의 목적지 "${canonicalSlug}" 가 그 자체로 별칭이다 — 리다이렉트가 두 번 걸린다.`);
  }
}

// ── 7. 워커가 가로채는 경로에서 _headers 의 noindex 가 사라지지 않는가 ────
// `_headers` 가 워커 처리 경로에도 적용되는지는 **미검증**이다. 그래서 워커가 가로채는
// 프리픽스 아래의 X-Robots-Tag noindex 규칙은 HTML 자체에도 noindex 가 있어야 한다.
const headersText = read("public/_headers");
if (headersText === null) {
  console.error("[redirects-budget] public/_headers 가 없다.");
  process.exit(1);
}
const headerRules = [];
let currentPath = null;
for (const line of headersText.split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith("#")) continue;
  if (!/^\s/.test(line)) {
    currentPath = line.trim();
    continue;
  }
  if (currentPath && /X-Robots-Tag:.*noindex/i.test(line)) headerRules.push(currentPath);
}

function htmlFilesUnder(pattern) {
  const base = pattern.replace(/\*$/, "").replace(/^\//, "");
  const candidates = [
    join("public", base, "index.html"),
    join("public", `${base}.html`),
    join("public", base.replace(/\/$/, "") + ".html"),
  ];
  const found = candidates.filter((candidate) => existsSync(resolve(rootDir, candidate)));
  const dir = resolve(rootDir, "public", base);
  if (existsSync(dir) && statSync(dir).isDirectory()) {
    for (const entry of readdirSync(dir)) {
      const nested = join("public", base, entry, "index.html");
      if (existsSync(resolve(rootDir, nested))) found.push(nested);
    }
  }
  return [...new Set(found)];
}

for (const headerPath of headerRules) {
  const covered = workerIncludes.some((marker) => {
    const prefix = marker.replace(/\*$/, "");
    return headerPath.startsWith(prefix);
  });
  if (!covered) continue;
  const files = htmlFilesUnder(headerPath);
  if (files.length === 0) continue;
  for (const file of files) {
    const html = read(file) || "";
    if (!/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html)) {
      fail(
        `public/_headers 의 "${headerPath}" 는 noindex 인데 ${file} 에 robots meta 가 없다. ` +
          `이 경로는 public/_worker.js 가 가로채므로 _headers 가 적용된다는 보장이 없다 — HTML 에도 noindex 를 둘 것.`,
      );
    }
  }
}

// ── 결과 ─────────────────────────────────────────────────────────────────
if (failures.length > 0) {
  console.error("[redirects-budget] 실패:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `[redirects-budget] OK — 규칙 ${rules.length}/${RULE_BUDGET}개, ` +
    `사이트맵 ${sitemapPaths.length}개와 교집합 0, 워커 include ${workerIncludes.length}개 정합, ` +
    `유명인 사주 별칭 ${aliasCount}개 최신.`,
);
