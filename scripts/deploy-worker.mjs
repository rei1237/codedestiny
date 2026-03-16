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

const distDir = resolve(rootDir, "dist");
const openNextDir = resolve(rootDir, ".open-next");
const workerConfig = resolve(rootDir, "wrangler.worker.jsonc");

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

console.log("[deploy-worker] Full stack deploy (Worker + assets) for API routes support.");

if (!existsSync(openNextDir)) {
  console.error("[deploy-worker] .open-next not found. Run: npm run build:cf");
  process.exit(1);
}

if (!existsSync(distDir)) {
  console.log("[deploy-worker] dist not found. Running npm run build:cf...");
  const buildResult = spawnSync(npmCmd, ["run", "build:cf"], {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (buildResult.status !== 0 || !existsSync(distDir)) {
    console.error("[deploy-worker] build:cf failed or dist still missing.");
    process.exit(1);
  }
}

if (!existsSync(workerConfig)) {
  console.error("[deploy-worker] wrangler.worker.jsonc not found.");
  process.exit(1);
}

const args = ["wrangler", "deploy", "--config", workerConfig];
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
