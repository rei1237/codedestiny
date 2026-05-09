/**
 * Deploy static assets to Cloudflare Pages.
 * For API routes (e.g. /api/tarot/draw) to work, use deploy:cf:worker instead:
 *   npm run deploy:cf:worker
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

const rootDir = process.cwd();
const envFiles = [".env.cloudflare.local", ".env.cloudflare", ".env"];

for (const envFile of envFiles) {
  const envPath = resolve(rootDir, envFile);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

if (!process.env.CLOUDFLARE_API_TOKEN && process.env.CF_API_TOKEN) {
  process.env.CLOUDFLARE_API_TOKEN = process.env.CF_API_TOKEN;
}

const rawProjectName =
  process.env.CF_PAGES_PROJECT_NAME ||
  process.env.CLOUDFLARE_PAGES_PROJECT_NAME ||
  process.env.CLOUDFLARE_PROJECT_NAME ||
  "codedestiny";

const projectName = String(rawProjectName || "").trim() === "code-destiny-web"
  ? "codedestiny"
  : String(rawProjectName || "codedestiny").trim();

if (String(rawProjectName || "").trim() === "code-destiny-web") {
  console.warn("[deploy-pages] CF_PAGES_PROJECT_NAME=code-destiny-web detected. Overriding to codedestiny.");
}

const branchArgIndex = process.argv.findIndex((arg) => arg === "--branch");
const branch =
  (branchArgIndex >= 0 && process.argv[branchArgIndex + 1]) ||
  process.env.CF_PAGES_BRANCH ||
  "main";

const forceDirectDeploy =
  String(process.env.CF_PAGES_FORCE_DIRECT_DEPLOY || "").toLowerCase() === "1"
  || String(process.env.CF_PAGES_FORCE_DIRECT_DEPLOY || "").toLowerCase() === "true";

if (!forceDirectDeploy) {
  console.log("[deploy-pages] Skipped direct deploy.");
  console.log("[deploy-pages] Cloudflare Pages should be deployed automatically from Git pushes.");
  console.log("[deploy-pages] Set CF_PAGES_FORCE_DIRECT_DEPLOY=1 only for emergency manual override.");
  process.exit(0);
}

const isGitHubActions = String(process.env.GITHUB_ACTIONS || "").toLowerCase() === "true";
if (!isGitHubActions) {
  console.error("[deploy-pages] Blocked: forced direct deploy is allowed only from GitHub Actions.");
  console.error("[deploy-pages] Default policy is Git push auto-deploy for Cloudflare Pages.");
  process.exit(1);
}

const isWindows = process.platform === "win32";
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const outputDir = resolve(process.cwd(), "dist");
const versionJsonPath = resolve(outputDir, "version.json");
const args = [
  "wrangler",
  "pages",
  "deploy",
  "dist",
  "--project-name",
  projectName,
  "--branch",
  branch,
];

console.log(`[deploy-pages] project=${projectName} branch=${branch}`);

function runGit(args) {
  const result = spawnSync("git", args, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) return "";
  return String(result.stdout || "").trim();
}

function normalizeCommitSha(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-f0-9]/g, "");
}

function verifyDistVersionMatchesHead() {
  if (!existsSync(versionJsonPath)) {
    console.error("[deploy-pages] dist/version.json not found. Fresh build verification failed.");
    return false;
  }

  let payload;
  try {
    payload = JSON.parse(readFileSync(versionJsonPath, "utf8"));
  } catch (error) {
    console.error("[deploy-pages] Failed to parse dist/version.json:", error instanceof Error ? error.message : error);
    return false;
  }

  const distCommit = normalizeCommitSha(payload?.commit || payload?.commitShort || "");
  const headCommit = normalizeCommitSha(runGit(["rev-parse", "HEAD"]));

  if (!distCommit || !headCommit) {
    console.error("[deploy-pages] Could not resolve commit for deploy verification.");
    return false;
  }

  const distShort = distCommit.slice(0, 12);
  const headShort = headCommit.slice(0, 12);
  if (distShort !== headShort) {
    console.error(`[deploy-pages] Stale dist detected: dist/version=${distShort} git/head=${headShort}`);
    return false;
  }

  console.log(`[deploy-pages] Verified dist/version commit=${distShort}`);
  return true;
}

function runDeploy(env) {
  const result = isWindows
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", `npx wrangler pages deploy dist --project-name ${projectName} --branch ${branch}`], {
        stdio: "inherit",
        shell: false,
        env,
      })
    : spawnSync("npx", args, {
        stdio: "inherit",
        shell: false,
        env,
      });

  if (result.error) {
    console.error(`[deploy-pages] Failed to start deploy command: ${result.error.message}`);
  }

  return result;
}

function runBuildFresh() {
  console.log("[deploy-pages] Running fresh build: npm run build:cf");
  const buildResult = spawnSync(npmCmd, ["run", "build:cf"], {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (buildResult.status !== 0) {
    return false;
  }

  if (!existsSync(outputDir)) {
    return false;
  }

  return verifyDistVersionMatchesHead();
}

if (!process.env.CLOUDFLARE_API_TOKEN) {
  console.error("[deploy-pages] CLOUDFLARE_API_TOKEN is required in GitHub Actions.");
  process.exit(1);
}

if (!runBuildFresh()) {
  console.error("[deploy-pages] Fresh build verification failed. Cannot continue.");
  process.exit(1);
}

let result;

result = runDeploy(process.env);

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
