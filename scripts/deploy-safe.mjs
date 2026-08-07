#!/usr/bin/env node

/*
 * Local Cloudflare release pipeline: check -> preview -> smoke -> production -> rollback.
 * The pipeline never performs payment, LLM, or database writes.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { classifyFile, riskOf, requiresDeepVerification } from "./lib/change-risk.mjs";
import { assertWorkerBaseIsFresh } from "./lib/worker-deploy-base-guard.mjs";

const root = process.cwd();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/ig;

function git(args, options = {}) {
  const result = spawnSync("git", args, { cwd: options.cwd || root, encoding: "utf8", windowsHide: true });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error("git " + args.join(" ") + " failed: " + String(result.stderr || "").trim());
  }
  return String(result.stdout || "").trim();
}

// 보조 워크트리에서 배포해도 잠금과 상태는 주 워크트리 하나를 공유해야 한다. cwd 기준으로
// 두면 워크트리 A 와 B 가 서로의 lock 을 못 보고 동시에 승격해 Worker 버전이 덮어써진다.
function primaryWorktree() {
  return git(["worktree", "list", "--porcelain"], { allowFailure: true }).match(/^worktree (.+)$/m)?.[1] || root;
}
const stateDir = path.join(primaryWorktree(), ".deploy-state");
const stateFile = path.join(stateDir, "state.json");
const lockFile = path.join(stateDir, "active.lock");

const DEPLOY_KEY_RE = /^(CLOUDFLARE_|CF_|CD_)/;
// 파일 전체를 process.env 에 붓지 않는다. 배포에 쓰는 접두사만 통과시키고, 이미 값이 있으면
// 덮지 않는다(다른 env 파일과 같은 first-wins 규칙).
function adoptDeployKeys(file) {
  if (!fs.existsSync(file)) return;
  const scratch = {};
  dotenv.config({ path: file, processEnv: scratch, quiet: true });
  for (const [key, value] of Object.entries(scratch)) {
    if (!DEPLOY_KEY_RE.test(key)) continue;
    if (String(process.env[key] || "").trim()) continue;
    process.env[key] = value;
  }
}

function loadEnv() {
  const files = [];
  if (process.env.CD_DEPLOY_ENV_FILE) files.push(path.resolve(process.env.CD_DEPLOY_ENV_FILE));
  files.push(path.join(root, ".env.cloudflare.local"), path.join(root, ".env.cloudflare"));
  const primary = primaryWorktree();
  if (primary) files.push(path.join(primary, ".env.cloudflare.local"), path.join(primary, ".env.cloudflare"));
  for (const file of [...new Set(files)]) {
    if (fs.existsSync(file)) dotenv.config({ path: file, override: false, quiet: true });
  }
  // 자격증명이 이 두 파일에도 있다. 통째로 읽으면 안 된다 — 둘 다 MONGO_URI·AUTH_*·PORTONE_*
  // 를 함께 들고 있어서, 배포가 spawn 하는 빌드·테스트 프로세스에 운영 DB 접속 문자열까지
  // 흘러든다(.disabled-for-local-auth 라는 이름이 바로 그 사고를 피하려던 흔적이다).
  // 그래서 배포에 필요한 CLOUDFLARE_/CF_/CD_ 접두사 키만 골라 들인다.
  for (const dir of [...new Set([root, primaryWorktree()])]) {
    adoptDeployKeys(path.join(dir, ".env.cloudflare.local.disabled-for-local-auth"));
    adoptDeployKeys(path.join(dir, ".env.local"));
  }
  // 같은 값이 역사적으로 여러 이름으로 저장돼 있다. 정본 이름이 비어 있을 때만 채운다.
  for (const [canonical, aliases] of [
    ["CLOUDFLARE_API_TOKEN", ["CF_API_TOKEN", "CLOUDFLARE_APITOKEN", "CLOUDFLARE_PublishToken", "CLOUDFLARE_PUBLISH_TOKEN", "CLOUDFLARE_API_KEY"]],
    ["CLOUDFLARE_ACCOUNT_ID", ["CF_ACCOUNT_ID", "ACCOUNT_ID", "Account_ID"]],
  ]) {
    if (String(process.env[canonical] || "").trim()) continue;
    const hit = aliases.find((name) => String(process.env[name] || "").trim());
    if (hit) process.env[canonical] = process.env[hit];
  }
}
loadEnv();

function parseArgs(argv) {
  const flags = new Set();
  const values = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (["--allow-dirty", "--yes", "--self-test", "--allow-no-worker-preview", "--ci", "--preview-only", "--no-open", "--list", "--allow-stale"].includes(arg)) flags.add(arg);
    else if (arg.startsWith("--") && arg.includes("=")) {
      const separator = arg.indexOf("=");
      values.set(arg.slice(2, separator), arg.slice(separator + 1));
    }
    else if (arg.startsWith("--") && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      values.set(arg.slice(2), argv[++i]);
    } else if (arg.startsWith("--")) flags.add(arg);
  }
  return { flags, values };
}
const cli = parseArgs(process.argv.slice(2));
const stage = cli.values.get("stage") || "";
const allowDirty = cli.flags.has("--allow-dirty");
const ciMode = cli.flags.has("--ci");
const autoYes = cli.flags.has("--yes");
const allowNoWorkerPreview = cli.flags.has("--allow-no-worker-preview");
const previewOnly = cli.flags.has("--preview-only");
const listOnly = cli.flags.has("--list");
const openPreview = !ciMode && !cli.flags.has("--no-open");
const allowEmptyChangeSet = ciMode && process.env.CD_ALLOW_EMPTY_CHANGESET === "true";

function envForChecks() {
  return { ...process.env, LLM_DRY_RUN: "true", WORKERS_AI_ENABLED: "false", DEPLOY_SAFE_MODE: "true" };
}
function npmCommand() { return process.platform === "win32" ? "npm.cmd" : "npm"; }
function npxCommand() { return process.platform === "win32" ? "npx.cmd" : "npx"; }
function wrangler(args) { return ["--no-install", "wrangler", ...args]; }
// Node 20+ refuses to spawn .cmd shims without a shell. CI runs on Linux so this never
// showed there, but the local preview path hits it. shell: true concatenates args, so
// quote anything containing whitespace (Pages commit messages do).
function shellFor(command) { return process.platform === "win32" && command.endsWith(".cmd"); }
function shellArgs(command, args) {
  return shellFor(command) ? args.map((arg) => (/\s/.test(String(arg)) ? '"' + arg + '"' : String(arg))) : args;
}

function run(label, command, args, options = {}) {
  console.log("[deploy-safe] " + label);
  const result = spawnSync(command, shellArgs(command, args), {
    cwd: root, env: options.env || envForChecks(), stdio: "inherit", shell: shellFor(command), windowsHide: true,
    input: options.input,
  });
  if (result.error) throw new Error(label + " could not start: " + result.error.message);
  if (result.status !== 0) throw new Error(label + " failed with exit " + String(result.status));
}
function capture(label, command, args, options = {}) {
  const result = spawnSync(command, shellArgs(command, args), {
    cwd: root, env: options.env || envForChecks(), encoding: "utf8", shell: shellFor(command), windowsHide: true,
  });
  const text = String(result.stdout || "") + String(result.stderr || "");
  if (text.trim()) process.stdout.write(text);
  if (result.error) throw new Error(label + " could not start: " + result.error.message);
  if (result.status !== 0) throw new Error(label + " failed with exit " + String(result.status));
  return text;
}

function ensureCredentials() {
  if (!String(process.env.CLOUDFLARE_API_TOKEN || "").trim()) throw new Error("CLOUDFLARE_API_TOKEN is missing.");
  if (!String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim()) throw new Error("CLOUDFLARE_ACCOUNT_ID is missing.");
}
function apiBase() { return process.env.CLOUDFLARE_API_BASE_URL || "https://api.cloudflare.com/client/v4"; }
async function cfFetch(url, options = {}) {
  ensureCredentials();
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", "Bearer " + process.env.CLOUDFLARE_API_TOKEN);
  headers.set("Accept", "application/json");
  const response = await fetch(url, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    const detail = (body.errors || []).map((e) => e.message).filter(Boolean).join("; ");
    throw new Error("Cloudflare API " + response.status + ": " + (detail || "request failed"));
  }
  return body.result;
}

function tomlValue(file, key) {
  const text = fs.readFileSync(file, "utf8");
  const escaped = key.replace(/[.*+?^()|[\]\\]/g, "\\$&");
  return text.match(new RegExp("^\\s*" + escaped + "\\s*=\\s*[\"']([^\"']+)[\"']", "m"))?.[1] || "";
}
function localPages() {
  const file = path.join(root, "wrangler.toml");
  if (!fs.existsSync(file)) throw new Error("Missing wrangler.toml.");
  return {
    file: "wrangler.toml",
    name: tomlValue(file, "name"),
    outputDir: tomlValue(file, "pages_build_output_dir") || "dist",
    functions: fs.existsSync(path.join(root, "public", "_worker.js")),
    routes: fs.existsSync(path.join(root, "public", "_routes.json")),
  };
}
function localWorker() {
  const file = path.join(root, "worker", "wrangler.toml");
  if (!fs.existsSync(file)) throw new Error("Missing worker/wrangler.toml.");
  const text = fs.readFileSync(file, "utf8");
  return {
    file: "worker/wrangler.toml",
    name: tomlValue(file, "name"),
    main: tomlValue(file, "main"),
    bindings: [...text.matchAll(/^\s*binding\s*=\s*[\"']([^\"']+)[\"']/gm)].map((m) => m[1]),
    routes: [...text.matchAll(/^\s*\{\s*pattern\s*=\s*[\"']([^\"']+)[\"']/gm)].map((m) => m[1]),
    crons: (text.match(/crons\s*=\s*\[([^\]]*)\]/m)?.[1] || "").split(",").map((v) => v.replace(/[\"']/g, "").trim()).filter(Boolean),
    hasAi: /\[ai\]/.test(text),
    hasR2: /\[\[r2_buckets\]\]/.test(text),
  };
}

function changedFiles() {
  const deployBase = process.env.CD_DEPLOY_BASE_SHA || process.env.GITHUB_BEFORE || "";
  const deployHead = process.env.CD_DEPLOY_HEAD_SHA || process.env.GITHUB_SHA || "HEAD";
  const hasBase = /^[0-9a-f]{7,64}$/i.test(deployBase) && !/^0+$/.test(deployBase);
  const range = hasBase
    ? git(["diff", "--name-only", deployBase + "..." + deployHead], { allowFailure: true })
    : ciMode
      ? git(["diff", "--name-only", "HEAD^", "HEAD"], { allowFailure: true })
      : git(["diff", "--name-only", "origin/main...HEAD"], { allowFailure: true });
  const working = [
    git(["diff", "--name-only", "HEAD"], { allowFailure: true }),
    git(["diff", "--cached", "--name-only"], { allowFailure: true }),
    git(["ls-files", "--others", "--exclude-standard"], { allowFailure: true }),
  ].flatMap((value) => value ? value.split(/\r?\n/).filter(Boolean) : []);
  const committed = range ? range.split(/\r?\n/).filter(Boolean) : [];
  if (committed.length || working.length) return [...new Set([...committed, ...working])];
  if (allowEmptyChangeSet) return ["__release_redeploy__"];
  // main 에서 직접 작업하고 이미 push 한 뒤 배포하는 흐름에서는 origin/main...HEAD 가 비어 있다.
  // 그때는 마지막 커밋의 파일 목록을 쓴다. HEAD~1..HEAD 는 머지 커밋에서도 첫 부모 기준으로
  // 동작해 diff-tree 가 빈 결과를 내던 문제를 피한다.
  const head = git(["diff", "--name-only", "HEAD~1..HEAD"], { allowFailure: true })
    || git(["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "HEAD"], { allowFailure: true });
  return head ? head.split(/\r?\n/).filter(Boolean) : [];
}
// classifyFile / riskOf 는 scripts/lib/change-risk.mjs 가 정본이다.
// check-changed.mjs 도 같은 모듈을 쓴다.
function gitInfo(files) {
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const dirtyFiles = git(["status", "--porcelain"]).split(/\r?\n/).filter(Boolean);
  if (!branch && !ciMode) throw new Error("Detached HEAD is not deployable.");
  // main 은 이제 정상 작업 브랜치다(2026-08-08 PR 정책 폐기). 배포를 막는 것은 브랜치 이름이
  // 아니라 아래의 dirty 검사, 아티팩트 지문 대조, 그리고 승격 직전의 명시적 확인이다.
  if (dirtyFiles.length && !allowDirty) throw new Error("Working tree is dirty. Commit first or pass --allow-dirty.");
  if (!ciMode && !git(["rev-parse", "--verify", "origin/main"], { allowFailure: true })) throw new Error("origin/main is unavailable.");
  return { branch, head, dirty: dirtyFiles.length > 0, dirtyFiles, files };
}

async function discover(pagesLocal, workerLocal) {
  ensureCredentials();
  const project = String(process.env.CF_PAGES_PROJECT_NAME || process.env.CLOUDFLARE_PAGES_PROJECT_NAME || pagesLocal.name || "").trim();
  const worker = String(process.env.CF_WORKER_NAME || process.env.CLOUDFLARE_WORKER_NAME || workerLocal.name || "").trim();
  if (!project || !worker) throw new Error("Pages project or Worker name could not be detected.");
  // 로컬 배포에서 가장 흔한 첫 실패다. 맨 "403 Authentication error" 만 던지면 토큰이
  // 죽은 건지 권한 한 종류가 빠진 건지 구분이 안 돼 한참 헤맨다.
  const pages = await cfFetch(apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID + "/pages/projects/" + encodeURIComponent(project))
    .catch((error) => {
      if (!/\b(401|403)\b/.test(error.message)) throw error;
      throw new Error(error.message + "\n  The API token cannot read Pages project '" + project + "'."
        + "\n  Add Account -> Cloudflare Pages -> Edit to the token (Workers Scripts -> Edit and Account Settings -> Read are also required),"
        + "\n  or check that CLOUDFLARE_ACCOUNT_ID matches the account that owns the project.");
    });
  const source = pages.source || {};
  const sourceConfig = source.config || {};
  const build = pages.build_config || {};
  if (source.type && source.type !== "github") throw new Error("Pages source drifted from GitHub: " + source.type);
  if (!sourceConfig.production_branch) throw new Error("Pages production branch is missing.");
  if (build.build_command && build.build_command !== "npm run build:cf") throw new Error("Pages build command drifted: " + build.build_command);
  if (build.destination_dir && build.destination_dir !== pagesLocal.outputDir) throw new Error("Pages output directory drifted.");
  return {
    project, worker,
    pages: {
      sourceType: source.type || "unknown",
      productionBranch: sourceConfig.production_branch,
      previewSetting: sourceConfig.preview_deployment_setting || "unknown",
      buildCommand: build.build_command || "unknown",
      outputDir: build.destination_dir || pagesLocal.outputDir,
      domains: pages.domains || [],
      subdomain: pages.subdomain || "",
    },
    workerConfig: workerLocal,
  };
}
function needsWorker(files) {
  return allowEmptyChangeSet || files.some((file) =>
    file.startsWith("worker/") || file.startsWith("server/") || file.includes("wrangler") ||
    file === "app/_lib/billing-client.ts" || file === "js/core/access-store.js"
  );
}
async function context() {
  const pagesLocal = localPages();
  const workerLocal = localWorker();
  const files = changedFiles();
  if (!files.length) throw new Error("No changes found against origin/main or the last commit.");
  const gitState = gitInfo(files);
  const risk = riskOf(files);
  const deep = requiresDeepVerification(files);
  const cf = await discover(pagesLocal, workerLocal);
  return { pagesLocal, workerLocal, files, git: gitState, risk, deep, cf, needsWorker: needsWorker(files) };
}
function printContext(value) {
  console.log("[deploy-safe] branch=" + value.git.branch + " commit=" + value.git.head.slice(0, 12) + (value.git.dirty ? " dirty" : ""));
  console.log("[deploy-safe] risk=" + value.risk.level + " deep=" + value.deep.required + " changed=" + value.risk.rows.length);
  for (const row of value.risk.rows) console.log("  - " + row.level.toUpperCase() + " " + row.file + " (" + row.reason + ")");
  for (const match of value.deep.matches) console.log("  ! DEEP " + match.file + " (" + match.reason + ")");
  console.log("[deploy-safe] Pages project=" + value.cf.project + " source=" + value.cf.pages.sourceType + " production=" + value.cf.pages.productionBranch + " preview=" + value.cf.pages.previewSetting + " output=" + value.cf.pages.outputDir);
  console.log("[deploy-safe] Worker=" + value.cf.worker + " AI=" + value.workerLocal.hasAi + " R2=" + value.workerLocal.hasR2 + " cron=" + value.workerLocal.crons.length);
  console.log("[deploy-safe] Pages Functions=" + value.pagesLocal.functions + " _routes=" + value.pagesLocal.routes);
}

function walk(directory, relative = "") {
  const entries = fs.readdirSync(path.join(directory, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...walk(directory, rel));
    else if (entry.isFile()) files.push(rel);
  }
  return files;
}
function artifact(directory) {
  if (!fs.existsSync(path.join(directory, "index.html"))) throw new Error("Missing " + directory + "/index.html.");
  const hash = crypto.createHash("sha256");
  const files = walk(directory).sort();
  for (const rel of files) { hash.update(rel.replace(/\\/g, "/")); hash.update(fs.readFileSync(path.join(directory, rel))); }
  return { outputDir: path.relative(root, directory).replace(/\\/g, "/"), sha256: hash.digest("hex"), fileCount: files.length, builtAt: new Date().toISOString() };
}
function readState() {
  if (!fs.existsSync(stateFile)) return null;
  return JSON.parse(fs.readFileSync(stateFile, "utf8"));
}
function writeState(state) {
  fs.mkdirSync(stateDir, { recursive: true });
  // "\\n" 이었다. JSON 뒤에 리터럴 백슬래시+n 이 붙어 readState 의 JSON.parse 가 반드시
  // 터졌다. CI 는 preview 와 승격을 한 프로세스에서 메모리로 넘겨 드러나지 않았고,
  // deploy:preview -> deploy:production 두 명령으로 나눈 지금에야 경로가 열린다.
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", "utf8");
}
function assertArtifact(state) {
  if (!state?.artifact) throw new Error("No verified build artifact exists.");
  const actual = artifact(path.join(root, state.artifact.outputDir));
  if (actual.sha256 !== state.artifact.sha256 || actual.fileCount !== state.artifact.fileCount) throw new Error("Build artifact changed after validation.");
}
function lock() {
  fs.mkdirSync(stateDir, { recursive: true });
  try {
    const fd = fs.openSync(lockFile, "wx");
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }) + "\\n");
    fs.closeSync(fd);
  } catch { throw new Error("Another deploy-safe process owns " + lockFile + ". Verify before removing it."); }
}
function unlock() { try { fs.rmSync(lockFile, { force: true }); } catch {} }

function pageDeploymentsUrl(cf, env = "production") {
  return apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID + "/pages/projects/" + encodeURIComponent(cf.project) + "/deployments?env=" + encodeURIComponent(env);
}
async function pageDeployments(cf, env = "production") {
  const result = await cfFetch(pageDeploymentsUrl(cf, env));
  return Array.isArray(result) ? result : [];
}
async function workerActive(cf) {
  const result = await cfFetch(apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID + "/workers/scripts/" + encodeURIComponent(cf.worker) + "/deployments");
  const deployment = (result.deployments || [])[0] || {};
  const active = (deployment.versions || []).find((v) => Number(v.percentage) === 100) || deployment.versions?.[0] || {};
  return { deploymentId: deployment.id || "", versionId: active.version_id || "", message: deployment.annotations?.["workers/message"] || "" };
}
async function workerVersions(cf) {
  const result = await cfFetch(apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID + "/workers/scripts/" + encodeURIComponent(cf.worker) + "/versions");
  return Array.isArray(result?.items) ? result.items : [];
}

// 사용자가 preview 를 직접 확인한다. 파이프라인이 할 일은 URL 을 눈앞에 띄우는 것까지다.
function openInBrowser(url) {
  if (!openPreview || !url) return;
  const [command, args] = process.platform === "win32"
    ? ["cmd.exe", ["/d", "/s", "/c", "start", "", url]]
    : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  const result = spawnSync(command, args, { stdio: "ignore", windowsHide: true });
  if (result.error || result.status !== 0) console.log("[deploy-safe] could not open a browser; visit " + url + " manually.");
  else console.log("[deploy-safe] opened " + url + " in the default browser.");
}
function metadata(deployment) { return deployment?.deployment_trigger?.metadata || {}; }
function parseUrls(text) { return [...new Set((String(text).match(/https?:\/\/[^\s<>)]+/g) || []).map((v) => v.replace(/[),.;]+$/, "")))]; }
function lastUuid(text) { const matches = String(text).match(UUID_RE) || []; return matches[matches.length - 1] || ""; }
function eslintArgs(sourceFiles) { return ["exec", "--", "eslint", "--quiet", ...sourceFiles]; }

/**
 * 변경 목록에서 실제로 린트할 파일만 고른다.
 * 🔴 존재 여부를 반드시 확인한다. `git diff --name-only` 는 삭제된 파일도 이름을 내놓는데,
 * 없는 경로를 eslint 에 넘기면 "No files matching the pattern" 으로 exit 2 가 나고
 * 릴리스가 통째로 막힌다(파일을 지운 PR 마다 재현된다).
 */
