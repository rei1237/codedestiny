import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const isWindows = process.platform === "win32";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizeSemver(versionRange) {
  if (typeof versionRange !== "string") {
    return undefined;
  }

  const match = versionRange.match(/\d+\.\d+\.\d+/);
  return match ? match[0] : undefined;
}

function resolveNextVersion() {
  const installedNextPackage = resolve(rootDir, "node_modules", "next", "package.json");
  if (existsSync(installedNextPackage)) {
    const installedVersion = readJson(installedNextPackage).version;
    if (typeof installedVersion === "string" && installedVersion.length > 0) {
      return installedVersion;
    }
  }

  const lockFilePath = resolve(rootDir, "package-lock.json");
  if (existsSync(lockFilePath)) {
    const lockFile = readJson(lockFilePath);
    const lockVersion = lockFile?.packages?.["node_modules/next"]?.version;
    if (typeof lockVersion === "string" && lockVersion.length > 0) {
      return lockVersion;
    }
  }

  const rootPackage = readJson(resolve(rootDir, "package.json"));
  const declaredRange = rootPackage?.dependencies?.next || rootPackage?.devDependencies?.next;
  const normalized = normalizeSemver(declaredRange);
  if (normalized) {
    return normalized;
  }

  throw new Error("Unable to resolve NEXT_VERSION from node_modules, package-lock.json, or package.json.");
}

const nextVersion = resolveNextVersion();
console.log(`[build-cloudflare] Using NEXT_VERSION=${nextVersion}`);

const command = isWindows ? "cmd.exe" : "npx";
const commandArgs = isWindows
  ? ["/d", "/s", "/c", "npx @opennextjs/cloudflare build --dangerouslyUseUnsupportedNextVersion"]
  : ["@opennextjs/cloudflare", "build", "--dangerouslyUseUnsupportedNextVersion"];

const result = spawnSync(command, commandArgs, {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    NEXT_VERSION: nextVersion,
  },
});

if (result.error) {
  console.error(`[build-cloudflare] Failed to start build command: ${result.error.message}`);
}

// OpenNext 빌드 성공 시 handler.mjs 추가 minification (minifyIdentifiers: true)
// OpenNext 자체는 minifyIdentifiers 를 생략하므로 여기서 보완한다.
if (result.status === 0) {
  const minifyCmd = isWindows ? "cmd.exe" : "node";
  const minifyArgs = isWindows
    ? ["/d", "/s", "/c", "node scripts/minify-handler.mjs"]
    : ["scripts/minify-handler.mjs"];
  const minifyResult = spawnSync(minifyCmd, minifyArgs, {
    stdio: "inherit",
    shell: false,
    env: { ...process.env },
  });
  if (minifyResult.error) {
    console.warn(`[build-cloudflare] minify-handler failed to start: ${minifyResult.error.message}`);
  }
}

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
