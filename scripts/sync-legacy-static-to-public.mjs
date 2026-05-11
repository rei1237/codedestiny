/**
 * Copies root static assets → public/ (Cloudflare / static hosting).
 * 사주 엔진은 js/saju-engine.js + tarot-sukuyo-quantum + core/saju/reportDashboard + continuation 순서로 index.html에 로드됨.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

const rootDir = process.cwd();
const publicDir = resolve(rootDir, "public");

const staticTargets = [
  "emoi_omikuji_v2.html",
  "AnalysisEngine.js",
  "PhysiognomyUI.js",
  "HwatuFortune.js",
  "secret-house_real.html",
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
  const cleanBuf = stripLeadingBom(buf);
  let str = cleanBuf.toString("utf8");
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

function hasSevereMojibake(html) {
  const replacementCount = (html.match(/\uFFFD/g) || []).length;
  if (replacementCount > 200) return true;
  if (/\?\?\/[a-z]/i.test(html)) return true;
  if (/<\?[a-z][^>]*>/i.test(html)) return true;
  return false;
}

function dedupeUtf8CharsetMeta(html) {
  let seen = false;
  return html
    .replace(/<meta\s+charset=["']UTF-8["']\s*\/?>/gi, (tag) => {
      if (seen) return "";
      seen = true;
      return tag;
    })
    .replace(/\n{3,}/g, "\n\n");
}

function stripStartupSplash(html) {
  return html
    .replace(/\s*<script\s+src="\/js\/splash\.js"\s+defer><\/script>\s*/g, "\n")
    .replace(
      /<div id="codeSplash" class="code-splash">/g,
      '<div id="codeSplash" class="code-splash" style="display:none" aria-hidden="true">',
    );
}

