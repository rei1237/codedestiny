import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname } from "node:path";

const root = process.cwd();

const scanRoots = [
  resolve(root, ".open-next"),
  resolve(root, "dist"),
  resolve(root, ".next", "static"),
];

const SKIP_FILE_NAMES = new Set();

const textExtensions = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".map",
  ".txt",
  ".html",
  ".css",
]);

const secretNamePatterns = [
  /\bGEMINIF_API_KEY\d*\b/i,
  /\bANTHROPIC_API_KEY\b/i,
  /\bDEEPL_API_KEY\b/i,
  /\bPORTONE_API_KEY\b/i,
  /\bPORTONE_API_SECRET\b/i,
  /\bJWT_SECRET\b/i,
  /\bADMIN_SECRET_HASH\b/i,
  /\b[A-Z0-9_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PRIVATE[_-]?KEY)\b/i,
];

// Artifact leak signatures (key assignment with inline string-like value).
const secretAssignmentPatterns = [
  /\b(?:GEMINIF_API_KEY\d*|ANTHROPIC_API_KEY|DEEPL_API_KEY|PORTONE_API_KEY|PORTONE_API_SECRET|JWT_SECRET|ADMIN_SECRET_HASH)\b\s*[:=]\s*["'`][^"'`\n]{1,}["'`]/i,
  /\b[A-Z][A-Z0-9_]{2,}(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PRIVATE[_-]?KEY)\b\s*[:=]\s*["'`][^"'`\n]{8,}["'`]/,
  /AIza[0-9A-Za-z\-_]{20,}/,
];

function collectEnvSecretValues() {
  const out = [];
  for (const [key, raw] of Object.entries(process.env)) {
    if (!raw || String(raw).trim().length < 12) continue;
    if (secretNamePatterns.some((re) => re.test(key))) {
      out.push({ key, value: String(raw) });
    }
  }
  return out;
}

function walk(dir, acc) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, acc);
      continue;
    }
    acc.push(full);
  }
}

const files = [];
for (const dir of scanRoots) walk(dir, files);

const envSecretValues = collectEnvSecretValues();
const findings = [];

for (const file of files) {
  const ext = extname(file).toLowerCase();
  if (!textExtensions.has(ext)) continue;
  const baseName = file.replace(/\\/g, "/").split("/").pop();
  if (SKIP_FILE_NAMES.has(baseName)) continue;

  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const re of secretAssignmentPatterns) {
    if (re.test(text)) {
      findings.push(`[name] ${file}`);
      break;
    }
  }

  for (const item of envSecretValues) {
    if (text.includes(item.value)) {
      findings.push(`[value:${item.key}] ${file}`);
      break;
    }
  }
}

if (findings.length > 0) {
  console.error("[verify-no-secret-leak] Secret-like content found in build artifacts:");
  for (const line of findings.slice(0, 100)) {
    console.error(` - ${line}`);
  }
  if (findings.length > 100) {
    console.error(` ... and ${findings.length - 100} more`);
  }
  process.exit(1);
}

console.log("[verify-no-secret-leak] OK: no secret names/values found in scanned build artifacts.");
