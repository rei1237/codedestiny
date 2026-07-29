#!/usr/bin/env node
/**
 * 서버 렌더 콘텐츠 여유 감시.
 *
 * `scripts/verify-adsense-readiness.mjs` 의 `verifyBlockedIndexableSitemapRouteQuality` 는
 * 사이트맵에 있는 비-AdSense·색인 가능 라우트에 **가시 텍스트 1,800자**를 요구하고, 한 곳이라도
 * 미달이면 postbuild 에서 배포 전체를 중단시킨다. 문제는 그게 **이분법**이라는 점이다 —
 * 1,801자짜리 라우트는 통과하지만 카피 한 문단만 지우면 그 순간 전 배포가 죽는다.
 *
 * 이 스크립트는 그 벼랑 끝에 선 라우트를 **미리** 보여 준다. 게이트를 대체하지 않고,
 * "지금 어디가 위험한가"를 배포 전에 알려 주는 용도다.
 *
 * 사용법:
 *   node scripts/audit-content-headroom.mjs            빌드 산출물(out/ 또는 dist/)에서 검사
 *   node scripts/audit-content-headroom.mjs --live     배포된 사이트에서 검사(로컬 빌드 불필요)
 *   node scripts/audit-content-headroom.mjs --fail-under 400
 *                                                      여유가 그 미만인 라우트가 있으면 종료코드 1
 *
 * 로컬 `next build` 가 Windows 에서 완주하지 않으므로 평소에는 `--live` 가 현실적이다.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canLoadAdsense } from "../app/components/adsense-route-policy.js";

const MINIMUM_VISIBLE_TEXT_LENGTH = 1800; // verify-adsense-readiness.mjs 와 같은 값
const DEFAULT_WARN_HEADROOM = 900;

const args = process.argv.slice(2);
const useLive = args.includes("--live");
const failUnderIndex = args.indexOf("--fail-under");
const failUnder = failUnderIndex >= 0 ? Number(args[failUnderIndex + 1]) : null;
const siteOrigin = "https://code-destiny.com";

/* ── verify-adsense-readiness.mjs 의 getVisibleText 와 동일한 구현 ───────────
   (문자열 스캔 방식. 정규식으로 바꾸면 결과가 달라져 감시의 의미가 없어진다) */
function removeElementBlocks(html, tagName) {
  const lowerHtml = html.toLowerCase();
  const openNeedle = `<${tagName}`;
  const closeNeedle = `</${tagName}>`;
  let result = "";
  let cursor = 0;
  while (cursor < html.length) {
    const openIndex = lowerHtml.indexOf(openNeedle, cursor);
    if (openIndex === -1) { result += html.slice(cursor); break; }
    result += html.slice(cursor, openIndex);
    const closeIndex = lowerHtml.indexOf(closeNeedle, openIndex);
    if (closeIndex === -1) break;
    cursor = closeIndex + closeNeedle.length;
  }
  return result;
}

function getVisibleText(html) {
  return ["script", "style", "svg"]
    .reduce((content, tagName) => removeElementBlocks(content, tagName), html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function hasNoindexMeta(html) {
  return /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html);
}

function sitemapPaths(sitemapText) {
  return [...new Set(
    [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((match) => {
        try { return new URL(match[1]).pathname.replace(/\/+$/, "") || "/"; }
        catch { return ""; }
      })
      .filter(Boolean),
  )];
}

function resolveBaseDir() {
  for (const dir of ["out", "dist"]) {
    if (existsSync(resolve(process.cwd(), dir, "sitemap.xml"))) return dir;
  }
  return "";
}

async function readRouteHtml(route) {
  if (useLive) {
    const url = `${siteOrigin}${route === "/" ? "" : route}/`;
    const response = await fetch(url, { headers: { "cache-control": "no-cache" } });
    return response.ok ? response.text() : "";
  }
  const baseDir = resolveBaseDir();
  const file = route === "/"
    ? resolve(process.cwd(), baseDir, "index.html")
    : resolve(process.cwd(), baseDir, `.${route}`, "index.html");
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

async function loadSitemap() {
  if (useLive) return (await fetch(`${siteOrigin}/sitemap.xml`)).text();
  const baseDir = resolveBaseDir();
  if (!baseDir) {
    console.error("[content-headroom] out/ 또는 dist/ 에 sitemap.xml 이 없습니다. `--live` 로 배포본을 검사하세요.");
    process.exit(2);
  }
  return readFileSync(resolve(process.cwd(), baseDir, "sitemap.xml"), "utf8");
}

/** 동시 실행 상한을 둔 map (라이브 모드에서 레이트리밋에 걸리지 않게) */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

const routes = sitemapPaths(await loadSitemap()).filter((route) => !canLoadAdsense(route));
console.log(`[content-headroom] 게이트 대상(비-AdSense·색인 가능) ${routes.length}개 검사 — 임계 ${MINIMUM_VISIBLE_TEXT_LENGTH}자\n`);

const rows = (await mapWithConcurrency(routes, useLive ? 6 : 24, async (route) => {
  const html = await readRouteHtml(route).catch(() => "");
  if (!html) return null;                       // 산출물 없음 → 게이트도 건너뛴다
  if (hasNoindexMeta(html)) return null;        // noindex → 게이트 대상 아님
  return { route, length: getVisibleText(html).length };
})).filter(Boolean).sort((a, b) => a.length - b.length);

let failing = 0;
let danger = 0;
for (const { route, length } of rows) {
  const headroom = length - MINIMUM_VISIBLE_TEXT_LENGTH;
  if (headroom < 0) { failing += 1; console.log(`  배포차단 ${String(length).padStart(6)}자  여유 ${String(headroom).padStart(6)}  ${route}`); }
  else if (headroom < (failUnder ?? DEFAULT_WARN_HEADROOM)) { danger += 1; console.log(`  위험     ${String(length).padStart(6)}자  여유 ${String(headroom).padStart(6)}  ${route}`); }
}

const safe = rows.length - failing - danger;
console.log(`\n[content-headroom] 배포차단 ${failing}개 · 여유부족 ${danger}개 · 안전 ${safe}개`);

if (failing > 0) {
  console.error("\n[content-headroom] FAILED — 1,800자 미만 라우트가 있습니다. 이대로면 postbuild 에서 배포가 중단됩니다.");
  process.exit(1);
}
if (failUnder !== null && danger > 0) {
  console.error(`\n[content-headroom] FAILED — 여유 ${failUnder}자 미만 라우트가 ${danger}개 있습니다.`);
  process.exit(1);
}
console.log("[content-headroom] OK");