function collectEntryIssues(html) {
  const issues = [];
  const replacementCount = (html.match(/\uFFFD/g) || []).length;
  if (replacementCount > 0) {
    issues.push(`replacement-char-count=${replacementCount}`);
  }
  if (/\?\?\/[a-z]/i.test(html)) issues.push("broken-closing-tag");
  if (/<\?[a-z][^>]*>/i.test(html)) issues.push("broken-open-tag");
  if (/臾대즺|轅轅|\?댁꽭/.test(html)) issues.push("legacy-mojibake-signature");

  const charsetMatches = html.match(/<meta\s+charset=["']UTF-8["']\s*\/?>/gi) || [];
  if (charsetMatches.length === 0) issues.push("missing-early-utf8-meta");
  if (charsetMatches.length > 1) issues.push(`duplicate-charset-meta=${charsetMatches.length}`);

  return issues;
}

function assertEntryHtmlHealthy(html, relPath) {
  const issues = collectEntryIssues(html);
  if (issues.length > 0) {
    throw new Error(`[sync-legacy-static-to-public] Refusing to write corrupted ${relPath}: ${issues.join(", ")}`);
  }
}

function makePublicShellFromRoot(rootHtml) {
  const normalizeBlock = [
    "  <script>",
    "    (function normalizeRootIndexPath() {",
    "      try {",
    "        var path = String(window.location.pathname || '/');",
    "        if (path === '/index.html') {",
    "          window.location.replace('/' + (window.location.search || '') + (window.location.hash || ''));",
    "        }",
    "      } catch (e) {}",
    "    })();",
    "  </script>",
  ].join("\n");

  const staticRedirectBlockRe =
    /\s*<script>\s*\(function forceRootToStatic\(\) \{[\s\S]*?window\.location\.replace\('\/static\/'\);[\s\S]*?\}\)\(\);\s*<\/script>\s*<noscript><meta http-equiv="refresh" content="0; url=\/static\/"><\/noscript>\s*/m;

  if (staticRedirectBlockRe.test(rootHtml)) {
    return rootHtml.replace(staticRedirectBlockRe, `\n${normalizeBlock}\n`);
  }

  let rewritten = rootHtml
    .replace("(function forceRootToStatic()", "(function normalizeRootIndexPath()")
    .replace(
      "if (path === '/' || path === '/index.html') {\n          window.location.replace('/static/');\n        }",
      "if (path === '/index.html') {\n          window.location.replace('/' + (window.location.search || '') + (window.location.hash || ''));\n        }",
    )
    .replace(/\s*<noscript><meta http-equiv="refresh" content="0; url=\/static\/"><\/noscript>\s*/m, "\n");

  return rewritten;
}

function extractFirst(html, re) {
  const m = html.match(re);
  return m ? m[0] : "";
}

const LEGACY_OMIKUJI_HERO_IMG = "/fuctionassets/emoi-shrine-robot.svg";
const SHRINE_OMIKUJI_HERO_IMG = "/fuctionassets/오미쿠지.webp";

function normalizeOmikujiHeroImageRefs(html) {
  if (!html || !html.includes(LEGACY_OMIKUJI_HERO_IMG)) return html;
  return html.split(LEGACY_OMIKUJI_HERO_IMG).join(SHRINE_OMIKUJI_HERO_IMG);
}

function syncCriticalShellBlocks(rootHtml, targetHtml) {
  let html = targetHtml;
  let changed = false;

  const flowerRe = /<section class="fg-group fg-group--flower"[\s\S]*?<\/section><!-- \/fg-group--flower -->/;
  const footerRe = /<footer[^>]*role="contentinfo"[\s\S]*?<\/footer>/;
  const flowerHideRe = /\.fg-group--flower\{display:none !important\}/g;
  const overlayHideRe = /#destinyFlowerStudioOverlay,.df-studio-overlay\{display:none !important\}/g;

  const rootFlower = extractFirst(rootHtml, flowerRe);
  const rootFooter = extractFirst(rootHtml, footerRe);
  const rootMainGlassRef = extractFirst(rootHtml, /\/styles\/main-glass\.css\?v=[^"']+/);
  const rootSibylRef = extractFirst(rootHtml, /\/js\/sibyl-system\.js\?v=[^"']+/);

  if (rootFlower && flowerRe.test(html)) {
    const next = html.replace(flowerRe, rootFlower);
    if (next !== html) {
      html = next;
      changed = true;
    }
  }

  if (rootFooter && footerRe.test(html)) {
    const next = html.replace(footerRe, rootFooter);
    if (next !== html) {
      html = next;
      changed = true;
    }
  }

  if (rootMainGlassRef) {
    const next = html.replace(/\/styles\/main-glass\.css\?v=[^"']+/g, rootMainGlassRef);
    if (next !== html) {
      html = next;
      changed = true;
    }
  }

  if (rootSibylRef) {
    const next = html.replace(/\/js\/sibyl-system\.js\?v=[^"']+/g, rootSibylRef);
    if (next !== html) {
      html = next;
      changed = true;
    }
  }

  const noFlowerHide = html.replace(flowerHideRe, "");
  const noOverlayHide = noFlowerHide.replace(overlayHideRe, "");
  if (noOverlayHide !== html) {
    html = noOverlayHide;
    changed = true;
  }

  return { html, changed };
}

function applyLocaleSeoMeta(indexHtml, localePath) {
  const canonicalUrl = `https://code-destiny.com${localePath}`;
  return indexHtml
    .replace(/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${canonicalUrl}">`)
    .replace(/<meta property="og:url" content="[^"]*">/i, `<meta property="og:url" content="${canonicalUrl}">`);
}

function stripBomInPublicHtmlTree(targetDir) {
  if (!existsSync(targetDir)) return;

  let touched = 0;
  const stack = [targetDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

      const raw = readFileSync(absPath);
      const stripped = stripLeadingBom(raw);
      if (stripped.length !== raw.length) {
        writeFileSync(absPath, stripped);
        touched += 1;
      }
    }
  }

  if (touched > 0) {
    console.log(`[sync-legacy-static-to-public] Stripped UTF-8 BOM from ${touched} public HTML file(s).`);
  }
}

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

// Some legacy source HTML files can carry BOM from manual edits.
// Strip BOM from public HTML artifacts before any downstream locale propagation.
stripBomInPublicHtmlTree(publicDir);

// Sync styles/ with pointer-file and tiny-file protection
syncStylesDir();

// Keep public/index.html as the source of truth for production shell.
// If public shell is severely mojibake-corrupted, auto-heal from root index with safe redirect normalization.
if (existsSync(rootIndexPath)) {
  const rootIndexBuf = stripLeadingBom(readFileSync(rootIndexPath));
  const rootIndexHtml = rootIndexBuf.toString("utf8");
  const rootIndexIssues = collectEntryIssues(rootIndexHtml);

  if (rootIndexIssues.length > 0) {
    console.warn(
      `[sync-legacy-static-to-public] Skip root index as healing source due to issues: ${rootIndexIssues.join(", ")}`,
    );
  }

  if (rootIndexIssues.length === 0 && !existsSync(publicIndexPath)) {
    const healedHtml = makePublicShellFromRoot(rootIndexHtml);
    writeFileSync(publicIndexPath, Buffer.from(healedHtml, "utf8"));
    console.log("[sync-legacy-static-to-public] Seeded missing public/index.html from root/index.html (normalized)");
  } else if (rootIndexIssues.length === 0) {
    const publicIndexBuf = stripLeadingBom(readFileSync(publicIndexPath));
    const publicIndexHtml = publicIndexBuf.toString("utf8");
    const patched = syncCriticalShellBlocks(rootIndexHtml, publicIndexHtml);
    if (patched.changed) {
      writeFileSync(publicIndexPath, Buffer.from(patched.html, "utf8"));
      console.log(
        "[sync-legacy-static-to-public] Patched public/index.html with extracted shell blocks (flower/footer/main-glass) from root/index.html.",
      );
    } else if (hasSevereMojibake(publicIndexHtml)) {
      console.warn(
        "[sync-legacy-static-to-public] Detected severe mojibake in public/index.html but skipped full overwrite; apply targeted fixes manually.",
      );
    }
  }
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

// Retained locale landing paths (ko is root '/', plus en/ja/zh locale slugs).
// Ensures Cloudflare Pages / asset-first hosts return 200 for retained locale roots.
const localeLandingDirs = [
  "en",
  "ja",
  "zh",
];
const legacyLocaleLandingDirs = ["en-us", "ja-jp", "zh-cn"];
const publicIndex = resolve(publicDir, "index.html");
if (existsSync(publicIndex)) {
  // Strip all leading UTF-8 BOMs (EF BB BF) to prevent double-BOM quirks-mode regression.
  // A BOM before <!DOCTYPE html> causes browsers to misidentify the DOCTYPE and enter quirks
  // mode, which breaks Google Translate's DOM rewriting (garbled strings on language switch).
  let indexBuf = readFileSync(publicIndex);
  const stripped = stripLeadingBom(indexBuf);
  const bomStart = indexBuf.length - stripped.length;
  if (bomStart > 0) {
    indexBuf = stripped;
    writeFileSync(publicIndex, indexBuf);
    console.log(`[sync-legacy-static-to-public] Stripped ${bomStart} BOM byte(s) from public/index.html`);
  }

  const legacyReplacementMarker = "'�'(replacement char)";
  let baseIndexHtml = indexBuf.toString("utf8");
  const dedupedIndexHtml = dedupeUtf8CharsetMeta(baseIndexHtml);
  if (dedupedIndexHtml !== baseIndexHtml) {
    baseIndexHtml = dedupedIndexHtml;
    indexBuf = Buffer.from(baseIndexHtml, "utf8");
    writeFileSync(publicIndex, indexBuf);
    console.log("[sync-legacy-static-to-public] Removed duplicate UTF-8 charset meta in public/index.html");
  }

  const normalizedIndexHtml = baseIndexHtml.replaceAll(legacyReplacementMarker, "U+FFFD(replacement char)");
  if (normalizedIndexHtml !== baseIndexHtml) {
    baseIndexHtml = normalizedIndexHtml;
    indexBuf = Buffer.from(baseIndexHtml, "utf8");
    writeFileSync(publicIndex, indexBuf);
    console.log("[sync-legacy-static-to-public] Normalized legacy replacement-char marker in public/index.html");
  }

  const noSplashIndexHtml = stripStartupSplash(baseIndexHtml);
  if (noSplashIndexHtml !== baseIndexHtml) {
    baseIndexHtml = noSplashIndexHtml;
    indexBuf = Buffer.from(baseIndexHtml, "utf8");
    writeFileSync(publicIndex, indexBuf);
    console.log("[sync-legacy-static-to-public] Removed startup splash script/overlay from public/index.html");
  }

  const normalizedOmikujiHeroIndexHtml = normalizeOmikujiHeroImageRefs(baseIndexHtml);
  if (normalizedOmikujiHeroIndexHtml !== baseIndexHtml) {
    baseIndexHtml = normalizedOmikujiHeroIndexHtml;
    indexBuf = Buffer.from(baseIndexHtml, "utf8");
    writeFileSync(publicIndex, indexBuf);
    console.log("[sync-legacy-static-to-public] Canonicalized omikuji hero image to 오미쿠지.webp in public/index.html");
  }

  const baseIssues = collectEntryIssues(baseIndexHtml);
  if (baseIssues.length > 0) {
    if (existsSync(rootIndexPath)) {
      const rootIndexBufForRepair = stripLeadingBom(readFileSync(rootIndexPath));
      const rootIndexHtmlForRepair = rootIndexBufForRepair.toString("utf8");
      const rootIssuesForRepair = collectEntryIssues(rootIndexHtmlForRepair);
      if (rootIssuesForRepair.length === 0) {
        const patched = syncCriticalShellBlocks(rootIndexHtmlForRepair, baseIndexHtml);
        const patchedIssues = collectEntryIssues(patched.html);
        if (patchedIssues.length === 0) {
          baseIndexHtml = patched.html;
          indexBuf = Buffer.from(baseIndexHtml, "utf8");
          writeFileSync(publicIndex, indexBuf);
          console.log(
            "[sync-legacy-static-to-public] Healed public/index.html using extracted critical blocks from root/index.html.",
          );
        } else {
          const rebuilt = makePublicShellFromRoot(rootIndexHtmlForRepair);
          const rebuiltIssues = collectEntryIssues(rebuilt);
          if (rebuiltIssues.length === 0) {
            baseIndexHtml = rebuilt;
            indexBuf = Buffer.from(baseIndexHtml, "utf8");
            writeFileSync(publicIndex, indexBuf);
            console.warn(
              "[sync-legacy-static-to-public] Recovered corrupted public/index.html from root/index.html as final fallback.",
            );
          }
        }
      }
    }
  }

  const finalizedOmikujiHeroIndexHtml = normalizeOmikujiHeroImageRefs(baseIndexHtml);
  if (finalizedOmikujiHeroIndexHtml !== baseIndexHtml) {
    baseIndexHtml = finalizedOmikujiHeroIndexHtml;
    indexBuf = Buffer.from(baseIndexHtml, "utf8");
    writeFileSync(publicIndex, indexBuf);
    console.log("[sync-legacy-static-to-public] Finalized omikuji hero image canonical path in public/index.html");
  }

  assertEntryHtmlHealthy(baseIndexHtml, "public/index.html");

  const staticDir = resolve(publicDir, "static");
  mkdirSync(staticDir, { recursive: true });
  writeFileSync(resolve(staticDir, "index.html"), indexBuf);
  console.log("[sync-legacy-static-to-public] Copied index.html -> public/static/index.html (SPA shell; avoids [adminHash] collision).");

  for (const loc of localeLandingDirs) {
    const locDir = resolve(publicDir, loc);
    mkdirSync(locDir, { recursive: true });
    const localeIndexHtml = dedupeUtf8CharsetMeta(applyLocaleSeoMeta(baseIndexHtml, `/${loc}`));
    assertEntryHtmlHealthy(localeIndexHtml, `public/${loc}/index.html`);
    writeFileSync(resolve(locDir, "index.html"), Buffer.from(localeIndexHtml, "utf8"));
  }

  for (const legacyLoc of legacyLocaleLandingDirs) {
    const legacyDir = resolve(publicDir, legacyLoc);
    if (existsSync(legacyDir)) {
      rmSync(legacyDir, { recursive: true, force: true });
    }
  }

  console.log(
    `[sync-legacy-static-to-public] Locale landing pages: /${localeLandingDirs.join(", /")}/index.html`,
  );
}

console.log("[sync-legacy-static-to-public] Completed static asset sync.");
