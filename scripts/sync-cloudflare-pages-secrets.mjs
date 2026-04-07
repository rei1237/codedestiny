import { existsSync, readFileSync } from "node:fs";
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
];

for (const envFile of envFiles) {
  const envPath = resolve(rootDir, envFile);
  if (!existsSync(envPath)) continue;
  dotenv.config({ path: envPath, override: false });
}

const projectName =
  process.env.CF_PAGES_PROJECT_NAME ||
  process.env.CLOUDFLARE_PAGES_PROJECT_NAME ||
  process.env.CLOUDFLARE_PROJECT_NAME ||
  "code-destiny";

const SECRET_KEYS = [
  "MONGO_URI",
  "MONGO_DB_NAME",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "YOUTUBE_API_KEY",
  "GEMINI_API_KEY_2",
  "GOOGLE_API_KEY_2",
  "GEMINI_API_KEY_3",
  "GOOGLE_API_KEY_3",
  "ANTHROPIC_API_KEY",
  "DEEPL_API_KEY",
  "PORTONE_API_KEY",
  "PORTONE_API_SECRET",
  "JWT_SECRET",
  "ADMIN_SECRET_HASH",
  "AUTH_API_BASE_URL",
  "AUTH_FRONTEND_BASE_URL",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "NAVER_OAUTH_CLIENT_ID",
  "NAVER_OAUTH_CLIENT_SECRET",
  "KAKAO_OAUTH_CLIENT_ID",
  "KAKAO_OAUTH_CLIENT_SECRET",
  "KASI_SERVICE_KEY",
  "KASI_API_BASE_URL",
];

function getSecretValue(key) {
  const raw = process.env[key];
  if (raw == null) return "";
  const value = String(raw).trim();
  if (!value) return "";

  const upper = value.toUpperCase();
  const placeholderMarkers = [
    "CHANGE_ME",
    "PUT_32_CHAR_RANDOM_HASH_HERE",
    "YOUR_",
    "EXAMPLE",
  ];
  if (placeholderMarkers.some((marker) => upper.includes(marker))) {
    return "";
  }

  return value;
}

function putPagesSecret(project, key, value) {
  const cmd = process.platform === "win32" ? "cmd.exe" : "npx";
  const cmdArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npx wrangler pages secret put ${key} --project-name ${project}`]
      : ["wrangler", "pages", "secret", "put", key, "--project-name", project];

  if (isDryRun) {
    console.log(`[dry-run] npx wrangler pages secret put ${key} --project-name ${project}`);
    return 0;
  }

  const result = spawnSync(cmd, cmdArgs, {
    input: `${value}\n`,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
    shell: false,
    env: process.env,
  });

  if (result.error) {
    console.error(`[secrets] Failed to run wrangler for ${key}: ${result.error.message}`);
    return 1;
  }
  return Number.isInteger(result.status) ? result.status : 1;
}

const available = SECRET_KEYS.filter((key) => getSecretValue(key));
if (available.length === 0) {
  console.error(
    "[secrets] No secret values found in env files (.env.cloudflare.local/.env.cloudflare/.env.local/.env)."
  );
  process.exit(1);
}

console.log(`[secrets] Target project: ${projectName}`);
console.log(`[secrets] ${isDryRun ? "Dry-run" : "Apply"} keys: ${available.join(", ")}`);

for (const key of available) {
  const value = getSecretValue(key);
  const code = putPagesSecret(projectName, key, value);
  if (code !== 0) {
    console.error(`[secrets] Failed while setting ${key}. Stopping.`);
    process.exit(code);
  }
}

console.log(`[secrets] Completed ${isDryRun ? "preview" : "sync"} successfully.`);

