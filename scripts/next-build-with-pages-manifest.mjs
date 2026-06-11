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

function collectAppPathsManifestEntries(dir = appDir, entries = {}) {
  if (!existsSync(dir)) return entries;

  let items = [];
  try {
    items = readdirSync(dir);
  } catch (error) {
    if (error?.code === "ENOENT") return entries;
    throw error;
  }

  for (const item of items) {
    const fullPath = join(dir, item);
    let stat = null;
    try {
      stat = statSync(fullPath);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }

    if (stat.isDirectory()) {
      collectAppPathsManifestEntries(fullPath, entries);
      continue;
    }

    if (item !== "page.js" && item !== "route.js") continue;

    const relativeFile = relative(appDir, fullPath).split(sep).join("/");
    entries[`/${relativeFile.replace(/\.js$/, "")}`] = `app/${relativeFile}`;
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

function ensurePagesManifest({ exportFallback = false } = {}) {
  if (readManifestKeys().length > 0) {
    if (exportFallback) ensureExport500Fallback();
    return;
  }

  const entries = collectPagesManifestEntries();
  if (Object.keys(entries).length === 0) {
    seedEmptyPagesManifest();
    return;
  }

  try {
    writeJsonAtomic(manifestPath, entries);
    if (exportFallback) ensureExport500Fallback();
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

function ensureAppPathsManifest() {
  const current = readJsonObject(appManifestPath);
  const entries = collectAppPathsManifestEntries();
  const notFoundOutputPath = join(appDir, "_not-found", "page.js");
  if (existsSync(notFoundOutputPath)) {
    entries["/_not-found/page"] = "app/_not-found/page.js";
  }
  const merged = { ...current, ...entries };
  if (Object.keys(merged).length === 0) return;
  if (JSON.stringify(current) === JSON.stringify(merged)) return;

  writeJsonAtomic(appManifestPath, merged);
}

function ensureBuildManifests(options = {}) {
  ensurePagesManifest(options);
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

function seedEmptyAppPathsManifest() {
  if (existsSync(appManifestPath)) return;
  writeJsonAtomic(appManifestPath, {});
}

ensureBuildDiagnostics();

const child = spawn(process.execPath, [nextCli, "build"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: false,
});

child.on("close", (code) => {
  if (code === 0) ensureBuildManifests({ exportFallback: true });
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("[next-build-with-pages-manifest]", error);
  process.exit(1);
});
