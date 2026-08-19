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

/**
 * 동기화 타깃. 🔴 환경변수가 아니라 명시 인자로만 갈린다 — "남아 있는 변수"로 타깃을 정하면
 * 변수가 새는 날 스테이징 값이 프로덕션 워커를 덮어쓴다.
 *
 *   npm run secrets:cf:worker -- --target=staging --dry-run
 */
const targetArg = [...args].find((arg) => arg.startsWith("--target="));
const syncTarget = targetArg ? targetArg.slice("--target=".length).trim() : "production";
if (!["production", "staging"].includes(syncTarget)) {
  console.error(`[secrets] Unknown --target=${syncTarget}. Use production or staging.`);
  process.exit(1);
}
const workerConfigPath = syncTarget === "staging" ? "worker/wrangler.staging.toml" : "worker/wrangler.toml";

// 스테이징은 .env.staging.local 이 가장 먼저다. 프로덕션 파일을 그대로 두고 그 위에 PortOne
// 테스트 채널 값만 덮어쓸 수 있어야 한다(같은 MONGO_URI, 다른 결제 자격증명).
const envFiles = syncTarget === "staging"
  ? [
    ".env.staging.local",
    ".env.local",
    ".env.cloudflare.local",
    ".env.cloudflare",
    ".env",
  ]
  : [
    ".env.local",
    ".env.cloudflare.local",
    ".env.cloudflare",
    ".env",
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

const PRODUCTION_WORKER_NAME = "code-destiny-web";

/** 대상 설정 파일의 `name` 을 읽는다. 이름을 두 곳에 적어 두면 언젠가 한쪽만 바뀐다. */
function workerNameFromConfig() {
  const configFile = resolve(rootDir, workerConfigPath);
  if (!existsSync(configFile)) return "";
  return readFileSync(configFile, "utf8").match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1] || "";
}

// 🔴 스테이징은 CF_WORKER_NAME 을 보지 않는다.
//
// 그 변수는 프로덕션 배포용이라 .env.local 이나 셸에 `code-destiny-web` 으로 남아 있는 것이
// 정상이다. 예전에는 스테이징도 같은 변수를 먼저 읽어서, 그 정상적인 값 하나 때문에 스테이징
// 동기화가 "프로덕션 워커로 해석됐다"며 통째로 멈췄다 — 사용자가 자기 환경을 고쳐야 스크립트가
// 도는 구조였다. 타깃이 다르면 읽는 변수도 달라야 한다.
const workerName = syncTarget === "staging"
  ? (process.env.CF_STAGING_WORKER_NAME || workerNameFromConfig() || "code-destiny-web-staging")
  : (process.env.CF_WORKER_NAME || process.env.CLOUDFLARE_WORKER_NAME || workerNameFromConfig() || PRODUCTION_WORKER_NAME);

// 🔴 --target=staging 인데 프로덕션 워커를 가리키면 여기서 끝낸다. 이 스크립트는 인자 없이 돌면
//    시크릿을 통째로 덮어쓰므로, 타깃이 어긋난 채 진행되는 것이 가장 비싼 실패다.
if (syncTarget === "staging" && workerName === PRODUCTION_WORKER_NAME) {
  console.error(`[secrets] --target=staging resolved to the production Worker '${PRODUCTION_WORKER_NAME}'. Unset CF_WORKER_NAME or point it at the staging Worker.`);
  process.exit(1);
}

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
  // 관리자 진입 비밀번호 해시. 이게 없으면 worker/routes/admin.js 의 verifyAdminEntryPassword
  // 가 fail-closed 로 막혀 /admin 전체가 잠긴다 — 실제 게이트인데 오래 목록에서 빠져 있었다.
  "ADMIN_ENTRY_PASSWORD_HASH",
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
    ? ["wrangler", "versions", "secret", "put", key, "--name", workerName, "--config", workerConfigPath]
    : ["wrangler", "secret", "put", key, "--name", workerName, "--config", workerConfigPath];

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

/** 마지막 실패의 wrangler 출력. 부트스트랩 안내를 조건부로 띄우는 데만 쓴다. */
let lastFailureOutput = "";

/**
 * 워커가 아직 없다는 신호. Cloudflare·wrangler 가 이 경우를 여러 문구로 알린다
 * (에러코드 10007 · "script not found" · "doesn't seem to be a Worker" 생성 프롬프트).
 */
function looksLikeMissingWorker(output) {
  return /10007|script[_ ]not[_ ]found|doesn't seem to be a worker|does not exist/i.test(String(output || ""));
}

function putWorkerSecret(key, value) {
  if (isDryRun) {
    console.log(`[dry-run] npx wrangler secret put ${key} --name ${workerName} --config ${workerConfigPath}`);
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

  lastFailureOutput = lastOutput;
  return lastStatus;
}

const activeSecretKeys = onlyPortone
  ? ["PORTONE_API_SECRET", "PORTONE_API_Secret", "PORTONE_WEBHOOK_URL", "PORTONE_webhook_URL", "PORTONE_webhookurl", "PORTONE_WEBHOOK_SECRET", "PORTONE_webhook", "PORTONE_webhook_Secret", "PORTONE_CHANNEL_KEY", "PORTONE_channel", "PORTONE_STORE_ID", "PORTONE_Store", "MID", "INICISMID", "INIsignkey", "INIAPIKEY", "INIAPI_IV"]
  : SECRET_KEYS;

/**
 * 🔴 스테이징에 넣지 않는 시크릿.
 *
 * .env.staging.local 은 프로덕션 .env.local 위에 얹히므로, 막지 않으면 과금 LLM 키가 그대로
 * 상속되어 스테이징 테스트가 조용히 유료 경로를 탄다. 스테이징에서 실제 생성 품질을 봐야 할 때만
 * `--target=staging --only-key=GEMINIF_API_KEY` 로 한 번 넣고, 확인이 끝나면 대시보드에서 지운다.
 */
const STAGING_EXCLUDED_KEYS = new Set(["GEMINIF_API_KEY", "ANTHROPIC_API_KEY"]);

const targetFilteredKeys = syncTarget === "staging" && !onlyKey
  ? activeSecretKeys.filter((key) => {
    if (!STAGING_EXCLUDED_KEYS.has(normalizeEnvKey(key))) return true;
    console.warn(`[worker-secrets] Skipping ${key}: excluded from staging (과금 LLM 키).`);
    return false;
  })
  : activeSecretKeys;

const selectedSecretKeys = onlyKey
  ? targetFilteredKeys.filter((key) => normalizeEnvKey(key) === onlyKey)
  : targetFilteredKeys;

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
    // 🔴 순서 함정. 시크릿은 **워커가 이미 존재해야** 넣을 수 있는데, 워커는 첫 배포로 생긴다.
    //    처음 스테이징을 세울 때 이 순서를 모르면 wrangler 원문 에러만 보고 한참 헤맨다.
    if (looksLikeMissingWorker(lastFailureOutput)) {
      console.error(`[worker-secrets] '${workerName}' 워커가 아직 없습니다. 시크릿은 워커가 존재해야 넣을 수 있습니다.`);
      console.error("[worker-secrets] 먼저 워커를 한 번 만든 뒤 다시 실행하세요:");
      console.error(`[worker-secrets]   npx wrangler deploy --config ${workerConfigPath}`);
      console.error("[worker-secrets] 그 배포는 시크릿이 없어 런타임이 동작하지 않습니다 — 껍데기를 만드는 것이 목적입니다.");
    }
    process.exit(code);
  }
}

console.log(`[worker-secrets] Completed ${isDryRun ? "preview" : "sync"} successfully.`);
