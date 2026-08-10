/**
 * Deploy static assets to Cloudflare Pages.
 *
 * 이 스크립트는 긴급용 폴백이다(--emergency 필요). 정상 경로는 `npm run deploy:safe` 이며
 * Pages 와 Worker 를 같은 커밋으로 함께 내보낸다.
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

const isCloudflarePagesBuild = [process.env.CF_PAGES, process.env.CLOUDFLARE_PAGES]
  .some((value) => /^(1|true)$/i.test(String(value || "")));
const forceDirectDeploy = true;
const isGitHubActions = String(process.env.GITHUB_ACTIONS || "").toLowerCase() === "true";

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
    console.warn("[deploy-pages] Could not resolve commit for deploy verification. Continuing anyway.");
    return true;
  }

  const distShort = distCommit.slice(0, 12);
  const headShort = headCommit.slice(0, 12);
  if (distShort !== headShort) {
    console.warn(`[deploy-pages] Stale dist warning: dist/version=${distShort} git/head=${headShort}. Continuing anyway.`);
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
  console.log("[deploy-pages] Skipping duplicate build step, using existing dist directory.");
  const exists = existsSync(outputDir);
  console.log(`[deploy-pages] Output dir exists: ${exists} (path: ${outputDir})`);
  if (!exists) {
    return false;
  }

  const verified = verifyDistVersionMatchesHead();
  console.log(`[deploy-pages] Commit verification result: ${verified}`);
  return verified;
}

/*
 * 🔴 이 경로는 릴리스 경로가 아니다.
 *
 * 아래 runDeploy() 는 --commit-hash 를 붙이지 않는다. 그래서 이 경로로 올린 배포는
 * Cloudflare 대시보드와 API 에서 커밋 메타데이터가 비고, `npx wrangler deployments list` 의
 * Pages↔Worker 짝 대조가 원천적으로 불가능해진다 — 어느 코드가 떠 있는지 물을 방법이 사라진다.
 * deploy-safe.mjs 의 Pages 배포는 --commit-hash 와 --commit-message 를 함께 넣는다.
 *
 * Cloudflare Pages 빌드 환경 안에서는 어차피 아래에서 배포하지 않고 종료하므로 게이트를 걸지 않는다.
 */
const emergencyDeploy = process.argv.includes("--emergency");
if (!emergencyDeploy && !isCloudflarePagesBuild) {
  console.error("[deploy-pages] BLOCKED: 수동 Pages 배포는 기본 차단입니다.");
  console.error("[deploy-pages] 정상 배포 경로는 `npm run deploy:safe` 입니다 (Worker 가 안 바뀌면 Pages 만 나갑니다).");
  console.error("[deploy-pages] 이 경로는 배포에 커밋을 새기지 않아 `npx wrangler deployments list` 의 Pages↔Worker 짝 대조를 무력화합니다.");
  console.error("[deploy-pages] deploy:safe 가 동작하지 않는 긴급 상황이면 `npm run deploy:cf:pages -- --emergency` 로 실행하세요.");
  process.exit(1);
}
if (emergencyDeploy && !isCloudflarePagesBuild) {
  console.warn("[deploy-pages] ⚠ EMERGENCY MODE: 커밋 메타데이터 없이 Pages 를 올립니다. 이후 배포 목록의 Pages 커밋은 비어 보입니다.");
}

if (!runBuildFresh()) {
  console.error("[deploy-pages] Fresh build verification failed. Cannot continue.");
  process.exit(1);
}

if (isCloudflarePagesBuild) {
  console.log("[deploy-pages] Cloudflare Pages build detected; skipping nested wrangler pages deploy.");
  process.exit(0);
}

/*
 * 🔴 이 경로는 릴리스 경로가 아니다.
 *
 * 아래 runDeploy() 는 --commit-hash 를 붙이지 않는다. 그래서 이 경로로 올린 배포는 Cloudflare
 * 대시보드와 API 에서 커밋 메타데이터가 비고, "지금 프로덕션에 뜬 코드가 어느 커밋인가"를
 * 물을 방법이 사라진다 — 배포 후 SHA 대조가 원천적으로 불가능해진다.
 * 정상 경로(릴리스 워크플로)의 Pages 배포는 --commit-hash 와 --commit-message 를 함께 넣는다.
 *
 * Cloudflare Pages 빌드 환경 안에서는 위에서 이미 종료하므로 게이트가 걸리지 않는다.
 */
assertProductionDeployIsCi("Pages production deploy (wrangler pages deploy)");

if (!process.env.CLOUDFLARE_API_TOKEN) {
  console.error("[deploy-pages] CLOUDFLARE_API_TOKEN is required for direct Pages deploy.");
  process.exit(1);
}

let result;

result = runDeploy(process.env);

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
