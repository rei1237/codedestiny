import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");
const skipEmpty = args.has("--skip-empty") || args.has("--allow-empty");
const onlyPortone = args.has("--only-portone");
const onlyKeyArg = [...args].find((arg) => arg.startsWith("--only-key="));
const onlyKey = onlyKeyArg ? normalizeEnvKey(onlyKeyArg.slice("--only-key=".length)) : "";
const continueOnTransientApiError = args.has("--continue-on-transient-api-error");
const retryDelayMs = Number(process.env.CF_SECRET_SYNC_RETRY_DELAY_MS || 15000);

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
if (!process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_APITOKEN) {
  process.env.CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_APITOKEN;
}

const workerName =
  process.env.CF_WORKER_NAME ||
  process.env.CLOUDFLARE_WORKER_NAME ||
  "code-destiny-web";

const SECRET_KEYS = [
  "API_UPSTREAM_ORIGIN",
  "SWISS_EPHEMERIS_API_URL",
  "SWISS_EPHEMERIS_URL",
  "SWISS_EPHEMERIS",
  "SWISS_API_BASE_URL",
  "ASTRO_SWISS_API_URL",
  "SWISS_EPHEMERIS_API_KEY",
  "SWISS_EPHEMERIS_KEY",
  "SWISS_API_KEY",
  "ASTRO_SWISS_API_KEY",
  "SWISS_EPHEMERIS_TIMEOUT_MS",
  "SWISS_EPHEMERIS_TIMEOUT",
  "SWISS_API_TIMEOUT_MS",
  "AUTH_API_BASE_URL",
  "AUTH_API_BASE",
  "CODE_DESTINY_API_URL",
  "AUTH_URL",
  "NEXTAUTH_URL",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "AUTH_TRUST_HOST",
  "NEXTAUTH_TRUST_HOST",
  "JWT_SECRET",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_EXPIRES_IN",
  "ACCESS_TOKEN_EXPIRES_IN",
  "REFRESH_TOKEN_EXPIRES_IN",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "AUTH_COOKIE_SECURE",
  "AUTH_COOKIE_SAMESITE",
  "CSRF_SECRET",
  // 개인정보 필드 암호화 키(worker/lib/pii-crypto.js). 미설정이면 신규 가입이 fail-closed 로 막힌다.
  "PII_ENC_KEY",
  "MONGO_URI",
  "MONGODB_URI",
  "MONGO_URL",
  "DATABASE_URL",
  "MONGO_NAME",
  "MONGO_DB_NAME",
  "PORTONE_API_BASE_URL",
  "PORTONE_API_SECRET",
  "PORTONE_API_Secret",
  "PORTONE_WEBHOOK_URL",
  "PORTONE_WEBHOOK_SECRET",
  "PORTONE_CHANNEL_KEY",
  "PORTONE_STORE_ID",
  "PORTONE_webhook_URL",
  "PORTONE_webhookurl",
  "PORTONE_webhook",
  "PORTONE_webhook_Secret",
  "PORTONE_channel",
  "PORTONE_Store",
  "MID",
  "INICISMID",
  "INIsignkey",
  "INIAPIKEY",
  "INIAPI_IV",
  "GEMINIF_API_KEY",
  "YOUTUBE_API_KEY",
  "YOUTUBE_DATA_API_KEY",
  "GOOGLE_YOUTUBE_API_KEY",
  "PEXELS_API_KEY",
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
  "KASI_SERVICE_KEY",
  "KASI_API_BASE_URL",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_OAUTH_CALLBACK",
  "NAVER_OAUTH_CLIENT_ID",
  "NAVER_OAUTH_CLIENT_SECRET",
  "NAVER_CLIENT_ID",
  "NAVER_CLIENT_SECRET",
  "NAVER_OAUTH_CALLBACK",
  "KAKAO_OAUTH_CLIENT_ID",
  "KAKAO_OAUTH_CLIENT_SECRET",
  "KAKAO_CLIENT_ID",
  "KAKAO_CLIENT_SECRET",
  "KAKAO_OAUTH_CALLBACK",
  "SUBSCRIPTION_LINK_SECRET",
  "ADMIN_SECRET_HASH",
  "FLOWER_ADMIN_SECRET",
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

const SECRET_KEY_ALIASES = {
  AUTH_SECRET: ["NEXTAUTH_SECRET"],
  JWT_SECRET: ["AUTH_SECRET", "NEXTAUTH_SECRET"],
  AUTH_URL: ["NEXTAUTH_URL"],
  AUTH_TRUST_HOST: ["NEXTAUTH_TRUST_HOST"],
  GOOGLE_OAUTH_CLIENT_ID: ["GOOGLE_CLIENT_ID"],
  GOOGLE_OAUTH_CLIENT_SECRET: ["GOOGLE_CLIENT_SECRET"],
  NAVER_OAUTH_CLIENT_ID: ["NAVER_CLIENT_ID"],
  NAVER_OAUTH_CLIENT_SECRET: ["NAVER_CLIENT_SECRET"],
  KAKAO_OAUTH_CLIENT_ID: ["KAKAO_CLIENT_ID"],
  KAKAO_OAUTH_CLIENT_SECRET: ["KAKAO_CLIENT_SECRET"],
  PORTONE_API_SECRET: ["PORTONE_API_Secret"],
  PORTONE_API_Secret: ["PORTONE_API_SECRET"],
  PORTONE_WEBHOOK_URL: ["PORTONE_webhook_URL", "PORTONE_webhookurl", "PORTONE_WEBHOOKURL"],
  PORTONE_webhook_URL: ["PORTONE_webhookurl", "PORTONE_WEBHOOK_URL", "PORTONE_WEBHOOKURL"],
  PORTONE_WEBHOOK_SECRET: ["PORTONE_webhook", "PORTONE_WEBHOOK_TOKEN", "PORTONE_webhook_Secret", "PORTONE_WEBHOOK_SECRET_KEY"],
  PORTONE_webhook: ["PORTONE_WEBHOOK_TOKEN", "PORTONE_WEBHOOK_SECRET", "PORTONE_webhook_Secret"],
  PORTONE_webhook_Secret: ["PORTONE_WEBHOOK_TOKEN", "PORTONE_WEBHOOK_SECRET", "PORTONE_webhook"],
  PORTONE_CHANNEL_KEY: ["PORTONE_channel", "PORTONE_CHANNEL"],
  PORTONE_channel: ["PORTONE_CHANNEL_KEY", "PORTONE_CHANNEL"],
  PORTONE_STORE_ID: ["PORTONE_Store", "PORTONE_STORE"],
  PORTONE_Store: ["PORTONE_STORE_ID", "PORTONE_STORE"],
  MID: ["INICISMID", "INIstoreId", "INI_STORE_ID", "INICIS_MID", "INICIS_STORE_ID"],
  INICISMID: ["MID", "INIstoreId", "INI_STORE_ID", "INICIS_MID", "INICIS_STORE_ID"],
  INIsignkey: ["INISIGNKEY", "INI_SIGNKEY", "INICIS_SIGNKEY", "INICIS_WEB_SIGNKEY"],
  INIAPIKEY: ["INI_API_KEY", "INICIS_API_KEY"],
  INIAPI_IV: ["INI_API_IV", "INICIS_API_IV"],
  GEMINIF_API_KEY: ["GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"],
  PEXELS_API_KEY: ["PEXELS_APIKEY", "PEXES_APIKEY"],
};

function getSecretValue(key) {
  const candidates = [key, ...(SECRET_KEY_ALIASES[key] || [])];
  for (const candidate of candidates) {
    const raw = process.env[candidate];
    if (!isUsableEnvValue(raw)) continue;
    return String(raw).trim();
  }
  return "";
}

function runSecretPutCommand(key, value, useVersions = false) {
  const wranglerArgs = useVersions
    ? ["wrangler", "versions", "secret", "put", key, "--name", workerName, "--config", "worker/wrangler.toml"]
    : ["wrangler", "secret", "put", key, "--name", workerName, "--config", "worker/wrangler.toml"];

  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const commandArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", `npx ${wranglerArgs.join(" ")}`]
    : wranglerArgs;

  const result = spawnSync(command, commandArgs, {
    input: `${value}\n`,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
    env: process.env,
  });

  return { result };
}

function isWorkerLatestVersionGuardError(outputText) {
  const text = String(outputText || "");
  return text.includes("latest version of your Worker isn't currently deployed")
    || (text.includes("Secret edit failed") && text.includes("wrangler versions secret put"));
}

function isBindingNameInUseError(outputText) {
  const text = String(outputText || "");
  return text.includes("Binding name")
    && text.includes("already in use")
    && text.includes("code: 10053");
}

function isTransientCloudflareApiError(outputText) {
  const text = String(outputText || "");
  return text.includes("code: 10013")
    || text.includes("An unknown error has occurred")
    || text.includes("Received a malformed response from the API")
    || /workers\/scripts\/.+\/secrets/.test(text) && /5\d\d/.test(text);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms));
}

