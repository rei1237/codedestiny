/**
 * Copies root static assets → public/ (Cloudflare / static hosting).
 * 사주 엔진은 js/saju-engine.js + tarot-sukuyo-quantum + core/saju/reportDashboard + continuation 순서로 index.html에 로드됨.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve, join } from "node:path";
import {
  ROOT_ASSET_REF_FILES,
  computeRootAssetCacheKeys,
  rewriteRootAssetCacheRefs,
} from "./lib/root-asset-cache-keys.mjs";

const rootDir = process.cwd();
const publicDir = resolve(rootDir, "public");

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function writeFileSyncWithRetry(filePath, data, options) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      writeFileSync(filePath, data, options);
      return;
    } catch (error) {
      if (!["UNKNOWN", "EBUSY", "EPERM"].includes(error?.code) || attempt === 19) {
        throw error;
      }
      sleepSync(50);
    }
  }
}

function syncSwissEphVendor() {
  const srcBase = resolve(rootDir, "node_modules", "sweph-wasm", "dist");
  if (!existsSync(srcBase)) return;

  const targetBase = resolve(rootDir, "js", "vendor", "sweph-wasm");
  const files = [
    ["index.js", "index.js"],
    ["wasm/swisseph.js", "wasm/swisseph.js"],
    ["wasm/swisseph.wasm", "wasm/swisseph.wasm"],
    ["ephe/seas_18.se1", "ephe/seas_18.se1"],
    ["ephe/sepl_18.se1", "ephe/sepl_18.se1"],
    ["ephe/semo_18.se1", "ephe/semo_18.se1"],
  ];

  for (const [srcRel, dstRel] of files) {
    const src = join(srcBase, srcRel);
    const dst = join(targetBase, dstRel);
    if (!existsSync(src)) continue;
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst, { force: true });
  }
}

const staticTargets = [
  "_headers",
  "destiny-island.html",
  "pet-saju.html",
  "vedic-astrology.html",
  "tarot-ijik.html",
  "neville-meditation.html",
  "cosmic-soul-meditation.html",
  "celestial-harmony.html",
  "yoga-guru.html",
  "geomancy-oracle-v4.html",
  "destiny-poker.html",
  "fortune-teller-fish.html",
  "royal-tea-oracle.html",
  "emoi_omikuji_v2.html",
  "blood-type-app.html",
  "tadagochi.html",
  "myungwun_final.html",
  "AnalysisEngine.js",
  "PhysiognomyUI.js",
  "PastLifeFaceUI.js",
  "HwatuFortune.js",
  "secret-house_real.html",
  "ads.txt",
  "manifest.json",
  "manifest-neo.json",
  "service-worker.js",
  "css",
  "js",
  "icons",
  // "styles" is handled separately via syncStylesDir() to prevent pointer files from overwriting real CSS
  "fortune",
  "fuctionassets",
  "sudda",
];

const staleTadagochiPwaTargets = [
  "manifest-tadagochi.json",
  "tadagochi-sw.js",
];

const staleLifeBookPdfTargets = [
  "js/life-book.js",
  "js/ziwei-book.js",
  "js/soul-origin-book.js",
  "js/astro-book.js",
];

syncSwissEphVendor();

function removeStaleTadagochiPwaAssets() {
  const removed = [];
  for (const target of staleTadagochiPwaTargets) {
    const targetPath = resolve(publicDir, target);
    if (!existsSync(targetPath)) continue;
    rmSync(targetPath, { force: true });
    removed.push(target);
  }
  if (removed.length) {
    console.log(`[sync-legacy-static-to-public] Removed stale Fortune Tama PWA assets: ${removed.join(", ")}`);
  }
}

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

const CACHE_BUST_QUERY_RE = /\?v=[a-zA-Z0-9_-]+/g;
// 이 키가 셸의 `/js/mobile-interaction-patch.js?v=` 를 덮어쓴다. 일반 셸 키와 **독립**이어야
// 하는 이유는 그대로다 — 모바일 브리지만 고친 핫픽스가 이전에 캐시된 쿼리 URL 로 서빙되면 안 된다.
//
// 🔴 예전에는 손으로 적은 상수였고 **두 번 낡았다.** 2026-07-02 값이 07-22 수정본까지 그대로
//    붙잡고 있었고, 2026-08-16 에도 상수(build-9edeaf4719a9)와 실제 파일이 어긋나 있었다.
//    파일은 바뀌는데 URL 이 그대로라 재방문 사용자가 옛 캐시를 계속 썼다. 손으로 유지하는 값은
//    또 낡으므로(원칙 10) 파일에서 직접 계산한다.
//
// 🔴 **정규화한 내용**을 해싱한다. 원문 그대로 해싱하면 안 된다 — 이 파일 안에는
//    `cacheBustMobileInteractionPatchScriptRefs` 가 매 빌드 다시 쓰는 `?v=<일반 빌드 키>` 참조가
//    들어 있어서, 원문 해시는 **이 파일과 무관한 변경에도 매번 바뀐다.** 그러면 "일반 셸 키와
//    독립"이라는 목적이 무너지고 무관한 배포마다 모바일 브리지 캐시가 통째로 날아간다.
//    실측(2026-08-16): 원문 해시는 origin/main `build-8bc8b48b61e6` vs 워킹트리 `build-fa1097ce6100`
//    로 갈렸지만, 정규화 해시는 양쪽 다 `build-1e92fb001e76` 로 같았다.
let mobileInteractionPatchCacheKey = "";
function resolveMobileInteractionPatchCacheKey() {
  if (mobileInteractionPatchCacheKey) return mobileInteractionPatchCacheKey;
  const abs = resolve(rootDir, "js/mobile-interaction-patch.js");
  if (!existsSync(abs)) {
    // 파일이 없으면 셸이 그 스크립트를 안 쓰는 상태다. 조용히 임의 값을 만들지 않는다.
    throw new Error("[sync:public] js/mobile-interaction-patch.js 가 없다 — 캐시 키를 계산할 수 없다.");
  }
  const raw = stripLeadingBom(readFileSync(abs)).toString("utf8");
  const digest = createHash("sha256").update(normalizeForCacheKey(raw)).digest("hex").slice(0, 12);
  mobileInteractionPatchCacheKey = `build-${digest}`;
  return mobileInteractionPatchCacheKey;
}
const CACHE_KEY_SOURCE_FILES = [
  "index.html",
];
const CACHE_KEY_SOURCE_DIRS = [
  { dir: "js", exts: new Set([".js", ".mjs", ".cjs", ".json"]) },
  { dir: "styles", exts: new Set([".css"]) },
];

function normalizeForCacheKey(content) {
  return String(content || "")
    .replace(CACHE_BUST_QUERY_RE, "?v=__CACHE_KEY__")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function normalizeCacheKeySeed(seed) {
  const sanitized = String(seed || "").trim().replace(/[^a-zA-Z0-9_-]/g, "-");
  return sanitized ? `build-${sanitized}` : "";
}

function resolveDeterministicCacheKey() {
  const explicitKey = normalizeCacheKeySeed(process.env.CACHE_BUST_KEY || process.env.BUILD_CACHE_KEY);
  if (explicitKey) return explicitKey;

  const gitSha = String(process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || "").trim();
  if (gitSha) {
    return `build-${gitSha.slice(0, 12)}`;
  }

  const hash = createHash("sha1");
  let hasSource = false;
  for (const rel of collectCacheKeySourceFiles()) {
    const abs = resolve(rootDir, rel);
    if (!existsSync(abs)) continue;
    hasSource = true;
    const raw = stripLeadingBom(readFileSync(abs)).toString("utf8");
    const normalized = normalizeForCacheKey(raw);
    hash.update(rel);
    hash.update("\n");
    hash.update(normalized);
    hash.update("\n---\n");
  }

  if (!hasSource) return "build-static";
  return `build-${hash.digest("hex").slice(0, 12)}`;
}

function collectCacheKeySourceFiles() {
  const files = new Set(CACHE_KEY_SOURCE_FILES);

  for (const item of CACHE_KEY_SOURCE_DIRS) {
    const baseDir = resolve(rootDir, item.dir);
    if (!existsSync(baseDir)) continue;
    collectCacheKeySourceFilesInDir(baseDir, item.dir, item.exts, files);
  }

  return Array.from(files).sort();
}

function collectCacheKeySourceFilesInDir(absDir, relDir, exts, files) {
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const absPath = join(absDir, entry.name);
    const relPath = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) {
      collectCacheKeySourceFilesInDir(absPath, relPath, exts, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const dot = entry.name.lastIndexOf(".");
    const ext = dot >= 0 ? entry.name.slice(dot) : "";
    if (exts.has(ext)) files.add(relPath);
  }
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

function stripLegacyPublicBlocks(html) {
  if (!html) return html;
  return html
    .replace(/\s*<!-- psychotest-visual-entry -->[\s\S]*?<!-- \/psychotest-visual-entry -->\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function cacheBustUiBindingsScriptRefs(source, buildTimestamp) {
  const html = String(source || "");
  return html.replace(
    /(\/js\/[^"'\s`)]+\.js\?v=)([a-zA-Z0-9_-]+)/g,
    (match, prefix) => `${prefix}${buildTimestamp}`,
  );
}

/**
 * ES 모듈 import 지정자의 ?v= 를 회전시킨다.
 *
 * 🔴 2026-08-24 릴리스 사고의 근본원인. js/app.js 가 `./core/bootstrapDestinyFlower.js` 를
 * `?v=20260625-df-i18n` 이라는 **손으로 박은 날짜 키**로 부르고 있었다. 그 파일 내용이
 * 바뀌어도(매칭 엔진을 워커로 옮기면서 import 한 줄이 사라졌다) URL 이 그대로라, _headers 의
 * `/js/*.js  max-age=604800` 을 타고 엣지가 **삭제된 모듈을 참조하는 옛 파일**을 계속 서빙했다.
 * 승격 후 스모크가 그 404 를 잡아 릴리스가 통째로 자동 롤백됐다(run 32683154849).
 *
 * 위쪽 셋(index-inline-runtime·uiBindings·mobile-interaction-patch)의 정규식은 `/js/…` 나
 * `js/…` 로 **시작하는** 참조만 본다. 모듈 지정자는 `./core/…`·`../services/…` 라 구조적으로
 * 안 걸렸다 — bare 루트 자산이 안 걸렸던 것(syncRootAssetCacheKeys 주석, 2026-08-08 장애)과
 * 정확히 같은 모양의 구멍이다.
 *
 * 🔴 이 목록 밖에서 수기 `?v=` 를 모듈 지정자에 새로 박지 말 것. verify:js-module-graph 가
 *    회전 형식(build-…/h…)이 아닌 키를 실패로 잡는다.
 */
