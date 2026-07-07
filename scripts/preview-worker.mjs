import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

function loadEnvFiles() {
  const rootDir = process.cwd();
  const envFiles = [".env.local", ".env.cloudflare.local", ".env.cloudflare", ".env"];

  for (const envFile of envFiles) {
    const envPath = resolve(rootDir, envFile);
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

loadEnvFiles();

const args = ["wrangler", "dev", "--config", "worker/wrangler.toml"];

const orderedKeys = [
  "GEMINIF_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];

for (const key of orderedKeys) {
  const value = String(process.env[key] || "").trim();
  if (!value) continue;
  args.push("--var", `${key}=${value}`);
  break;
}

const result = process.platform === "win32"
  ? spawnSync("npx", args, {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd(),
      env: process.env,
    })
  : spawnSync("npx", args, {
      stdio: "inherit",
      shell: false,
      cwd: process.cwd(),
      env: process.env,
    });

if (result.error) {
  console.error("[preview-worker] Failed to start wrangler:", result.error.message);
  process.exit(1);
}

process.exit(typeof result.status === "number" ? result.status : 1);
