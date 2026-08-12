import { promises as fs } from "node:fs";
import path from "node:path";

import { isBuildArtifactDir } from "./lib/source-scan-ignore.mjs";

const rootDir = process.cwd();

const REQUIRED_FILES = [
  "wrangler.toml",
  "worker/wrangler.toml",
  "next.config.mjs",
  "public/index.html",
  "worker/index.js",
];

const WORKER_GLOB_EXT = new Set([".js", ".mjs", ".ts", ".tsx"]);

const BLOCKED_NODE_MODULE_PATTERNS = [
  /from\s+["']node:(fs|path|child_process|cluster|worker_threads|dgram|repl|readline|vm)["']/g,
  /from\s+["'](fs|path|child_process|cluster|worker_threads|dgram|repl|readline|vm)["']/g,
  /require\(("|')(fs|path|child_process|cluster|worker_threads|dgram|repl|readline|vm)\1\)/g,
];

const WARNING_MODULE_PATTERNS = [
  /from\s+["']mongoose["']/g,
  /from\s+["']express["']/g,
  /require\(("|')(mongoose|express)\1\)/g,
];

async function exists(relPath) {
  try {
    await fs.access(path.join(rootDir, relPath));
    return true;
  } catch (e) {
    return false;
  }
}

async function readText(relPath) {
  return fs.readFile(path.join(rootDir, relPath), "utf8");
}

async function listFilesRecursive(absDir) {
  const out = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // 번들에는 node:fs 등이 그대로 인라인돼 있어, 산출물이 worker/ 안에 있으면
        // worker-node-incompatible-imports 블로커로 잡힌다(소스는 멀쩡한데 실패한다).
        if (isBuildArtifactDir(entry.name)) continue;
        await walk(abs);
        continue;
      }
      out.push(abs);
    }
  }

  await walk(absDir);
  return out;
}

function findRegexMatches(text, patterns) {
  const matches = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      matches.push(pattern.toString());
    }
  }
  return matches;
}

async function analyzeWorkerCompatibility() {
  const workerDir = path.join(rootDir, "worker");
  const files = await listFilesRecursive(workerDir);

  const jsFiles = files.filter((absFile) => WORKER_GLOB_EXT.has(path.extname(absFile).toLowerCase()));

  const blocked = [];
  const warnings = [];

  for (const absFile of jsFiles) {
    const relFile = path.relative(rootDir, absFile).replace(/\\/g, "/");
    const content = await fs.readFile(absFile, "utf8");

    const blockedMatches = findRegexMatches(content, BLOCKED_NODE_MODULE_PATTERNS);
    if (blockedMatches.length > 0) {
      blocked.push({ file: relFile, matches: blockedMatches });
    }

    const warningMatches = findRegexMatches(content, WARNING_MODULE_PATTERNS);
    if (warningMatches.length > 0) {
      warnings.push({ file: relFile, matches: warningMatches });
    }
  }

  return {
    fileCount: jsFiles.length,
    blocked,
    warnings,
  };
}

async function analyzeLegacyServer() {
  const rel = "server/server.js";
  if (!(await exists(rel))) {
    return { exists: false };
  }

  const content = await readText(rel);
  const usesExpress = /require\(("|')\.\/app\1\)/.test(content) || /express/i.test(content);
  const usesDotenv = /dotenv/i.test(content);

  return {
    exists: true,
    usesExpress,
    usesDotenv,
  };
}

async function analyzeWrangler() {
  const rootWrangler = await readText("wrangler.toml");
  const workerWrangler = await readText("worker/wrangler.toml");

  return {
    rootHasPagesOutput: /pages_build_output_dir\s*=\s*"dist"/.test(rootWrangler),
    workerHasMainIndex: /main\s*=\s*"index\.js"/.test(workerWrangler),
    workerUsesNodeCompat: /compatibility_flags\s*=\s*\[[^\]]*nodejs_compat[^\]]*\]/.test(workerWrangler),
  };
}

async function analyzeNextOutput() {
  const text = await readText("next.config.mjs");
  return {
    staticExport: /output\s*:\s*['\"]export['\"]/.test(text),
    distDir: /distDir\s*:\s*['\"]dist['\"]/.test(text),
  };
}

async function main() {
  const missingRequired = [];
  for (const rel of REQUIRED_FILES) {
    if (!(await exists(rel))) missingRequired.push(rel);
  }

  const worker = await analyzeWorkerCompatibility();
  const legacyServer = await analyzeLegacyServer();
  const wrangler = await analyzeWrangler();
  const nextOutput = await analyzeNextOutput();

  const blockers = [];
  const warnings = [];

  if (missingRequired.length > 0) {
    blockers.push({ type: "missing-required-files", items: missingRequired });
  }

  if (worker.blocked.length > 0) {
    blockers.push({ type: "worker-node-incompatible-imports", items: worker.blocked });
  }

  if (!wrangler.rootHasPagesOutput || !wrangler.workerHasMainIndex) {
    blockers.push({ type: "wrangler-config-mismatch", wrangler });
  }

  if (worker.warnings.length > 0) {
    warnings.push({
      type: "worker-heavy-runtime-deps",
      items: worker.warnings,
      note: "Mongoose/Express patterns were detected. In Worker runtime this can increase cold-start and risk. Consider D1/HTTP DB adapters.",
    });
  }

  if (legacyServer.exists && legacyServer.usesExpress) {
    warnings.push({
      type: "legacy-node-server-present",
      file: "server/server.js",
      note: "This is not Cloudflare Worker runtime code. Keep it as local fallback only.",
    });
  }

  if (!nextOutput.staticExport || !nextOutput.distDir) {
    warnings.push({
      type: "next-static-export-not-strict",
      nextOutput,
    });
  }

  const appClassification = {
    repository: legacyServer.exists ? "hybrid-static-plus-backend" : "static-or-worker-only",
  };

  const recommendation = {
    deploymentModel: "Cloudflare Pages (frontend static dist) + Cloudflare Worker (API)",
    pagesProject: "codedestiny",
    workerName: "code-destiny-web",
  };

  const result = {
    ok: blockers.length === 0,
    generatedAt: new Date().toISOString(),
    appClassification,
    recommendation,
    checks: {
      missingRequired,
      wrangler,
      nextOutput,
      worker,
      legacyServer,
    },
    blockers,
    warnings,
  };

  console.log(JSON.stringify(result, null, 2));

  if (result.ok) {
    console.log("\n[verify-cloudflare-migration-readiness] PASS");
    process.exit(0);
  }

  console.error("\n[verify-cloudflare-migration-readiness] FAIL");
  process.exit(1);
}

main().catch((error) => {
  console.error("[verify-cloudflare-migration-readiness] fatal:", error?.message || String(error));
  process.exit(1);
});