function cacheBustModuleImportSpecifiers(source, buildTimestamp) {
  return String(source || "").replace(/(\.js\?v=)[a-zA-Z0-9_-]+/g, `$1${buildTimestamp}`);
}

/** 모듈 지정자 캐시 키를 회전시킬 파일. 루트와 public 사본에 같은 목록을 쓴다. */
const MODULE_IMPORT_CACHE_KEY_FILES = [
  ["js", "app.js"],
  ["js", "core", "init.js"],
  ["js", "core", "bootstrapDestinyFlower.js"],
];

function preserveIndependentCacheKeys(source) {
  return String(source || "").replace(
    /(\/js\/mobile-interaction-patch\.js\?v=)[a-zA-Z0-9_-]+/g,
    `$1${resolveMobileInteractionPatchCacheKey()}`,
  );
}

function cacheBustMobileInteractionPatchScriptRefs(source, buildTimestamp) {
  const js = String(source || "");
  return js.replace(
    /(js\/[^"'\s`)]+\.js\?v=)[a-zA-Z0-9_-]+/g,
    `$1${buildTimestamp}`,
  );
}

// 로케일 랜딩 셸(/ja, /zh, /en)의 head 를 해당 언어로 현지화한다.
// 본문은 런타임에 cd-lang-native.js 가 /i18n/{lang}.json 사전으로 번역하고
// (경로 프리픽스 자동 감지), head 메타는 여기서 빌드 타임에 교체한다.
// SEO_INDEXABLE_LOCALES(lib/i18n/locales.ts)와 함께 다국어 색인이 열려 있으므로 noindex 를 걸지 않는다.
const LOCALE_SHELL_SEO = {
  "/ja": {
    lang: "ja",
    ogLocale: "ja_JP",
    language: "Japanese",
    title: "無料占い | 四柱推命・タロット・相性・今日の運勢 — CODE DESTINY",
    description:
      "生年月日を入力するだけで四柱推命、タロット、紫微斗数、宿曜占星術、相性占いまで無料。AIがあなたの毎日の運勢と恋愛の流れを丁寧に読み解きます。",
    keywords:
      "四柱推命 無料, 占い 無料, タロット占い 無料, 今日の運勢, 相性占い, 紫微斗数, 宿曜占星術, 誕生日占い, 恋愛占い, 韓国 占い, 無料鑑定",
    appTitle: "CODE DESTINY ハニーピッグ占い",
    imageAlt:
      "ハニーピッグ占い HONEY FORTUNE — 花豚ヨニのカメオとサービス紹介を収めた CODE DESTINY の名刺カード",
    dictionaryFile: "ja.json",
  },
  "/zh": {
    lang: "zh-CN",
    ogLocale: "zh_CN",
    language: "Chinese",
    title: "免费算命 | 八字·塔罗·紫微斗数·今日运势 — CODE DESTINY",
    description:
      "输入出生日期即可免费查看八字命理、塔罗牌、紫微斗数、宿曜占星与合婚配对。AI 为你细致解读每日运势与感情走向。",
    keywords:
      "免费算命, 八字算命, 生辰八字, 塔罗牌占卜, 今日运势, 合婚配对, 紫微斗数, 宿曜占星, 星座运势, 姻缘测算",
    appTitle: "CODE DESTINY 蜜豚运势",
    imageAlt:
      "蜜豚运势 HONEY FORTUNE — 印有花猪 Yeoni 客串形象与服务介绍的 CODE DESTINY 名片卡",
    dictionaryFile: "zh-cn.json",
  },
  // zh-TW 는 zh(간체)와 분리된 별도 로케일이다(lib/i18n/locales.ts). 문구를 zh 에서
  // 물려주면 대만 사용자에게 간체가 그대로 나가므로 번체 문구를 따로 둔다.
  "/zh-tw": {
    lang: "zh-TW",
    ogLocale: "zh_TW",
    language: "Chinese",
    title: "免費算命 | 八字·塔羅·紫微斗數·今日運勢 — CODE DESTINY",
    description:
      "輸入出生日期即可免費查看八字命理、塔羅牌、紫微斗數、宿曜占星與合婚配對。AI 為你細緻解讀每日運勢與感情走向。",
    keywords:
      "免費算命, 八字算命, 生辰八字, 塔羅牌占卜, 今日運勢, 合婚配對, 紫微斗數, 宿曜占星, 星座運勢, 姻緣測算",
    appTitle: "CODE DESTINY 蜜豚運勢",
    imageAlt:
      "蜜豚運勢 HONEY FORTUNE — 印有花豬 Yeoni 客串形象與服務介紹的 CODE DESTINY 名片卡",
    dictionaryFile: "zh-tw.json",
  },
  "/en": {
    lang: "en",
    ogLocale: "en_US",
    language: "English",
    title: "Free Fortune Telling | Saju, Tarot & Daily Horoscope — CODE DESTINY",
    description:
      "Enter your birth date for free Korean Saju (Four Pillars) readings, tarot, Zi Wei Dou Shu, Sukuyo compatibility and daily horoscopes — warm, in-depth AI interpretations.",
    keywords:
      "free fortune telling, saju reading, four pillars of destiny, free tarot reading, daily horoscope, zi wei dou shu, compatibility test, korean astrology, birth chart",
    appTitle: "CODE DESTINY Honey Pig Fortune",
    imageAlt:
      "Honey Pig Fortune HONEY FORTUNE — a CODE DESTINY calling card with a cameo of Yeoni the flower pig and an overview of the service",
    dictionaryFile: "en.json",
  },
};

/**
 * <title> 만은 seo.title 이 아니라 사전(shell.CODEDESTINY) 값을 쓴다.
 *
 * 셸의 title 태그에는 data-cd-trans 마커가 붙어 있어 런타임에 cd-lang-native.js 가
 * 사전 값으로 덮어쓴다. 여기서 seo.title 을 넣으면 JS 를 실행하지 않는 크롤러와
 * 렌더링하는 크롤러가 서로 다른 제목을 보게 된다. 마커를 떼는 방법은 못 쓴다 —
 * verify-i18n-runtime-readiness 가 미러의 마커 수를 루트와 정확히 일치시킨다.
 */
function resolveLocaleShellTitle(seo) {
  if (!seo?.dictionaryFile) return seo?.title || null;
  try {
    const dictPath = resolve(publicDir, "i18n", seo.dictionaryFile);
    if (!existsSync(dictPath)) return seo.title;
    const dict = JSON.parse(stripLeadingBom(readFileSync(dictPath)).toString("utf8"));
    const localized = dict?.shell?.CODEDESTINY;
    return typeof localized === "string" && localized.trim() ? localized.trim() : seo.title;
  } catch {
    return seo.title;
  }
}

/**
 * 로케일 셸의 PWA 매니페스트. 홈 화면에 추가하면 앱 이름·설명이 그대로 노출되므로
 * 한국어 매니페스트를 그대로 물려주면 안 된다. LOCALE_SHELL_SEO 와 같은 문구 계열을 쓴다.
 */
const LOCALE_MANIFEST = {
  "/ja": {
    name: "CODE DESTINY — 無料占い",
    short_name: "CODE DESTINY",
    description: "今日の運勢と四柱推命、相性とタロットの流れが静かに開きます。",
    lang: "ja",
    shortcut: {
      name: "今日の運勢",
      short_name: "運勢",
      description: "今日一日の流れをすぐに照らします。",
    },
  },
  "/zh": {
    name: "CODE DESTINY — 免费算命",
    short_name: "CODE DESTINY",
    description: "今日运势与八字命理、合婚配对和塔罗的流向静静展开。",
    lang: "zh-CN",
    shortcut: {
      name: "今日运势",
      short_name: "运势",
      description: "立即照见今天一整天的流向。",
    },
  },
  // 기존 public/manifest.zh-tw.json 의 문구를 그대로 유지한다(재생성해도 값이 바뀌지 않게).
  "/zh-tw": {
    name: "CODE DESTINY — 免費算命",
    short_name: "CODE DESTINY",
    description: "今日運勢與四柱八字、合婚配對和塔羅的流向靜靜展開。",
    lang: "zh-TW",
    shortcut: {
      name: "今日運勢",
      short_name: "運勢",
      description: "立即照見今天一整天的流向。",
    },
  },
  "/en": {
    name: "CODE DESTINY — Free Fortune Readings",
    short_name: "CODE DESTINY",
    description: "Today's fortune, Four Pillars, compatibility, and tarot — read with a calm, steady hand.",
    lang: "en",
    shortcut: {
      name: "Today's Fortune",
      short_name: "Fortune",
      description: "See today's flow at a glance.",
    },
  },
};

/** 로케일별 매니페스트 파일을 public/ 에 쓰고 파일명을 돌려준다. */
function writeLocaleManifest(localePath) {
  const override = LOCALE_MANIFEST[localePath];
  if (!override) return null;
  const basePath = resolve(publicDir, "manifest.json");
  if (!existsSync(basePath)) return null;
  const base = JSON.parse(stripLeadingBom(readFileSync(basePath)).toString("utf8"));
  const localeCode = localePath.replace("/", "");
  const fileName = `manifest.${localeCode}.json`;
  // 🔴 shortcuts 는 통째로 갈아끼우지 않는다 — 아이콘·url 구조는 한국어 기준 매니페스트에서
  // 물려받고 사용자에게 보이는 문구만 로케일 것으로 바꾼다. 예전에는 이 병합이 문구를
  // 건드리지 않아 ja/zh/en 홈화면 바로가기에 한국어가 그대로 나갔다.
  const { shortcut, ...manifestOverride } = override;
  const merged = { ...base, ...manifestOverride, start_url: `${localePath}/`, scope: "/" };
  if (shortcut && Array.isArray(base.shortcuts) && base.shortcuts.length) {
    merged.shortcuts = base.shortcuts.map((entry, index) => (index === 0 ? { ...entry, ...shortcut } : entry));
  }
  writeFileSyncWithRetry(resolve(publicDir, fileName), Buffer.from(`${JSON.stringify(merged, null, 2)}\n`, "utf8"));
  return fileName;
}

function applyLocaleSeoMeta(indexHtml, localePath) {
  const seo = LOCALE_SHELL_SEO[localePath];
  if (!seo) return indexHtml;

  const canonicalUrl = `https://code-destiny.com${localePath}/`;
  const manifestFile = writeLocaleManifest(localePath);
  const localeShellTitle = resolveLocaleShellTitle(seo);
  return indexHtml
    .replace(
      /<link rel="manifest" href="\/manifest\.json([^"]*)">/i,
      manifestFile ? `<link rel="manifest" href="/${manifestFile}$1">` : "$&",
    )
    .replace(/<html lang="ko"/i, `<html lang="${seo.lang}"`)
    // 셸의 title 은 <title data-cd-trans="shell.CODEDESTINY"> 처럼 속성을 갖는다.
    // 속성 없는 <title> 만 매칭하던 과거 정규식은 조용히 no-op 이라 로케일 셸이
    // 한국어 제목을 그대로 물려받았다. 여는 태그(=마커)는 보존하고 본문만 바꾼다.
    .replace(/(<title\b[^>]*>)[^<]*(<\/title>)/i, `$1${localeShellTitle}$2`)
    .replace(/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${canonicalUrl}">`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${seo.description}"/>`)
    .replace(/<meta name="keywords" content="[^"]*"/i, `<meta name="keywords" content="${seo.keywords}"`)
    .replace(/<meta property="og:url" content="[^"]*">/i, `<meta property="og:url" content="${canonicalUrl}">`)
    .replace(/<meta property="og:locale" content="[^"]*">/i, `<meta property="og:locale" content="${seo.ogLocale}">`)
    .replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${seo.title}">`)
    .replace(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${seo.description}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/i, `<meta name="twitter:title" content="${seo.title}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/i, `<meta name="twitter:description" content="${seo.description}">`)
    .replace(/<meta name="language" content="[^"]*">/i, `<meta name="language" content="${seo.language}">`)
    .replace(/<meta http-equiv="content-language" content="[^"]*">/i, `<meta http-equiv="content-language" content="${seo.lang}">`)
    // 아래 3종은 오래도록 체인에 없어서 로케일 셸이 한국어 값을 그대로 물려받았다.
    // 홈 화면 추가 이름과 소셜 카드 대체 텍스트라 화면에는 안 보이지만 크롤러와
    // 스크린리더에는 그대로 노출된다.
    .replace(
      /<meta name="apple-mobile-web-app-title" content="[^"]*">/i,
      `<meta name="apple-mobile-web-app-title" content="${seo.appTitle}">`,
    )
    .replace(/<meta property="og:image:alt" content="[^"]*">/i, `<meta property="og:image:alt" content="${seo.imageAlt}">`)
    .replace(/<meta name="twitter:image:alt" content="[^"]*">/i, `<meta name="twitter:image:alt" content="${seo.imageAlt}">`);
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

const STATIC_R2_FONT_HTML_BLOCK = `<link rel="preconnect" href="https://assets.code-destiny.com" crossorigin>
<style data-cd-r2-static-fonts>
@font-face{font-family:'CodeDestinyStaticDisplay';src:url('https://assets.code-destiny.com/Mulmaru.woff2') format('woff2');font-weight:500;font-style:normal;font-display:swap}
@font-face{font-family:'CodeDestinyStaticDecorative';src:url('https://assets.code-destiny.com/Galmuri11-Bold.woff2') format('woff2');font-weight:700;font-style:normal;font-display:optional}
:root{--font-body:'Apple SD Gothic Neo','Malgun Gothic',system-ui,-apple-system,'Segoe UI',sans-serif;--font-display:'CodeDestinyStaticDisplay',var(--font-body);--font-decorative:'CodeDestinyStaticDecorative',var(--font-display)}
body{font-family:var(--font-body)!important;line-height:1.68;letter-spacing:0;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
h1,h2,h3,.title,.cover-title,.hero-title,.card-title,.section-title{font-family:var(--font-display)!important;letter-spacing:0;word-break:keep-all}
button,input,select,textarea{font-family:var(--font-body)!important}
</style>`;

const STATIC_R2_FONT_CSS_BLOCK = `@font-face{font-family:'CodeDestinyStaticDisplay';src:url('https://assets.code-destiny.com/Mulmaru.woff2') format('woff2');font-weight:500;font-style:normal;font-display:swap}
@font-face{font-family:'CodeDestinyStaticDecorative';src:url('https://assets.code-destiny.com/Galmuri11-Bold.woff2') format('woff2');font-weight:700;font-style:normal;font-display:optional}
:root{--font-body:'Apple SD Gothic Neo','Malgun Gothic',system-ui,-apple-system,'Segoe UI',sans-serif;--font-display:'CodeDestinyStaticDisplay',var(--font-body);--font-decorative:'CodeDestinyStaticDecorative',var(--font-display)}
body{font-family:var(--font-body);line-height:1.68;letter-spacing:0;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
h1,h2,h3,.title,.post-title,.blog-title,.blog-card-title,.section-title{font-family:var(--font-display);letter-spacing:0;word-break:keep-all}
button,input,select,textarea{font-family:var(--font-body)}
`;

function removeGoogleFontReferences(content) {
  return String(content || "")
    .replace(/^\s*<link\b[^>]*href=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*\r?\n?/gim, "")
    .replace(/^\s*<link\b[^>]*https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*\r?\n?/gim, "")
    .replace(/^\s*@import\s+url\(["']?https:\/\/fonts\.googleapis\.com[^)]*\)\s*;\s*\r?\n?/gim, "");
}

function sanitizePublicGoogleFontReferences(targetDir) {
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
      if (!entry.isFile() || (!entry.name.endsWith(".html") && !entry.name.endsWith(".css"))) continue;

      const original = stripLeadingBom(readFileSync(absPath)).toString("utf8");
      const withoutGoogleFonts = removeGoogleFontReferences(original);
      if (withoutGoogleFonts === original) continue;

      let nextContent = withoutGoogleFonts;
      if (entry.name.endsWith(".html") && !nextContent.includes("data-cd-r2-static-fonts")) {
        nextContent = nextContent.replace(/<\/head>/i, `${STATIC_R2_FONT_HTML_BLOCK}\n</head>`);
      }
      if (entry.name.endsWith(".css") && !nextContent.includes("CodeDestinyStaticDisplay")) {
        nextContent = `${STATIC_R2_FONT_CSS_BLOCK}\n${nextContent}`;
      }

      writeFileSync(absPath, Buffer.from(nextContent, "utf8"));
      touched += 1;
    }
  }

  if (touched > 0) {
    console.log(`[sync-legacy-static-to-public] Removed Google Fonts from ${touched} public artifact(s).`);
  }
}

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

function cpSyncWithRetry(sourcePath, destinationPath, options) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      cpSync(sourcePath, destinationPath, options);
      return;
    } catch (error) {
      if (attempt === 19) throw error;
      sleepSync(100);
    }
  }
}

for (const target of staticTargets) {
  const sourcePath = resolve(rootDir, target);
  const destinationPath = resolve(publicDir, target);

  if (!existsSync(sourcePath)) {
    continue;
  }

  cpSyncWithRetry(sourcePath, destinationPath, { recursive: true, force: true });
}

removeStaleTadagochiPwaAssets();

for (const target of staleLifeBookPdfTargets) {
  const targetPath = resolve(publicDir, target);
  if (!existsSync(targetPath)) continue;
  rmSync(targetPath, { force: true });
  console.log(`[sync-legacy-static-to-public] Removed stale retired asset: ${target}`);
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
  } else {
    // Deployment reflection guard:
    // Always derive public/index.html from root/index.html when root is healthy.
    // This prevents stale legacy blocks in public shell (for example psychotest legacy cards)
    // and guarantees static/locale mirrors follow root source edits.
    const normalizedPublicHtml = makePublicShellFromRoot(rootIndexHtml);
    const currentPublicHtml = existsSync(publicIndexPath)
      ? stripLeadingBom(readFileSync(publicIndexPath)).toString("utf8")
      : "";

    if (currentPublicHtml !== normalizedPublicHtml) {
      writeFileSync(publicIndexPath, Buffer.from(normalizedPublicHtml, "utf8"));
      console.log("[sync-legacy-static-to-public] Synced public/index.html from root/index.html (normalized shell)");
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

// Retained locale landing paths (ko is root '/', plus en/ja/zh/zh-tw locale slugs).
// Ensures Cloudflare Pages / asset-first hosts return 200 for retained locale roots.
//
// 🔴 lib/i18n/locales.ts 의 PUBLIC_LOCALES 와 같은 집합을 유지할 것.
// zh-tw 가 빠져 있던 동안 public/zh-tw/index.html 은 루트 셸에서 재생성되지 않아
// 조용히 낡아 갔다(셸 변경이 그 로케일에만 전파되지 않는다).
const localeLandingDirs = [
  "en",
  "ja",
  "zh",
  "zh-tw",
];
const legacyLocaleLandingDirs = ["en-us", "ja-jp", "zh-cn"];
const publicIndex = resolve(publicDir, "index.html");
if (existsSync(publicIndex) || existsSync(rootIndexPath)) {
  if (!existsSync(rootIndexPath)) {
    throw new Error("[sync-legacy-static-to-public] Missing root index.html; cannot build canonical public shell.");
  }

  const rootIndexBuf = stripLeadingBom(readFileSync(rootIndexPath));
  const rootIndexHtml = rootIndexBuf.toString("utf8");
  const rootIssues = collectEntryIssues(rootIndexHtml);
  if (rootIssues.length > 0) {
    throw new Error(
      `[sync-legacy-static-to-public] Refusing to sync from unhealthy root/index.html: ${rootIssues.join(", ")}`,
    );
  }

  let baseIndexHtml = stripLegacyPublicBlocks(makePublicShellFromRoot(rootIndexHtml));

  // Strip all leading UTF-8 BOMs (EF BB BF) to prevent double-BOM quirks-mode regression.
  // A BOM before <!DOCTYPE html> causes browsers to misidentify the DOCTYPE and enter quirks
  // mode, which breaks Google Translate's DOM rewriting (garbled strings on language switch).
  const currentPublicBuf = existsSync(publicIndex) ? readFileSync(publicIndex) : Buffer.alloc(0);
  const stripped = stripLeadingBom(currentPublicBuf);
  const bomStart = currentPublicBuf.length - stripped.length;
  if (bomStart > 0) {
    console.log(`[sync-legacy-static-to-public] Detected ${bomStart} BOM byte(s) in existing public/index.html`);
  }

  const legacyReplacementMarker = `'${String.fromCharCode(0xfffd)}'(replacement char)`;
  const dedupedIndexHtml = dedupeUtf8CharsetMeta(baseIndexHtml);
  if (dedupedIndexHtml !== baseIndexHtml) {
    baseIndexHtml = dedupedIndexHtml;
    console.log("[sync-legacy-static-to-public] Removed duplicate UTF-8 charset meta in canonical shell");
  }

  const normalizedIndexHtml = baseIndexHtml.replaceAll(legacyReplacementMarker, "U+FFFD(replacement char)");
  if (normalizedIndexHtml !== baseIndexHtml) {
    baseIndexHtml = normalizedIndexHtml;
    console.log("[sync-legacy-static-to-public] Normalized legacy replacement-char marker in canonical shell");
  }

  const normalizedOmikujiHeroIndexHtml = normalizeOmikujiHeroImageRefs(baseIndexHtml);
  if (normalizedOmikujiHeroIndexHtml !== baseIndexHtml) {
    baseIndexHtml = normalizedOmikujiHeroIndexHtml;
    console.log("[sync-legacy-static-to-public] Canonicalized omikuji hero image to 오미쿠지.webp in canonical shell");
  }

  const finalizedOmikujiHeroIndexHtml = stripLegacyPublicBlocks(normalizeOmikujiHeroImageRefs(baseIndexHtml));
  if (finalizedOmikujiHeroIndexHtml !== baseIndexHtml) {
    baseIndexHtml = finalizedOmikujiHeroIndexHtml;
    console.log("[sync-legacy-static-to-public] Stripped legacy public-only blocks from canonical shell");
  }

  // Auto cache-bust all static asset query strings (?v=...)
  const buildTimestamp = resolveDeterministicCacheKey();
  const cacheBustedIndexHtml = preserveIndependentCacheKeys(
    baseIndexHtml.replace(/\?v=[a-zA-Z0-9_-]+/g, "?v=" + buildTimestamp),
  );
  if (cacheBustedIndexHtml !== baseIndexHtml) {
    baseIndexHtml = cacheBustedIndexHtml;
    console.log(`[sync-legacy-static-to-public] Auto cache-busted static assets with ${buildTimestamp}`);
  }

  const inlineRuntimePath = resolve(publicDir, "js", "core", "index-inline-runtime.js");
  if (existsSync(inlineRuntimePath)) {
    let runtimeJs = readFileSync(inlineRuntimePath, "utf8");
    const bustedRuntimeJs = preserveIndependentCacheKeys(
      runtimeJs.replace(/\?v=[a-zA-Z0-9_-]+/g, "?v=" + buildTimestamp),
    );
    if (bustedRuntimeJs !== runtimeJs) {
      writeFileSync(inlineRuntimePath, bustedRuntimeJs);
      console.log(`[sync-legacy-static-to-public] Auto cache-busted index-inline-runtime.js with ${buildTimestamp}`);
    }
  }

  const uiBindingsPath = resolve(publicDir, "js", "core", "uiBindings.js");
  if (existsSync(uiBindingsPath)) {
    const uiBindingsJs = readFileSync(uiBindingsPath, "utf8");
    const bustedUiBindingsJs = cacheBustUiBindingsScriptRefs(uiBindingsJs, buildTimestamp);
    if (bustedUiBindingsJs !== uiBindingsJs) {
      writeFileSync(uiBindingsPath, bustedUiBindingsJs);
      console.log(`[sync-legacy-static-to-public] Auto cache-busted uiBindings.js PDF/runtime loaders with ${buildTimestamp}`);
    }
  }

  const mobilePatchPath = resolve(publicDir, "js", "mobile-interaction-patch.js");
  if (existsSync(mobilePatchPath)) {
    const mobilePatchJs = readFileSync(mobilePatchPath, "utf8");
    const bustedMobilePatchJs = cacheBustMobileInteractionPatchScriptRefs(mobilePatchJs, buildTimestamp);
    if (bustedMobilePatchJs !== mobilePatchJs) {
      writeFileSync(mobilePatchPath, bustedMobilePatchJs);
      console.log(`[sync-legacy-static-to-public] Auto cache-busted mobile-interaction-patch.js tarot loader with ${buildTimestamp}`);
    }
  }

  for (const parts of MODULE_IMPORT_CACHE_KEY_FILES) {
    const modulePath = resolve(publicDir, ...parts);
    if (!existsSync(modulePath)) continue;
    const moduleJs = readFileSync(modulePath, "utf8");
    const bustedModuleJs = cacheBustModuleImportSpecifiers(moduleJs, buildTimestamp);
    if (bustedModuleJs !== moduleJs) {
      writeFileSync(modulePath, bustedModuleJs);
      console.log(`[sync-legacy-static-to-public] Auto cache-busted ${parts.join("/")} module imports with ${buildTimestamp}`);
    }
  }

  assertEntryHtmlHealthy(baseIndexHtml, "public/index.html");
  const indexBuf = Buffer.from(baseIndexHtml, "utf8");
  const currentPublicHtml = existsSync(publicIndex)
    ? stripLeadingBom(readFileSync(publicIndex)).toString("utf8")
    : "";
  if (currentPublicHtml !== baseIndexHtml) {
    writeFileSyncWithRetry(publicIndex, indexBuf);
    console.log("[sync-legacy-static-to-public] Rebuilt public/index.html from canonical root shell");
  }

  const staticDir = resolve(publicDir, "static");
  mkdirSync(staticDir, { recursive: true });
  writeFileSyncWithRetry(resolve(staticDir, "index.html"), indexBuf);
  console.log("[sync-legacy-static-to-public] Copied index.html -> public/static/index.html (SPA shell; avoids [adminHash] collision).");

  for (const loc of localeLandingDirs) {
    const locDir = resolve(publicDir, loc);
    mkdirSync(locDir, { recursive: true });
    const localeIndexHtml = dedupeUtf8CharsetMeta(applyLocaleSeoMeta(baseIndexHtml, `/${loc}`));
    assertEntryHtmlHealthy(localeIndexHtml, `public/${loc}/index.html`);
    writeFileSyncWithRetry(resolve(locDir, "index.html"), Buffer.from(localeIndexHtml, "utf8"));
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

  // Sync back the auto cache-busted versions to root to maintain consistency for verification
  const rootInlineRuntimePath = resolve(rootDir, "js", "core", "index-inline-runtime.js");
  if (existsSync(rootInlineRuntimePath)) {
    let rootRuntimeJs = readFileSync(rootInlineRuntimePath, "utf8");
    const bustedRootRuntimeJs = preserveIndependentCacheKeys(
      rootRuntimeJs.replace(/\?v=[a-zA-Z0-9_-]+/g, "?v=" + buildTimestamp),
    );
    if (bustedRootRuntimeJs !== rootRuntimeJs) {
      writeFileSync(rootInlineRuntimePath, bustedRootRuntimeJs);
      console.log(`[sync-legacy-static-to-public] Updated root index-inline-runtime.js with ${buildTimestamp}`);
    }
  }

  const rootUiBindingsPath = resolve(rootDir, "js", "core", "uiBindings.js");
  if (existsSync(rootUiBindingsPath)) {
    const rootUiBindingsJs = readFileSync(rootUiBindingsPath, "utf8");
    const bustedRootUiBindingsJs = cacheBustUiBindingsScriptRefs(rootUiBindingsJs, buildTimestamp);
    if (bustedRootUiBindingsJs !== rootUiBindingsJs) {
      writeFileSync(rootUiBindingsPath, bustedRootUiBindingsJs);
      console.log(`[sync-legacy-static-to-public] Updated root uiBindings.js PDF/runtime loaders with ${buildTimestamp}`);
    }
  }

  const rootMobilePatchPath = resolve(rootDir, "js", "mobile-interaction-patch.js");
  if (existsSync(rootMobilePatchPath)) {
    const rootMobilePatchJs = readFileSync(rootMobilePatchPath, "utf8");
    const bustedRootMobilePatchJs = cacheBustMobileInteractionPatchScriptRefs(rootMobilePatchJs, buildTimestamp);
    if (bustedRootMobilePatchJs !== rootMobilePatchJs) {
      writeFileSync(rootMobilePatchPath, bustedRootMobilePatchJs);
      console.log(`[sync-legacy-static-to-public] Updated root mobile-interaction-patch.js tarot loader with ${buildTimestamp}`);
    }
  }

  for (const parts of MODULE_IMPORT_CACHE_KEY_FILES) {
    const rootModulePath = resolve(rootDir, ...parts);
    if (!existsSync(rootModulePath)) continue;
    const rootModuleJs = readFileSync(rootModulePath, "utf8");
    const bustedRootModuleJs = cacheBustModuleImportSpecifiers(rootModuleJs, buildTimestamp);
    if (bustedRootModuleJs !== rootModuleJs) {
      writeFileSync(rootModulePath, bustedRootModuleJs);
      console.log(`[sync-legacy-static-to-public] Updated root ${parts.join("/")} module imports with ${buildTimestamp}`);
    }
  }

  if (existsSync(rootIndexPath)) {
    let rootHtml = readFileSync(rootIndexPath, "utf8");
    const bustedRootHtml = preserveIndependentCacheKeys(
      rootHtml.replace(/\?v=[a-zA-Z0-9_-]+/g, "?v=" + buildTimestamp),
    );
    if (bustedRootHtml !== rootHtml) {
      writeFileSync(rootIndexPath, bustedRootHtml);
      console.log(`[sync-legacy-static-to-public] Updated root index.html with ${buildTimestamp}`);
    }
  }
}

/**
 * 루트 bare 자산(AnalysisEngine.js 등)의 ?v= 를 파일 내용 해시로 맞춘다.
 *
 * 🔴 반드시 다른 모든 캐시버스트 **뒤에** 돌아야 한다. 위쪽의 무차별 치환
 * (`replace(/\?v=[a-zA-Z0-9_-]+/g, buildTimestamp)`)이 index-inline-runtime.js 의
 * `/HwatuFortune.js?v=` 까지 덮어쓰기 때문에, 먼저 돌면 그 값이 되돌아간다.
 *
 * 이 자산들은 디렉터리 없는 bare 파일명이라 위의 `\/js\/`·`js\/` 정규식에
 * 구조적으로 안 걸린다 — 그게 2026-08-08 전생 관상 장애의 원인이었다.
 */
function syncRootAssetCacheKeys() {
  const keys = computeRootAssetCacheKeys(rootDir);
  const assetNames = Object.keys(keys);
  if (!assetNames.length) return;

  const touched = [];
  for (const relPath of ROOT_ASSET_REF_FILES) {
    const abs = resolve(rootDir, relPath);
    if (!existsSync(abs)) continue;
    const current = stripLeadingBom(readFileSync(abs)).toString("utf8");
    const next = rewriteRootAssetCacheRefs(current, keys);
    if (next === current) continue;
    writeFileSyncWithRetry(abs, Buffer.from(next, "utf8"));
    touched.push(relPath);
  }

  console.log(
    `[sync-legacy-static-to-public] Root asset cache keys: ${assetNames.map((n) => `${n}=${keys[n]}`).join(", ")}`,
  );
  if (touched.length) {
    console.log(`[sync-legacy-static-to-public] Rewrote root asset refs in ${touched.length} file(s): ${touched.join(", ")}`);
  }
}

/**
 * 이 스크립트가 만든 public/ 사본을 리포 루트 `.ignore` 에 적어 **검색에서만** 뺀다.
 * ripgrep 은 .gitignore·.ignore·.rgignore 를 모두 읽으므로, git 은 이 파일을 안 보는 채로
 * Grep/Glob 결과에서 사본이 사라진다(추적·빌드·배포·CI 는 그대로다).
 *
 * 왜 필요한가 (2026-08-16 실측): public/ 은 추적 코드파일의 10%(266/2536)인데, 실제 심볼
 * 검색 히트의 19~58%를 차지한다 — 미러된 것이 정확히 자주 찾는 파일(js/core/*, 루트 엔진,
 * 정적 셸)이기 때문이다. 게다가 셸 사본 한 장이 2.68MB라 한 번 열면 컨텍스트가 통째로 날아간다.
 *
 * 🔴 판정은 **선언이 아니라 실제 내용**으로 한다. staticTargets 를 그대로 믿으면 안 된다:
 *   · staticTargets 는 icons·sudda 를 복사 대상이라 선언하지만 루트에 원본 디렉터리가 없어
 *     복사 루프에서 skip 된다 → public/icons/(20) · public/sudda/(53) 은 **원본**이다.
 *   · cpSync 는 삭제를 하지 않는다 → 루트에서 지워진 파일이 public/ 에 고아로 남는다
 *     (public/js/ 의 18개가 그것이고, 이들은 다른 사본이 없어 빼면 검색에서 영영 사라진다).
 * 그래서 ①루트에 바이트 동일한 원본이 있는 파일만 사본으로 본다. 내용이 **어긋난** 사본은
 * 일부러 남긴다 — 드리프트야말로 사람이 찾아야 할 것이다.
 *
 * ②③은 ①에 안 걸리는 파생물이다(변형이 있어 바이트가 다르다).
 */
const SEARCH_IGNORE_PATH = resolve(rootDir, ".ignore");
const SEARCH_IGNORE_BEGIN = "# >>> sync:public 생성 미러 — 자동 생성, 직접 편집 금지 >>>";
const SEARCH_IGNORE_END = "# <<< sync:public 생성 미러 <<<";

const SEARCH_IGNORE_HEADER = `# ripgrep 전용 제외 목록 — git 은 이 파일을 읽지 않는다(.gitignore 아님).
# 여기 적힌 것은 sync:public 이 루트에서 복사·파생한 사본이라, 검색에서 정본과 나란히
# 나오면 같은 내용을 두 번 읽게 된다. 원본은 들어오지 않는다(아래 블록은 자동 생성).
#
# 미러까지 포함해 찾아야 할 때 — 셋 다 살아 있다:
#   git grep <패턴>     git 은 .ignore 를 보지 않는다
#   rg -u <패턴>        --no-ignore
#   Read <경로>         경로를 직접 주는 읽기는 막히지 않는다
#
# 🔴 심볼·파일을 지우기 전 3면 grep(CLAUDE.md 원칙 9)에는 이 제외를 적용하지 말 것.
#    미러가 참조를 갖고 있는데 못 보면 "임포터 0" 을 죽음의 증거로 오독하게 된다.
#
# 갱신: npm run sync:public (마커 안쪽만 다시 쓴다)
`;

/** gitignore 문법의 메타문자를 escape 해서 경로를 리터럴로 만든다. */
function escapeIgnorePattern(relPath) {
  return relPath.replace(/[[\]*?!#\\]/g, (ch) => `\\${ch}`);
}

/**
 * 빌드가 만드는 산출물 디렉터리 — 미러 목록에 넣으면 안 된다.
 *
 * 왜 (2026-08-24): 이 블록은 **디스크에 있는 것**으로 만들어진다. `fortune/data/` 는
 * scripts/fortune-daily-once.mjs 가 빌드 때 만드는 추적 밖 데이터라, 로컬에서는 있고
 * CI 의 새 체크아웃에는 없다. 그래서 그 경로가 커밋된 `.ignore` 에 들어가면
 * verify:public-mirror-fresh 가 **환경에 따라 반대 결론**을 낸다 — 로컬은 "넣어라",
 * CI 는 "빼라". 어느 쪽으로 커밋해도 한쪽이 빨간불이라서, 매 세션 손으로 되돌리고 있었다.
 * 파일명이 날짜를 물고 도는 것(`daily-2026-08-24.json`)도 같은 뿌리의 증상이다.
 */
const MIRROR_EXCLUDED_DIRS = ["fortune/data"];

/** public/ 아래에서 "루트에 바이트 동일한 원본이 있는" 파일만 모은다. */
function collectMirroredPublicPaths(absDir, relDir, out) {
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    const abs = join(absDir, entry.name);
    if (MIRROR_EXCLUDED_DIRS.some((dir) => rel === dir || rel.startsWith(`${dir}/`))) continue;
    if (entry.isDirectory()) {
      collectMirroredPublicPaths(abs, rel, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const rootAbs = resolve(rootDir, rel);
    // 루트에 대응 파일이 없으면 원본이다(고아 사본 포함). 여기서 걸러야 원본을 안 삼킨다.
    if (!existsSync(rootAbs) || !statSync(rootAbs).isFile()) continue;
    // 크기부터 본다 — 2.6MB 셸 같은 대형 파일을 매번 통째로 읽지 않기 위한 선필터다.
    if (statSync(abs).size !== statSync(rootAbs).size) continue;
    if (!readFileSync(abs).equals(readFileSync(rootAbs))) continue;
    out.add(`public/${rel}`);
  }
}

function syncSearchIgnoreList() {
  if (!existsSync(publicDir)) return;

  const mirrors = new Set();

  // ① 루트와 바이트 동일한 사본
  collectMirroredPublicPaths(publicDir, "", mirrors);

  // ② 루트 index.html 에서 파생한 셸 6벌 — applyLocaleSeoMeta 등으로 변형돼 ①에 안 걸린다.
  const derivedShells = ["index.html", "static/index.html", ...localeLandingDirs.map((loc) => `${loc}/index.html`)];
  for (const rel of derivedShells) {
    if (existsSync(resolve(publicDir, rel))) mirrors.add(`public/${rel}`);
  }

  // ③ public/manifest.json 에서 파생한 로케일 매니페스트 (writeLocaleManifest)
  for (const loc of localeLandingDirs) {
    const rel = `manifest.${loc}.json`;
    if (existsSync(resolve(publicDir, rel))) mirrors.add(`public/${rel}`);
  }

  const body = [...mirrors].sort().map((rel) => `/${escapeIgnorePattern(rel)}`);
  const block = [SEARCH_IGNORE_BEGIN, ...body, SEARCH_IGNORE_END].join("\n");

  const before = existsSync(SEARCH_IGNORE_PATH)
    ? stripLeadingBom(readFileSync(SEARCH_IGNORE_PATH)).toString("utf8")
    : null;

  let next;
  if (before === null) {
    next = `${SEARCH_IGNORE_HEADER}\n${block}\n`;
  } else {
    const beginAt = before.indexOf(SEARCH_IGNORE_BEGIN);
    const endAt = before.indexOf(SEARCH_IGNORE_END);
    if (beginAt !== -1 && endAt !== -1 && endAt > beginAt) {
      next = `${before.slice(0, beginAt)}${block}${before.slice(endAt + SEARCH_IGNORE_END.length)}`;
    } else {
      // 마커가 없으면 사람이 쓴 내용을 지우지 않고 뒤에 덧붙인다.
      next = `${before.replace(/\s*$/, "")}\n\n${block}\n`;
    }
  }

  if (before === next) {
    console.log(`[sync-legacy-static-to-public] Search ignore list unchanged (${body.length} mirrors).`);
    return;
  }
  writeFileSyncWithRetry(SEARCH_IGNORE_PATH, Buffer.from(next, "utf8"));
  console.log(`[sync-legacy-static-to-public] Wrote .ignore search-exclusion block (${body.length} mirrors).`);
}

syncRootAssetCacheKeys();

sanitizePublicGoogleFontReferences(publicDir);

// 🔴 반드시 마지막이다 — 위의 캐시키 재작성·폰트 정리가 사본 내용을 바꾸므로,
//    그전에 돌면 방금 어긋난 파일을 "미러 아님"으로 잘못 판정한다.
syncSearchIgnoreList();

console.log("[sync-legacy-static-to-public] Completed static asset sync.");
