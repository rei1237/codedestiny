import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

// Check if build artifacts exist; if not, run build:cf first
const openNextDir = resolve(rootDir, ".open-next");
const workerBundle = resolve(openNextDir, "worker.js");
const workerAssetsDir = resolve(openNextDir, "assets");

const needsBuild =
  !existsSync(openNextDir) ||
  !existsSync(workerBundle) ||
  !existsSync(workerAssetsDir) ||
  !existsSync(resolve(workerAssetsDir, "index.html"));

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
