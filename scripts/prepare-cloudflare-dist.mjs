import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { getStaticShellCanonicalRoutes } from "./static-canonical-route-map.mjs";
import { injectStaticShellRouteMeta } from "./lib/static-shell-route-meta.mjs";

const rootDir = process.cwd();
const distDir = resolve(rootDir, "dist");
const publicDir = resolve(rootDir, "public");
const generatedOutDir = resolve(rootDir, "out");
const nextServerAppDir = resolve(rootDir, ".next", "server", "app");
const rootIndexPath = resolve(rootDir, "index.html");
const candidates = [generatedOutDir, resolve(rootDir, ".open-next", "assets")];

const sourceDir = candidates.find((dirPath) => existsSync(dirPath));
const staticShellRouteHtmlFiles = new Set([
  "index.html",
  "static/index.html",
  "en/index.html",
  "ja/index.html",
  "zh/index.html",
]);

const generatedRouteHtmlRoots = [
  generatedOutDir,
  sourceDir,
  nextServerAppDir,
];

if (!sourceDir) {
  console.error("[prepare-cloudflare-dist] Missing source output (.open-next/assets or out).");
  process.exit(1);
}

function clearDirectoryOrRemove(targetDir) {
  try {
    removePathWithRetry(targetDir);
    return;
  } catch (error) {
    if (error?.code !== "EPERM" || !existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
      throw error;
    }
  }

  for (const entry of readdirSync(targetDir)) {
    removePathWithRetry(join(targetDir, entry));
  }
}

function waitForFileLock(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isTransientFileSystemError(error) {
  return ["EBUSY", "EPIPE", "EPERM", "ESRCH", "ENOENT", "ENOTEMPTY"].includes(error?.code);
}

function removePathWithRetry(targetPath) {
  const maxAttempts = 12;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      rmSync(targetPath, { recursive: true, force: true, maxRetries: 8, retryDelay: 300 });
      return;
    } catch (error) {
      if (isTransientFileSystemError(error) && attempt < maxAttempts) {
        waitForFileLock(200 * attempt);
        continue;
      }
      throw error;
    }
  }
}

function copyFileWithRetry(sourcePath, targetPath) {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      copyFileSync(sourcePath, targetPath);
      return;
    } catch (error) {
      if (isTransientFileSystemError(error) && attempt < maxAttempts) {
        waitForFileLock(150 * attempt);
        continue;
      }
      throw error;
    }
  }
}

function copyDirectoryWithRetry(sourcePath, targetPath, options) {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      cpSync(sourcePath, targetPath, options);
      return;
    } catch (error) {
      if (isTransientFileSystemError(error) && attempt < maxAttempts) {
        waitForFileLock(180 * attempt);
        continue;
      }
      throw error;
    }
  }
}

function collectGeneratedRouteHtmlFiles(sourceRoot, currentDir = sourceRoot, routeFiles = []) {
  if (!sourceRoot || !existsSync(currentDir)) return routeFiles;

  let entries = [];
  try {
    entries = readdirSync(currentDir);
  } catch (error) {
    if (error?.code === "ENOENT") return routeFiles;
    throw error;
  }

  for (const entry of entries) {
    const entryPath = join(currentDir, entry);
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

function relativePath(from, to) {
  return to.slice(from.length + 1).replace(/\\/g, "/");
}

function restoreGeneratedRouteHtml(targetRoot) {
  const restored = new Set();

  for (const routeRoot of generatedRouteHtmlRoots) {
    if (!routeRoot || !existsSync(routeRoot)) continue;

    for (const routeFile of collectGeneratedRouteHtmlFiles(routeRoot)) {
      if (restored.has(routeFile)) continue;
      const sourcePath = join(routeRoot, routeFile);
      const targetPath = join(targetRoot, routeFile);
      mkdirSync(dirname(targetPath), { recursive: true });
      copyFileWithRetry(sourcePath, targetPath);
      restored.add(routeFile);
    }
  }
}

function writeStaticShellCanonicalRoutes(targetRoot) {
  if (!existsSync(rootIndexPath)) return;

  const rootShellHtml = readFileSync(rootIndexPath, "utf8");
  for (const route of getStaticShellCanonicalRoutes()) {
    const routeFile = route.canonical.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!routeFile) continue;
    const targetPath = join(targetRoot, routeFile, "index.html");
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, injectStaticShellRouteMeta(rootShellHtml, route), "utf8");
  }
}

if (existsSync(distDir)) {
  clearDirectoryOrRemove(distDir);
}

mkdirSync(distDir, { recursive: true });
copyDirectoryWithRetry(sourceDir, distDir, { recursive: true, force: true });

// Safety net: merge committed public assets so Pages deploy never misses legacy static files.
if (existsSync(publicDir)) {
  copyDirectoryWithRetry(publicDir, distDir, { recursive: true, force: true });
  restoreGeneratedRouteHtml(distDir);
  writeStaticShellCanonicalRoutes(distDir);
  console.log(`[prepare-cloudflare-dist] Merged ${publicDir} -> ${distDir}`);
}

// If Cloudflare Pages is configured to publish directly from `.open-next/assets` (common with
// OpenNext deployments), ensure legacy static files are also merged there.
// This prevents `/styles/*.css` (and other public assets) from being served as HTML fallback.
const openNextAssetsDir = resolve(rootDir, ".open-next", "assets");
if (existsSync(openNextAssetsDir) && existsSync(publicDir)) {
  copyDirectoryWithRetry(publicDir, openNextAssetsDir, { recursive: true, force: true });
  restoreGeneratedRouteHtml(openNextAssetsDir);
  writeStaticShellCanonicalRoutes(openNextAssetsDir);
  console.log(`[prepare-cloudflare-dist] Merged ${publicDir} -> ${openNextAssetsDir}`);
}

if (!existsSync(resolve(distDir, "index.html"))) {
  console.error("[prepare-cloudflare-dist] dist/index.html is missing after copy.");
  process.exit(1);
}

console.log(`[prepare-cloudflare-dist] Copied ${sourceDir} -> ${distDir}`);

// 로컬 js/inline 파일들을 dist + .open-next/assets에 복사 (Pages는 dist, Workers wrangler는 .open-next/assets)
const inlineSourceDir = resolve(rootDir, "js", "inline");
if (existsSync(inlineSourceDir)) {
  const inlineDistDir = resolve(distDir, "js", "inline");
  mkdirSync(inlineDistDir, { recursive: true });
  copyDirectoryWithRetry(inlineSourceDir, inlineDistDir, { recursive: true, force: true });
  console.log(`[prepare-cloudflare-dist] Copied ${inlineSourceDir} -> ${inlineDistDir}`);

  const assetsRoot = resolve(rootDir, ".open-next", "assets");
  if (existsSync(assetsRoot)) {
    if (existsSync(publicDir)) {
      copyDirectoryWithRetry(publicDir, assetsRoot, { recursive: true, force: true });
      restoreGeneratedRouteHtml(assetsRoot);
      writeStaticShellCanonicalRoutes(assetsRoot);
      console.log(`[prepare-cloudflare-dist] Merged ${publicDir} -> ${assetsRoot}`);
    }

    const inlineAssetsDir = resolve(assetsRoot, "js", "inline");
    mkdirSync(inlineAssetsDir, { recursive: true });
    copyDirectoryWithRetry(inlineSourceDir, inlineAssetsDir, { recursive: true, force: true });
    console.log(`[prepare-cloudflare-dist] Copied ${inlineSourceDir} -> ${inlineAssetsDir}`);
  }
}
