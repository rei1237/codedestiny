import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");
const skipEmpty = args.has("--skip-empty") || args.has("--allow-empty");

const envFiles = [
  ".env.local",
  ".env.cloudflare.local",
  ".env.cloudflare",
  ".env",
  "server/.env.local",
  "server/.env",
];

function isUsableEnvValue(rawValue) {
  if (rawValue == null) return false;
  const value = String(rawValue).trim();
  if (!value) return false;

  const upper = value.toUpperCase();
  const placeholders = [
    "CHANGE_ME",
    "PLEASE_CHANGE",
    "YOUR_",
    "EXAMPLE",
    "PUT_32_CHAR_RANDOM_HASH_HERE",
    "YOUR_SECRET",
    "YOUR_API_KEY",
  ];
  if (placeholders.some((marker) => upper.includes(marker))) return false;

  return true;
}

function loadEnvPreferUsable(filePath) {
  const fileText = readFileSync(filePath, "utf8");
  const parsed = {
    ...parseRelaxedEnv(fileText),
    ...dotenv.parse(fileText),
  };
  for (const [key, value] of Object.entries(parsed)) {
    const current = process.env[key];
    const currentUsable = isUsableEnvValue(current);
    const incomingUsable = isUsableEnvValue(value);

    if (!currentUsable && incomingUsable) {
      process.env[key] = String(value).trim();
    }
  }
}

function normalizeEnvKey(rawKey) {
  return String(rawKey || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .toUpperCase();
}

function unquoteValue(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseRelaxedEnv(fileText) {
  const parsed = {};
  const lines = String(fileText || "").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    let key = "";
    let value = "";

    const equalMatch = rawLine.match(/^\s*([^=]+?)\s*=\s*(.*)$/);
    if (equalMatch) {
      key = equalMatch[1];
      value = equalMatch[2];
    } else {
      const colonMatch = rawLine.match(/^\s*([^:#=][^:]*?)\s*:\s*(.*)$/);
      if (!colonMatch) continue;
      key = colonMatch[1];
      value = colonMatch[2];
    }

    const normalizedKey = normalizeEnvKey(key);
    if (!normalizedKey) continue;
    parsed[normalizedKey] = unquoteValue(value);
  }

  return parsed;
}

for (const envFile of envFiles) {
  const envPath = resolve(rootDir, envFile);
  if (!existsSync(envPath)) continue;
  loadEnvPreferUsable(envPath);
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
  "MONGO_NAME",
  "MONGO_DB_NAME",
  "PORTONE_API_BASE_URL",
  "PORTONE_API_KEY",
  "PORTONE_API_SECRET",
  "PORTONE_WEBHOOK_TOKEN",
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_MODEL",
  "PREMIUM_GEMINI_MODEL",
  "LIFEBOOK_GEMINI_MODEL",
  "LOVE_SECRET_GEMINI_MODEL",
  "PSYCHO_ANALYSIS_GEMINI_MODEL",
  "SUKUYO_GEMINI_MODEL",
  "ASTRO_GEMINI_MODEL",
  "VEDIC_GEMINI_MODEL",
  "ZIWEI_GEMINI_MODEL",
  "PSYCHO_ANALYSIS_PROVIDER_TIMEOUT_MS",
  "PREMIUM_GEMINI_TIMEOUT_MS",
  "ANTHROPIC_API_KEY",
  "DEEPL_API_KEY",
  "KASI_SERVICE_KEY",
  "KASI_API_BASE_URL",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_CALLBACK",
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
  if (!isUsableEnvValue(raw)) return "";
  return String(raw).trim();
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
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
    env: process.env,
  });

  const stdout = String(result.stdout || "");
  const stderr = String(result.stderr || "");
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  if (result.error) {
    console.error(`[worker-secrets] Failed to run wrangler for ${key}: ${result.error.message}`);
    return 1;
  }

  if (result.status !== 0) {
    const merged = `${stdout}\n${stderr}`;
    // Wrangler returns this when a key already exists as a non-secret [vars] binding.
    if (merged.includes("Binding name") && merged.includes("already in use") && merged.includes("code: 10053")) {
      console.warn(`[worker-secrets] Skipping ${key}: already defined as non-secret binding.`);
      return 0;
    }
  }

  return Number.isInteger(result.status) ? result.status : 1;
}

const available = SECRET_KEYS.filter((key) => getSecretValue(key));
if (available.length === 0) {
  const message = "[worker-secrets] No usable secret values found in env files.";
  if (skipEmpty) {
    console.warn(`${message} Skipping because --skip-empty was supplied.`);
    process.exit(0);
  }
  console.error(message);
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
