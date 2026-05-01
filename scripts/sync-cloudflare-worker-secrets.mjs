import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");

const envFiles = [
  ".env.cloudflare.local",
  ".env.cloudflare",
  ".env.local",
  ".env",
  "server/.env.local",
  "server/.env",
];

for (const envFile of envFiles) {
  const envPath = resolve(rootDir, envFile);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

if (!process.env.CLOUDFLARE_API_TOKEN && process.env.CF_API_TOKEN) {
  process.env.CLOUDFLARE_API_TOKEN = process.env.CF_API_TOKEN;
}

const workerName =
  process.env.CF_WORKER_NAME ||
  process.env.CLOUDFLARE_WORKER_NAME ||
  "code-destiny-web";

const SECRET_KEYS = [
  "API_UPSTREAM_ORIGIN",
  "AUTH_API_BASE_URL",
  "AUTH_API_BASE",
  "CODE_DESTINY_API_URL",
  "AUTH_URL",
  "AUTH_SECRET",
  "AUTH_TRUST_HOST",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "CSRF_SECRET",
  "MONGO_URI",
  "MONGODB_URI",
  "MONGO_DB_NAME",
  "PORTONE_API_BASE_URL",
  "PORTONE_API_KEY",
  "PORTONE_API_SECRET",
  "PORTONE_WEBHOOK_TOKEN",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "ANTHROPIC_API_KEY",
  "DEEPL_API_KEY",
  "KASI_SERVICE_KEY",
  "KASI_API_BASE_URL",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "NAVER_OAUTH_CLIENT_ID",
  "NAVER_OAUTH_CLIENT_SECRET",
  "KAKAO_OAUTH_CLIENT_ID",
  "KAKAO_OAUTH_CLIENT_SECRET",
  "SUBSCRIPTION_LINK_SECRET",
  "ADMIN_SECRET_HASH",
  "FLOWER_ADMIN_SECRET",
  "VERTEX_PROJECT_ID",
  "VERTEX_LOCATION",
  "VERTEX_SA_JSON",
  "VERTEX_SA_JSON_BASE64",
  "VERTEX_SA_CLIENT_EMAIL",
  "VERTEX_SA_PRIVATE_KEY",
  "GCP_SERVICE_ACCOUNT_JSON",
  "GCP_SERVICE_ACCOUNT_JSON_BASE64",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64",
  "RESEND_API_KEY",
  "ADMIN_SMTP_HOST",
  "ADMIN_SMTP_PORT",
  "ADMIN_SMTP_USER",
  "ADMIN_SMTP_PASS",
  "ADMIN_SMTP_FROM",
  "POINT_CHARGE_PACKAGES",
  "PIG_COIN_PAYMENT_API_READY",
  "DEFAULT_FORTUNE_COST_POINTS",
];

function getSecretValue(key) {
  const raw = process.env[key];
  if (raw == null) return "";

  const value = String(raw).trim();
  if (!value) return "";

  const upper = value.toUpperCase();
  const placeholders = [
    "CHANGE_ME",
    "YOUR_",
    "EXAMPLE",
    "PUT_32_CHAR_RANDOM_HASH_HERE",
    "YOUR_SECRET",
    "YOUR_API_KEY",
  ];
  if (placeholders.some((marker) => upper.includes(marker))) return "";

  return value;
}

function putWorkerSecret(key, value) {
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const commandArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", `npx wrangler secret put ${key} --name ${workerName} --config worker/wrangler.toml`]
    : ["wrangler", "secret", "put", key, "--name", workerName, "--config", "worker/wrangler.toml"];

  if (isDryRun) {
    console.log(`[dry-run] npx wrangler secret put ${key} --name ${workerName} --config worker/wrangler.toml`);
    return 0;
  }

  const result = spawnSync(command, commandArgs, {
    input: `${value}\n`,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
    shell: false,
    env: process.env,
  });

  if (result.error) {
    console.error(`[worker-secrets] Failed to run wrangler for ${key}: ${result.error.message}`);
    return 1;
  }

  return Number.isInteger(result.status) ? result.status : 1;
}

const available = SECRET_KEYS.filter((key) => getSecretValue(key));
if (available.length === 0) {
  console.error("[worker-secrets] No usable secret values found in env files.");
  process.exit(1);
}

console.log(`[worker-secrets] Target Worker: ${workerName}`);
console.log(`[worker-secrets] ${isDryRun ? "Dry-run" : "Apply"} keys: ${available.join(", ")}`);

for (const key of available) {
  const code = putWorkerSecret(key, getSecretValue(key));
  if (code !== 0) {
    console.error(`[worker-secrets] Failed while setting ${key}. Stopping.`);
    process.exit(code);
  }
}

console.log(`[worker-secrets] Completed ${isDryRun ? "preview" : "sync"} successfully.`);
