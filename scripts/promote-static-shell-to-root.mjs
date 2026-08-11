import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getStaticShellCanonicalRoutes } from "./static-canonical-route-map.mjs";

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

function writeHtml(sourcePath, destinationPath, label, options = {}) {
  if (!existsSync(sourcePath)) {
    throw new Error(`[promote-static-shell] Missing source: ${sourcePath}`);
  }

  const buffer = stripLeadingBom(readFileSync(sourcePath));
  const html = buffer.toString("utf8");
  assertShellLooksReady(html, options);
  mkdirSync(dirname(destinationPath), { recursive: true });
  writeFileSync(destinationPath, buffer);
  console.log(`[promote-static-shell] ${label}: ${sourcePath} -> ${destinationPath}`);
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

function escapeHtmlAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toCanonicalUrl(pathname) {
  const normalized = String(pathname || "/").startsWith("/") ? String(pathname || "/") : `/${pathname}`;
  return `https://code-destiny.com${normalized}`;
}

function injectStaticShellRouteMeta(html, route) {
  const canonicalUrl = toCanonicalUrl(route.canonical);
  const routeMeta = [
    `<meta name="cd-static-canonical-route" content="${escapeHtmlAttr(route.canonical)}">`,
    route.action ? `<meta name="cd-static-canonical-action" content="${escapeHtmlAttr(route.action)}">` : "",
  ].filter(Boolean).join("\n");

  let nextHtml = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(route.title)}</title>`)
    .replace(/<meta\s+name=["']description["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta name="description" content="${escapeHtmlAttr(route.description)}">`)
    .replace(/<link\s+rel=["']canonical["']\s+href=["'][\s\S]*?["']\s*\/?>/i, `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}">`)
    .replace(/<meta\s+name=["']robots["']\s+content=["'][\s\S]*?["']\s*\/?>/i, '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">');

  if (nextHtml.includes("</head>")) {
    nextHtml = nextHtml.replace("</head>", `${routeMeta}\n</head>`);
  }

  return nextHtml;
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
  writeHtml(publicStaticIndexPath, distStaticIndexPath, "legacy static", { allowStaticSelfRedirect: true });
}

writeStaticShellCanonicalRoutes();
