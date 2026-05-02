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
import { readFileSync } from "node:fs";

function normalizeOriginOnly(rawValue, label) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch {
    console.error(`[deploy-worker] ${label} must be a valid absolute URL origin. Received: ${value}`);
    process.exit(1);
  }
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

const rootWranglerJson = resolve(rootDir, "wrangler.json");
const rootWranglerJsonc = resolve(rootDir, "wrangler.jsonc");
if (existsSync(rootWranglerJson) || existsSync(rootWranglerJsonc)) {
  console.warn("[deploy-worker] Root wrangler.json/jsonc detected. Worker deploy will still use --config worker/wrangler.toml.");
}

try {
  const configText = readFileSync(workerConfig, "utf8");
  if (!/\nmain\s*=\s*"index\.js"\s*(\n|$)/.test(`\n${configText}\n`)) {
    console.error("[deploy-worker] worker/wrangler.toml must include: main = \"index.js\"");
    process.exit(1);
  }

  if (!/\n\[assets\]\s*\n[\s\S]*?\bdirectory\s*=\s*"[^"]+"/m.test(`\n${configText}\n`)) {
    console.error("[deploy-worker] worker/wrangler.toml must include an [assets] section with directory.");
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
} catch (error) {
  console.error("[deploy-worker] Failed to read worker config:", error?.message || String(error));
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

console.log("[deploy-worker] Deploying Cloudflare API Worker from worker/ using --config worker/wrangler.toml.");

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
