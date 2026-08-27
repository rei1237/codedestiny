import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getStaticShellCanonicalRoutes } from "./static-canonical-route-map.mjs";
import { injectStaticShellRouteMeta } from "./lib/static-shell-route-meta.mjs";

const rootDir = process.cwd();
const publicDir = resolve(rootDir, "public");
const publicIndexPath = resolve(rootDir, "public", "index.html");
const publicStaticIndexPath = resolve(rootDir, "public", "static", "index.html");
const generatedSitemapPath = resolve(rootDir, "out", "sitemap.xml");
const generatedRobotsPath = resolve(rootDir, "out", "robots.txt");
const generatedOutDir = resolve(rootDir, "out");
const nextServerAppDir = resolve(rootDir, ".next", "server", "app");
const distIndexPath = resolve(rootDir, "dist", "index.html");
const distSitemapPath = resolve(rootDir, "dist", "sitemap.xml");
const distRobotsPath = resolve(rootDir, "dist", "robots.txt");
const distStaticIndexPath = resolve(rootDir, "dist", "static", "index.html");
const staticShellRouteHtmlFiles = new Set([
  "index.html",
  "static/index.html",
  "en/index.html",
  "ja/index.html",
  "zh/index.html",
  "zh-tw/index.html",
]);

function stripLeadingBom(buffer) {
  let offset = 0;
  while (
    offset + 2 < buffer.length &&
    buffer[offset] === 0xef &&
    buffer[offset + 1] === 0xbb &&
    buffer[offset + 2] === 0xbf
  ) {
    offset += 3;
  }
  return offset > 0 ? buffer.subarray(offset) : buffer;
}

function assertShellLooksReady(html, options = {}) {
  const { allowStaticSelfRedirect = false } = options;
  const requiredMarkers = [
    'id="authQuickLinks"',
    "openHwatuModal",
  ];

  for (const marker of requiredMarkers) {
    if (!html.includes(marker)) {
      throw new Error(`[promote-static-shell] Missing required shell marker: ${marker}`);
    }
  }

  const hasStaticRedirect = html.includes("forceRootToStatic")
    || (!allowStaticSelfRedirect && html.includes("window.location.replace('/static/"));

  if (hasStaticRedirect) {
    throw new Error("[promote-static-shell] Root shell still contains a /static redirect.");
  }
}

/**
 * `/static/` 는 `/` 와 바이트까지 동일한 사본이다(홈 셸이 승격되기 전 시절의 폴백 경로).
 * 그래서 크롤러 눈에는 홈의 완전한 중복 URL 이고, 실제로 `/about` 이 `/static/#…` 앵커
 * 4개로 링크해 발견 가능하다. 지금은 cross-canonical 하나만 그걸 막고 있다.
 *
 * 원본(`public/static/index.html`)은 건드리지 않는다 — 검증기 여러 개가 그 파일을 셸
 * 사본으로 대조한다. 배포 산출물의 `/static/` 사본에서만 robots 를 noindex 로 바꾼다.
 * 루프 가드 폴백 기능에는 영향이 없다.
 */
