import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const CHUNKS_DIR = resolve(process.cwd(), ".next", "static", "chunks");
const DEFAULT_BUDGET_BYTES = 900 * 1024;
const budget = Number.parseInt(process.env.BUNDLE_BUDGET_BYTES || "", 10) || DEFAULT_BUDGET_BYTES;

function listFilesRecursively(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(listFilesRecursively(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

try {
  const files = listFilesRecursively(CHUNKS_DIR);
  const total = files.reduce((sum, file) => sum + statSync(file).size, 0);

  console.log(`[bundle-budget] JS chunks total: ${total} bytes`);
  console.log(`[bundle-budget] Budget: ${budget} bytes`);

  if (total > budget) {
    console.error(`[bundle-budget] FAIL: ${total - budget} bytes over budget`);
    process.exit(1);
  }

  console.log("[bundle-budget] PASS");
} catch (error) {
  console.error("[bundle-budget] FAIL: unable to inspect .next build output");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
