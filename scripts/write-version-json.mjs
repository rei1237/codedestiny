import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function runGit(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) return "";
  return String(result.stdout || "").trim();
}

function firstNonEmpty(values) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

const rootDir = process.cwd();
const distDir = resolve(rootDir, "dist");

function readPackageVersion() {
  try {
    const packageJsonPath = resolve(rootDir, "package.json");
    const raw = readFileSync(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw);
    return String(parsed?.version || "").trim();
  } catch (e) {
    return "";
  }
}

if (!existsSync(distDir)) {
  console.error("[write-version-json] dist directory not found. Run build first.");
  process.exit(1);
}

const commitSha = firstNonEmpty([
  process.env.CF_PAGES_COMMIT_SHA,
  process.env.GITHUB_SHA,
  process.env.VERCEL_GIT_COMMIT_SHA,
  runGit(["rev-parse", "HEAD"]),
]);

const timeStamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const commitShort = commitSha ? commitSha.slice(0, 12) : `build-${timeStamp}`;

const branch = firstNonEmpty([
  process.env.CF_PAGES_BRANCH,
  process.env.GITHUB_REF_NAME,
  process.env.VERCEL_GIT_COMMIT_REF,
  runGit(["rev-parse", "--abbrev-ref", "HEAD"]),
]) || "unknown";

const builtAt = new Date().toISOString();
const appVersion = firstNonEmpty([
  process.env.NEXT_PUBLIC_APP_VERSION,
  process.env.APP_VERSION,
  readPackageVersion(),
  "0.0.0",
]);
const deploymentMode = firstNonEmpty([
  process.env.DEPLOYMENT_MODE,
  "manual-pages-only",
]);
const environment = firstNonEmpty([
  process.env.CF_PAGES === "1" || process.env.CF_PAGES === "true" ? "production" : "",
  process.env.NODE_ENV,
  "production",
]);
const source = "pages";
const buildSource = firstNonEmpty([
  process.env.CF_PAGES_URL ? "cloudflare-pages" : "",
  process.env.GITHUB_ACTIONS ? "github-actions" : "",
  "local",
]);
const payload = {
  ok: true,
  service: "code-destiny",
  appVersion,
  gitSha: commitSha || "unknown",
  buildTime: builtAt,
  environment,
  source,
  commit: commitSha || "unknown",
  commitShort,
  branch,
  builtAt,
  deploymentMode,
  buildSource,
};

const versionPath = resolve(distDir, "version.json");
const staticDir = resolve(distDir, "static");
const staticVersionPath = resolve(staticDir, "version.json");
// public/ 사본은 `next dev` 가 /version.json 을 서빙하도록 두는 로컬 미러이고 .gitignore 대상이다.
// 추적하면 매 빌드가 워킹트리를 더럽혀 deploy:production 의 dirty 검사가 승격을 막는다.
const publicVersionPath = resolve(rootDir, "public", "version.json");
// OpenNext 경유 배포는 .open-next/assets 를 서빙한다. prepare-cloudflare-dist 가 public 을 그쪽에
// 병합하는 시점은 여기보다 앞이라, 직접 써 주지 않으면 지난 빌드 값이 남는다.
const openNextAssetsDir = resolve(rootDir, ".open-next", "assets");

mkdirSync(staticDir, { recursive: true });

const body = JSON.stringify(payload, null, 2) + "\n";
const targets = [versionPath, staticVersionPath, publicVersionPath];
if (existsSync(openNextAssetsDir)) targets.push(resolve(openNextAssetsDir, "version.json"));

for (const target of targets) {
  writeFileSync(target, body, "utf8");
  console.log("[write-version-json] wrote " + target);
}
console.log("[write-version-json] commit=" + payload.commitShort + " branch=" + payload.branch);
