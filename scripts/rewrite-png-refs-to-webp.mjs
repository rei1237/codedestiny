#!/usr/bin/env node
/**
 * Repoints .png references at their .webp siblings — but only the ones that are
 * proven to exist, never by blind string replacement.
 *
 * A reference is rewritten when:
 *   - local path (`/foo.png`, `images/foo.png`) → the .webp file exists on disk
 *   - R2 URL (`https://assets.code-destiny.com/<key>.png`) → <key>.webp is in the
 *     manifest written by scripts/convert-r2-png-to-webp.mjs
 * Everything else (external CDNs, code-destiny.com/og/*, unconverted keys) is
 * left alone. Static export does no runtime negotiation, so the reference is
 * what actually decides which bytes ship.
 *
 * Usage:
 *   node scripts/rewrite-png-refs-to-webp.mjs                 # dry-run (default)
 *   node scripts/rewrite-png-refs-to-webp.mjs --apply
 *   node scripts/rewrite-png-refs-to-webp.mjs --apply --skip-r2-check
 *
 * After --apply, run `npm run sync:public` so the root shells propagate to the
 * public/ mirrors.
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { isWebpExcluded } from "./webp-exclusions.mjs";

const REPO_ROOT = path.resolve();
const PUBLIC_ROOT = path.join(REPO_ROOT, "public");
const DEFAULT_MANIFEST = "reports/converted-r2-webp.json";

const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".html", ".css"]);
/** Records and generated mirrors: their .png strings are history, not wiring. */
const SKIPPED_DIRECTORIES = new Set([
  ".claude", ".git", ".next", ".wrangler", "coverage", "dist", "docs", "node_modules", "out", "reports", "scratchpad",
]);
const SKIPPED_PATH_FRAGMENTS = ["apps/mobile/android/app/src/main/assets"];
/** These two tools document .png/.webp shapes in prose; rewriting them is noise. */
const SKIPPED_FILES = new Set(["scripts/convert-r2-png-to-webp.mjs", "scripts/rewrite-png-refs-to-webp.mjs"]);
/** Hosts that serve the R2 asset buckets. */
const R2_HOSTS = new Set(["assets.code-destiny.com", "music.code-destiny.com"]);
/**
 * Reference shapes, widest first. Korean asset names contain spaces, so the
 * quoted/url() forms must be read before the whitespace-delimited fallback —
 * otherwise `"자는 연이.png"` is only seen as `연이.png`.
 */
