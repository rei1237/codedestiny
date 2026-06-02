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
];

function isUsableEnvValue(rawValue) {
  if (rawValue == null) return false;
  const value = String(rawValue).trim();
  if (!value) return false;

  const upper = value.toUpperCase();
  const placeholderMarkers = [
    "CHANGE_ME",
    "PLEASE_CHANGE",
    "PUT_32_CHAR_RANDOM_HASH_HERE",
    "YOUR_",
    "EXAMPLE",
  ];
  if (placeholderMarkers.some((marker) => upper.includes(marker))) return false;

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

const projectName =
  process.env.CF_PAGES_PROJECT_NAME ||
  process.env.CLOUDFLARE_PAGES_PROJECT_NAME ||
  process.env.CLOUDFLARE_PROJECT_NAME ||
  "code-destiny";

const PAGES_PUBLIC_KEYS = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_AUTH_API_BASE_URL",
  "NEXT_PUBLIC_PORTONE_MOBILE_REDIRECT_PATH",
];

function getSecretValue(key) {
  const raw = process.env[key];
  if (!isUsableEnvValue(raw)) return "";
  return String(raw).trim();
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

const available = PAGES_PUBLIC_KEYS.filter((key) => getSecretValue(key));
if (available.length === 0) {
  const message =
    "[secrets] No Pages public values found in env files (.env.cloudflare.local/.env.cloudflare/.env.local/.env).";
  if (skipEmpty) {
    console.warn(`${message} Skipping because --skip-empty was supplied.`);
    process.exit(0);
  }
  console.error(message);
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

