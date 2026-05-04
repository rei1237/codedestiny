import { spawnSync } from "node:child_process";

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

const commitSha = firstNonEmpty([
  process.env.CF_PAGES_COMMIT_SHA,
  process.env.GITHUB_SHA,
  process.env.VERCEL_GIT_COMMIT_SHA,
  runGit(["rev-parse", "HEAD"]),
]);

const commitShort = commitSha ? commitSha.slice(0, 12) : "unknown";

const branch = firstNonEmpty([
  process.env.CF_PAGES_BRANCH,
  process.env.GITHUB_REF_NAME,
  process.env.VERCEL_GIT_COMMIT_REF,
  runGit(["rev-parse", "--abbrev-ref", "HEAD"]),
]) || "unknown";

const buildSource = firstNonEmpty([
  process.env.CF_PAGES_URL ? "cloudflare-pages" : "",
  process.env.GITHUB_ACTIONS ? "github-actions" : "",
  "local",
]);

const builtAt = new Date().toISOString();
const deploymentMode = firstNonEmpty([
  process.env.DEPLOYMENT_MODE,
  "manual-pages-only",
]);

console.log("[build-context] source=" + buildSource);
console.log("[build-context] branch=" + branch);
console.log("[build-context] commit=" + commitSha);
console.log("[build-context] commitShort=" + commitShort);
console.log("[build-context] builtAt=" + builtAt);
console.log("[build-context] deploymentMode=" + deploymentMode);
