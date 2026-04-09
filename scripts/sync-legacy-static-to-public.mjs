/**
 * Copies root static assets → public/ (Cloudflare / static hosting).
 * 사주 엔진은 js/saju-engine.js + tarot-sukuyo-quantum + core/saju/reportDashboard + continuation 순서로 index.html에 로드됨.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
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
 * Guards against four failure modes:
 *   1. A root/styles/*.css that is just an @import pointer back to public/styles/
 *      accidentally overwrites the real CSS in public/styles/ (circular reference + CSS loss).
 *   2. A tiny/empty placeholder in root/styles/ overwrites a large, real CSS in public/styles/.
 *   3. PowerShell Set-Content adds UTF-8 BOM or CRLF line endings to CSS files.
 *      This function always writes normalized (BOM-free, LF) CSS.
 *   4. styles/globals.css is the Next.js source file (requires @tailwind directives for
 *      PostCSS compilation). public/styles/globals.css is the statically-served pure CSS.
 *      These have DIFFERENT contents by design and must NEVER be synced to each other.
 *      Same applies to any other file listed in STATIC_ONLY_OVERRIDES.
 */

// Files whose root/styles/ version is a Next.js source (Tailwind/PostCSS processed)
// and whose public/styles/ version is independently maintained pure CSS.
// These are NEVER overwritten by the sync in either direction.
const STATIC_ONLY_OVERRIDES = new Set(["globals.css"]);
function normalizeCss(buf) {
  let str = buf.toString("utf8");
  // Remove UTF-8 BOM (EF BB BF) if present
  if (str.charCodeAt(0) === 0xFEFF) str = str.slice(1);
  // Normalize CRLF → LF
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return Buffer.from(str, "utf8");
}

function syncStylesDir() {
  const srcDir = resolve(rootDir, "styles");
  const dstDir = resolve(publicDir, "styles");
  if (!existsSync(srcDir)) return;
  mkdirSync(dstDir, { recursive: true });

  const POINTER_RE = /@import\s+url\s*\(\s*["']?\.\.\/public\/styles\//;
  const TAILWIND_RE = /^@tailwind\s+(base|components|utilities)\s*;/m;
  const TINY_THRESHOLD = 512; // bytes — anything smaller is considered a placeholder

  for (const name of readdirSync(srcDir)) {
    const srcFile = join(srcDir, name);
    const dstFile = join(dstDir, name);

    // Only handle regular CSS files; sub-directories are copied as-is
    if (!name.endsWith(".css")) {
      cpSync(srcFile, dstFile, { recursive: true, force: true });
      continue;
    }

    const srcBuf = readFileSync(srcFile);
    const srcNorm = normalizeCss(srcBuf);
    const srcStr = srcNorm.toString("utf8");
    const srcSize = srcBuf.length;

    // Guard 0: files that serve fundamentally different roles in root vs public
    // (e.g. globals.css = Next.js @tailwind source vs. static pure CSS)
    if (STATIC_ONLY_OVERRIDES.has(name)) {
      console.log(`[sync-styles] SKIP dual-purpose file: styles/${name} (root=Next.js source, public=static pure CSS)`);
      continue;
    }

    // Guard 1: skip pointer files that reference ../public/styles/ (would create circular @import)
    if (POINTER_RE.test(srcStr)) {
      console.warn(`[sync-styles] SKIP pointer file: styles/${name} → would overwrite public/styles/${name} with self-reference`);
      continue;
    }

    // Guard 2: skip tiny source if destination already has a larger real file
    if (srcSize < TINY_THRESHOLD && existsSync(dstFile)) {
      const dstStat = statSync(dstFile);
      if (dstStat.size > srcSize * 10) {
        console.warn(`[sync-styles] SKIP tiny src (${srcSize}B) vs large dst (${dstStat.size}B): styles/${name}`);
        continue;
      }
    }

    // Guard 3: skip if source contains @tailwind directives (static serving can't compile them)
    // and destination already has a valid plain CSS file.
    // Note: globals.css is handled by STATIC_ONLY_OVERRIDES above; this catches any other
    // Tailwind source files that might be added to styles/ in the future.
    if (TAILWIND_RE.test(srcStr) && existsSync(dstFile)) {
      const dstContent = normalizeCss(readFileSync(dstFile)).toString("utf8");
      if (!TAILWIND_RE.test(dstContent)) {
        console.warn(`[sync-styles] SKIP @tailwind source: styles/${name} → would replace static CSS with uncompiled source`);
        continue;
      }
    }

    // Write normalized (BOM-free, LF) content
    writeFileSync(dstFile, srcNorm);
  }

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
  // Strip all leading UTF-8 BOMs (EF BB BF) to prevent double-BOM quirks-mode regression.
  // A BOM before <!DOCTYPE html> causes browsers to misidentify the DOCTYPE and enter quirks
  // mode, which breaks Google Translate's DOM rewriting (garbled strings on language switch).
  let indexBuf = readFileSync(publicIndex);
  let bomStart = 0;
  while (
    bomStart + 2 < indexBuf.length &&
    indexBuf[bomStart] === 0xef &&
    indexBuf[bomStart + 1] === 0xbb &&
    indexBuf[bomStart + 2] === 0xbf
  ) {
    bomStart += 3;
  }
  if (bomStart > 0) {
    indexBuf = indexBuf.subarray(bomStart);
    writeFileSync(publicIndex, indexBuf);
    console.log(`[sync-legacy-static-to-public] Stripped ${bomStart} BOM byte(s) from public/index.html`);
  }

  const staticDir = resolve(publicDir, "static");
  mkdirSync(staticDir, { recursive: true });
  writeFileSync(resolve(staticDir, "index.html"), indexBuf);
  console.log("[sync-legacy-static-to-public] Copied index.html -> public/static/index.html (SPA shell; avoids [adminHash] collision).");

  for (const loc of localeLandingDirs) {
    const locDir = resolve(publicDir, loc);
    mkdirSync(locDir, { recursive: true });
    writeFileSync(resolve(locDir, "index.html"), indexBuf);
  }
  console.log(
    `[sync-legacy-static-to-public] Locale landing pages: /${localeLandingDirs.join(", /")}/index.html`,
  );
}

console.log("[sync-legacy-static-to-public] Completed static asset sync.");
