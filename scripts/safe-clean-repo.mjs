#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const reportsDir = path.join(rootDir, "reports");
const applyMode = process.argv.slice(2).includes("--apply");

const DELETE_DIRS = [
  ".next",
  "out",
  "dist",
  "build",
  "coverage",
  "playwright-report",
  "test-results",
  ".wrangler",
  ".cloudflare",
];

const PROTECTED_EXACT = new Set([
  "index.html",
  "package.json",
  "package-lock.json",
  "wrangler.toml",
  "wrangler.assets.toml",
  "worker/wrangler.toml",
  "next.config.mjs",
  "middleware.js",
]);

const PROTECTED_PREFIXES = [
  "public/",
  "app/",
  "worker/",
  "utils/astrology/",
  "fortune/",
  "veda/",
];

const LOG_FILE_REGEX = [
  /^npm-debug\.log/i,
  /^yarn-debug\.log/i,
  /^yarn-error\.log/i,
  /^pnpm-debug\.log/i,
  /\.log$/i,
];

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function ensureReportsDir() {
  fs.mkdirSync(reportsDir, { recursive: true });
}

function isProtected(relPath) {
  if (PROTECTED_EXACT.has(relPath)) return true;
  for (const prefix of PROTECTED_PREFIXES) {
    if (relPath === prefix.slice(0, -1) || relPath.startsWith(prefix)) return true;
  }
  return false;
}

function isLogFile(baseName) {
  return LOG_FILE_REGEX.some((re) => re.test(baseName));
}

function collectWalkFiles(baseDir) {
  const out = [];
  const stack = [baseDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const rel = toPosix(path.relative(baseDir, abs));

      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        stack.push(abs);
        continue;
      }

      if (entry.isFile()) out.push(rel);
    }
  }

  return out;
}

function collectCandidates() {
  const planned = [];
  const skippedProtected = [];

  for (const relDir of DELETE_DIRS) {
    const absDir = path.join(rootDir, relDir);
    if (!fs.existsSync(absDir)) continue;
    if (isProtected(relDir)) {
      skippedProtected.push({ path: relDir, reason: "protected-path" });
      continue;
    }
    planned.push({ path: relDir, type: "directory", reason: "build-or-cache-directory" });
  }

  const allFiles = collectWalkFiles(rootDir);
  for (const rel of allFiles) {
    const base = path.basename(rel);
    const normalized = toPosix(rel);

    let reason = null;

    if (/^_tmp_/i.test(base) || normalized.includes("/_tmp_")) {
      reason = "temporary-artifact";
    } else if (/^\._/.test(base) || base === ".DS_Store" || base === "Thumbs.db") {
      reason = "os-artifact";
    } else if (base === "tsconfig.tsbuildinfo" || base.endsWith(".tsbuildinfo")) {
      reason = "typescript-buildinfo";
    } else if (isLogFile(base)) {
      reason = "log-file";
    }

    if (!reason) continue;

    if (isProtected(normalized)) {
      skippedProtected.push({ path: normalized, reason: "protected-path" });
      continue;
    }

    planned.push({ path: normalized, type: "file", reason });
  }

  const dedup = new Map();
  for (const item of planned) {
    if (!dedup.has(item.path)) dedup.set(item.path, item);
  }

  return {
    candidates: [...dedup.values()].sort((a, b) => a.path.localeCompare(b.path)),
    skippedProtected: skippedProtected.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

function writeJsonReport(fileName, payload) {
  const reportPath = path.join(reportsDir, fileName);
  fs.writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[safe-clean-repo] wrote ${toPosix(path.relative(rootDir, reportPath))}`);
}

function applyCleanup(candidates) {
  const deleted = [];
  const failed = [];

  for (const item of candidates) {
    const abs = path.join(rootDir, item.path);
    try {
      if (!fs.existsSync(abs)) continue;
      fs.rmSync(abs, { recursive: true, force: true });
      deleted.push(item);
    } catch (error) {
      failed.push({ ...item, error: String(error && error.message ? error.message : error) });
    }
  }

  return { deleted, failed };
}

function main() {
  ensureReportsDir();

  const { candidates, skippedProtected } = collectCandidates();

  const plan = {
    generatedAt: new Date().toISOString(),
    mode: applyMode ? "apply" : "dry-run",
    candidateCount: candidates.length,
    skippedProtectedCount: skippedProtected.length,
    candidates,
    skippedProtected,
    notes: [
      "This cleaner only targets cache/build/temp artifacts.",
      "Protected files and directories are never removed.",
    ],
  };

  writeJsonReport("cleanup-plan.json", plan);

  if (!applyMode) {
    console.log(`[safe-clean-repo] dry-run complete. candidates=${candidates.length}`);
    return;
  }

  const { deleted, failed } = applyCleanup(candidates);
  const applied = {
    generatedAt: new Date().toISOString(),
    mode: "apply",
    attemptedCount: candidates.length,
    deletedCount: deleted.length,
    failedCount: failed.length,
    deleted,
    failed,
  };

  writeJsonReport("cleanup-applied.json", applied);

  if (failed.length > 0) {
    console.error(`[safe-clean-repo] apply finished with failures. failed=${failed.length}`);
    process.exit(1);
  }

  console.log(`[safe-clean-repo] apply complete. deleted=${deleted.length}`);
}

main();
