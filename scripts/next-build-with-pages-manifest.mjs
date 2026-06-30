import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const rootDir = process.cwd();
const manifestPath = resolve(rootDir, ".next", "server", "pages-manifest.json");
const appManifestPath = resolve(rootDir, ".next", "server", "app-paths-manifest.json");
const middlewareManifestPath = resolve(rootDir, ".next", "server", "middleware-manifest.json");
const serverReferenceManifestPath = resolve(rootDir, ".next", "server", "server-reference-manifest.json");
const pagesDir = resolve(rootDir, ".next", "server", "pages");
const appDir = resolve(rootDir, ".next", "server", "app");
const export404Path = resolve(rootDir, ".next", "export", "404.html");
const export500Path = resolve(rootDir, ".next", "export", "500.html");
const diagnosticsPath = resolve(rootDir, ".next", "diagnostics", "build-diagnostics.json");
const routesManifestPath = resolve(rootDir, ".next", "routes-manifest.json");
const nextCli = resolve(rootDir, "node_modules", "next", "dist", "bin", "next");
const manifestReadGuardRequire = "--require=./scripts/next-manifest-read-guard.cjs";
const stableBuildWorkerMode = "0";

function withManifestReadGuard(nodeOptions = "") {
  return [nodeOptions, manifestReadGuardRequire].filter(Boolean).join(" ");
}

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

function ensureExportHtmlFallback(filePath, title) {
  if (existsSync(filePath)) return;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><main>${title}</main></body></html>\n`,
    "utf8",
  );
}

function ensureExportFallbacks() {
  ensureExportHtmlFallback(export404Path, "404");
  ensureExportHtmlFallback(export500Path, "500");
}

function ensurePagesManifest({ exportFallback = false } = {}) {
  const requiredEntries = {
    "/_app": "../../node_modules/next/dist/pages/_app.js",
    "/_error": "../../node_modules/next/dist/pages/_error.js",
    "/_document": "../../node_modules/next/dist/pages/_document.js",
  };
  const current = readJsonObject(manifestPath);
  const entries = collectPagesManifestEntries();
  const merged = { ...requiredEntries, ...current, ...entries };
  if (Object.keys(merged).length === 0) {
    seedEmptyPagesManifest();
    return;
  }
  if (JSON.stringify(current) === JSON.stringify(merged)) {
    if (exportFallback) ensureExportFallbacks();
    return;
  }

  try {
    writeJsonAtomic(manifestPath, merged);
    if (exportFallback) ensureExportFallbacks();
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
  if (Object.keys(merged).length === 0) {
    seedEmptyAppPathsManifest();
    return;
  }
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
  const requiredEntries = {
    "/_app": "../../node_modules/next/dist/pages/_app.js",
    "/_error": "../../node_modules/next/dist/pages/_error.js",
    "/_document": "../../node_modules/next/dist/pages/_document.js",
  };
  const current = readJsonObject(manifestPath);
  const merged = { ...requiredEntries, ...current };
  if (JSON.stringify(current) === JSON.stringify(merged)) return;
  writeJsonAtomic(manifestPath, merged);
}

function seedEmptyAppPathsManifest() {
  if (existsSync(appManifestPath)) return;
  writeJsonAtomic(appManifestPath, {});
}

function seedEmptyMiddlewareManifest() {
  if (existsSync(middlewareManifestPath)) return;
  writeJsonAtomic(middlewareManifestPath, {
    version: 3,
    middleware: {},
    functions: {},
    sortedMiddleware: [],
  });
}

function seedEmptyServerReferenceManifest() {
  if (existsSync(serverReferenceManifestPath)) return;
  writeJsonAtomic(serverReferenceManifestPath, {
    node: {},
    edge: {},
    encryptionKey: "",
  });
}

function seedPrebuildManifests() {
  seedEmptyPagesManifest();
  seedEmptyMiddlewareManifest();
  seedEmptyServerReferenceManifest();
}

function seedRuntimeGuardManifests() {
  seedEmptyMiddlewareManifest();
  seedEmptyServerReferenceManifest();
  ensurePagesManifest();
}

function startManifestGuard() {
  seedRuntimeGuardManifests();
  const timer = setInterval(() => {
    try {
      seedRuntimeGuardManifests();
    } catch {
      // best-effort guard while Next rebuilds .next/server
    }
  }, 25);
  timer.unref?.();
  return timer;
}

function assertCoreRoutesManifest() {
  if (existsSync(routesManifestPath)) return true;

  console.error(
    [
      "[next-build-with-pages-manifest] missing .next/routes-manifest.json after next build.",
      "This is a core Next.js build artifact and will not be synthesized.",
      "Check the earlier Next build/export error before re-running the build.",
    ].join(" "),
  );
  return false;
}

ensureBuildDiagnostics();
seedPrebuildManifests();
const manifestGuard = startManifestGuard();

const child = spawn(process.execPath, [nextCli, "build"], {
  cwd: rootDir,
  env: {
    ...process.env,
    CIRCLE_NODE_TOTAL: process.env.CIRCLE_NODE_TOTAL || "1",
    NEXT_PRIVATE_BUILD_WORKER: process.env.NEXT_PRIVATE_BUILD_WORKER || stableBuildWorkerMode,
    NODE_OPTIONS: withManifestReadGuard(process.env.NODE_OPTIONS),
  },
  stdio: "inherit",
  shell: false,
});

child.on("close", (code) => {
  clearInterval(manifestGuard);
  let manifestRepairFailed = false;

  try {
    ensureBuildManifests({ exportFallback: true });
  } catch (error) {
    manifestRepairFailed = true;
    console.error("[next-build-with-pages-manifest] manifest repair failed:", error);
  }

  if (!assertCoreRoutesManifest()) {
    process.exit(code === 0 ? 1 : (code ?? 1));
  }

  if (manifestRepairFailed) {
    process.exit(1);
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  clearInterval(manifestGuard);
  console.error("[next-build-with-pages-manifest]", error);
  process.exit(1);
});
