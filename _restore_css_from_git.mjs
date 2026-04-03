/**
 * Restore public/styles/*.css and styles/*.css from the last-known-good git commit.
 * - Reads each file directly via git show (binary-safe, no PowerShell encoding issues)
 * - Writes with UTF-8 without BOM, LF line endings
 *
 * IMPORTANT: styles/globals.css and public/styles/globals.css serve DIFFERENT purposes:
 *   - styles/globals.css      = Next.js source, MUST have @tailwind directives (PostCSS processes this)
 *   - public/styles/globals.css = Static pure CSS served by Cloudflare Pages (no @tailwind)
 * These are restored separately from different source commits and NEVER synced to each other.
 */
import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

// cc78d0b = last good commit where both Next.js build and static serving worked correctly.
const GOOD_COMMIT = "cc78d0b";

// 6182b4a = commit where public/styles/globals.css was correctly pure CSS (no @tailwind).
const GLOBALS_STATIC_COMMIT = "6182b4a";

/**
 * Files to restore to BOTH public/styles/ AND styles/ from the same git source.
 * gitPath defaults to "public/styles/<file>".
 */
const FILES_TO_RESTORE = [
  // Critical CSS (were pointer files, may have BOM/CRLF after PowerShell restore)
  { file: "fortune-ui.css", commit: GOOD_COMMIT },
  { file: "main-glass.css", commit: GOOD_COMMIT },
  // Files that were behind cc78d0b state
  { file: "mobile-ux.css", commit: GOOD_COMMIT },
  { file: "cosmic-main.css", commit: GOOD_COMMIT },
  { file: "tarot-healing-dawn.css", commit: GOOD_COMMIT },
  { file: "tarot-year-fortune.css", commit: GOOD_COMMIT },
];

function gitShowBuffer(commit, gitPath) {
  // Use git cat-file to get raw binary content
  try {
    const hash = execSync(`git rev-parse ${commit}:${gitPath}`, { encoding: "utf8" }).trim();
    const buf = execSync(`git cat-file blob ${hash}`, { encoding: null, maxBuffer: 10 * 1024 * 1024 });
    return buf;
  } catch (e) {
    return null;
  }
}

function normalizeCss(buf) {
  let str = buf.toString("utf8");
  // Remove UTF-8 BOM if present
  if (str.charCodeAt(0) === 0xFEFF) {
    str = str.slice(1);
  }
  // Normalize CRLF → LF
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return Buffer.from(str, "utf8");
}

let changed = 0;
let skipped = 0;
let errored = 0;

function restoreFile(pubDest, rootDest, raw, label) {
  const normalized = normalizeCss(raw);
  let needsWrite = true;
  if (existsSync(pubDest)) {
    const existing = readFileSync(pubDest);
    if (normalizeCss(existing).equals(normalized)) {
      needsWrite = false;
    }
  }
  if (needsWrite) {
    writeFileSync(pubDest, normalized);
    if (rootDest) writeFileSync(rootDest, normalized);
    console.log(`[restore] UPDATED: ${label} (${normalized.length} bytes)`);
    changed++;
  } else {
    console.log(`[restore] SKIP: ${label} already up to date`);
    skipped++;
  }
}

// Sync-pair files: same content for both public/styles/ and styles/
for (const { file, commit } of FILES_TO_RESTORE) {
  const gitPath = `public/styles/${file}`;
  const pubDest = resolve(ROOT, "public", "styles", file);
  const rootDest = resolve(ROOT, "styles", file);

  const raw = gitShowBuffer(commit, gitPath);
  if (!raw) {
    console.error(`[restore] ERROR: could not read ${commit}:${gitPath}`);
    errored++;
    continue;
  }
  restoreFile(pubDest, rootDest, raw, file);
}

// globals.css: public/styles version (pure CSS) and styles/ version (@tailwind) are DIFFERENT
// public/styles/globals.css → pure CSS from GLOBALS_STATIC_COMMIT
{
  const raw = gitShowBuffer(GLOBALS_STATIC_COMMIT, "public/styles/globals.css");
  if (raw) {
    restoreFile(
      resolve(ROOT, "public", "styles", "globals.css"),
      null, // do NOT touch styles/globals.css here
      raw,
      "public/styles/globals.css (static pure CSS)"
    );
  } else {
    console.error(`[restore] ERROR: could not read globals.css from ${GLOBALS_STATIC_COMMIT}`);
    errored++;
  }
}
// styles/globals.css → @tailwind source from GOOD_COMMIT
{
  const raw = gitShowBuffer(GOOD_COMMIT, "styles/globals.css");
  if (raw) {
    const normalized = normalizeCss(raw);
    const dest = resolve(ROOT, "styles", "globals.css");
    let needsWrite = true;
    if (existsSync(dest)) {
      if (normalizeCss(readFileSync(dest)).equals(normalized)) needsWrite = false;
    }
    if (needsWrite) {
      writeFileSync(dest, normalized);
      console.log(`[restore] UPDATED: styles/globals.css (@tailwind source, ${normalized.length} bytes)`);
      changed++;
    } else {
      console.log(`[restore] SKIP: styles/globals.css already up to date`);
      skipped++;
    }
  } else {
    console.error(`[restore] ERROR: could not read styles/globals.css from ${GOOD_COMMIT}`);
    errored++;
  }
}

console.log(`\n[restore] Done. changed=${changed}, skipped=${skipped}, errored=${errored}`);