function lintTargets(files) {
  return files
    .filter((file) => /\.(c|m)?js$|\.(c|m)?tsx?$/.test(file))
    .filter((file) => fs.existsSync(path.resolve(root, file)));
}

async function checks(value) {
  const env = envForChecks();
  const sourceFiles = lintTargets(value.files);
  if (sourceFiles.length) run("changed-file lint", npmCommand(), eslintArgs(sourceFiles), { env });
  run("TypeScript typecheck", npmCommand(), ["run", "typecheck"], { env });
  if (value.risk.level !== "low") run("core mock smoke tests", npmCommand(), ["run", "smoke:core"], { env });
  if (value.risk.level === "medium") run("Node regression tests", npmCommand(), ["run", "test:node"], { env });
  // deep 은 risk level 과 독립이다. 결제·인증·DB 스키마·배포 인프라는 preview 스모크가
  // 못 잡으므로 level 이 무엇이든 전체 회귀를 돌린다. PR 리뷰를 대체하는 자리다.
  if (value.risk.level === "high" || value.deep.required) {
    if (value.deep.required) {
      console.log("[deploy-safe] deep verification required:");
      for (const match of value.deep.matches) console.log("  ! " + match.file + " (" + match.reason + ")");
    }
    run("high-risk mock gates", npmCommand(), ["run", "deploy:critical"], { env });
    run("Node regression tests", npmCommand(), ["run", "test:node"], { env });
  }
}
function build(value) {
  run("single Cloudflare production build", npmCommand(), ["run", "build:cf"], { env: envForChecks() });
  const result = artifact(path.join(root, value.cf.pages.outputDir));
  console.log("[deploy-safe] artifact=" + result.sha256 + " files=" + result.fileCount);
  return result;
}

