import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { assertProductionDeployIsCi } from "./lib/production-deploy-guard.mjs";

// 🔴 OpenNext 경유 배포도 프로덕션 Worker 를 갈아 끼운다. 릴리스 워크플로가 쓰는 경로는
// 아니지만, 게이트가 없으면 "정상 경로를 우회하는 또 하나의 길"로 남는다. 빌드보다 먼저
// 막아야 검증 없는 배포를 위해 몇 분씩 빌드하는 일이 없다.
assertProductionDeployIsCi("OpenNext production deploy (@opennextjs/cloudflare deploy)");

const rootDir = process.cwd();
const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

// Check if build artifacts exist; if not, run build:cf first
const openNextDir = resolve(rootDir, ".open-next");
const workerBundle = resolve(openNextDir, "worker.js");
const workerAssetsDir = resolve(openNextDir, "assets");
const sourceShell = resolve(rootDir, "index.html");
const outputShell = resolve(workerAssetsDir, "index.html");

function isOutputOlderThanSource(outputPath, sourcePath) {
  if (!existsSync(outputPath) || !existsSync(sourcePath)) return true;
  return statSync(outputPath).mtimeMs < statSync(sourcePath).mtimeMs;
}

function outputShellMissingCurrentMarker() {
  if (!existsSync(outputShell) || !existsSync(sourceShell)) return true;
  const sourceText = readFileSync(sourceShell, "utf8");
  const outputText = readFileSync(outputShell, "utf8");
  const markerMatch = sourceText.match(/data-marker="([^"]*premium-constellation-library[^"]*)"/);
  return Boolean(markerMatch && !outputText.includes(markerMatch[0]));
}

const needsBuild =
  !existsSync(openNextDir) ||
  !existsSync(workerBundle) ||
  !existsSync(workerAssetsDir) ||
  !existsSync(outputShell) ||
  isOutputOlderThanSource(outputShell, sourceShell) ||
  outputShellMissingCurrentMarker();

if (needsBuild) {
  console.log(
    "[opennext-deploy-retry] OpenNext output missing (.open-next/worker.js or .open-next/assets/index.html). Running npm run build:cf...",
  );
  const buildResult = spawnSync(npmCmd, ["run", "build:cf"], {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (buildResult.status !== 0 || !existsSync(workerBundle) || !existsSync(resolve(workerAssetsDir, "index.html"))) {
    console.error("[opennext-deploy-retry] build:cf failed or expected outputs still missing.");
    process.exit(1);
  }
}
const maxAttempts = Math.max(1, Number.parseInt(process.env.CF_DEPLOY_RETRY_ATTEMPTS || "3", 10) || 3);
const retryDelayMs = Math.max(1000, Number.parseInt(process.env.CF_DEPLOY_RETRY_DELAY_MS || "12000", 10) || 12000);

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runOnce() {
  if (isWindows) {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", "npx @opennextjs/cloudflare deploy --config=wrangler.json"], {
      shell: false,
      env: process.env,
      encoding: "utf8",
    });
  }
  return spawnSync("npx", ["@opennextjs/cloudflare", "deploy", "--config=wrangler.json"], {
    shell: false,
    env: process.env,
    encoding: "utf8",
  });
}

function runSizeBudgetGuard() {
  return spawnSync("node", ["scripts/verify-worker-size-budget.mjs"], {
    shell: false,
    env: process.env,
    encoding: "utf8",
  });
}

function printResultOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function isRetryable(result) {
  const text = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (/502 Bad Gateway/i.test(text)) return true;
  if (/malformed response from the API/i.test(text)) return true;
  if (/workers\/scripts\/.+\/deployments\s*->\s*5\d\d/i.test(text)) return true;
  if (/fetch failed|ETIMEDOUT|ECONNRESET|EAI_AGAIN/i.test(text)) return true;
  return false;
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  if (attempt > 1) {
    console.log(`[opennext-deploy-retry] Retry ${attempt}/${maxAttempts}`);
  }

  const sizeGuard = runSizeBudgetGuard();
  if (sizeGuard.error) {
    console.error("[opennext-deploy-retry] Failed to run size budget check:", sizeGuard.error.message);
    process.exit(1);
  }

  printResultOutput(sizeGuard);
  const sizeStatus = typeof sizeGuard.status === "number" ? sizeGuard.status : 1;
  if (sizeStatus === 2) {
    console.error(
      "[opennext-deploy-retry] Deploy BLOCKED: Worker bundle (gzip estimate) exceeds free-plan budget.",
    );
    process.exit(1);
  }
  if (sizeStatus !== 0) {
    process.exit(sizeStatus);
  }

  const result = runOnce();
  if (result.error) {
    console.error("[opennext-deploy-retry] Failed to start deploy command:", result.error.message);
    process.exit(1);
  }

  printResultOutput(result);

  const status = typeof result.status === "number" ? result.status : 1;
  if (status === 0) {
    process.exit(0);
  }

  if (attempt < maxAttempts && isRetryable(result)) {
    console.warn(`[opennext-deploy-retry] Transient deploy error detected. Waiting ${retryDelayMs}ms...`);
    sleep(retryDelayMs);
    continue;
  }

  process.exit(status);
}
