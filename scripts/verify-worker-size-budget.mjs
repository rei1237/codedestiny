import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, extname } from "node:path";
import { gzipSync } from "node:zlib";

const rootDir = process.cwd();
const handlerPath = resolve(rootDir, ".open-next", "server-functions", "default", "handler.mjs");
const serverFnDir = resolve(rootDir, ".open-next", "server-functions", "default");

// Cloudflare Workers 무료 플랜: 3 MiB 압축(gzip) 기준.
// handler.mjs의 gzip 압축 크기로 가늠한다. 최종 worker.js 번들에 미들웨어 등
// 소량의 오버헤드(~50 KB)가 추가되므로, 실제 한도보다 ~150 KB 작게 설정한다.
const CF_FREE_LIMIT_BYTES = 3 * 1024 * 1024; // 3 MiB
const OVERHEAD_ALLOWANCE_BYTES = Number.parseInt(
  process.env.CF_WORKER_OVERHEAD_BYTES || String(150 * 1024),
  10,
);
const MAX_HANDLER_GZIP_BYTES = Number.parseInt(
  process.env.CF_WORKER_MAIN_BUDGET_BYTES || String(CF_FREE_LIMIT_BYTES - OVERHEAD_ALLOWANCE_BYTES),
  10,
);
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

// gzip level 9로 압축해 Cloudflare 업로드 크기를 추정한다.
const handlerContent = readFileSync(handlerPath);
const gzipped = gzipSync(handlerContent, { level: 9 });
const gzipBytes = gzipped.length;

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
  `[verify-worker-size-budget] handler.mjs raw=${handlerBytes} bytes (${toMiB(handlerBytes)} MiB)` +
  `, gzip=${gzipBytes} bytes (${toMiB(gzipBytes)} MiB)` +
  `, budget=${MAX_HANDLER_GZIP_BYTES} bytes (${toMiB(MAX_HANDLER_GZIP_BYTES)} MiB compressed)`,
);

if (gzipBytes > MAX_HANDLER_GZIP_BYTES) {
  console.error("[verify-worker-size-budget] FAIL: Worker bundle (gzip estimate) exceeds free-plan budget.");
  console.error(`  handler.mjs gzip: ${toMiB(gzipBytes)} MiB, limit: ${toMiB(MAX_HANDLER_GZIP_BYTES)} MiB`);
  if (heavyFiles.length > 0) {
    console.error("[verify-worker-size-budget] Top heavy runtime files (raw):");
    for (const file of heavyFiles) {
      console.error(`- ${file.path}: ${file.size} bytes (${file.miB} MiB)`);
    }
  }
  process.exit(2);
}

console.log("[verify-worker-size-budget] OK: Worker bundle (gzip estimate) is within budget.");
