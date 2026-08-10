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
import { assertProductionDeployIsCi, resolveProductionDeployPermission } from "./lib/production-deploy-guard.mjs";

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
 *
 * 게이트는 **두 겹**이고 역할이 다르다.
 *   바깥: assertProductionDeployIsCi — "CI 가 아니면 프로덕션에 못 쓴다"는 경계.
 *         뚫으려면 CD_BREAK_GLASS=1 과 --break-glass 가 **둘 다** 필요하다.
 *   안쪽: --emergency — 그 경계를 뚫고 들어온 **로컬 실행에만** 적용되는 확인.
 *         비상구를 열었다는 것과 지금 이 명령으로 프로덕션을 밀 작정이라는 것은 다른 결정이라
 *         따로 받는다.
 * 🔴 안쪽 게이트는 CI 에서 건너뛴다. CI 에도 걸면 릴리스 워크플로가 자기 가드에 막힌다.
 */
assertProductionDeployIsCi("Worker production deploy (wrangler deploy)");

const runningInCi = resolveProductionDeployPermission({ env: process.env, argv: process.argv }).reason === "ci";
if (!runningInCi) {
  if (!process.argv.includes("--emergency")) {
    console.error("[deploy-worker] BLOCKED: 수동 Worker 배포는 기본 차단입니다.");
    console.error("[deploy-worker] 정상 배포 경로: feature 브랜치 → PR → CI 통과 → main 머지 → GitHub Actions 자동 배포.");
    console.error("[deploy-worker] 로컬에서 할 수 있는 것: npm run deploy:check (업로드 없음) · PR 에 `preview` 라벨.");
    console.error("[deploy-worker] 이 경로에 없는 것: PR·CI 검증, 배포 후 스모크, 실패 시 자동 롤백, Pages 짝 맞춤.");
    console.error("[deploy-worker] 비상 상황이면: CD_BREAK_GLASS=1 npm run deploy:cf:worker -- --break-glass --emergency");
    process.exit(1);
  }
  console.warn("[deploy-worker] ⚠ EMERGENCY MODE: 검증 없이 워킹트리를 프로덕션 Worker 로 밉니다.");
  console.warn("[deploy-worker] ⚠ 끝난 뒤 같은 내용을 반드시 PR 로 main 에 반영하세요 — 안 하면 다음 정식 배포가 이 변경을 되돌립니다.");
}

// 🔴 낡은 베이스로 배포하면 그 사이 머지된 남의 워커 커밋이 조용히 사라진다. 여기서 막는다.
assertWorkerBaseIsFresh(rootDir, { argv: process.argv });

const args = ["wrangler", "deploy", "--config", "worker/wrangler.toml"];
if (workerName.trim()) {
  args.push("--name", workerName.trim());
  console.log(`[deploy-worker] Using Worker name override: ${workerName.trim()}`);
}

// 배포에 커밋을 새겨 `wrangler deployments list` 에서 "지금 뜬 게 어느 코드인지" 보이게 한다.
// 접두사에 공백을 넣지 않는다 — win32 는 shell:true 로 spawn 해서 공백이 인자를 쪼갠다
// (scripts/lib/worker-deploy-base-guard.mjs 의 buildDeployMessage 주석 참고).
const deployMessage = "emergency-" + buildDeployMessage(rootDir);
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