function isAliasRelatedKey(keyA, keyB) {
  const keysA = new Set([keyA, ...(SECRET_KEY_ALIASES[keyA] || [])]);
  const keysB = new Set([keyB, ...(SECRET_KEY_ALIASES[keyB] || [])]);
  for (const key of keysA) {
    if (keysB.has(key)) return true;
  }
  return false;
}

function putWorkerSecret(key, value) {
  if (isDryRun) {
    console.log(`[dry-run] npx wrangler secret put ${key} --name ${workerName} --config worker/wrangler.toml`);
    return 0;
  }

  const maxAttempts = 3;
  let lastStatus = 1;
  let lastOutput = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) {
      console.warn(`[worker-secrets] ${key}: retrying transient Cloudflare API error (${attempt}/${maxAttempts}).`);
      sleep(retryDelayMs);
    }

    const firstTry = runSecretPutCommand(key, value, false);
    const firstStdout = String(firstTry.result.stdout || "");
    const firstStderr = String(firstTry.result.stderr || "");
    if (firstStdout) process.stdout.write(firstStdout);
    if (firstStderr) process.stderr.write(firstStderr);

    let finalResult = firstTry.result;
    let mergedOutput = `${firstStdout}\n${firstStderr}`;

    if (finalResult.status !== 0 && isWorkerLatestVersionGuardError(mergedOutput)) {
      console.warn(`[worker-secrets] ${key}: switching to 'wrangler versions secret put' due to Worker Versions guard.`);
      const retry = runSecretPutCommand(key, value, true);
      const retryStdout = String(retry.result.stdout || "");
      const retryStderr = String(retry.result.stderr || "");
      if (retryStdout) process.stdout.write(retryStdout);
      if (retryStderr) process.stderr.write(retryStderr);
      finalResult = retry.result;
      mergedOutput = `${retryStdout}\n${retryStderr}`;
    }

    if (finalResult.error) {
      console.error(`[worker-secrets] Failed to run wrangler for ${key}: ${finalResult.error.message}`);
      return 1;
    }

    if (finalResult.status !== 0 && isBindingNameInUseError(mergedOutput)) {
      console.warn(`[worker-secrets] Skipping ${key}: already defined as non-secret binding.`);
      return 0;
    }

    lastStatus = Number.isInteger(finalResult.status) ? finalResult.status : 1;
    lastOutput = mergedOutput;

    if (lastStatus === 0) return 0;
    if (!isTransientCloudflareApiError(mergedOutput)) return lastStatus;
  }

  if (continueOnTransientApiError && isTransientCloudflareApiError(lastOutput)) {
    console.warn("[worker-secrets] Cloudflare secret API kept returning a transient error; continuing because --continue-on-transient-api-error was supplied.");
    return 0;
  }

  return lastStatus;
}

