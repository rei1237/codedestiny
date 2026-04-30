import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");

const workerName =
  process.env.CF_WORKER_NAME ||
  process.env.CLOUDFLARE_WORKER_NAME ||
  "code-destiny-web";

// .env.example 파싱 (기본값)
function parseEnvExample() {
  const path = resolve(rootDir, ".env.example");
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/);
  const secrets = {};
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    let key, value;
    if (line.includes(":")) {
      const parts = line.split(":");
      key = parts[0].trim();
      value = parts.slice(1).join(":").trim();
    } else if (line.includes("=")) {
      const parts = line.split("=");
      key = parts[0].trim();
      value = parts.slice(1).join("=").trim();
    } else continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).trim();
    }
    if (key && value) secrets[key] = value;
  }
  return secrets;
}

const finalSecrets = parseEnvExample();

// 유저 요청에 따른 강제 오버라이드 및 보정
finalSecrets["MONGO_DB_NAME"] = "code_destiny";
finalSecrets["AUTH_API_BASE_URL"] = "https://codedestiny-5md.pages.dev";
finalSecrets["AUTH_TRUST_HOST"] = "true";

// AUTH_SECRET이 없으면 안전을 위해 생성 (NextAuth 호환)
if (!finalSecrets["AUTH_SECRET"]) {
  finalSecrets["AUTH_SECRET"] = finalSecrets["JWT_SECRET"] || crypto.randomBytes(32).toString("hex");
}

// GEMINIF_API_KEYn 매핑
for (let i = 1; i <= 9; i++) {
  const oldKey = `GEMINIF_API_KEY${i}`;
  if (finalSecrets[oldKey]) {
    const newKey = i === 1 ? "GEMINI_API_KEY" : `GEMINI_API_KEY_${i}`;
    // GEMINI_API_KEY_n 형식이 없으면 보충해준다.
    if (!finalSecrets[newKey]) {
      finalSecrets[newKey] = finalSecrets[oldKey];
    }
  }
}
if (finalSecrets["portone api"]) finalSecrets["PORTONE_API_KEY"] = finalSecrets["portone api"];

const TARGET_KEYS = [
  "JWT_SECRET",
  "AUTH_SECRET",
  "AUTH_TRUST_HOST",
  "AUTH_API_BASE_URL",
  "MONGO_URI",
  "MONGO_DB_NAME",
  "KAKAO_OAUTH_CLIENT_ID",
  "KAKAO_OAUTH_CLIENT_SECRET",
  "NAVER_OAUTH_CLIENT_ID",
  "NAVER_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "KASI_SERVICE_KEY",
  "YOUTUBE_API_KEY",
  "GEMINI_API_KEY",
  "GEMINI_API_KEY_2",
  "GEMINI_API_KEY_3",
  "GEMINI_API_KEY_4",
  "GEMINI_API_KEY_5",
  "GEMINI_API_KEY_6",
  "GEMINI_API_KEY_7",
  "GEMINI_API_KEY_8",
  "GEMINI_API_KEY_9",
  "GEMINIF_API_KEY",
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINIF_API_KEY5",
  "GEMINIF_API_KEY6",
  "GEMINIF_API_KEY7",
  "GEMINIF_API_KEY8",
  "GEMINIF_API_KEY9",
  "PAGESPEED_API_KEY",
  "EMAILAPI",
  "PORTONE_API_KEY",
];

function putWorkerSecret(workerName, key, value) {
  const cmd = process.platform === "win32" ? "cmd.exe" : "npx";
  const cmdArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npx wrangler versions secret put ${key} --name ${workerName}`]
      : ["wrangler", "versions", "secret", "put", key, "--name", workerName];

  if (isDryRun) {
    console.log(`[dry-run] npx wrangler versions secret put ${key} --name ${workerName}`);
    return 0;
  }

  const result = spawnSync(cmd, cmdArgs, {
    input: `${value}\n`,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
    shell: false,
    env: process.env,
  });

  if (result.error) return 1;
  return Number.isInteger(result.status) ? result.status : 1;
}

const available = TARGET_KEYS.filter((key) => finalSecrets[key]);
console.log(`[secrets] Apply keys: ${available.join(", ")}`);

for (const key of available) {
  const value = finalSecrets[key];
  putWorkerSecret(workerName, key, value);
}

console.log(`[secrets] Completed sync successfully.`);
