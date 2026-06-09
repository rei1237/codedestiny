import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

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
  if (lastError?.code === "EPERM" && existsSync(targetPath) && statSync(targetPath).isDirectory()) {
    for (const entry of readdirSync(targetPath)) {
      rmSync(join(targetPath, entry), { recursive: true, force: true, maxRetries: 8, retryDelay: 300 });
    }
    return;
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
