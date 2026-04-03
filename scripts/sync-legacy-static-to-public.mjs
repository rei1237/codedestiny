/**
 * Copies root static assets → public/ (Cloudflare / static hosting).
 * 사주 엔진은 js/saju-engine.js + tarot-sukuyo-quantum + core/saju/reportDashboard + continuation 순서로 index.html에 로드됨.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const rootDir = process.cwd();
const publicDir = resolve(rootDir, "public");

const staticTargets = [
  "AnalysisEngine.js",
  "PhysiognomyUI.js",
  "HwatuFortune.js",
  "secret-house-final.html",
  "ads.txt",
  "manifest.json",
  "manifest-samba.json",
  "service-worker.js",
  "css",
  "js",
  "icons",
  // "styles" is handled separately via syncStylesDir() to prevent pointer files from overwriting real CSS
  "fortune",
  "fuctionassets",
  "sudda",
];

/**
 * Safe per-file sync for the styles/ directory.
 * Guards against two failure modes:
 *   1. A root/styles/*.css that is just an @import pointer back to public/styles/
 *      accidentally overwrites the real CSS in public/styles/ (circular reference + CSS loss).
 *   2. A tiny/empty placeholder in root/styles/ overwrites a large, real CSS in public/styles/.
 */
function syncStylesDir() {
  const srcDir = resolve(rootDir, "styles");
  const dstDir = resolve(publicDir, "styles");
  if (!existsSync(srcDir)) return;
  mkdirSync(dstDir, { recursive: true });

  const POINTER_RE = /@import\s+url\s*\(\s*["']?\.\.\/public\/styles\//;
  const TINY_THRESHOLD = 512; // bytes — anything smaller is considered a placeholder

  for (const name of readdirSync(srcDir)) {
    const srcFile = join(srcDir, name);
    const dstFile = join(dstDir, name);

    // Only handle regular CSS files; sub-directories are copied as-is
    if (!name.endsWith(".css")) {
      cpSync(srcFile, dstFile, { recursive: true, force: true });
      continue;
    }

    const srcStat = statSync(srcFile);
    const srcContent = readFileSync(srcFile, "utf8");

    // Guard 1: skip pointer files that reference ../public/styles/ (would create circular @import)
    if (POINTER_RE.test(srcContent)) {
      console.warn(`[sync-styles] SKIP pointer file: styles/${name} → would overwrite public/styles/${name} with self-reference`);
      continue;
    }

    // Guard 2: skip tiny source if destination already has a larger real file
    if (srcStat.size < TINY_THRESHOLD && existsSync(dstFile)) {
      const dstStat = statSync(dstFile);
      if (dstStat.size > srcStat.size * 10) {
        console.warn(`[sync-styles] SKIP tiny src (${srcStat.size}B) vs large dst (${dstStat.size}B): styles/${name}`);
        continue;
      }
    }

    cpSync(srcFile, dstFile, { force: true });
  }

  // Also copy any files present in public/styles/ that are NOT in root/styles/
  // (e.g. CSS generated directly into public/ during a build step).
  // These are kept as-is since they have no root counterpart to overwrite them.
  console.log(`[sync-styles] Completed safe styles sync: ${srcDir} → ${dstDir}`);
}

const rootIndexPath = resolve(rootDir, "index.html");
const publicIndexPath = resolve(publicDir, "index.html");

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

for (const target of staticTargets) {
  const sourcePath = resolve(rootDir, target);
  const destinationPath = resolve(publicDir, target);

  if (!existsSync(sourcePath)) {
    continue;
  }

  cpSync(sourcePath, destinationPath, { recursive: true, force: true });
}

// Sync styles/ with pointer-file and tiny-file protection
syncStylesDir();

// Keep public/index.html as the source of truth for production shell.
// Root index can be edited independently for local experiments, but should not overwrite deploy entry.
if (!existsSync(publicIndexPath) && existsSync(rootIndexPath)) {
  cpSync(rootIndexPath, publicIndexPath, { force: true });
  console.log("[sync-legacy-static-to-public] Seeded missing public/index.html from root/index.html");
}

// Fallback: some pipelines generate ads.txt under build/ only.
// Keep /public/ads.txt populated so final dist always exposes /ads.txt.
const rootAdsTxt = resolve(rootDir, "ads.txt");
const buildAdsTxt = resolve(rootDir, "build", "ads.txt");
const publicAdsTxt = resolve(publicDir, "ads.txt");
if (!existsSync(rootAdsTxt) && existsSync(buildAdsTxt)) {
  cpSync(buildAdsTxt, publicAdsTxt, { force: true });
  console.log("[sync-legacy-static-to-public] Fallback copied build/ads.txt -> public/ads.txt");
}

// Locale landing paths (same slugs as middleware.js LOCALE_SLUGS / app/layout.js).
// Ensures Cloudflare Pages / asset-first hosts return 200 for /en-us etc., not 404.
const localeLandingDirs = [
  "en-us",
  "ja-jp",
  "zh-cn",
  "hi-in",
  "es-es",
  "fr-fr",
  "de-de",
  "nl-nl",
  "ms-my",
];
const publicIndex = resolve(publicDir, "index.html");
if (existsSync(publicIndex)) {
  const staticDir = resolve(publicDir, "static");
  mkdirSync(staticDir, { recursive: true });
  cpSync(publicIndex, resolve(staticDir, "index.html"), { force: true });
  console.log("[sync-legacy-static-to-public] Copied index.html -> public/static/index.html (SPA shell; avoids [adminHash] collision).");

  for (const loc of localeLandingDirs) {
    const locDir = resolve(publicDir, loc);
    mkdirSync(locDir, { recursive: true });
    cpSync(publicIndex, resolve(locDir, "index.html"), { force: true });
  }
  console.log(
    `[sync-legacy-static-to-public] Locale landing pages: /${localeLandingDirs.join(", /")}/index.html`,
  );
}

console.log("[sync-legacy-static-to-public] Completed static asset sync.");
