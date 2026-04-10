import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const serverPublicDir = resolve(rootDir, ".open-next", "server-functions", "default", "public");

const pruneTargets = [
  "tadagochi.html",
  "fuctionassets/tadagochi-local",
];

let removed = 0;
for (const rel of pruneTargets) {
  const target = resolve(serverPublicDir, rel);
  if (!existsSync(target)) continue;
  rmSync(target, { recursive: true, force: true });
  removed += 1;
  console.log(`[prune-server-function-static-heavy] Removed ${target}`);
}

if (removed === 0) {
  console.log("[prune-server-function-static-heavy] No prune targets found.");
} else {
  console.log(`[prune-server-function-static-heavy] Completed. removed=${removed}`);
}
