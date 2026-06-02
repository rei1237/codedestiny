import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const targets = [".open-next", ".next/cache", ".next", "dist", "out"];

function wait(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removeTarget(targetPath) {
  let lastError = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      rmSync(targetPath, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
      return;
    } catch (error) {
      lastError = error;
      wait(180 + attempt * 120);
    }
  }
  throw lastError;
}

for (const target of targets) {
  const targetPath = resolve(rootDir, target);

  if (!existsSync(targetPath)) {
    continue;
  }

  removeTarget(targetPath);
  console.log(`[clean-cloudflare-build] Removed ${target}`);
}

console.log("[clean-cloudflare-build] Clean step completed.");
