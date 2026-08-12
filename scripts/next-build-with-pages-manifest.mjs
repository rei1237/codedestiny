import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const rootDir = process.cwd();
const manifestPath = resolve(rootDir, ".next", "server", "pages-manifest.json");
const appManifestPath = resolve(rootDir, ".next", "server", "app-paths-manifest.json");
const middlewareManifestPath = resolve(rootDir, ".next", "server", "middleware-manifest.json");
const serverReferenceManifestPath = resolve(rootDir, ".next", "server", "server-reference-manifest.json");
const buildManifestPath = resolve(rootDir, ".next", "build-manifest.json");
const pagesDir = resolve(rootDir, ".next", "server", "pages");
const appDir = resolve(rootDir, ".next", "server", "app");
const server404JsPath = resolve(rootDir, ".next", "server", "pages", "404.js");
const server500JsPath = resolve(rootDir, ".next", "server", "pages", "500.js");
const server404Path = resolve(rootDir, ".next", "server", "pages", "404.html");
const server500Path = resolve(rootDir, ".next", "server", "pages", "500.html");
const export404Path = resolve(rootDir, ".next", "export", "404.html");
const export500Path = resolve(rootDir, ".next", "export", "500.html");
const exportDetailPath = resolve(rootDir, ".next", "export-detail.json");
const diagnosticsPath = resolve(rootDir, ".next", "diagnostics", "build-diagnostics.json");
const routesManifestPath = resolve(rootDir, ".next", "routes-manifest.json");
const nextCli = resolve(rootDir, "node_modules", "next", "dist", "bin", "next");
const manifestReadGuardRequire = "--require=./scripts/next-manifest-read-guard.cjs";
const stableBuildWorkerMode = "0";
const exportSuccessGraceMs = Number.parseInt(process.env.CD_NEXT_EXPORT_SUCCESS_GRACE_MS || "90000", 10);
const maxBuildAttempts = Math.max(1, Number.parseInt(process.env.CD_NEXT_BUILD_ATTEMPTS || "2", 10) || 1);

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removeBuildOutputWithRetry(target) {
  for (let attemptIndex = 0; attemptIndex < 40; attemptIndex += 1) {
    try {
      rmSync(target, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!["EBUSY", "ENOTEMPTY", "EPERM"].includes(error?.code) || attemptIndex === 39) throw error;
      sleepSync(100);
    }
  }
}

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

