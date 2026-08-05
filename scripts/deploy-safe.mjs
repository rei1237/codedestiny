#!/usr/bin/env node

/*
 * PR-optional local Cloudflare release pipeline.
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

const root = process.cwd();
const stateDir = path.join(root, ".deploy-state");
const stateFile = path.join(stateDir, "state.json");
const lockFile = path.join(stateDir, "active.lock");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/ig;

function git(args, options = {}) {
  const result = spawnSync("git", args, { cwd: options.cwd || root, encoding: "utf8", windowsHide: true });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error("git " + args.join(" ") + " failed: " + String(result.stderr || "").trim());
  }
  return String(result.stdout || "").trim();
}

function loadEnv() {
  const files = [];
  if (process.env.CD_DEPLOY_ENV_FILE) files.push(path.resolve(process.env.CD_DEPLOY_ENV_FILE));
  files.push(path.join(root, ".env.cloudflare.local"), path.join(root, ".env.cloudflare"));
  const primary = git(["worktree", "list", "--porcelain"], { allowFailure: true }).match(/^worktree (.+)$/m)?.[1];
  if (primary) files.push(path.join(primary, ".env.cloudflare.local"), path.join(primary, ".env.cloudflare"));
  for (const file of [...new Set(files)]) {
    if (fs.existsSync(file)) dotenv.config({ path: file, override: false, quiet: true });
  }
  if (!process.env.CLOUDFLARE_API_TOKEN && process.env.CF_API_TOKEN) process.env.CLOUDFLARE_API_TOKEN = process.env.CF_API_TOKEN;
}
loadEnv();

function parseArgs(argv) {
  const flags = new Set();
  const values = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (["--allow-dirty", "--yes", "--self-test", "--allow-no-worker-preview", "--ci", "--preview-only"].includes(arg)) flags.add(arg);
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
const allowEmptyChangeSet = ciMode && process.env.CD_ALLOW_EMPTY_CHANGESET === "true";

function envForChecks() {
  return { ...process.env, LLM_DRY_RUN: "true", WORKERS_AI_ENABLED: "false", DEPLOY_SAFE_MODE: "true" };
}
function assertProductionCi() {
  const ref = String(process.env.GITHUB_REF || "");
  if (!ciMode || process.env.GITHUB_ACTIONS !== "true" || ref !== "refs/heads/main") {
    throw new Error("Production promotion is CI-only from main. Push a verified SHA to main and use the unified release workflow.");
  }
}
function npmCommand() { return process.platform === "win32" ? "npm.cmd" : "npm"; }
function npxCommand() { return process.platform === "win32" ? "npx.cmd" : "npx"; }
function wrangler(args) { return ["--no-install", "wrangler", ...args]; }

function run(label, command, args, options = {}) {
  console.log("[deploy-safe] " + label);
  const result = spawnSync(command, args, {
    cwd: root, env: options.env || envForChecks(), stdio: "inherit", shell: false, windowsHide: true,
    input: options.input,
  });
  if (result.error) throw new Error(label + " could not start: " + result.error.message);
  if (result.status !== 0) throw new Error(label + " failed with exit " + String(result.status));
}
function capture(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root, env: options.env || envForChecks(), encoding: "utf8", shell: false, windowsHide: true,
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
  const head = git(["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "HEAD"], { allowFailure: true });
  return head ? head.split(/\r?\n/).filter(Boolean) : [];
}
const highPatterns = [
  /^worker\//i, /^server\//i, /(^|\/)(payment|billing|auth|login|signup|access|unlock|entitlement|mongo|database|migration|migrate|kv|d1|r2|durable)/i,
  /(^|\/)wrangler\.(toml|jsonc?)$/i, /(^|\/)\.env/i, /^\.github\/workflows\//i,
  /(^|\/)package-lock\.json$/i, /(^|\/)scripts\/deploy/i,
];
const mediumPatterns = [
  /(^|\/)(app|components|src|lib|js)\//i, /(^|\/)(route|cache|profile|session)/i,
  /(^|\/)(package\.json|next\.config\.|tsconfig\.)/i,
];
const lowPatterns = [
  /(^|\/)(docs?|reports?)\//i, /(^|\/)(styles?|css)\//i,
  /\.(css|scss|sass|less|svg|png|jpg|jpeg|webp|gif|ico|avif)$/i,
  /(^|\/)(index\.html|public\/i18n\/|sitemap|robots|ads\.txt)/i,
];
function classifyFile(file) {
  const value = file.replace(/\\/g, "/");
  if (highPatterns.some((p) => p.test(value))) return { level: "high", reason: "runtime/payment/auth/infra boundary" };
  if (mediumPatterns.some((p) => p.test(value))) return { level: "medium", reason: "shared UI/state/API/routing code" };
  if (lowPatterns.some((p) => p.test(value))) return { level: "low", reason: "static/content/presentation change" };
  return { level: "medium", reason: "unclassified source/config change" };
}
function riskOf(files) {
  const rows = files.map((file) => ({ file, ...classifyFile(file) }));
  const rank = { low: 1, medium: 2, high: 3 };
  const level = rows.reduce((current, row) => rank[row.level] > rank[current] ? row.level : current, "low");
  return { level, rows };
}
function secondaryWorktree() {
  const entries = git(["worktree", "list", "--porcelain"]).split(/\r?\n\r?\n/).filter(Boolean);
  const current = path.resolve(root).replace(/\\/g, "/").toLowerCase();
  const paths = entries.map((entry) => entry.match(/^worktree (.+)$/m)?.[1]).filter(Boolean);
  return paths.length > 0 && current !== path.resolve(paths[0]).replace(/\\/g, "/").toLowerCase();
}
function gitInfo(files) {
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const dirtyFiles = git(["status", "--porcelain"]).split(/\r?\n/).filter(Boolean);
  if (!branch && !ciMode) throw new Error("Detached HEAD is not deployable.");
  if (["main", "master"].includes(branch.toLowerCase()) && !(ciMode && process.env.GITHUB_ACTIONS === "true")) {
    throw new Error("Protected branch is not deployable locally.");
  }
  if (!ciMode && !secondaryWorktree()) throw new Error("Use a registered secondary worktree.");
  if (dirtyFiles.length && !allowDirty) throw new Error("Working tree is dirty. Commit first or pass --allow-dirty.");
  if (!ciMode && !git(["rev-parse", "--verify", "origin/main"], { allowFailure: true })) throw new Error("origin/main is unavailable.");
  return { branch, head, dirty: dirtyFiles.length > 0, dirtyFiles, files };
}

async function discover(pagesLocal, workerLocal) {
  ensureCredentials();
  const project = String(process.env.CF_PAGES_PROJECT_NAME || process.env.CLOUDFLARE_PAGES_PROJECT_NAME || pagesLocal.name || "").trim();
  const worker = String(process.env.CF_WORKER_NAME || process.env.CLOUDFLARE_WORKER_NAME || workerLocal.name || "").trim();
  if (!project || !worker) throw new Error("Pages project or Worker name could not be detected.");
  const pages = await cfFetch(apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID + "/pages/projects/" + encodeURIComponent(project));
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
  if (!files.length) throw new Error("No committed changes relative to origin/main.");
  const gitState = gitInfo(files);
  const risk = riskOf(files);
  const cf = await discover(pagesLocal, workerLocal);
  return { pagesLocal, workerLocal, files, git: gitState, risk, cf, needsWorker: needsWorker(files) };
}
function printContext(value) {
  console.log("[deploy-safe] branch=" + value.git.branch + " commit=" + value.git.head.slice(0, 12) + (value.git.dirty ? " dirty" : ""));
  console.log("[deploy-safe] risk=" + value.risk.level + " changed=" + value.risk.rows.length);
  for (const row of value.risk.rows) console.log("  - " + row.level.toUpperCase() + " " + row.file + " (" + row.reason + ")");
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
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\\n", "utf8");
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
function metadata(deployment) { return deployment?.deployment_trigger?.metadata || {}; }
function parseUrls(text) { return [...new Set((String(text).match(/https?:\/\/[^\s<>)]+/g) || []).map((v) => v.replace(/[),.;]+$/, "")))]; }
function lastUuid(text) { const matches = String(text).match(UUID_RE) || []; return matches[matches.length - 1] || ""; }
function eslintArgs(sourceFiles) { return ["exec", "--", "eslint", "--quiet", ...sourceFiles]; }

async function checks(value) {
  const env = envForChecks();
  const sourceFiles = value.files.filter((file) => /\.(c|m)?js$|\.(c|m)?tsx?$/.test(file));
  if (sourceFiles.length) run("changed-file lint", npmCommand(), eslintArgs(sourceFiles), { env });
  run("TypeScript typecheck", npmCommand(), ["run", "typecheck"], { env });
  if (value.risk.level !== "low") run("core mock smoke tests", npmCommand(), ["run", "smoke:core"], { env });
  if (value.risk.level === "medium") run("Node regression tests", npmCommand(), ["run", "test:node"], { env });
  if (value.risk.level === "high") {
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
  if (skipApi) args.push("--skip-api");
  run("read-only smoke test", process.execPath, args, { env: envForChecks() });
}
function productionOrigin(value) {
  if (process.env.CD_PRODUCTION_ORIGIN) return String(process.env.CD_PRODUCTION_ORIGIN).replace(/\/+$/, "");
  const domain = value.cf.pages.domains.find((item) => !item.includes(".pages.dev")) || value.cf.pages.domains[0];
  return domain ? "https://" + domain.replace(/^https?:\/\//, "").replace(/\/+$/, "") : "";
}

async function checkStage() {
  const value = await context();
  printContext(value);
  console.log("[deploy-safe] check passed; no deploy or data mutation.");
  return value;
}
async function previewStage() {
  const value = await checkStage();
  await checks(value);
  const built = build(value);
  const branch = "safe-preview-" + value.git.head.slice(0, 12);
  const pages = await deployPages(value, branch, false);
  const worker = value.needsWorker ? await uploadWorker(value) : null;
  const state = {
    schema: 1, createdAt: new Date().toISOString(),
    git: { branch: value.git.branch, commit: value.git.head, dirty: value.git.dirty },
    risk: value.risk, files: value.files,
    cf: { project: value.cf.project, worker: value.cf.worker, productionBranch: value.cf.pages.productionBranch },
    artifact: built, preview: { pages, worker, smokePassed: false }, worker,
  };
  writeState(state);
  console.log("[deploy-safe] Pages preview URL: " + pages.url);
  if (worker?.previewUrl) console.log("[deploy-safe] Worker preview URL: " + worker.previewUrl);
  return { value, state };
}
async function promote(value, state, yes) {
  assertProductionCi();
  if (!yes) throw new Error("Production promotion requires --yes.");
  assertArtifact(state);
  const oldPages = (await pageDeployments(value.cf, "production")).find((item) => metadata(item).branch === value.cf.pages.productionBranch);
  const oldWorker = value.needsWorker ? await workerActive(value.cf) : null;
  let workerPromoted = false;
  try {
    if (value.needsWorker) {
      if (!state.worker?.versionId) throw new Error("No Worker preview version to promote.");
      capture("Worker 100% promotion", npxCommand(), wrangler(["versions", "deploy", state.worker.versionId + "@100", "--name", value.cf.worker, "--message", "safe-production-" + value.git.head.slice(0, 12), "--yes"]), { env: envForChecks() });
      workerPromoted = true;
    }
    const pages = await deployPages(value, value.cf.pages.productionBranch, true);
    const next = {
      ...state,
      production: { deployedAt: new Date().toISOString(), pagesDeploymentId: pages.id, pagesUrl: productionOrigin(value), workerVersionId: state.worker?.versionId || "" },
      rollback: { pagesDeploymentId: oldPages?.id || "", workerVersionId: oldWorker?.versionId || "" },
    };
    writeState(next);
    await smoke(productionOrigin(value));
    writeState({ ...next, production: { ...next.production, smokePassed: true } });
    console.log("[deploy-safe] production smoke passed; commit=" + value.git.head);
  } catch (error) {
    console.error("[deploy-safe] production failed: " + error.message);
    if (workerPromoted && oldWorker?.versionId) {
      try {
        capture("automatic Worker rollback", npxCommand(), wrangler(["versions", "deploy", oldWorker.versionId + "@100", "--name", value.cf.worker, "--message", "safe-auto-rollback-" + value.git.head.slice(0, 12), "--yes"]), { env: envForChecks() });
        console.error("[deploy-safe] Worker rollback completed.");
      } catch (rollbackError) { console.error("[deploy-safe] Worker rollback failed: " + rollbackError.message); }
    }
    if (oldPages?.id) console.error("[deploy-safe] Pages rollback target=" + oldPages.id + "; run deploy:rollback -- --yes after confirmation.");
    throw error;
  }
}
async function productionStage() {
  const state = readState();
  const value = await checkStage();
  if (!state || state.git?.commit !== value.git.head) throw new Error("Release state does not match HEAD.");
  if (!state.preview?.smokePassed) throw new Error("Preview smoke has not passed.");
  await promote(value, state, autoYes);
}
async function confirmProduction() {
  if (!input.isTTY || !output.isTTY) throw new Error("Pass --yes in a non-interactive terminal.");
  const rl = createInterface({ input, output });
  try { return /^y(es)?$/i.test((await rl.question("Preview passed. Promote exact artifact to production? [y/N] ")).trim()); }
  finally { rl.close(); }
}
async function safeStage() {
  lock();
  try {
    const preview = await previewStage();
    await smoke(preview.state.preview.pages.url, preview.state.preview.worker?.previewUrl || "", !preview.state.preview.worker?.previewUrl);
    const state = { ...preview.state, preview: { ...preview.state.preview, smokePassed: true, smokedAt: new Date().toISOString() } };
    writeState(state);
    console.log("[deploy-safe] Preview passed. Production is the only remaining step.");
    if (previewOnly) {
      console.log("[deploy-safe] Preview-only mode; production was not attempted.");
      return;
    }
    await promote(preview.value, state, autoYes || await confirmProduction());
  } finally { unlock(); }
}
async function rollbackStage() {
  assertProductionCi();
  if (!autoYes) throw new Error("Rollback requires --yes.");
  const state = readState();
  if (!state?.rollback) throw new Error("No rollback record in " + stateFile);
  const value = await checkStage();
  const result = {};
  if (state.rollback.workerVersionId) {
    capture("Worker rollback", npxCommand(), wrangler(["versions", "deploy", state.rollback.workerVersionId + "@100", "--name", value.cf.worker, "--message", "safe-manual-rollback", "--yes"]), { env: envForChecks() });
    result.workerVersionId = state.rollback.workerVersionId;
  }
  if (state.rollback.pagesDeploymentId) {
    const pages = await cfFetch(apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID + "/pages/projects/" + encodeURIComponent(value.cf.project) + "/deployments/" + encodeURIComponent(state.rollback.pagesDeploymentId) + "/rollback", { method: "POST" });
    result.pagesDeploymentId = pages?.id || state.rollback.pagesDeploymentId;
  }
  if (!Object.keys(result).length) throw new Error("Rollback record has no usable target.");
  writeState({ ...state, lastRollback: { at: new Date().toISOString(), ...result } });
  console.log("[deploy-safe] rollback completed.");
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
  const pagesListUrl = pageDeploymentsUrl({ project: "project name" }, "preview");
  if (!pagesListUrl.includes("/project%20name/deployments?env=preview") || /[?&](?:page|per_page)=/.test(pagesListUrl)) throw new Error("Pages deployment lookup must use Cloudflare default pagination.");
  if (parseUrls("https://a.pages.dev https://b.workers.dev").length !== 2) throw new Error("URL parser failed.");
  console.log("[deploy-safe] self-test passed.");
}

async function main() {
  if (cli.flags.has("--self-test")) return selfTest();
  if (stage === "check") return checkStage();
  if (stage === "preview") { lock(); try { return previewStage(); } finally { unlock(); } }
  if (stage === "smoke") return smokeOnlyStage();
  if (stage === "production") { lock(); try { return productionStage(); } finally { unlock(); } }
  if (stage === "rollback") { lock(); try { return rollbackStage(); } finally { unlock(); } }
  if (stage === "safe") return safeStage();
  throw new Error("Unknown stage. Use deploy:check, deploy:preview, deploy:smoke, deploy:production, deploy:rollback, or deploy:safe.");
}
main().catch((error) => { unlock(); console.error("[deploy-safe] BLOCKED: " + (error?.stack || error)); process.exitCode = 1; });
