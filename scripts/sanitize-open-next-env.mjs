import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const envFile = resolve(root, ".open-next", "cloudflare", "next-env.mjs");

// Only keep explicitly non-secret runtime knobs in generated artifacts.
const SAFE_ENV_KEYS = new Set([
  "PSYCHO_ANALYSIS_GEMINI_MODEL",
  "PSYCHO_ANALYSIS_MAX_TOKENS",
  "NODE_ENV",
]);

function parseExportObject(source, exportName) {
  const re = new RegExp(`export const ${exportName} = (\\{[\\s\\S]*?\\});`);
  const m = source.match(re);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    return null;
  }
}

function sanitizeMap(input) {
  const out = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (SAFE_ENV_KEYS.has(key)) {
      out[key] = value;
    }
  }
  return out;
}

function buildExportLine(name, obj) {
  return `export const ${name} = ${JSON.stringify(obj)};`;
}

if (!existsSync(envFile)) {
  console.log("[sanitize-open-next-env] No .open-next/cloudflare/next-env.mjs file found. Skipping.");
  process.exit(0);
}

const source = readFileSync(envFile, "utf8");
const production = sanitizeMap(parseExportObject(source, "production"));
const development = sanitizeMap(parseExportObject(source, "development"));
const testEnv = sanitizeMap(parseExportObject(source, "test"));

const nextSource = [
  buildExportLine("production", production),
  buildExportLine("development", development),
  buildExportLine("test", testEnv),
  "",
].join("\n");

writeFileSync(envFile, nextSource, "utf8");
console.log("[sanitize-open-next-env] Sanitized .open-next/cloudflare/next-env.mjs");
