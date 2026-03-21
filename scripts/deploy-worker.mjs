/**
 * Deploy to Cloudflare Workers (full stack: Worker + static assets).
 * Use this so that API routes (e.g. /api/tarot/draw, /api/tarot/reading) work.
 * For static-only deploy use deploy:cf:pages instead.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
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

const openNextDir = resolve(rootDir, ".open-next");
const workerAssetsDir = resolve(openNextDir, "assets");
const workerConfig = resolve(rootDir, "wrangler.worker.jsonc");

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

console.log("[deploy-worker] Full stack deploy (Worker + assets) for API routes support.");

const workerBundle = resolve(openNextDir, "worker.js");
const needsBuild =
  !existsSync(openNextDir) ||
  !existsSync(workerBundle) ||
  !existsSync(workerAssetsDir) ||
  !existsSync(resolve(workerAssetsDir, "index.html"));

if (needsBuild) {
  console.log(
    "[deploy-worker] OpenNext output missing (.open-next/worker.js or .open-next/assets/index.html). Running npm run build:cf...",
  );
  const buildResult = spawnSync(npmCmd, ["run", "build:cf"], {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (buildResult.status !== 0 || !existsSync(workerBundle) || !existsSync(resolve(workerAssetsDir, "index.html"))) {
    console.error("[deploy-worker] build:cf failed or expected outputs still missing.");
    process.exit(1);
  }
}

if (!existsSync(workerConfig)) {
  console.error("[deploy-worker] wrangler.worker.jsonc not found.");
  process.exit(1);
}

const workerName =
  process.env.CF_WORKER_NAME ||
  process.env.CLOUDFLARE_WORKER_NAME ||
  "";

const args = ["wrangler", "deploy", "--config", workerConfig];
if (workerName.trim()) {
  args.push("--name", workerName.trim());
  console.log(`[deploy-worker] Using Worker name override: ${workerName.trim()}`);
}
const result = isWindows
  ? spawnSync("cmd.exe", ["/d", "/s", "/c", `npx ${args.join(" ")}`], {
      stdio: "inherit",
      shell: false,
      env: process.env,
    })
  : spawnSync("npx", args, {
      stdio: "inherit",
      shell: false,
      env: process.env,
    });

if (result.error) {
  console.error("[deploy-worker] Failed to start wrangler:", result.error.message);
  process.exit(1);
}

process.exit(typeof result.status === "number" ? result.status : 1);