function ensureHtmlFallback(filePath, title) {
  if (existsSync(filePath)) return;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><main>${title}</main></body></html>\n`,
    "utf8",
  );
}

const ERROR_PAGE_STUB_SOURCE = "module.exports = require('./_error.js');\n";
// 진짜 번들을 한 번이라도 본 경로. 아래 주석 참고 — 이 경로에는 스텁을 다시 쓰지 않는다.
const realErrorPageBundlesSeen = new Set();

function ensurePageJsFallback(filePath) {
  if (existsSync(filePath)) {
    try {
      if (readFileSync(filePath, "utf8") !== ERROR_PAGE_STUB_SOURCE) {
        realErrorPageBundlesSeen.add(filePath);
      }
    } catch {
      // 빌드 중 부분 기록 상태일 수 있다. 다음 폴링에서 다시 판정한다.
    }
    return;
  }

  // Next 는 static generation 이 끝나면 export 된 페이지의 서버 번들을 unlink 한다
  // (build/index.js "remove server bundles that were exported"). output:"export" 인 경우
  // 그 뒤 writeFullyStaticExport 가 같은 모듈을 다시 require 해서 out/ 을 만든다.
  // 25ms 폴링이 그 창에서 _error 스텁을 채워 넣으면, 두 번째 export 가 스텁을 읽어
  // 커스텀 404(pages/404.tsx)가 프레임워크 기본 404 로 바뀐다.
  // 실물을 본 적 있는 경로는 건드리지 않고, 한 번도 못 본 경우(빌드 초반 크래시 방어)에만 채운다.
  if (realErrorPageBundlesSeen.has(filePath)) return;
  // 🔴 per-path seen 가드는 폴링이 실물을 한 번도 관찰하지 못한 타이밍에 뚫린다 — unlink 가
  // 두 폴링 틱 사이에 끝나면 seen 이 비어 있어 스텁이 들어가고, 커스텀 404 가 기본 404 로
  // 내보내져 adsense-readiness 게이트가 릴리스를 통째로 막는다(2026-08-12 #496 릴리스 실패 실측).
  // routes-manifest 는 컴파일 완료 후에 쓰이고 unlink 는 항상 그 뒤(static generation 이후)이므로,
  // 그 존재 = "빈 자리는 크래시가 아니라 Next 의 의도적 unlink"다. 이때는 스텁을 쓰지 않는다.
  // 빌드 초반 크래시 방어(routes-manifest 이전)는 그대로 유지된다.
  if (hasCoreRoutesManifest()) return;

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, ERROR_PAGE_STUB_SOURCE, "utf8");
}

function ensureServerPagesFallbacks() {
  if (!existsSync(pagesDir) || !existsSync(buildManifestPath)) return;
  ensurePageJsFallback(server404JsPath);
  ensurePageJsFallback(server500JsPath);
  ensureHtmlFallback(server404Path, "404");
  ensureHtmlFallback(server500Path, "500");
  ensureErrorPagesBuildManifestEntries();
}

function ensureErrorPagesBuildManifestEntries() {
  const buildManifest = readJsonObject(buildManifestPath);
  const pages = buildManifest.pages;
  if (!pages || typeof pages !== "object" || Array.isArray(pages)) return;
  const errorFiles = pages["/_error"];
  if (!Array.isArray(errorFiles) || errorFiles.length === 0) return;

  let changed = false;
  for (const route of ["/404", "/500"]) {
    if (Array.isArray(pages[route]) && pages[route].length > 0) continue;
    pages[route] = [...errorFiles];
    changed = true;
  }

  if (changed) writeJsonAtomic(buildManifestPath, buildManifest);
}

function ensureExportFallbacks() {
  ensureHtmlFallback(export404Path, "404");
  ensureHtmlFallback(export500Path, "500");
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
  const current = Object.fromEntries(
    Object.entries(readJsonObject(appManifestPath)).filter(([, outputPath]) => (
      typeof outputPath === "string" && existsSync(resolve(rootDir, ".next", "server", outputPath))
    )),
  );
  const entries = collectAppPathsManifestEntries();
  const notFoundOutputPath = join(appDir, "_not-found", "page.js");
  if (existsSync(notFoundOutputPath)) {
    entries["/_not-found"] = "app/_not-found/page.js";
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
  ensureServerPagesFallbacks();
}

function seedRuntimeGuardManifests() {
  seedEmptyMiddlewareManifest();
  seedEmptyServerReferenceManifest();
  ensurePagesManifest();
  if (existsSync(buildManifestPath) && (existsSync(appManifestPath) || existsSync(join(appDir, "_not-found", "page.js")))) {
    ensureAppPathsManifest();
  }
  ensureServerPagesFallbacks();
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
  if (hasCoreRoutesManifest()) return true;

  console.error(
    [
      "[next-build-with-pages-manifest] missing .next/routes-manifest.json after next build.",
      "This is a core Next.js build artifact and will not be synthesized.",
      "Check the earlier Next build/export error before re-running the build.",
    ].join(" "),
  );
  return false;
}

function hasCoreRoutesManifest() {
  return existsSync(routesManifestPath);
}

function hasSuccessfulExportDetail() {
  const detail = readJsonObject(exportDetailPath);
  return detail.success === true && typeof detail.outDirectory === "string";
}

function stopChildBuildTree() {
  if (!child) return;
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

function clearBuildOutputsForRetry() {
  // .next 를 지우면 "실물 번들을 봤다"는 기록도 무효가 된다.
  // 비우지 않으면 재시도 빌드 초반에 스텁 방어가 영영 동작하지 않는다.
  realErrorPageBundlesSeen.clear();
  for (const target of [resolve(rootDir, ".next"), resolve(rootDir, "out")]) {
    removeBuildOutputWithRetry(target);
  }
}

let child = null;
let manifestGuard = null;
let exportSuccessWatchdog = null;
let finished = false;
let attempt = 0;
let exportSuccessSeenAt = 0;

function clearAttemptTimers() {
  if (manifestGuard) clearInterval(manifestGuard);
  if (exportSuccessWatchdog) clearInterval(exportSuccessWatchdog);
  manifestGuard = null;
  exportSuccessWatchdog = null;
}

function startNextBuildAttempt() {
  attempt += 1;
  exportSuccessSeenAt = 0;
  ensureBuildDiagnostics();
  seedPrebuildManifests();
  manifestGuard = startManifestGuard();

  child = spawn(process.execPath, [nextCli, "build"], {
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

  exportSuccessWatchdog = setInterval(() => {
    if (!hasSuccessfulExportDetail()) {
      exportSuccessSeenAt = 0;
      return;
    }

    exportSuccessSeenAt ||= Date.now();
    if (Date.now() - exportSuccessSeenAt < exportSuccessGraceMs) return;

    console.warn("[next-build-with-pages-manifest] export succeeded but next build did not exit; finalizing completed export.");
    stopChildBuildTree();
    finishBuild(0);
  }, 5000);
  exportSuccessWatchdog.unref?.();

  child.on("close", finishBuild);

  child.on("error", (error) => {
    if (finished) return;
    finished = true;
    clearAttemptTimers();
    console.error("[next-build-with-pages-manifest]", error);
    process.exit(1);
  });
}

function finishBuild(code) {
  if (finished) return;
  clearAttemptTimers();
  let manifestRepairFailed = false;

  try {
    ensureBuildManifests({ exportFallback: true });
  } catch (error) {
    manifestRepairFailed = true;
    console.error("[next-build-with-pages-manifest] manifest repair failed:", error);
  }

  const routesManifestOk = hasCoreRoutesManifest();
  if ((code !== 0 || manifestRepairFailed || !routesManifestOk) && attempt < maxBuildAttempts) {
    console.warn(`[next-build-with-pages-manifest] build attempt ${attempt}/${maxBuildAttempts} failed; retrying from a clean Next output.`);
    clearBuildOutputsForRetry();
    startNextBuildAttempt();
    return;
  }

  finished = true;

  if (!routesManifestOk && !assertCoreRoutesManifest()) {
    process.exit(code === 0 ? 1 : (code ?? 1));
  }

  if (manifestRepairFailed) {
    process.exit(1);
  }

  process.exit(code ?? 1);
}

startNextBuildAttempt();
