import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function runGit(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) return "";
  return String(result.stdout || "").trim();
}

function firstNonEmpty(values) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

const rootDir = process.cwd();
const distDir = resolve(rootDir, "dist");

if (!existsSync(distDir)) {
  console.error("[write-version-json] dist directory not found. Run build first.");
  process.exit(1);
}

const commitSha = firstNonEmpty([
  process.env.CF_PAGES_COMMIT_SHA,
  process.env.GITHUB_SHA,
  process.env.VERCEL_GIT_COMMIT_SHA,
  runGit(["rev-parse", "HEAD"]),
]);

const timeStamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const commitShort = commitSha ? commitSha.slice(0, 12) : `build-${timeStamp}`;

const branch = firstNonEmpty([
  process.env.CF_PAGES_BRANCH,
  process.env.GITHUB_REF_NAME,
  process.env.VERCEL_GIT_COMMIT_REF,
  runGit(["rev-parse", "--abbrev-ref", "HEAD"]),
]) || "unknown";

const builtAt = new Date().toISOString();
const deploymentMode = firstNonEmpty([
  process.env.DEPLOYMENT_MODE,
  "manual-pages-only",
]);
const payload = {
  ok: true,
  service: "code-destiny",
  commit: commitSha || "unknown",
  commitShort,
  branch,
  builtAt,
  buildTime: builtAt,
  deploymentMode,
  source: firstNonEmpty([
    process.env.CF_PAGES_URL ? "cloudflare-pages" : "",
    process.env.GITHUB_ACTIONS ? "github-actions" : "",
    "local",
  ]),
};

const versionPath = resolve(distDir, "version.json");
const staticDir = resolve(distDir, "static");
const staticVersionPath = resolve(staticDir, "version.json");
const publicVersionPath = resolve(rootDir, "public", "version.json");

mkdirSync(staticDir, { recursive: true });

const body = JSON.stringify(payload, null, 2) + "\n";
writeFileSync(versionPath, body, "utf8");
writeFileSync(staticVersionPath, body, "utf8");
writeFileSync(publicVersionPath, body, "utf8");

console.log("[write-version-json] wrote " + versionPath);
console.log("[write-version-json] wrote " + staticVersionPath);
console.log("[write-version-json] wrote " + publicVersionPath);
console.log("[write-version-json] commit=" + payload.commitShort + " branch=" + payload.branch);
