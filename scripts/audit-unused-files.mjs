#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = process.cwd();
const reportsDir = path.join(rootDir, "reports");

const args = new Set(process.argv.slice(2));
const duplicatesOnly = args.has("--duplicates");

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".wrangler",
  "out",
  "dist",
  "build",
  "coverage",
  "playwright-report",
  "test-results",
  ".open-next",
  "_scripts-archive",
  "reports",
]);

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".html",
  ".htm",
  ".css",
  ".md",
  ".txt",
  ".xml",
  ".yml",
  ".yaml",
  ".toml",
  ".env",
]);

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

const LARGE_FILE_THRESHOLD = 512 * 1024;
const IMAGE_OPTIMIZE_THRESHOLD = 200 * 1024;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function ensureReportsDir() {
  fs.mkdirSync(reportsDir, { recursive: true });
}

function shouldSkipDir(name) {
  if (EXCLUDED_DIRS.has(name)) return true;
  if (name.startsWith(".") && name !== ".github") return true;
  return false;
}

function listFiles(baseDir) {
  const out = [];
  const stack = [baseDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const rel = toPosix(path.relative(baseDir, abs));

      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) continue;
        stack.push(abs);
        continue;
      }

      if (entry.isFile()) {
        out.push(rel);
      }
    }
  }

  return out;
}