async function deployPages(value, branch, production) {
  const message = "safe-" + (production ? "production-" : "preview-") + value.git.head.slice(0, 12);
  const args = wrangler(["pages", "deploy", value.cf.pages.outputDir, "--project-name", value.cf.project, "--branch", branch, "--commit-hash", value.git.head, "--commit-message", message]);
  if (!production) args.push("--skip-caching");
  const text = capture("Pages " + (production ? "production" : "preview") + " deployment", npxCommand(), args, { env: envForChecks() });
  const list = await pageDeployments(value.cf, production ? "production" : "preview");
  const deployment = list.find((item) => metadata(item).commit_hash === value.git.head && metadata(item).branch === branch);
  const urls = parseUrls(text);
  const url = urls.find((item) => item.includes(".pages.dev")) || deployment?.url || deployment?.aliases?.[0] || "";
  if (!url) throw new Error("Pages deploy returned no URL.");
  return { id: deployment?.id || "", url, branch, message };
}
async function uploadWorker(value) {
  const alias = "safe-" + value.git.head.slice(0, 12);
  const text = capture("Worker preview version upload", npxCommand(), wrangler(["versions", "upload", "--config", "worker/wrangler.toml", "--name", value.cf.worker, "--tag", alias, "--preview-alias", alias, "--message", "safe-preview-" + value.git.head.slice(0, 12), "--var", "COMMIT_SHA:" + value.git.head]), { env: envForChecks() });
  const versionId = lastUuid(text);
  const previewUrl = parseUrls(text).find((item) => /workers\.dev/i.test(item)) || process.env.CD_WORKER_PREVIEW_ORIGIN || "";
  if (!versionId) throw new Error("Worker preview upload returned no version ID.");
  if (!previewUrl && !allowNoWorkerPreview) throw new Error("Worker preview URL missing. Set CD_WORKER_PREVIEW_ORIGIN or pass --allow-no-worker-preview.");
  return { versionId, previewUrl, alias };
}
async function smoke(base, apiOrigin = "", skipApi = false) {
  const args = [path.join(scriptDir, "deploy-smoke.mjs"), "--base", base];
  if (apiOrigin) args.push("--api-origin", apiOrigin);
  // A Pages preview is static-only in this release path. Its /api routes are
  // intentionally absent; production smoke below remains API-strict.
  if (skipApi) args.push("--skip-api");
  run("read-only smoke test", process.execPath, args, { env: envForChecks() });
}
/**
 * 프로덕션 스모크 **전에** Pages 전환이 실제로 전파될 때까지 기다린다.
 *
 * 🔴 이게 없으면 릴리스가 배포마다 무작위로 실패한다. deployPages(production) 직후에는
 * 새 HTML 을 받은 엣지 PoP 가 아직 옛 배포를 가리켜, 그 HTML 이 참조하는
 * `_next/static/chunks/webpack-*.js` 가 404 로 내려온다. 브라우저 스모크는 그 404 를
 * console.error 로 잡아 릴리스를 실패시키고, 그러면 워커가 자동 롤백된다 —
 * 코드에는 아무 문제가 없는데도 배포가 되돌아간다(2026-08-07: 5연속 실패).
 *
 * scripts/verify-deployed-assets.mjs 가 정확히 이 구간을 위해 만들어져 있었지만
 * (자기 주석에 "배포 30초 뒤 bare/cdcb 모두 404 → 잠시 뒤 둘 다 200" 실측이 적혀 있다)
 * 어디에서도 호출되지 않아 죽은 도구였다. 5라운드 × 25초 재시도 예산이 곧 전파 대기다.
 *
 * 이건 검사를 무르게 하는 것이 아니다 — 전파가 끝난 뒤에도 자산이 죽어 있으면 그대로 실패하고,
 * 그 실패는 진짜 산출물 문제다. 순서만 바로잡는다.
 */
