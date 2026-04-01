import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const targets = [".open-next", ".next", "dist"];

for (const target of targets) {
  const targetPath = resolve(rootDir, target);

  if (!existsSync(targetPath)) {
    continue;
  }

  rmSync(targetPath, { recursive: true, force: true });
  console.log(`[clean-cloudflare-build] Removed ${target}`);
}

console.log("[clean-cloudflare-build] Clean step completed.");