function isTextFile(relPath) {
  const base = path.basename(relPath).toLowerCase();
  if (base === ".env" || base.endsWith(".env")) return true;
  const ext = path.extname(relPath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function stripQueryAndHash(spec) {
  return spec.replace(/[?#].*$/, "").trim();
}

function isExternalSpecifier(spec) {
  return /^(https?:|data:|mailto:|tel:|javascript:|#)/i.test(spec);
}

function hasKnownExtension(relPath) {
  return Boolean(path.extname(relPath));
}

function candidateWithExtensions(relPath) {
  const candidates = [relPath];
  if (hasKnownExtension(relPath)) return candidates;

  const exts = [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json", ".html", ".css"];
  for (const ext of exts) candidates.push(`${relPath}${ext}`);
  candidates.push(path.posix.join(relPath, "index.js"));
  candidates.push(path.posix.join(relPath, "index.ts"));
  candidates.push(path.posix.join(relPath, "index.tsx"));
  candidates.push(path.posix.join(relPath, "index.html"));
  return candidates;
}

function resolveSpecifier(fromRelPath, spec, allFilesSet) {
  let raw = stripQueryAndHash(spec);
  if (!raw || isExternalSpecifier(raw)) return [];

  if (raw.startsWith("@/")) {
    raw = raw.slice(2);
    return candidateWithExtensions(raw).filter((c) => allFilesSet.has(c));
  }

  if (raw.startsWith("@")) {
    return [];
  }

  const fromDir = path.posix.dirname(fromRelPath);
  const candidates = new Set();

  if (raw.startsWith("./") || raw.startsWith("../")) {
    const normalized = path.posix.normalize(path.posix.join(fromDir, raw));
    for (const c of candidateWithExtensions(normalized)) candidates.add(c);
  } else if (raw.startsWith("/")) {
    const absolute = raw.slice(1);
    for (const c of candidateWithExtensions(absolute)) candidates.add(c);
    for (const c of candidateWithExtensions(path.posix.join("public", absolute))) candidates.add(c);
  } else {
    if (raw.includes("/")) {
      for (const c of candidateWithExtensions(path.posix.normalize(raw))) candidates.add(c);
    } else {
      for (const c of candidateWithExtensions(raw)) candidates.add(c);
      for (const c of candidateWithExtensions(path.posix.join(fromDir, raw))) candidates.add(c);
      for (const c of candidateWithExtensions(path.posix.join("public", raw))) candidates.add(c);
    }
  }

  const resolved = [];
  for (const c of candidates) {
    if (allFilesSet.has(c)) resolved.push(c);
  }
  return resolved;
}

function extractSpecifiers(content) {
  const specs = new Set();
  const patterns = [
    /(?:import|export)\s+(?:[^"'`]*?\sfrom\s*)?["'`]([^"'`]+)["'`]/g,
    /import\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
    /require\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
    /fetch\s*\(\s*["'`]([^"'`]+)["'`]/g,
    /new\s+Worker\s*\(\s*["'`]([^"'`]+)["'`]/g,
    /(?:href|src|action)\s*=\s*["']([^"']+)["']/g,
    /url\(\s*["']?([^"')]+)["']?\s*\)/g,
    /(?:location\.assign|location\.replace|window\.open)\s*\(\s*["'`]([^"'`]+)["'`]/g,
    /["'`](\/[A-Za-z0-9_./-]+(?:\.[A-Za-z0-9]+)?(?:\?[^"]*)?)["'`]/g,
    /["'`]([A-Za-z0-9_.-]+\.(?:js|mjs|cjs|ts|tsx|jsx|css|html|json|png|jpg|jpeg|webp|svg|ico|xml|txt))(?:\?[^"'`]*)?["'`]/g,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const val = String(match[1] || "").trim();
      if (val) specs.add(val);
    }
  }

  return [...specs];
}

function collectPackageScriptEntries(packageJsonPath, allFilesSet) {
  const entries = new Set();
  if (!fs.existsSync(packageJsonPath)) return entries;

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const scripts = pkg && pkg.scripts ? pkg.scripts : {};
    const nodeFileRe = /(?:^|\s)(?:node|tsx|ts-node)\s+([^\s;]+\.(?:mjs|cjs|js|ts))/g;

    for (const key of Object.keys(scripts)) {
      const cmd = String(scripts[key] || "");
      let match;
      nodeFileRe.lastIndex = 0;
      while ((match = nodeFileRe.exec(cmd)) !== null) {
        let rel = match[1].trim().replace(/^['"]|['"]$/g, "");
        rel = toPosix(rel.replace(/^\.\//, ""));
        if (allFilesSet.has(rel)) entries.add(rel);
      }
    }
  } catch (e) {
    return entries;
  }

  return entries;
}

function collectWranglerEntries(allFilesSet) {
  const entries = new Set();
  const wranglerFiles = ["wrangler.toml", "worker/wrangler.toml", "wrangler.assets.toml"];

  for (const rel of wranglerFiles) {
    if (!allFilesSet.has(rel)) continue;
    entries.add(rel);

    try {
      const txt = fs.readFileSync(path.join(rootDir, rel), "utf8");
      const m = txt.match(/^\s*main\s*=\s*"([^"]+)"/m);
      if (m && m[1]) {
        const mainRel = toPosix(path.posix.join(path.posix.dirname(rel), m[1]));
        if (allFilesSet.has(mainRel)) entries.add(mainRel);
      }
    } catch (e) {
      // noop
    }
  }

  return entries;
}

function collectEntryPoints(allFiles, allFilesSet) {
  const entries = new Set();

  for (const rel of allFiles) {
    if (!rel.includes("/") && rel.endsWith(".html") && !path.basename(rel).startsWith("_tmp_")) entries.add(rel);
    if (rel.startsWith("public/") && rel.endsWith(".html")) entries.add(rel);
    if (rel.startsWith("app/") && /\.(js|jsx|ts|tsx)$/.test(rel)) entries.add(rel);
  }

  [
    "index.html",
    "public/index.html",
    "next.config.mjs",
    "middleware.js",
    "worker/index.js",
    "package.json",
  ].forEach((rel) => {
    if (allFilesSet.has(rel)) entries.add(rel);
  });

  for (const rel of collectPackageScriptEntries(path.join(rootDir, "package.json"), allFilesSet)) {
    entries.add(rel);
  }

  for (const rel of collectWranglerEntries(allFilesSet)) {
    entries.add(rel);
  }

  return entries;
}

function buildReachability(allFiles, allFilesSet, entryPoints) {
  const visited = new Set();
  const queue = [...entryPoints].filter((r) => allFilesSet.has(r));
  const graphEdges = new Map();

  while (queue.length) {
    const rel = queue.shift();
    if (visited.has(rel)) continue;
    visited.add(rel);

    const abs = path.join(rootDir, rel);
    if (!isTextFile(rel)) continue;

    let content = "";
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch (e) {
      continue;
    }

    const nextNodes = new Set();
    const specs = extractSpecifiers(content);
    for (const spec of specs) {
      const resolved = resolveSpecifier(rel, spec, allFilesSet);
      for (const n of resolved) {
        nextNodes.add(n);
        if (!visited.has(n)) queue.push(n);
      }
    }
    graphEdges.set(rel, [...nextNodes]);
  }

  return { visited, graphEdges };
}

function isProtected(relPath) {
  if (PROTECTED_EXACT.has(relPath)) return true;
  for (const prefix of PROTECTED_PREFIXES) {
    if (relPath === prefix.slice(0, -1) || relPath.startsWith(prefix)) return true;
  }
  return false;
}

function bytesToHuman(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function makeUnusedReport(allFiles, allFilesSet, entryPoints, reachable, graphEdges) {
  const candidates = [];
  const protectedUnreached = [];

  for (const rel of allFiles) {
    if (reachable.has(rel)) continue;

    let size = 0;
    try {
      size = fs.statSync(path.join(rootDir, rel)).size;
    } catch (e) {
      size = 0;
    }

    const item = {
      path: rel,
      size,
      sizeHuman: bytesToHuman(size),
      extension: path.extname(rel).toLowerCase() || "(none)",
    };

    if (isProtected(rel)) {
      protectedUnreached.push(item);
    } else {
      candidates.push(item);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    totalFilesScanned: allFiles.length,
    entryPointCount: entryPoints.size,
    reachableCount: reachable.size,
    unreachableCount: allFiles.length - reachable.size,
    entryPoints: [...entryPoints].sort(),
    graphNodeCount: graphEdges.size,
    unusedCandidates: candidates.sort((a, b) => b.size - a.size),
    protectedButUnreached: protectedUnreached.sort((a, b) => a.path.localeCompare(b.path)),
    notes: [
      "This report does not delete files.",
      "Candidates are heuristic and require manual validation for runtime/dynamic links.",
    ],
  };
}

function hashFile(absPath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(absPath);
  hash.update(data);
  return hash.digest("hex");
}

function makeDuplicateReport(allFiles) {
  const byHash = new Map();

  for (const rel of allFiles) {
    const abs = path.join(rootDir, rel);
    let stat;
    try {
      stat = fs.statSync(abs);
    } catch (e) {
      continue;
    }

    if (!stat.isFile() || stat.size === 0) continue;

    const hash = hashFile(abs);
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push({ path: rel, size: stat.size, sizeHuman: bytesToHuman(stat.size) });
  }

  const duplicates = [];
  for (const [hash, files] of byHash.entries()) {
    if (files.length < 2) continue;
    files.sort((a, b) => a.path.localeCompare(b.path));
    duplicates.push({
      hash,
      size: files[0].size,
      sizeHuman: files[0].sizeHuman,
      copies: files.length,
      files,
    });
  }

  duplicates.sort((a, b) => b.size - a.size || b.copies - a.copies);

  return {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    groups: duplicates,
    groupCount: duplicates.length,
    fileCountInGroups: duplicates.reduce((acc, g) => acc + g.copies, 0),
  };
}

function makeLargeFileReport(allFiles) {
  const items = [];
  const imageCandidates = [];

  for (const rel of allFiles) {
    const abs = path.join(rootDir, rel);
    let stat;
    try {
      stat = fs.statSync(abs);
    } catch (e) {
      continue;
    }

    if (!stat.isFile()) continue;

    const ext = path.extname(rel).toLowerCase();
    if (stat.size >= LARGE_FILE_THRESHOLD) {
      items.push({ path: rel, size: stat.size, sizeHuman: bytesToHuman(stat.size), extension: ext || "(none)" });
    }

    if (IMAGE_EXTENSIONS.has(ext) && stat.size >= IMAGE_OPTIMIZE_THRESHOLD) {
      imageCandidates.push({
        path: rel,
        size: stat.size,
        sizeHuman: bytesToHuman(stat.size),
        suggestion: "Consider WebP/AVIF conversion",
      });
    }
  }

  items.sort((a, b) => b.size - a.size);
  imageCandidates.sort((a, b) => b.size - a.size);

  return {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    thresholdBytes: LARGE_FILE_THRESHOLD,
    thresholdHuman: bytesToHuman(LARGE_FILE_THRESHOLD),
    largeFiles: items,
    imageOptimizationCandidates: imageCandidates,
  };
}

function writeReport(name, payload) {
  const outPath = path.join(reportsDir, name);
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[audit-unused-files] wrote ${toPosix(path.relative(rootDir, outPath))}`);
}

function main() {
  ensureReportsDir();

  const allFiles = listFiles(rootDir).sort();
  const allFilesSet = new Set(allFiles);

  if (!duplicatesOnly) {
    const entryPoints = collectEntryPoints(allFiles, allFilesSet);
    const { visited, graphEdges } = buildReachability(allFiles, allFilesSet, entryPoints);
    const unusedReport = makeUnusedReport(allFiles, allFilesSet, entryPoints, visited, graphEdges);
    writeReport("unused-files-report.json", unusedReport);

    const largeReport = makeLargeFileReport(allFiles);
    writeReport("large-files-report.json", largeReport);
  }

  const dupReport = makeDuplicateReport(allFiles);
  writeReport("duplicate-files-report.json", dupReport);

  console.log("[audit-unused-files] completed in dry-run mode.");
}

main();
