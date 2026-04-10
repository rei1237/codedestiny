import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, extname } from "node:path";

const rootDir = process.cwd();
const handlerPath = resolve(rootDir, ".open-next", "server-functions", "default", "handler.mjs");
const serverFnDir = resolve(rootDir, ".open-next", "server-functions", "default");

const MAX_MAIN_BYTES = Number.parseInt(process.env.CF_WORKER_MAIN_BUDGET_BYTES || "2900000", 10);
const HEAVY_FILE_MIN_BYTES = Number.parseInt(process.env.CF_WORKER_HEAVY_FILE_MIN_BYTES || "200000", 10);

function toMiB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absPath, out);
      continue;
    }
    const st = statSync(absPath);
    out.push({ path: absPath, size: st.size });
  }
  return out;
}

if (!existsSync(handlerPath)) {
  console.warn("[verify-worker-size-budget] handler.mjs not found. Skipping size budget check.");
  process.exit(0);
}

const handlerBytes = statSync(handlerPath).size;
const allFiles = walkFiles(serverFnDir);
const codeLike = allFiles.filter((f) => {
  const ext = extname(f.path).toLowerCase();
  if (![".js", ".mjs", ".cjs", ".json"].includes(ext)) return false;
  return !f.path.includes("\\public\\") && !f.path.includes("/public/");
});

const heavyFiles = codeLike
  .filter((f) => f.size >= HEAVY_FILE_MIN_BYTES)
  .sort((a, b) => b.size - a.size)
  .slice(0, 12)
  .map((f) => ({
    path: relative(rootDir, f.path),
    size: f.size,
    miB: toMiB(f.size),
  }));

console.log(
  `[verify-worker-size-budget] handler.mjs=${handlerBytes} bytes (${toMiB(handlerBytes)} MiB), budget=${MAX_MAIN_BYTES} bytes (${toMiB(MAX_MAIN_BYTES)} MiB)`,
);

if (handlerBytes > MAX_MAIN_BYTES) {
  console.error("[verify-worker-size-budget] FAIL: Worker main bundle exceeds configured budget.");
  if (heavyFiles.length > 0) {
    console.error("[verify-worker-size-budget] Top heavy runtime files:");
    for (const file of heavyFiles) {
      console.error(`- ${file.path}: ${file.size} bytes (${file.miB} MiB)`);
    }
  }
  process.exit(2);
}

console.log("[verify-worker-size-budget] OK: Worker main bundle is within budget.");
