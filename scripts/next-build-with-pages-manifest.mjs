import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const rootDir = process.cwd();
const manifestPath = resolve(rootDir, ".next", "server", "pages-manifest.json");
const appManifestPath = resolve(rootDir, ".next", "server", "app-paths-manifest.json");
const pagesDir = resolve(rootDir, ".next", "server", "pages");
const appDir = resolve(rootDir, ".next", "server", "app");
const export500Path = resolve(rootDir, ".next", "export", "500.html");
const diagnosticsPath = resolve(rootDir, ".next", "diagnostics", "build-diagnostics.json");
const nextCli = resolve(rootDir, "node_modules", "next", "dist", "bin", "next");

function readJsonObject(filePath) {
  if (!existsSync(filePath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeJsonAtomic(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tmpPath, filePath);
}

function readManifestKeys() {
  return Object.keys(readJsonObject(manifestPath));
}

function collectPagesManifestEntries(dir = pagesDir, entries = {}) {
  if (!existsSync(dir)) return entries;

  for (const item of readdirSync(dir)) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      collectPagesManifestEntries(fullPath, entries);
      continue;
    }

    if (!item.endsWith(".js")) continue;

    const relativeFile = relative(pagesDir, fullPath).split(sep).join("/");
    const route = `/${relativeFile.replace(/\.js$/, "").replace(/\/index$/, "")}` || "/";
    entries[route === "" ? "/" : route] = `pages/${relativeFile}`;
  }

  return entries;
}

function ensureExport500Fallback() {
  if (!existsSync(join(pagesDir, "500.js"))) return;
  if (!existsSync(dirname(export500Path))) return;
  if (existsSync(export500Path)) return;

  writeFileSync(
    export500Path,
    "<!doctype html><html><head><meta charset=\"utf-8\"><title>500</title></head><body><main>500</main></body></html>\n",
    "utf8",
  );
}

function ensurePagesManifest() {
  if (readManifestKeys().length > 0) {
    ensureExport500Fallback();
    return;
  }

  const entries = collectPagesManifestEntries();
  if (Object.keys(entries).length === 0) {
    seedEmptyPagesManifest();
    return;
  }

  try {
    writeJsonAtomic(manifestPath, entries);
    ensureExport500Fallback();
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

function ensureAppPathsManifest() {
  const notFoundOutputPath = join(appDir, "_not-found", "page.js");
  if (!existsSync(notFoundOutputPath)) return;

  const current = readJsonObject(appManifestPath);
  const merged = { ...current, "/_not-found/page": "app/_not-found/page.js" };
  if (JSON.stringify(current) === JSON.stringify(merged)) return;

  writeJsonAtomic(appManifestPath, merged);
}

function ensureBuildManifests() {
  ensurePagesManifest();
  ensureAppPathsManifest();
}

function ensureBuildDiagnostics() {
  if (existsSync(diagnosticsPath)) return;
  writeJsonAtomic(diagnosticsPath, {});
}

function seedEmptyPagesManifest() {
  if (existsSync(manifestPath)) return;
  writeJsonAtomic(manifestPath, {});
}

seedEmptyPagesManifest();
ensureBuildDiagnostics();

const timer = setInterval(ensureBuildManifests, 100);
const child = spawn(process.execPath, [nextCli, "build"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: false,
});

child.on("close", (code) => {
  clearInterval(timer);
  ensureBuildManifests();
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  clearInterval(timer);
  console.error("[next-build-with-pages-manifest]", error);
  process.exit(1);
});
