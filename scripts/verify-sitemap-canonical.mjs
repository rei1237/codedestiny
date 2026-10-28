/**
 * 사이트맵 정본·내부 링크 검사(빌드 산출물 dist/ 기준). postbuild 에서 verify-home-identity 뒤에 돈다.
 *
 * Search Console 이 사이트맵 URL 에 "NOINDEX", "사용자가 선택한 표준이 없는 중복", "리디렉션이 포함된
 * 페이지" 사유를 붙이지 않게, 배포될 HTML 에서 직접 확인한다.
 *   - 사이트맵 loc 마다 dist 파일이 있고, rel=canonical 이 정확히 1개이며 loc 과 같다
 *   - 사이트맵 loc 의 HTML 에 robots/googlebot noindex 메타가 없다
 *   - 내부 <a href> 가 리다이렉트 원천(_redirects, 워커 CONSOLIDATED_PAGE_REDIRECTS, /index.html)을
 *     가리키지 않는다. 쿼리가 붙은 링크(/index.html?action=… 등 기능 진입)는 워커가 앱으로 넘기는
 *     기능 링크라 보지 않는다.
 *
 * `_headers` 의 X-Robots-Tag 와 사이트맵의 충돌은 verify-sitemap-integrity.mjs 가 본다.
 * dist/ 가 없으면 실패한다. 이 검사는 빌드 뒤에만 의미가 있다.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DIST = process.argv.find((arg) => arg.startsWith("--dist="))?.slice(7) || "dist";
const SITE = "https://code-destiny.com";
// 정적 자산 폴더에는 문서 HTML 이 없다. 1000개가 넘는 페이지만 훑으려고 건너뛴다.
const SKIP_DIRS = new Set(["_next", "js", "css", "assets", "images", "icons", "fonts"]);
// 워커 루트 분기(public/_worker.js)가 /index.html 을 301 로 / 에 넘긴다.
const WORKER_REDIRECT_PATHS = ["/index.html"];

function sitemapLocs() {
  const files = readdirSync(DIST).filter((name) => /^sitemap(-[a-z0-9-]+)?\.xml$/.test(name) && name !== "sitemap-index.xml");
  const locs = new Set();
  for (const name of files) {
    for (const [, loc] of readFileSync(join(DIST, name), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) locs.add(loc.trim());
  }
  return { files, locs };
}

function htmlFileFor(loc) {
  const { pathname } = new URL(loc);
  const relative = decodeURIComponent(pathname).replace(/^\//, "");
  if (pathname.endsWith("/")) return join(DIST, relative, "index.html");
  const exact = join(DIST, relative);
  return existsSync(exact) ? exact : `${exact}.html`;
}

export function checkSitemapPage(html, loc) {
  const failures = [];
  const canonicals = [...html.matchAll(/<link[^>]+rel="canonical"[^>]*>/g)].map(([tag]) => (tag.match(/href="([^"]+)"/) || [])[1]);
  if (canonicals.length !== 1 || canonicals[0] !== loc) failures.push(`${loc}: canonical ${JSON.stringify(canonicals)}`);
  if (/<meta[^>]+name="(robots|googlebot)"[^>]+content="[^"]*noindex/i.test(html)) failures.push(`${loc}: noindex 메타`);
  return failures;
}

function redirectSources() {
  const exact = new Set(WORKER_REDIRECT_PATHS);
  const prefixes = [];
  for (const line of readFileSync(join(DIST, "_redirects"), "utf8").split(/\r?\n/)) {
    const [source, , status = "301"] = line.trim().split(/\s+/);
    if (!source || source.startsWith("#") || status.startsWith("200")) continue;
    if (source.endsWith("/*")) prefixes.push(source.slice(0, -1));
    else if (!source.includes(":")) exact.add(source);
  }
  const worker = readFileSync("public/_worker.js", "utf8");
  const table = worker.match(/const CONSOLIDATED_PAGE_REDIRECTS = (\{[\s\S]*?\});/);
  if (!table) throw new Error("public/_worker.js 에서 CONSOLIDATED_PAGE_REDIRECTS 를 찾지 못했습니다.");
  for (const source of Object.keys(JSON.parse(table[1]))) exact.add(source);
  return { exact, prefixes };
}

function htmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) htmlFiles(file, out);
    } else if (entry.name.endsWith(".html")) out.push(file);
  }
  return out;
}

export function redirectingLinks(html, { exact, prefixes }) {
  const hits = [];
  for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    if (href.includes("?")) continue;
    let pathname = href.split("#")[0];
    if (pathname.startsWith(SITE)) pathname = pathname.slice(SITE.length) || "/";
    if (!pathname.startsWith("/") || pathname.startsWith("//")) continue;
    if (exact.has(pathname) || prefixes.some((prefix) => pathname.startsWith(prefix))) hits.push(pathname);
  }
  return hits;
}

function main() {
  if (!existsSync(DIST)) {
    console.error(`[verify-sitemap-canonical] ${DIST}/ 가 없습니다. 빌드 뒤에 실행하세요.`);
    process.exit(1);
  }
  const { files, locs } = sitemapLocs();
  const failures = [];
  if (locs.size === 0) failures.push(`${DIST}/sitemap*.xml 에 loc 이 없습니다`);
  for (const loc of locs) {
    const file = htmlFileFor(loc);
    if (!existsSync(file)) failures.push(`${loc}: dist 파일 없음`);
    else failures.push(...checkSitemapPage(readFileSync(file, "utf8"), loc));
  }

  const sources = redirectSources();
  const linkHits = new Map();
  for (const file of htmlFiles(DIST)) {
    for (const pathname of redirectingLinks(readFileSync(file, "utf8"), sources)) {
      const pages = linkHits.get(pathname) || new Set();
      pages.add(file.slice(DIST.length + 1).replace(/\\/g, "/"));
      linkHits.set(pathname, pages);
    }
  }
  for (const [pathname, pages] of linkHits) {
    failures.push(`내부 링크 ${pathname} 는 리다이렉트된다 (${pages.size}개 페이지, 예: ${[...pages].slice(0, 3).join(", ")})`);
  }

  if (failures.length) {
    console.error(`[verify-sitemap-canonical] 실패 ${failures.length}건`);
    for (const failure of failures.slice(0, 40)) console.error(`  ✗ ${failure}`);
    if (failures.length > 40) console.error(`  … ${failures.length - 40}건 더`);
    process.exit(1);
  }
  console.log(`[verify-sitemap-canonical] OK — 사이트맵 ${files.length}개 · loc ${locs.size}개 · 리다이렉트 내부 링크 0`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
