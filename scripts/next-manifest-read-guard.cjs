const fs = require("fs");
const Module = require("module");
const path = require("path");
const { fileURLToPath } = require("url");

const guardedManifests = new Map([
  ["server-reference-manifest.json", {
    node: {},
    edge: {},
    encryptionKey: "",
  }],
]);
const waitableServerManifests = new Set([
  "pages-manifest.json",
  "app-paths-manifest.json",
  "middleware-manifest.json",
]);
const rootDevelopmentManifests = new Map([
  ["routes-manifest.json", () => ({
    version: 3,
    pages404: true,
    caseSensitive: false,
    basePath: "",
    redirects: [],
    headers: [],
    rewrites: {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    },
    dynamicRoutes: [],
    staticRoutes: [],
    dataRoutes: [],
    rsc: {
      header: "RSC",
      varyHeader: "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch",
      prefetchHeader: "Next-Router-Prefetch",
      didPostponeHeader: "x-nextjs-postponed",
      contentTypeHeader: "text/x-component",
      suffix: ".rsc",
      prefetchSuffix: ".prefetch.rsc",
      prefetchSegmentHeader: "Next-Router-Segment-Prefetch",
      prefetchSegmentSuffix: ".segment.rsc",
      prefetchSegmentDirSuffix: ".segments",
    },
    rewriteHeaders: {
      pathHeader: "x-nextjs-rewritten-path",
      queryHeader: "x-nextjs-rewritten-query",
    },
    skipMiddlewareUrlNormalize: false,
  })],
  ["prerender-manifest.json", () => ({
    version: 4,
    routes: {},
    dynamicRoutes: {},
    notFoundRoutes: [],
    preview: {
      previewModeId: "",
      previewModeSigningKey: "",
      previewModeEncryptionKey: "",
    },
  })],
  ["required-server-files.json", () => ({
    version: 1,
    config: {
      assetPrefix: "",
      basePath: "",
      trailingSlash: true,
      poweredByHeader: true,
      generateEtags: true,
      reactMaxHeadersLength: 6000,
      htmlLimitedBots: "",
      images: {
        unoptimized: true,
      },
      experimental: {
        ppr: false,
        staleTimes: {},
        cacheLife: {},
        serverActions: {},
        taint: false,
        devtoolSegmentExplorer: false,
        clientSegmentCache: false,
        clientParamParsing: false,
        dynamicOnHover: false,
        inlineCss: false,
        authInterrupts: false,
        clientTraceMetadata: [],
      },
    },
    appDir: process.cwd(),
    relativeAppDir: "",
    files: [],
    ignore: [],
  })],
]);

function toPathString(filePath) {
  if (filePath instanceof URL) return fileURLToPath(filePath);
  if (typeof filePath === "string") return filePath;
  return "";
}

function isNextExportHtmlPromotion(sourcePath, targetPath) {
  const source = path.normalize(toPathString(sourcePath));
  const target = path.normalize(toPathString(targetPath));
  if (!source || !target) return false;
  const fileName = path.basename(source);
  if (fileName !== "404.html" && fileName !== "500.html") return false;
  if (path.basename(target) !== fileName) return false;
  return (
    source.includes(`${path.sep}.next${path.sep}export${path.sep}`)
    && target.includes(`${path.sep}.next${path.sep}server${path.sep}pages${path.sep}`)
  );
}

function canRetryRenameWithOverwrite(error, sourcePath, targetPath) {
  return (
    (error?.code === "EPERM" || error?.code === "EEXIST")
    && isNextExportHtmlPromotion(sourcePath, targetPath)
    && fs.existsSync(toPathString(targetPath))
  );
}

