import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const rootDir = process.cwd();
const manifestPath = resolve(rootDir, ".next", "server", "pages-manifest.json");

if (existsSync(manifestPath)) {
  console.log("[ensure-pages-manifest] pages-manifest.json already exists.");
  process.exit(0);
}

mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, "{}\n", "utf8");
console.log("[ensure-pages-manifest] Created fallback .next/server/pages-manifest.json");