const QUOTED_PATTERN = /(['"`])([^'"`\n]*?\.png)\1/gi;
const CSS_URL_PATTERN = /url\(\s*(['"]?)([^)'"\n]*?\.png)\1\s*\)/gi;
const PNG_TOKEN_PATTERN = /[^\s"'`()<>,;{}[\]\\]+\.png\b/gi;
/** Cloudflare Image Resizing prefix: /cdn-cgi/image/<options>/<real key> */
const CDN_CGI_PATTERN = /^cdn-cgi\/image\/[^/]+\//i;

function parseArgs(argv) {
  const options = { apply: false, help: false, manifest: DEFAULT_MANIFEST, skipR2Check: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--skip-r2-check") options.skipR2Check = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--manifest") {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) throw new Error("--manifest requires a value.");
      options.manifest = next;
      index += 1;
    } else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

/**
 * Converted R2 keys, indexed two ways: exact key, and basename when it is
 * unambiguous. The basename index is what lets a reference assembled by string
 * concatenation (`base + "기본-Photoroom.png"`) be verified at all.
 */
async function loadManifest(manifestPath) {
  const keys = new Set();
  const byBasename = new Map();
  try {
    const parsed = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
    for (const entry of parsed.converted || []) {
      if (!entry?.webpKey) continue;
      keys.add(entry.webpKey);
      const basename = entry.webpKey.split("/").pop();
      byBasename.set(basename, (byBasename.get(basename) || 0) + 1);
    }
  } catch {
    void 0;
  }
  return { byBasename, keys };
}

async function collectFiles(directory, found = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const relative = path.relative(REPO_ROOT, child).replace(/\\/g, "/");
      if (SKIPPED_PATH_FRAGMENTS.some((fragment) => relative.startsWith(fragment))) continue;
      await collectFiles(child, found);
    } else if (entry.isFile() && SCANNED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      if (SKIPPED_FILES.has(path.relative(REPO_ROOT, child).replace(/\\/g, "/"))) continue;
      found.push(child);
    }
  }
  return found;
}

async function fileExists(target) {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

function decodeSegments(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toWebp(value) {
  return `${value.slice(0, -4)}.webp`;
}

/** Local disk candidates that could back a reference found in `filePath`. */
function localCandidates(reference, filePath) {
  const [pathname] = reference.split(/[?#]/);
  const decoded = decodeSegments(pathname);
  if (decoded.startsWith("//")) return [];
  if (decoded.startsWith("/")) {
    const relative = decoded.replace(/^\/+/, "");
    return [path.join(PUBLIC_ROOT, relative), path.join(REPO_ROOT, relative)];
  }
  return [path.resolve(path.dirname(filePath), decoded)];
}

/** R2 object key a reference points at, or "" when it is not an R2 URL. */
function r2KeyOf(reference) {
  if (!/^https?:\/\//i.test(reference)) return "";
  try {
    const url = new URL(reference);
    if (!R2_HOSTS.has(url.hostname)) return "";
    const key = decodeSegments(url.pathname.replace(/^\/+/, ""));
    return key.replace(CDN_CGI_PATTERN, "");
  } catch {
    return "";
  }
}

/**
 * Every distinct .png reference in a file, longest first so that rewriting
 * `자는 연이.png` consumes the text before the loose `연이.png` sees it.
 */
function extractReferences(text) {
  const references = new Set();
  for (const match of text.matchAll(QUOTED_PATTERN)) references.add(match[2]);
  for (const match of text.matchAll(CSS_URL_PATTERN)) references.add(match[2]);
  for (const match of text.match(PNG_TOKEN_PATTERN) || []) references.add(match);
  return [...references].filter(Boolean).sort((a, b) => b.length - a.length);
}

/** R2 keys a non-absolute reference could resolve to (both known prefixes). */
function r2KeyCandidates(reference) {
  const [pathname] = reference.split(/[?#]/);
  const decoded = decodeSegments(pathname);
  if (!decoded.startsWith("/")) return [];
  const relative = decoded.replace(/^\/+/, "");
  return [relative, `assets/${relative}`];
}

/**
 * Decides one reference.
 * @returns {{action: "rewrite"|"skip", reason: string, r2Pending?: string}}
 */
async function classify(reference, filePath, manifest) {
  // Explicit, not incidental: some icons already have a stray .webp sibling
  // (public/icons/app-logo-512.webp), so "no .webp exists" would not hold them back.
  if (isWebpExcluded(reference.split(/[?#]/)[0])) return { action: "skip", reason: "icon-or-og-asset" };

  const r2Key = r2KeyOf(reference);
  if (r2Key) {
    if (manifest.keys.has(toWebp(r2Key))) return { action: "rewrite", reason: "r2-manifest" };
    return { action: "skip", reason: "r2-not-converted" };
  }
  if (/^https?:\/\//i.test(reference)) return { action: "skip", reason: "external-host" };

  const candidates = localCandidates(reference, filePath);
  for (const candidate of candidates) {
    if (await fileExists(toWebp(candidate))) {
      // The same path may also be served from R2 via getAssetUrlFromPublicPath.
      // R2 stores some of these under `assets/`, some at the bucket root, so a
      // hit on any of the three forms means it is already converted.
      const relative = path.relative(PUBLIC_ROOT, candidate).replace(/\\/g, "/");
      const webpRelative = toWebp(relative);
      const forms = relative.startsWith("..") ? [] : [`assets/${webpRelative}`, webpRelative];
      const covered = forms.some((form) => manifest.keys.has(form))
        || manifest.byBasename.has(webpRelative.split("/").pop());
      return { action: "rewrite", r2Pending: covered ? undefined : forms[0], reason: "local-webp" };
    }
  }

  // No local file: it can only be an R2-hosted key, so the manifest decides.
  for (const key of r2KeyCandidates(reference)) {
    if (manifest.keys.has(toWebp(key))) return { action: "rewrite", reason: "r2-manifest-path" };
  }
  const basename = toWebp(decodeSegments(reference.split(/[?#]/)[0]).split("/").pop() || "");
  if (manifest.byBasename.get(basename) === 1) return { action: "rewrite", reason: "r2-manifest-basename" };
  if (manifest.byBasename.get(basename) > 1) return { action: "skip", reason: "r2-basename-ambiguous" };

  return { action: "skip", reason: manifest.keys.size ? "not-converted" : "no-local-webp" };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("node scripts/rewrite-png-refs-to-webp.mjs [--apply] [--skip-r2-check] [--manifest <path>]");
    return;
  }

  const manifest = await loadManifest(options.manifest);
  console.log(`[png->webp] manifest keys: ${manifest.keys.size}${manifest.keys.size ? "" : ` (none found at ${options.manifest})`}`);

  const files = (await collectFiles(REPO_ROOT)).sort();
  const skipReasons = new Map();
  const r2Pending = new Set();
  const changedFiles = [];
  let rewrites = 0;

  for (const filePath of files) {
    const original = await readFile(filePath, "utf8");
    if (!/\.png\b/i.test(original)) continue;
    // A regression guard that asserts an asset is ABSENT names the forbidden file
    // on purpose. Rewriting that string leaves the guard passing while it no longer
    // watches anything — the legacy asset could come back unnoticed.
    if (original.includes("assertNotContains")) {
      skipReasons.set("negative-assertion-guard", (skipReasons.get("negative-assertion-guard") || 0) + 1);
      continue;
    }

    const references = extractReferences(original);
    let updated = original;
    let fileRewrites = 0;

    for (const reference of references) {
      // A .png next to its own .webp in the same file is a deliberate fallback
      // (`<img src=".webp" onerror="this.src='.png'">`, <picture>). Rewriting it
      // would collapse both arms of the chain onto one format.
      if (original.includes(toWebp(reference))) {
        skipReasons.set("webp-fallback-arm", (skipReasons.get("webp-fallback-arm") || 0) + 1);
        continue;
      }

      const verdict = await classify(reference, filePath, manifest);
      if (verdict.action === "skip") {
        skipReasons.set(verdict.reason, (skipReasons.get(verdict.reason) || 0) + 1);
        continue;
      }
      if (verdict.r2Pending) r2Pending.add(verdict.r2Pending);
      const occurrences = updated.split(reference).length - 1;
      updated = updated.split(reference).join(toWebp(reference));
      fileRewrites += occurrences;
    }

    if (fileRewrites > 0) {
      rewrites += fileRewrites;
      changedFiles.push({ count: fileRewrites, filePath, updated });
      console.log(`  ${String(fileRewrites).padStart(4)} ref(s)  ${path.relative(REPO_ROOT, filePath).replace(/\\/g, "/")}`);
    }
  }

  console.log("\n[png->webp] Skipped references by reason");
  for (const [reason, count] of [...skipReasons].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(5)}  ${reason}`);
  }

  if (r2Pending.size) {
    console.log(`\n[png->webp] ${r2Pending.size} rewritten path(s) are also served from R2 but have no converted key yet:`);
    for (const key of [...r2Pending].sort().slice(0, 15)) console.log(`  pending  ${key}`);
    if (r2Pending.size > 15) console.log(`  ...and ${r2Pending.size - 15} more`);
    console.log("  Run scripts/convert-r2-png-to-webp.mjs --apply first, or pass --skip-r2-check to proceed anyway.");
  }

  console.log(`\n[png->webp] ${rewrites} reference(s) in ${changedFiles.length} file(s) ${options.apply ? "rewritten" : "would be rewritten"}`);

  if (!options.apply) {
    console.log("[png->webp] dry-run. Re-run with --apply to write.");
    return;
  }
  if (r2Pending.size && !options.skipR2Check) {
    console.error("[png->webp] refusing to write: convert the R2 keys above first (or pass --skip-r2-check).");
    process.exitCode = 1;
    return;
  }

  for (const { filePath, updated } of changedFiles) await writeFile(filePath, updated, "utf8");
  console.log("[png->webp] done. Next: npm run sync:public");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
