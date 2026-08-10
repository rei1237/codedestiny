/**
 * Deploy the Cloudflare backend Worker from worker/wrangler.toml.
 *
 * - Frontend static deployment is handled by Cloudflare Pages.
 * - /api backend routes are handled by worker/index.js.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { assertWorkerBaseIsFresh, buildDeployMessage } from "./lib/worker-deploy-base-guard.mjs";
import { assertProductionDeployIsCi } from "./lib/production-deploy-guard.mjs";

function normalizeOriginOnly(rawValue, label) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch (e) {
    console.error(`[deploy-worker] ${label} must be a valid absolute URL origin. Received: ${value}`);
    process.exit(1);
  }
}

function hasRoutePattern(configText, pattern) {
  const escaped = String(pattern || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`pattern\\s*=\\s*"${escaped}"`).test(configText);
}


const rootDir = process.cwd();
const envFiles = [".env.cloudflare.local", ".env.cloudflare", ".env.local", ".env"];

for (const envFile of envFiles) {
  const envPath = resolve(rootDir, envFile);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

if (!process.env.CLOUDFLARE_API_TOKEN && process.env.CF_API_TOKEN) {
  process.env.CLOUDFLARE_API_TOKEN = process.env.CF_API_TOKEN;
}
if (!process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_APITOKEN) {
  process.env.CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_APITOKEN;
}

const workerConfig = resolve(rootDir, "worker", "wrangler.toml");
if (!existsSync(workerConfig)) {
  console.error("[deploy-worker] worker/wrangler.toml not found.");
  process.exit(1);
}

const workerEntry = resolve(rootDir, "worker", "index.js");
if (!existsSync(workerEntry)) {
  console.error("[deploy-worker] worker/index.js not found.");
  process.exit(1);
}

try {
  const configText = readFileSync(workerConfig, "utf8");
  if (!/\nmain\s*=\s*"index\.js"\s*(\n|$)/.test(`\n${configText}\n`)) {
    console.error("[deploy-worker] worker/wrangler.toml must include: main = \"index.js\"");
    process.exit(1);
  }

  const configuredApiBase = configText.match(/^\s*AUTH_API_BASE_URL\s*=\s*"([^"]+)"\s*$/m)?.[1] || "";
  if (configuredApiBase && normalizeOriginOnly(configuredApiBase, "AUTH_API_BASE_URL") !== configuredApiBase) {
    console.error("[deploy-worker] AUTH_API_BASE_URL must be origin-only (no path/query/hash). Example: https://code-destiny.com");
    process.exit(1);
  }

  const configuredFrontendBase = configText.match(/^\s*AUTH_FRONTEND_BASE_URL\s*=\s*"([^"]+)"\s*$/m)?.[1] || "";
  if (configuredFrontendBase && normalizeOriginOnly(configuredFrontendBase, "AUTH_FRONTEND_BASE_URL") !== configuredFrontendBase) {
    console.error("[deploy-worker] AUTH_FRONTEND_BASE_URL must be origin-only (no path/query/hash). Example: https://code-destiny.com");
    process.exit(1);
  }

  if (
    configuredApiBase === "https://code-destiny.com"
    && !hasRoutePattern(configText, "code-destiny.com/api/*")
  ) {
    console.error("[deploy-worker] AUTH_API_BASE_URL=https://code-destiny.com requires Worker route pattern code-destiny.com/api/* so auth cookies stay same-origin.");
    process.exit(1);
  }
} catch (error) {
  console.error("[deploy-worker] Failed to read worker config:", error?.message || String(error));
  process.exit(1);
}

const workerName =
  process.env.CF_WORKER_NAME ||
  process.env.CLOUDFLARE_WORKER_NAME ||
  "";

const truthy = (value) => ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
const vedicForceExternal = truthy(process.env.VEDIC_API_FORCE_EXTERNAL);
if (vedicForceExternal) {
  const hasVedicBaseUrl = Boolean(String(process.env.VEDIC_API_BASE_URL || process.env.VEDIC_API_BASE || "").trim());
  const hasVedicApiKey = Boolean(String(process.env.VEDIC_API_KEY || process.env.VEDIC_API_TOKEN || "").trim());
  if (!hasVedicBaseUrl || !hasVedicApiKey) {
    console.error("[deploy-worker] VEDIC_API_FORCE_EXTERNAL=true requires VEDIC_API_BASE_URL (or VEDIC_API_BASE) and VEDIC_API_KEY (or VEDIC_API_TOKEN).");
    process.exit(1);
  }
}

/*
 * 🔴 이 경로는 릴리스 경로가 아니다.
 *
 * `wrangler deploy` 는 현재 워킹트리를 그대로 프로덕션에 민다 — PR 도, CI 검증도, 스모크도,
 * 자동 롤백도, Pages 짝 맞춤도 없이. 정상 경로는 feature 브랜치 → PR → CI → main 머지이고,
 * 그 머지가 릴리스 워크플로를 깨워 Pages 와 Worker 를 같은 SHA 로 함께 내보낸다.
 *
 * GitHub Actions 자체가 사용 불가할 때의 핫픽스 수단으로만 남긴다 — 그래서 제거가 아니라 게이트다.
 */
assertProductionDeployIsCi("Worker production deploy (wrangler deploy)");

// 🔴 낡은 베이스로 배포하면 그 사이 머지된 남의 워커 커밋이 조용히 사라진다. 여기서 막는다.
assertWorkerBaseIsFresh(rootDir, { argv: process.argv });

const args = ["wrangler", "deploy", "--config", "worker/wrangler.toml"];
if (workerName.trim()) {
  args.push("--name", workerName.trim());
  console.log(`[deploy-worker] Using Worker name override: ${workerName.trim()}`);
}

// 배포에 커밋을 새겨 `wrangler deployments list` 에서 "지금 뜬 게 어느 코드인지" 보이게 한다.
const deployMessage = buildDeployMessage(rootDir);
const deployCommit = String(
  process.env.GITHUB_SHA
  || spawnSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).stdout
  || "",
).trim();
if (!/^[0-9a-f]{7,64}$/i.test(deployCommit)) {
  console.error("[deploy-worker] Could not resolve the deploy commit SHA.");
  process.exit(1);
}
args.push("--message", deployMessage);
args.push("--var", `COMMIT_SHA:${deployCommit}`);

console.log("[deploy-worker] Deploying Cloudflare backend Worker using --config worker/wrangler.toml.");
console.log(`[deploy-worker] Deploy message: ${deployMessage}`);
console.log(`[deploy-worker] Runtime commit: ${deployCommit.slice(0, 12)}`);

const result = process.platform === "win32"
  ? spawnSync("npx", args, {
      stdio: "inherit",
      shell: true,
      cwd: rootDir,
      env: process.env,
    })
  : spawnSync("npx", args, {
      stdio: "inherit",
      shell: false,
      cwd: rootDir,
      env: process.env,
    });

if (result.error) {
  console.error("[deploy-worker] Failed to start wrangler:", result.error.message);
  process.exit(1);
}

process.exit(typeof result.status === "number" ? result.status : 1);
