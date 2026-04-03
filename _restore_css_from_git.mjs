/**
 * Restore public/styles/*.css and styles/*.css from the last-known-good git commit.
 * - Reads each file directly via git show (binary-safe, no PowerShell encoding issues)
 * - Writes with UTF-8 without BOM, LF line endings
 * - Also updates root/styles/ to keep them in sync
 */
import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

// cc78d0b = last good commit before the pointer-file regression (2b79c89)
// We use this as the source of truth for all CSS files.
const GOOD_COMMIT = "cc78d0b";

// globals.css: the @tailwind-fixed version was at 6182b4a.
// That commit removed @tailwind directives which are meaningless in static serving.
const GLOBALS_COMMIT = "6182b4a";

/**
 * Files to restore. Each entry: { file, commit, gitPath }
 * gitPath defaults to "public/styles/<file>" if not specified.
 */
const FILES_TO_RESTORE = [
  // Critical CSS (were pointer files, may have BOM/CRLF after PowerShell restore)
  { file: "fortune-ui.css", commit: GOOD_COMMIT },
  { file: "main-glass.css", commit: GOOD_COMMIT },
  // globals.css: must be plain CSS (no @tailwind directives) for static serving
  { file: "globals.css", commit: GLOBALS_COMMIT },
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

  const normalized = normalizeCss(raw);

  // Check if public/styles file already matches (skip unnecessary writes)
  let needsWrite = true;
  if (existsSync(pubDest)) {
    const existing = readFileSync(pubDest);
    const existingNorm = normalizeCss(existing);
    if (existingNorm.equals(normalized)) {
      needsWrite = false;
    }
  }

  if (needsWrite) {
    writeFileSync(pubDest, normalized);
    writeFileSync(rootDest, normalized);
    console.log(`[restore] UPDATED: ${file} (${normalized.length} bytes, from ${commit})`);
    changed++;
  } else {
    console.log(`[restore] SKIP: ${file} already up to date`);
    skipped++;
  }
}

console.log(`\n[restore] Done. changed=${changed}, skipped=${skipped}, errored=${errored}`);