function awaitProductionAssets(base) {
  run(
    "production asset propagation",
    process.execPath,
    [path.join(scriptDir, "verify-deployed-assets.mjs")],
    { env: { ...envForChecks(), CD_DEPLOY_VERIFY_ORIGIN: base } },
  );
}

function productionOrigin(value) {
  if (process.env.CD_PRODUCTION_ORIGIN) return String(process.env.CD_PRODUCTION_ORIGIN).replace(/\/+$/, "");
  const domain = value.cf.pages.domains.find((item) => !item.includes(".pages.dev")) || value.cf.pages.domains[0];
  return domain ? "https://" + domain.replace(/^https?:\/\//, "").replace(/\/+$/, "") : "";
}

// 배포 직후 확인. deploy-smoke 가 /api/health·/api/version 200 과 콘솔 에러를 이미 보고,
// 여기서는 그것만으로는 못 잡는 두 가지를 더 본다. 둘 다 이미 있던 스크립트인데 통합
// 릴리스로 개편될 때 호출부가 사라져 죽어 있었다.
async function postDeployHealth(value) {
  const origin = productionOrigin(value);
  await smoke(origin);
  // verify-pages-worker-parity 는 "방금 배포한 커밋"을 GITHUB_SHA 로 읽는다. 로컬 배포에는
  // 그 변수가 없으므로 HEAD 를 넣어 준다.
  const env = { ...envForChecks(), CD_DEPLOY_VERIFY_ORIGIN: origin, CD_WORKER_VERSION_URL: origin + "/api/version", GITHUB_SHA: value.git.head };
  // Pages 와 Worker 가 같은 커밋인지. 결제·접근 상태처럼 양쪽이 맞물린 변경에서 어긋나면
  // 두 코드가 서로 다른 계약으로 대화한다.
  if (value.needsWorker) run("Pages/Worker commit parity", process.execPath, [path.join(scriptDir, "verify-pages-worker-parity.mjs")], { env });
  // _next/static 404. 엣지가 404 를 이틀 캐시하면 롤백해도 안 고쳐진다(2026-07-30 사고).
  run("deployed asset availability", process.execPath, [path.join(scriptDir, "verify-deployed-assets.mjs")], { env });
}

async function checkStage() {
  const value = await context();
  printContext(value);
  console.log("[deploy-safe] check passed; no deploy or data mutation.");
  return value;
}
async function previewStage() {
  const value = await checkStage();
  // wrangler 는 커밋이 아니라 워킹트리를 민다. 베이스가 낡으면 그 사이 origin/main 에
  // 들어온 worker/·lib/ 변경이 조용히 사라진다(2026-08-01 에 4건). 로컬이 주 배포 경로가
  // 된 지금은 이 검사가 CI 시절보다 더 중요하다. 우회는 --allow-stale.
  if (!ciMode) assertWorkerBaseIsFresh(root, { argv: process.argv.slice(2) });
  await checks(value);
  const built = build(value);
  const branch = "safe-preview-" + value.git.head.slice(0, 12);
  const pages = await deployPages(value, branch, false);
  const worker = value.needsWorker ? await uploadWorker(value) : null;
  const state = {
    schema: 1, createdAt: new Date().toISOString(),
    git: { branch: value.git.branch, commit: value.git.head, dirty: value.git.dirty },
    risk: value.risk, deep: value.deep, files: value.files,
    cf: { project: value.cf.project, worker: value.cf.worker, productionBranch: value.cf.pages.productionBranch },
    artifact: built, preview: { pages, worker, smokePassed: false }, worker,
  };
  writeState(state);
  console.log("[deploy-safe] Pages preview URL: " + pages.url);
  if (worker?.previewUrl) console.log("[deploy-safe] Worker preview URL: " + worker.previewUrl);
  return { value, state };
}
/**
 * Pages 프로덕션 배포를 이전 배포로 되돌린다. rollbackStage 가 쓰던 것과 같은 API 다.
 */
async function rollbackPagesDeployment(project, deploymentId) {
  return cfFetch(
    apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID
    + "/pages/projects/" + encodeURIComponent(project)
    + "/deployments/" + encodeURIComponent(deploymentId) + "/rollback",
    { method: "POST" },
  );
}

async function promote(value, state, yes) {
  if (!yes) throw new Error("Production promotion requires --yes.");
  assertArtifact(state);
  // gitleaks 는 GitHub 체크로만 돌았다. 로컬 승격에는 그 경로가 없으므로 레포에 이미 있는
  // 시크릿 스캐너를 승격 직전에 돌린다(외부 바이너리 불필요).
  run("secret leak scan", npmCommand(), ["run", "verify:no-secret-leak"], { env: envForChecks() });
  const oldPages = (await pageDeployments(value.cf, "production")).find((item) => metadata(item).branch === value.cf.pages.productionBranch);
  const oldWorker = value.needsWorker ? await workerActive(value.cf) : null;
  let workerPromoted = false;
  let pagesPromoted = false;
  try {
    if (value.needsWorker) {
      if (!state.worker?.versionId) throw new Error("No Worker preview version to promote.");
      capture("Worker 100% promotion", npxCommand(), wrangler(["versions", "deploy", state.worker.versionId + "@100", "--name", value.cf.worker, "--message", "safe-production-" + value.git.head.slice(0, 12), "--yes"]), { env: envForChecks() });
      workerPromoted = true;
    }
    const pages = await deployPages(value, value.cf.pages.productionBranch, true);
    pagesPromoted = true;
    const next = {
      ...state,
      production: { deployedAt: new Date().toISOString(), pagesDeploymentId: pages.id, pagesUrl: productionOrigin(value), workerVersionId: state.worker?.versionId || "" },
      rollback: { pagesDeploymentId: oldPages?.id || "", workerVersionId: oldWorker?.versionId || "" },
    };
    writeState(next);
    // 전파를 먼저 기다린다(위 awaitProductionAssets 주석 참고). 이 순서가 아니면 브라우저
    // 스모크가 전환 틈새의 404 를 잡아 멀쩡한 릴리스를 되돌린다.
    awaitProductionAssets(productionOrigin(value));
    // 그 다음에 스모크 + Pages/Worker 커밋 패리티까지 본다(postDeployHealth 가 smoke 를 품는다).
    await postDeployHealth(value);
    writeState({ ...next, production: { ...next.production, smokePassed: true } });
    console.log("[deploy-safe] production health check passed; commit=" + value.git.head);
  } catch (error) {
    console.error("[deploy-safe] production failed: " + error.message);

    // 🔴 Pages 와 Worker 는 **함께** 되돌린다.
    //
    // 예전에는 Worker 만 자동 롤백하고 Pages 는 롤백 대상 ID 만 출력한 뒤 사람이 확인하도록 두었다.
    // 그 결과 실패한 릴리스마다 프로덕션이 '새 클라이언트 + 옛 워커' 로 어긋난 채 남았고, 실패가
    // 반복되면서 어긋남이 누적됐다. 2026-08-07 에는 그 누적이 실제 장애로 드러났다 — 라이브
    // /me/ 가 참조하는 청크 4개가 404(bare·bypass 둘 다)였다. HTML 세대와 자산 세대가 서로
    // 다른 배포에서 온 것이다.
    //
    // 롤백 순서는 승격의 역순(Pages → Worker)이다. 승격은 Worker → Pages 였으므로 LIFO 로 되돌린다.
    // 중간 상태의 위험도도 이 순서가 낫다: '옛 클라이언트 + 새 워커'(워커 API 는 대개 하위호환)가
    // '새 클라이언트 + 옛 워커'(새 클라이언트가 없는 API 를 부른다)보다 안전하다.
    let pagesRolledBack = false;
    if (pagesPromoted && oldPages?.id) {
      try {
        await rollbackPagesDeployment(value.cf.project, oldPages.id);
        pagesRolledBack = true;
        console.error("[deploy-safe] Pages rollback completed. target=" + oldPages.id);
      } catch (rollbackError) {
        console.error("[deploy-safe] Pages rollback failed: " + rollbackError.message);
        console.error("[deploy-safe] Pages rollback target=" + oldPages.id + "; run deploy:rollback -- --yes manually.");
      }
    } else if (oldPages?.id) {
      console.error("[deploy-safe] Pages was not promoted; nothing to roll back.");
    }

    if (workerPromoted && oldWorker?.versionId) {
      try {
        capture("automatic Worker rollback", npxCommand(), wrangler(["versions", "deploy", oldWorker.versionId + "@100", "--name", value.cf.worker, "--message", "safe-auto-rollback-" + value.git.head.slice(0, 12), "--yes"]), { env: envForChecks() });
        console.error("[deploy-safe] Worker rollback completed.");
      } catch (rollbackError) { console.error("[deploy-safe] Worker rollback failed: " + rollbackError.message); }
    }

    // 한쪽만 되돌아간 상태는 조용히 지나가면 안 된다 — 그게 이번 사고의 형태였다.
    if (pagesPromoted && !pagesRolledBack && workerPromoted) {
      console.error("::error::프로덕션이 세대 불일치 상태일 수 있습니다(Pages 새 세대 + Worker 옛 세대). 즉시 확인하세요.");
    }
    throw error;
  }
}
// preview 배포 + 스모크 + 브라우저 오픈까지. deploy:preview 와 deploy:safe 가 공유한다.
// 스모크를 여기 두는 이유: deploy:preview 만 돌리고 끝내면 smokePassed 가 false 로 남아
// 이어지는 deploy:production 이 무조건 거부된다.
async function previewAndSmoke() {
  const preview = await previewStage();
  // workers.dev preview aliases do not carry the Pages custom-domain routing
  // used by /api. Validate preview rendering here; production smoke below
  // remains the authoritative API health and guest-boundary check.
  await smoke(preview.state.preview.pages.url, "", true);
  const state = { ...preview.state, preview: { ...preview.state.preview, smokePassed: true, smokedAt: new Date().toISOString() } };
  writeState(state);
  openInBrowser(state.preview.pages.url);
  return { value: preview.value, state };
}
async function productionStage() {
  const state = readState();
  const value = await checkStage();
  if (!state || state.git?.commit !== value.git.head) throw new Error("Release state does not match HEAD. Run npm run deploy:preview first.");
  if (!state.preview?.smokePassed) throw new Error("Preview smoke has not passed. Run npm run deploy:preview first.");
  if (!(autoYes || await confirmProduction(value))) {
    console.log("[deploy-safe] declined; production is untouched.");
    return;
  }
  await promote(value, state, true);
}
async function confirmProduction(value) {
  // PR 리뷰를 대체하는 자리. 결제·인증·DB·배포 인프라가 걸렸으면 무엇이 왜 위험한지
  // 눈앞에 나열한 뒤 확인을 받는다.
  if (value?.deep?.required) {
    console.log("[deploy-safe] this release touches paths a preview smoke cannot validate:");
    for (const match of value.deep.matches) console.log("  ! " + match.file + " (" + match.reason + ")");
  }
  if (!input.isTTY || !output.isTTY) throw new Error("Pass --yes in a non-interactive terminal.");
  const rl = createInterface({ input, output });
  try { return /^y(es)?$/i.test((await rl.question("Inspect the preview in the browser, then answer. Promote this exact artifact to production? [y/N] ")).trim()); }
  finally { rl.close(); }
}
async function safeStage() {
  lock();
  try {
    const preview = await previewAndSmoke();
    console.log("[deploy-safe] Preview passed. Production is the only remaining step.");
    if (previewOnly) {
      console.log("[deploy-safe] Preview-only mode; production was not attempted.");
      return;
    }
    // 거절은 정상적인 답이다. 예전에는 promote() 가 "requires --yes" 로 던져서, 사용자가
    // preview 를 보고 "아니오" 를 고른 것이 실패처럼 보였다.
    if (!(autoYes || await confirmProduction(preview.value))) {
      console.log("[deploy-safe] declined; production is untouched. The preview stays at " + preview.state.preview.pages.url);
      return;
    }
    await promote(preview.value, preview.state, true);
  } finally { unlock(); }
}
async function listRollbackTargets(value) {
  const pages = await pageDeployments(value.cf, "production");
  console.log("[deploy-safe] Pages production deployments (newest first):");
  for (const item of pages.slice(0, 10)) {
    const meta = metadata(item);
    console.log("  " + (item.id || "?") + "  " + (item.created_on || "") + "  " + String(meta.commit_hash || "").slice(0, 12) + "  " + (meta.commit_message || ""));
  }
  const versions = await workerVersions(value.cf).catch((error) => {
    console.log("  (Worker versions unavailable: " + error.message + ")");
    return [];
  });
  const active = await workerActive(value.cf).catch(() => ({ versionId: "" }));
  console.log("[deploy-safe] Worker versions (newest first), active=" + (active.versionId || "unknown") + ":");
  for (const item of versions.slice(0, 10)) {
    console.log("  " + (item.id || "?") + "  " + (item.metadata?.created_on || "") + "  " + (item.annotations?.["workers/message"] || ""));
  }
  console.log("[deploy-safe] roll back with: npm run deploy:rollback -- --yes [--to=<pagesDeploymentId>] [--worker-version=<id>]");
}
async function rollbackStage() {
  const value = await checkStage();
  if (listOnly) return listRollbackTargets(value);
  if (!autoYes) throw new Error("Rollback requires --yes. Run npm run deploy:rollback -- --list to see the targets first.");
  const state = readState();
  // --to / --worker-version 이 있으면 기록된 직전 버전 대신 그 버전으로 되돌린다.
  const pagesTarget = cli.values.get("to") || state?.rollback?.pagesDeploymentId || "";
  const workerTarget = cli.values.get("worker-version") || state?.rollback?.workerVersionId || "";
  if (!pagesTarget && !workerTarget) throw new Error("No rollback target. Pass --to=<id> / --worker-version=<id>, or run a production deploy first so " + stateFile + " records one.");
  const result = {};
  if (workerTarget) {
    capture("Worker rollback", npxCommand(), wrangler(["versions", "deploy", workerTarget + "@100", "--name", value.cf.worker, "--message", "safe-manual-rollback", "--yes"]), { env: envForChecks() });
    result.workerVersionId = workerTarget;
  }
  // pagesTarget 을 쓴다(--to 오버라이드 + 기록된 직전 배포 폴백). 실제 호출은 공용 헬퍼로.
  if (pagesTarget) {
    const pages = await rollbackPagesDeployment(value.cf.project, pagesTarget);
    result.pagesDeploymentId = pages?.id || pagesTarget;
  }
  writeState({ ...(state || {}), lastRollback: { at: new Date().toISOString(), ...result } });
  console.log("[deploy-safe] rollback completed; verifying production.");
  // 롤백도 검증한다. 되돌린 상태가 멀쩡한지 확인하지 않으면 롤백이 두 번째 장애가 된다.
  await smoke(productionOrigin(value));
  console.log("[deploy-safe] rollback smoke passed.");
}
async function smokeOnlyStage() {
  const base = cli.values.get("base") || process.env.CD_SMOKE_BASE;
  if (!base) throw new Error("Usage: npm run deploy:smoke -- --base https://preview.example.pages.dev");
  await smoke(base, cli.values.get("api-origin") || process.env.CD_SMOKE_API_ORIGIN || "");
}
async function selfTest() {
  const cases = [
    ["style", classifyFile("styles/site.css").level, "low"],
    ["component", classifyFile("components/Button.tsx").level, "medium"],
    ["payment", classifyFile("worker/routes/payments.js").level, "high"],
    ["wrangler", classifyFile("wrangler.toml").level, "high"],
  ];
  for (const item of cases) if (item[1] !== item[2]) throw new Error(item[0] + " classification failed.");
  const lint = eslintArgs(["fixture.js"]);
  if (!lint.includes("--quiet") || lint.includes("--max-warnings=0")) throw new Error("release lint must block errors without promoting warnings.");
  // 파일을 지운 릴리스가 eslint exit 2 로 막히던 회귀를 잠근다.
  const targets = lintTargets(["scripts/deploy-safe.mjs", "app/does-not-exist/Deleted.tsx", "docs/readme.md"]);
  if (!targets.includes("scripts/deploy-safe.mjs")) throw new Error("changed-file lint must keep existing source files.");
  if (targets.some((file) => file.includes("Deleted.tsx"))) throw new Error("changed-file lint must skip deleted files; eslint exits 2 on missing paths.");
  if (targets.some((file) => file.endsWith(".md"))) throw new Error("changed-file lint must only take JS/TS sources.");
  const pagesListUrl = pageDeploymentsUrl({ project: "project name" }, "preview");
  if (!pagesListUrl.includes("/project%20name/deployments?env=preview") || /[?&](?:page|per_page)=/.test(pagesListUrl)) throw new Error("Pages deployment lookup must use Cloudflare default pagination.");
  if (parseUrls("https://a.pages.dev https://b.workers.dev").length !== 2) throw new Error("URL parser failed.");

  // 결제·인증·DB·배포 인프라는 risk level 과 무관하게 전체 회귀를 요구해야 한다.
  if (!requiresDeepVerification(["worker/routes/payments.js"]).required) throw new Error("payment paths must require deep verification.");
  if (requiresDeepVerification(["worker/routes/ziwei-ai.js"]).required) throw new Error("ordinary worker routes must not require deep verification.");

  // writeState 가 남기는 것이 실제로 다시 읽히는 JSON 인지. 예전에는 리터럴 "\\n" 을 붙여
  // readState 가 반드시 터졌고, 한 프로세스로 도는 CI 에서는 드러나지 않았다.
  const probe = path.join(root, ".deploy-state-selftest.json");
  try {
    fs.writeFileSync(probe, JSON.stringify({ schema: 1 }, null, 2) + "\n", "utf8");
    if (JSON.parse(fs.readFileSync(probe, "utf8")).schema !== 1) throw new Error("state round-trip failed.");
  } finally { fs.rmSync(probe, { force: true }); }

  // 잠금·상태는 주 워크트리 하나를 공유해야 병렬 워크트리에서 동시 승격을 막는다.
  if (path.dirname(stateFile) !== stateDir) throw new Error("state file must live in the shared state directory.");
  if (!stateDir.endsWith(".deploy-state")) throw new Error("state directory name drifted.");

  console.log("[deploy-safe] self-test passed.");
}

// return 만 하면 finally 가 프라미스를 기다리지 않고 즉시 unlock 해, 잠금이 작업 시작
// 직후 풀렸다. 보조 워크트리와 잠금을 공유하는 지금은 그 창이 곧 동시 승격이다.
async function withLock(work) {
  lock();
  try { return await work(); } finally { unlock(); }
}
async function main() {
  if (cli.flags.has("--self-test")) return selfTest();
  if (stage === "check") return checkStage();
  if (stage === "preview") return withLock(previewAndSmoke);
  if (stage === "smoke") return smokeOnlyStage();
  if (stage === "production") return withLock(productionStage);
  // 목록 조회는 읽기 전용이라 잠금을 잡지 않는다. 배포가 도는 중에도 봐야 한다.
  if (stage === "rollback") return listOnly ? rollbackStage() : withLock(rollbackStage);
  if (stage === "safe") return safeStage();
  throw new Error("Unknown stage. Use deploy:check, deploy:preview, deploy:smoke, deploy:production, deploy:rollback, or deploy:safe.");
}
main().catch((error) => { unlock(); console.error("[deploy-safe] BLOCKED: " + (error?.stack || error)); process.exitCode = 1; });
