import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const rootDir = process.cwd();
const manifestPath = resolve(rootDir, ".next", "server", "pages-manifest.json");
const appPathsManifestPath = resolve(rootDir, ".next", "server", "app-paths-manifest.json");
const nextCli = resolve(rootDir, "node_modules", "next", "dist", "bin", "next");

function ensurePagesManifest() {
  if (!existsSync(appPathsManifestPath)) return;
  mkdirSync(dirname(manifestPath), { recursive: true });
  if (!existsSync(manifestPath)) writeFileSync(manifestPath, "{}\n", "utf8");
}

const timer = setInterval(ensurePagesManifest, 250);
const child = spawn(process.execPath, [nextCli, "build"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: false,
});

child.on("close", (code) => {
  clearInterval(timer);
  ensurePagesManifest();
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  clearInterval(timer);
  console.error("[next-build-with-pages-manifest]", error);
  process.exit(1);
});