function withNoindexRobots(html) {
  const pattern = /(<meta\s+name="robots"\s+content=")[^"]*(")/i;
  if (!pattern.test(html)) {
    throw new Error("[promote-static-shell] robots meta not found in the static shell copy");
  }
  return html.replace(pattern, "$1noindex, follow$2");
}

/**
 * 정적 셸 사본에서 hreflang alternate 를 걷어낸다.
 *
 * 이 사본들은 루트 셸의 `<head>` 만 갈아 끼우므로, 지우지 않으면 **홈의 alternate 12줄**
 * (ko·ko-KR·ja·ja-JP·zh-CN·zh·zh-Hans·zh-TW·zh-Hant·en·en-US·x-default)을 그대로 들고 나간다.
 * 즉 이 사본이 "이 사이트의 한국어판이자 x-default" 라고 주장하게 되고, 목적지들은 당연히
 * 되돌아 가리키지 않아 상호참조가 깨진 채로 남는다 — Google "Localized versions" 는
 * 역방향 링크가 없으면 주석이 무시되거나 잘못 해석될 수 있다고 명시한다.
 * noindex 라 실제로 처리되지는 않지만, 홈의 hreflang 클러스터에 잡음을 남길 이유가 없다.
 *
 * 2026-08-27 dist/ 실측: `/oracle/juyuk`·`/oracle/hwatu`·`/static` 이 각각 12줄을 내보내고 있었다.
 * 🔴 `rel="alternate"` 만 보고 지우지 말 것 — RSS 링크
 *    (`<link rel="alternate" type="application/rss+xml" ...>`)가 같은 rel 을 쓴다.
 *    반드시 `hreflang=` 이 함께 있는 태그만 지운다.
 */
function withoutHreflangLinks(html) {
  return html.replace(/\s*<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=["'][^"']*["'][^>]*>/gi, "");
}

/**
 * noindex 사본에서 홈을 가리키는 cross-canonical 을 걷어낸다.
 *
 * Google "Consolidate duplicate URLs" 는 canonical 선택에 noindex 를 쓰지 말라고 명시하고,
 * 두 신호가 모순이면 어느 쪽이 이길지 보장되지 않는다 — 최악의 경우 noindex 가 canonical
 * 목적지(여기서는 **홈**)로 옮겨붙는다. `/static` 은 중복 URL 이므로 남길 신호는 noindex 하나다.
 * 2026-08-27 사용자 결정: noindex 유지 · canonical 제거.
 */
function withoutHomeCanonical(html) {
  const pattern = /\s*<link\s+rel=["']canonical["']\s+href=["']https:\/\/code-destiny\.com\/["']\s*\/?>/i;
  if (!pattern.test(html)) {
    throw new Error("[promote-static-shell] home canonical not found in the static shell copy");
  }
  return html.replace(pattern, "");
}

function writeHtml(sourcePath, destinationPath, label, options = {}) {
  if (!existsSync(sourcePath)) {
    throw new Error(`[promote-static-shell] Missing source: ${sourcePath}`);
  }

  const buffer = stripLeadingBom(readFileSync(sourcePath));
  const html = buffer.toString("utf8");
  assertShellLooksReady(html, options);
  mkdirSync(dirname(destinationPath), { recursive: true });
  // noindex 사본은 언어 대체본도 아니고 canonical 을 위임할 자격도 없다 —
  // robots 와 함께 hreflang·홈 canonical 을 모두 걷어낸다.
  writeFileSync(
    destinationPath,
    options.noindex
      ? Buffer.from(withoutHomeCanonical(withoutHreflangLinks(withNoindexRobots(html))), "utf8")
      : buffer,
  );
  console.log(`[promote-static-shell] ${label}: ${sourcePath} -> ${destinationPath}${options.noindex ? " (noindex)" : ""}`);
}

function relativePath(from, to) {
  return to.slice(from.length + 1).replace(/\\/g, "/");
}

function collectGeneratedRouteHtmlFiles(sourceRoot, currentDir = sourceRoot, routeFiles = []) {
  if (!existsSync(currentDir)) return routeFiles;

  let entries = [];
  try {
    entries = readdirSync(currentDir);
  } catch (error) {
    if (error?.code === "ENOENT") return routeFiles;
    throw error;
  }

  for (const entry of entries) {
    const entryPath = resolve(currentDir, entry);
    let stats;
    try {
      stats = statSync(entryPath);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }

    if (stats.isDirectory()) {
      collectGeneratedRouteHtmlFiles(sourceRoot, entryPath, routeFiles);
      continue;
    }

    if (entry !== "index.html") continue;

    const routeFile = relativePath(sourceRoot, entryPath);
    if (!staticShellRouteHtmlFiles.has(routeFile)) {
      routeFiles.push(routeFile);
    }
  }

  return routeFiles;
}

function restoreGeneratedRouteHtml() {
  let copiedCount = 0;

  for (const sourceRoot of [generatedOutDir, nextServerAppDir]) {
    for (const routeFile of collectGeneratedRouteHtmlFiles(sourceRoot)) {
      const sourcePath = resolve(sourceRoot, routeFile);
      if (!existsSync(sourcePath)) continue;
      const destinationPath = resolve(rootDir, "dist", routeFile);
      mkdirSync(dirname(destinationPath), { recursive: true });
      copyFileSync(sourcePath, destinationPath);
      copiedCount += 1;
    }
  }

  if (copiedCount > 0) {
    console.log(`[promote-static-shell] restored ${copiedCount} generated app route HTML file(s)`);
  }
}

function restoreStaticShellLocaleHtml() {
  for (const routeFile of staticShellRouteHtmlFiles) {
    if (!/^(en|ja|zh|zh-tw)\/index\.html$/.test(routeFile)) continue;
    const sourcePath = resolve(publicDir, routeFile);
    if (!existsSync(sourcePath)) continue;
    const destinationPath = resolve(rootDir, "dist", routeFile);
    mkdirSync(dirname(destinationPath), { recursive: true });
    copyFileSync(sourcePath, destinationPath);
  }
}

function writeStaticShellCanonicalRoutes() {
  if (!existsSync(publicIndexPath)) return;

  const rootShellHtml = readFileSync(publicIndexPath, "utf8");
  for (const route of getStaticShellCanonicalRoutes()) {
    const routeFile = route.canonical.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!routeFile) continue;
    const destinationPath = resolve(rootDir, "dist", routeFile, "index.html");
    mkdirSync(dirname(destinationPath), { recursive: true });
    writeFileSync(destinationPath, injectStaticShellRouteMeta(rootShellHtml, route), "utf8");
  }
}

if (!existsSync(resolve(rootDir, "dist"))) {
  throw new Error("[promote-static-shell] dist/ does not exist. Run this after next build.");
}

if (existsSync(publicDir)) {
  cpSync(publicDir, resolve(rootDir, "dist"), { recursive: true, force: true });
  restoreGeneratedRouteHtml();
  restoreStaticShellLocaleHtml();
  console.log(`[promote-static-shell] public assets: ${publicDir} -> ${resolve(rootDir, "dist")}`);

  if (existsSync(generatedSitemapPath)) {
    copyFileSync(generatedSitemapPath, distSitemapPath);
    console.log(`[promote-static-shell] sitemap: ${generatedSitemapPath} -> ${distSitemapPath}`);
  }

  if (existsSync(generatedRobotsPath)) {
    copyFileSync(generatedRobotsPath, distRobotsPath);
    console.log(`[promote-static-shell] robots: ${generatedRobotsPath} -> ${distRobotsPath}`);
  }
}

writeHtml(publicIndexPath, distIndexPath, "root");

if (existsSync(publicStaticIndexPath)) {
  writeHtml(publicStaticIndexPath, distStaticIndexPath, "legacy static", { allowStaticSelfRedirect: true, noindex: true });
}

writeStaticShellCanonicalRoutes();
