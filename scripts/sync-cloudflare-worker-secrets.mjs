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
];

for (const envFile of envFiles) {
  const envPath = resolve(rootDir, envFile);
  if (!existsSync(envPath)) continue;
  dotenv.config({ path: envPath, override: false });
}

const workerConfig = resolve(rootDir, "wrangler.json");
if (!existsSync(workerConfig)) {
  console.error("[worker-secrets] wrangler.json not found.");
  process.exit(1);
}

const SECRET_KEYS = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "PAGESPEED_API_KEY",
  "GOOGLE_PAGESPEED_API_KEY",
  "ANTHROPIC_API_KEY",
  "DEEPL_API_KEY",
  "PORTONE_API_KEY",
  "PORTONE_API_SECRET",
  "JWT_SECRET",
  "ADMIN_SECRET_HASH",
];

function getSecretValue(key) {
  const raw = process.env[key];
  if (raw == null) return "";
  return String(raw).trim();
}

function putWorkerSecret(key, value) {
  const cmd = process.platform === "win32" ? "cmd.exe" : "npx";
  const cmdArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npx wrangler secret put ${key} --config wrangler.json`]
      : ["wrangler", "secret", "put", key, "--config", workerConfig];

  if (isDryRun) {
    console.log(`[dry-run] npx wrangler secret put ${key} --config ${workerConfig}`);
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
    console.error(`[worker-secrets] Failed to run wrangler for ${key}: ${result.error.message}`);
    return 1;
  }

  return Number.isInteger(result.status) ? result.status : 1;
}

const available = SECRET_KEYS.filter((key) => getSecretValue(key));
if (available.length === 0) {
  console.error(
    "[worker-secrets] No secret values found in env files (.env.cloudflare.local/.env.cloudflare/.env.local/.env).",
  );
  process.exit(1);
}

console.log(`[worker-secrets] ${isDryRun ? "Dry-run" : "Apply"} keys: ${available.join(", ")}`);

for (const key of available) {
  const value = getSecretValue(key);
  const code = putWorkerSecret(key, value);
  if (code !== 0) {
    console.error(`[worker-secrets] Failed while setting ${key}. Stopping.`);
    process.exit(code);
  }
}

console.log(`[worker-secrets] Completed ${isDryRun ? "preview" : "sync"} successfully.`);