function ensureGuardedManifest(filePath) {
  const pathString = toPathString(filePath);
  if (!pathString) return false;

  const normalizedPath = path.normalize(pathString);
  const manifest = guardedManifests.get(path.basename(normalizedPath));
  if (!manifest) return false;
  if (!normalizedPath.includes(`${path.sep}.next${path.sep}server${path.sep}`)) return false;

  fs.mkdirSync(path.dirname(normalizedPath), { recursive: true });
  if (!fs.existsSync(normalizedPath)) {
    fs.writeFileSync(normalizedPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
  return true;
}

function isDevelopmentManifestFallbackEnabled() {
  const argv = process.argv.map((value) => String(value || ""));
  if (argv.includes("build") || argv.includes("export")) return false;
  if (process.env.NODE_ENV === "production") return false;
  return argv.includes("dev") || process.env.NODE_ENV === "development" || process.env.NEXT_PHASE === "phase-development-server";
}

function isNextRootManifestPath(filePath) {
  const pathString = toPathString(filePath);
  if (!pathString) return false;
  const normalizedPath = path.normalize(pathString);
  return path.dirname(normalizedPath).endsWith(`${path.sep}.next`);
}

function ensureRootDevelopmentManifest(filePath) {
  if (!isDevelopmentManifestFallbackEnabled()) return false;
  if (!isNextRootManifestPath(filePath)) return false;

  const pathString = toPathString(filePath);
  const fileName = path.basename(pathString);
  const buildText = fileName === "BUILD_ID" ? "development\n" : "";
  const manifestFactory = rootDevelopmentManifests.get(fileName);
  if (!buildText && !manifestFactory) return false;

  fs.mkdirSync(path.dirname(pathString), { recursive: true });
  if (!fs.existsSync(pathString)) {
    fs.writeFileSync(
      pathString,
      buildText || `${JSON.stringify(manifestFactory(), null, 2)}\n`,
      "utf8",
    );
  }
  return true;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isNextServerAppModulePath(filePath) {
  const pathString = toPathString(filePath);
  if (!pathString) return false;
  const normalizedPath = path.normalize(pathString);
  if (!normalizedPath.includes(`${path.sep}.next${path.sep}server${path.sep}app${path.sep}`)) return false;
  return normalizedPath.endsWith(`${path.sep}page.js`) || normalizedPath.endsWith(`${path.sep}route.js`);
}

function waitForExistingFile(filePath) {
  const pathString = toPathString(filePath);
  if (!pathString) return false;
  for (let index = 0; index < 300; index += 1) {
    if (fs.existsSync(pathString)) return true;
    sleep(50);
  }
  return fs.existsSync(pathString);
}

function isWaitableServerManifestPath(filePath) {
  const pathString = toPathString(filePath);
  if (!pathString) return false;
  const normalizedPath = path.normalize(pathString);
  if (!normalizedPath.includes(`${path.sep}.next${path.sep}server${path.sep}`)) return false;
  return waitableServerManifests.has(path.basename(normalizedPath));
}

function isNextJsonPath(filePath) {
  const pathString = toPathString(filePath);
  if (!pathString) return false;
  const normalizedPath = path.normalize(pathString);
  return normalizedPath.includes(`${path.sep}.next${path.sep}`) && normalizedPath.endsWith(".json");
}

function fileContentsText(contents) {
  if (Buffer.isBuffer(contents)) return contents.toString("utf8");
  if (typeof contents === "string") return contents;
  return "";
}

function looksIncompleteJson(contents) {
  const text = fileContentsText(contents).trim();
  if (!text) return true;
  const first = text[0];
  const last = text[text.length - 1];
  return (first === "{" && last !== "}") || (first === "[" && last !== "]");
}

function readStableNextJsonSync(filePath, args, currentContents) {
  if (!isNextJsonPath(filePath) || !looksIncompleteJson(currentContents)) return currentContents;
  let latestContents = currentContents;
  for (let index = 0; index < 120; index += 1) {
    sleep(50);
    latestContents = readFileSync.call(fs, filePath, ...args);
    if (!looksIncompleteJson(latestContents)) return latestContents;
  }
  return latestContents;
}

async function readStableNextJson(filePath, args, currentContents) {
  if (!isNextJsonPath(filePath) || !looksIncompleteJson(currentContents)) return currentContents;
  let latestContents = currentContents;
  for (let index = 0; index < 120; index += 1) {
    sleep(50);
    latestContents = await readFile.call(fs.promises, filePath, ...args);
    if (!looksIncompleteJson(latestContents)) return latestContents;
  }
  return latestContents;
}

const readFileSync = fs.readFileSync;
const renameSync = fs.renameSync;
fs.renameSync = function guardedRenameSync(sourcePath, targetPath, ...args) {
  try {
    return renameSync.call(this, sourcePath, targetPath, ...args);
  } catch (error) {
    if (canRetryRenameWithOverwrite(error, sourcePath, targetPath)) {
      fs.rmSync(targetPath, { force: true });
      return renameSync.call(this, sourcePath, targetPath, ...args);
    }
    throw error;
  }
};

const rename = fs.rename;
fs.rename = function guardedRename(sourcePath, targetPath, callback) {
  return rename.call(this, sourcePath, targetPath, (error) => {
    if (!error || !canRetryRenameWithOverwrite(error, sourcePath, targetPath)) {
      callback(error);
      return;
    }

    fs.rm(targetPath, { force: true }, (removeError) => {
      if (removeError) {
        callback(error);
        return;
      }
      rename.call(this, sourcePath, targetPath, callback);
    });
  });
};

fs.readFileSync = function guardedReadFileSync(filePath, ...args) {
  try {
    return readStableNextJsonSync(filePath, args, readFileSync.call(this, filePath, ...args));
  } catch (error) {
    if (error?.code === "ENOENT" && ensureRootDevelopmentManifest(filePath)) {
      return readStableNextJsonSync(filePath, args, readFileSync.call(this, filePath, ...args));
    }
    if (error?.code === "ENOENT" && isWaitableServerManifestPath(filePath) && waitForExistingFile(filePath)) {
      return readStableNextJsonSync(filePath, args, readFileSync.call(this, filePath, ...args));
    }
    if (error?.code === "ENOENT" && ensureGuardedManifest(filePath)) {
      return readStableNextJsonSync(filePath, args, readFileSync.call(this, filePath, ...args));
    }
    throw error;
  }
};

const readFile = fs.promises.readFile;
const renamePromise = fs.promises.rename;
fs.promises.rename = async function guardedRenamePromise(sourcePath, targetPath, ...args) {
  try {
    return await renamePromise.call(this, sourcePath, targetPath, ...args);
  } catch (error) {
    if (canRetryRenameWithOverwrite(error, sourcePath, targetPath)) {
      await fs.promises.rm(targetPath, { force: true });
      return renamePromise.call(this, sourcePath, targetPath, ...args);
    }
    throw error;
  }
};

fs.promises.readFile = async function guardedReadFile(filePath, ...args) {
  try {
    return await readStableNextJson(filePath, args, await readFile.call(this, filePath, ...args));
  } catch (error) {
    if (error?.code === "ENOENT" && ensureRootDevelopmentManifest(filePath)) {
      return await readStableNextJson(filePath, args, await readFile.call(this, filePath, ...args));
    }
    if (error?.code === "ENOENT" && isWaitableServerManifestPath(filePath) && waitForExistingFile(filePath)) {
      return readStableNextJson(filePath, args, await readFile.call(this, filePath, ...args));
    }
    if (error?.code === "ENOENT" && ensureGuardedManifest(filePath)) {
      return readStableNextJson(filePath, args, await readFile.call(this, filePath, ...args));
    }
    throw error;
  }
};

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function guardedResolveFilename(request, parent, isMain, options) {
  if (typeof request === "string") {
    ensureGuardedManifest(request);
  }

  if (
    typeof request === "string"
    && /^\.\/[^/\\]+\.js$/.test(request)
    && parent?.filename
    && path.basename(parent.filename) === "webpack-runtime.js"
    && parent.filename.includes(`${path.sep}.next${path.sep}server${path.sep}`)
  ) {
    const candidate = path.join(path.dirname(parent.filename), "chunks", request.slice(2));
    if (fs.existsSync(candidate)) return candidate;
  }

  try {
    return resolveFilename.call(this, request, parent, isMain, options);
  } catch (error) {
    if (error?.code === "MODULE_NOT_FOUND" && isNextServerAppModulePath(request) && waitForExistingFile(request)) {
      return resolveFilename.call(this, request, parent, isMain, options);
    }
    throw error;
  }
};
