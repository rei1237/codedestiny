#!/usr/bin/env node
/**
 * 배포된 리다이렉트 **라이브** 검사 (수동 실행 전용).
 *
 * 왜 이게 개수 가드와 한 쌍인가:
 *   Cloudflare Pages 가 `_redirects` 의 첫 102개만 적용한다는 것은 2026-08-16 실측값이고,
 *   그 상한이 **규칙 수인지 바이트인지는 미확정**이다. `verify-redirects-budget` 은 개수만
 *   세므로 상한이 달라지는 변화를 잡지 못한다. 유일하게 확실한 신호는
 *   "**파일 마지막 규칙**이 실제로 적용되는가" 뿐이다.
 *
 * 배포 게이트에 넣지 않는 이유는 verify-www-canonical.mjs 와 같다 — 네트워크 오류가 배포를
 * 막으면 안 된다. 머지 후 손으로 한 번 돌린다.
 *
 *   npm run verify:redirects:live
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ORIGIN = (process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");
const rootDir = process.cwd();
const UA = "Yeti/1.1 (+https://naver.me/spd)";
const failures = [];
const notes = [];

function readFile(relativePath) {
  const full = resolve(rootDir, relativePath);
  return existsSync(full) ? readFileSync(full, "utf8") : null;
}

async function head(path) {
  const response = await fetch(`${ORIGIN}${path}`, { redirect: "manual", headers: { "User-Agent": UA } });
  return {
    status: response.status,
    location: (response.headers.get("location") || "").replace(ORIGIN, ""),
    robots: response.headers.get("x-robots-tag") || "",
  };
}

// ── 1. _redirects 의 마지막 규칙이 살아 있는가 (상한 재발 감지) ───────────
const redirectsText = readFile("public/_redirects");
if (!redirectsText) {
  console.error("[redirects-live] public/_redirects 가 없다.");
  process.exit(1);
}
const rules = redirectsText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => line.split(/\s+/))
  .filter((parts) => parts.length >= 2)
  .map((parts) => ({ from: parts[0], to: parts[1] }));

if (rules.length === 0) {
  console.error("[redirects-live] 규칙이 0개다.");
  process.exit(1);
}

const last = rules[rules.length - 1];
const probePath = last.from.replace(/\*$/, "probe-cd");
const lastResult = await head(probePath);
if (lastResult.status < 300 || lastResult.status >= 400) {
  failures.push(
    `🔴 마지막 규칙(#${rules.length} "${last.from}")이 적용되지 않는다 — ${probePath} → ${lastResult.status}. ` +
      `Cloudflare 의 _redirects 상한이 ${rules.length}개보다 낮다. 규칙을 줄이거나 public/_worker.js 로 옮길 것.`,
  );
} else {
  notes.push(`마지막 규칙 #${rules.length} "${last.from}" 적용 확인 (${lastResult.status} → ${lastResult.location})`);
}

// ── 2. 워커가 처리하는 fortune 레거시 리다이렉트 ─────────────────────────
const fortuneProbes = [
  { path: "/fortune/monthly/aries.html", expect: "/fortune/monthly/aries/" },
  { path: "/fortune/weekly/rat.html", expect: "/fortune/weekly/rat/" },
  { path: "/fortune/today/aries.html", expect: "/fortune/today/aries/" },
  { path: "/fortune/today/sukuyo/", expect: "/sukuyo/" },
  { path: "/fortune/monthly/ziwei/anything", expect: "/ziwei/" },
];
for (const probe of fortuneProbes) {
  const result = await head(probe.path);
  if (result.location !== probe.expect) {
    failures.push(`🔴 ${probe.path} → ${result.status} ${result.location || "(리다이렉트 없음)"} (기대: 301 ${probe.expect})`);
  }
}

// ── 3. 워커가 가로챈 뒤에도 살아 있는 라우트는 200 인가 ──────────────────
for (const path of ["/fortune/", "/fortune/today/aries/", "/fortune/monthly/pig/"]) {
  const result = await head(path);
  if (result.status !== 200) {
    failures.push(`🔴 살아 있는 라우트 ${path} 가 ${result.status} ${result.location} — 워커/리다이렉트가 삼켰다.`);
  }
}

// ── 4. 워커 경로에서 _headers 의 noindex 가 유지되는가 ───────────────────
// _headers 가 워커 처리 경로에도 적용되는지는 미검증이라 여기서 실측한다.
const sikojen = await head("/fortune/sikojen-povailu/");
if (!/noindex/i.test(sikojen.robots)) {
  notes.push(
    `⚠️ /fortune/sikojen-povailu/ 의 X-Robots-Tag 가 "${sikojen.robots || "(없음)"}" 이다 — ` +
      `_headers 가 워커 경로에 적용되지 않는다는 뜻. HTML 의 robots meta 로만 막히고 있는지 확인할 것.`,
  );
}

// ── 5. 사이트맵 URL 은 하나도 리다이렉트되지 않아야 한다 ─────────────────
const sitemapResponse = await fetch(`${ORIGIN}/sitemap.xml`, { headers: { "User-Agent": UA } });
const sitemapPaths = [...(await sitemapResponse.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
  m[1].replace(ORIGIN, ""),
);
if (sitemapPaths.length === 0) {
  failures.push("🔴 라이브 sitemap.xml 에서 URL 을 하나도 못 읽었다.");
}
let cursor = 0;
const redirected = [];
async function worker() {
  while (cursor < sitemapPaths.length) {
    const path = sitemapPaths[cursor++];
    const result = await head(path);
    if (result.status !== 200) redirected.push(`${result.status} ${path} → ${result.location}`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
if (redirected.length > 0) {
  failures.push(`🔴 사이트맵 URL ${redirected.length}개가 200 이 아니다: ${redirected.slice(0, 5).join(" | ")}`);
}

// ── 결과 ─────────────────────────────────────────────────────────────────
for (const note of notes) console.log(`[redirects-live] ${note}`);
if (failures.length > 0) {
  console.error("[redirects-live] 실패:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`[redirects-live] OK — 규칙 ${rules.length}개, 사이트맵 ${sitemapPaths.length}개 전수 200.`);
