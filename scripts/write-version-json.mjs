import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

function readPackageVersion() {
  try {
    const packageJsonPath = resolve(rootDir, "package.json");
    const raw = readFileSync(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw);
    return String(parsed?.version || "").trim();
  } catch {
    return "";
  }
}

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
const appVersion = firstNonEmpty([
  process.env.NEXT_PUBLIC_APP_VERSION,
  process.env.APP_VERSION,
  readPackageVersion(),
  "0.0.0",
]);
const deploymentMode = firstNonEmpty([
  process.env.DEPLOYMENT_MODE,
  "manual-pages-only",
]);
const environment = firstNonEmpty([
  process.env.CF_PAGES === "1" || process.env.CF_PAGES === "true" ? "production" : "",
  process.env.NODE_ENV,
  "production",
]);
const source = "pages";
const buildSource = firstNonEmpty([
  process.env.CF_PAGES_URL ? "cloudflare-pages" : "",
  process.env.GITHUB_ACTIONS ? "github-actions" : "",
  "local",
]);
const payload = {
  ok: true,
  service: "code-destiny",
  appVersion,
  gitSha: commitSha || "unknown",
  buildTime: builtAt,
  environment,
  source,
  commit: commitSha || "unknown",
  commitShort,
  branch,
  builtAt,
  deploymentMode,
  buildSource,
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
