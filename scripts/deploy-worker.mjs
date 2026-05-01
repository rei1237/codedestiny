/**
 * Deploy the Cloudflare API Worker in worker/.
 *
 * The Pages frontend is deployed separately from dist/. This Worker receives
 * /api/* traffic from public/_redirects and forwards it to the configured API
 * origin until the Express routes are ported to Worker-native handlers.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

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

const workerConfig = resolve(rootDir, "worker", "wrangler.toml");
if (!existsSync(workerConfig)) {
  console.error("[deploy-worker] worker/wrangler.toml not found.");
  process.exit(1);
}

const workerName =
  process.env.CF_WORKER_NAME ||
  process.env.CLOUDFLARE_WORKER_NAME ||
  "";

const args = ["wrangler", "deploy", "--config", "worker/wrangler.toml"];
if (workerName.trim()) {
  args.push("--name", workerName.trim());
  console.log(`[deploy-worker] Using Worker name override: ${workerName.trim()}`);
}

console.log("[deploy-worker] Deploying Cloudflare API Worker from worker/.");

const result = process.platform === "win32"
  ? spawnSync("cmd.exe", ["/d", "/s", "/c", `npx ${args.join(" ")}`], {
      stdio: "inherit",
      shell: false,
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