const activeSecretKeys = onlyPortone
  ? ["PORTONE_API_SECRET", "PORTONE_API_Secret", "PORTONE_WEBHOOK_URL", "PORTONE_webhook_URL", "PORTONE_webhookurl", "PORTONE_WEBHOOK_SECRET", "PORTONE_webhook", "PORTONE_webhook_Secret", "PORTONE_CHANNEL_KEY", "PORTONE_channel", "PORTONE_STORE_ID", "PORTONE_Store", "MID", "INICISMID", "INIsignkey", "INIAPIKEY", "INIAPI_IV"]
  : SECRET_KEYS;

const selectedSecretKeys = onlyKey
  ? activeSecretKeys.filter((key) => normalizeEnvKey(key) === onlyKey)
  : activeSecretKeys;

const available = [];
for (const key of selectedSecretKeys) {
  const value = getSecretValue(key);
  if (!value) continue;

  const duplicate = available.find(
    (entry) => entry.value === value && isAliasRelatedKey(entry.key, key)
  );
  if (duplicate) {
    console.warn(`[worker-secrets] Skipping ${key}: duplicate value already synced via alias ${duplicate.key}.`);
    continue;
  }

  available.push({ key, value });
}

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
console.log(`[worker-secrets] ${isDryRun ? "Dry-run" : "Apply"} keys: ${available.map((entry) => entry.key).join(", ")}`);

for (const { key, value } of available) {
  const code = putWorkerSecret(key, value);
  if (code !== 0) {
    console.error(`[worker-secrets] Failed while setting ${key}. Stopping.`);
    process.exit(code);
  }
}

console.log(`[worker-secrets] Completed ${isDryRun ? "preview" : "sync"} successfully.`);
