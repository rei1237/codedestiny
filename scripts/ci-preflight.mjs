#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync, symlinkSync, mkdirSync, rmdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { ciPreflightPlan, validatedPrArguments } from "./lib/ci-preflight-plan.mjs";
import { resolveTier, shouldRunFastChecks, shouldRunStaticGuards } from "./resolve-ci-tier.mjs";

const root = process.cwd();
const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
function run(file, args, { cwd = root, env = process.env, capture = false } = {}) {
  const result = spawnSync(file, args, { cwd, env, windowsHide: true, encoding: "utf8", timeout: 30 * 60 * 1000, maxBuffer: 32 * 1024 * 1024, stdio: capture ? "pipe" : "inherit" });
  if (result.status !== 0) throw new Error(`${file} ${args.join(" ")} failed (${result.status ?? result.error?.code})${capture ? `: ${result.stderr}` : ""}`);
  return (result.stdout || "").trim();
}
function runAsync(file, args, { cwd = root, env = process.env } = {}) {
  return new Promise(resolveRun => {
    const child = spawn(file, args, { cwd, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 30 * 60 * 1000);
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => {
      clearTimeout(timeout);
      resolveRun({ status: null, signal: null, stdout, stderr, error });
    });
    child.on("close", (status, signal) => {
      clearTimeout(timeout);
      resolveRun({ status: timedOut ? null : status, signal: timedOut ? "SIGTERM" : signal, stdout, stderr, timedOut });
    });
  });
}
const INDEPENDENT_PURE_CHECKS = [
  "npm run verify:ai-locale-pipeline",
  "npm run verify:business-identity",
  "npm run verify:sukuyo-astronomy",
];
const git = (args, options = {}) => run("git", args, { capture: true, ...options });
function tree() {
  const index = resolve(git(["rev-parse", "--absolute-git-dir"]), `preflight-index-${randomUUID()}`);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  try {
    git(["read-tree", "HEAD"], { env });
    git(["add", "-A", "--", "."], { env });
    return git(["write-tree"], { env });
  } finally { if (existsSync(index)) unlinkSync(index); }
}
// Upstream moved but never touched any file this candidate changed: reusing prior verification is safe.
// GitHub itself does not require a PR branch to contain the latest main (no merge queue, strict status checks off),
// so this local rule only needs to match that already-accepted risk level, not exceed it.
export function upstreamCompatible({ ancestor, upstreamFiles, files }) {
  if (!ancestor) return false;
  return !upstreamFiles.some((file) => files.includes(file));
}
function checkUpstream(oldBase, newBase, files) {
  if (oldBase === newBase) return true;
  let ancestor = true;
  try { git(["merge-base", "--is-ancestor", oldBase, newBase]); } catch { ancestor = false; }
  const upstreamFiles = ancestor ? git(["diff", "--name-only", oldBase, newBase]).split(/\r?\n/).filter(Boolean) : [];
  return upstreamCompatible({ ancestor, upstreamFiles, files });
}
async function main() {
  const receiptPath = resolve(git(["rev-parse", "--absolute-git-dir"]), "ci-preflight.json");
  const planOnly = argv.includes("--plan");
  if (!planOnly) git(["fetch", "--quiet", "origin", "main"]);
  let base = git(["rev-parse", "origin/main"]);
  const head = git(["rev-parse", "HEAD"]);
  const candidate = tree();
  if (argv.includes("--verify-receipt") || argv.includes("--create-pr")) {
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    if (receipt.tree !== candidate || receipt.version !== 1 || !Array.isArray(receipt.files) || !checkUpstream(receipt.base, base, receipt.files)) throw new Error("Preflight evidence is stale. Run npm run ci:preflight again.");
    if (git(["status", "--porcelain"])) throw new Error("Commit verified changes before PR creation.");
    if (argv.includes("--create-pr")) {
      const branch = git(["branch", "--show-current"]);
      const remote = git(["ls-remote", "origin", `refs/heads/${branch}`]).split(/\s/)[0];
      if (remote !== head) throw new Error("Push the verified commit before PR creation.");
      run("gh", validatedPrArguments(argv.filter(arg => arg !== "--create-pr"), branch));
    } else console.log("[ci:preflight] receipt matches committed tree and latest main");
    return;
  }
  if (!planOnly && existsSync(receiptPath)) unlinkSync(receiptPath);
  git(["merge-base", "--is-ancestor", base, "HEAD"]);
  const files = git(["diff", "--name-only", base, candidate]).split(/\r?\n/).filter(Boolean);
  const tier = argv.includes("--full") ? "critical" : resolveTier(files);
  const workflow = require("js-yaml").load(readFileSync(resolve(root, ".github/workflows/pr-ci.yml"), "utf8"));
  const runFast = argv.includes("--full") || shouldRunFastChecks(files);
  const runGuards = shouldRunStaticGuards(files);
  const commands = ciPreflightPlan(workflow, tier, { runFast, runGuards });
  if (!runFast) commands.unshift("npm run verify:doc-freshness");
  // These cheap independent PR gates also read shared source outside their path filters.
  commands.push(
    "npm run verify:ai-locale-pipeline",
    "npm run verify:business-identity",
    "npm run verify:sukuyo-astronomy",
  );
  console.log(JSON.stringify({ base, tree: candidate, tier, files, commands }, null, 2));
  if (planOnly) return;
  const dependencies = resolve(root, "node_modules");
  if (!existsSync(dependencies)) throw new Error("Run npm ci and npx playwright install chromium first.");
  const installed = JSON.parse(readFileSync(resolve(dependencies, ".package-lock.json"), "utf8"));
  const locked = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8"));
  for (const [name, pkg] of Object.entries(installed.packages || {})) {
    if (locked.packages?.[name]?.version !== pkg.version || locked.packages?.[name]?.integrity !== pkg.integrity) throw new Error(`Dependency drift: ${name}. Run npm ci.`);
  }
  const snapshot = resolve(dirname(root), `.preflight-${randomUUID().slice(0, 8)}`);
  mkdirSync(dirname(snapshot), { recursive: true });
  const commit = git(["commit-tree", candidate, "-p", head, "-m", "Local preflight snapshot (not published)"]);
  let added = false;
  try {
    git(["-c", "core.longpaths=true", "worktree", "add", "--detach", snapshot, commit]);
    added = true;
    symlinkSync(dependencies, resolve(snapshot, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    const guard = resolve(snapshot, "scripts/lib/mock-network-guard.cjs").replaceAll("\\", "/");
    // The UUID checkout has its own .next; unrelated dev servers cannot own it.
    const env = { ...process.env, PR_BASE_SHA: base, PR_HEAD_SHA: commit, LLM_DRY_RUN: "true", WORKERS_AI_ENABLED: "false", NEXT_TELEMETRY_DISABLED: "1", WRANGLER_SEND_METRICS: "false", ALLOW_DEV_SERVER_DURING_BUILD: "1", NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --require="${guard}"`.trim() };
    const npm = process.env.npm_execpath;
    if (!npm) throw new Error("Invoke through npm run ci:preflight");
    const assertBase = () => {
      const latest = git(["rev-parse", "origin/main"]);
      if (latest === base) return;
      if (!checkUpstream(base, latest, files)) throw new Error("main changed during validation; update the branch and run preflight again.");
      base = latest;
    };
    const runIndependentChecks = async (parallelCommands) => {
      assertBase();
      console.log(`[ci:preflight] parallel (${parallelCommands.length}) ${parallelCommands.join(" | ")}`);
      const results = await Promise.all(parallelCommands.map(async command => {
        const [binary, ...args] = command.split(/\s+/);
        const result = await runAsync(process.execPath, binary === "npm" ? [npm, ...args] : args, { cwd: snapshot, env });
        return { command, ...result };
      }));
      for (const result of results) {
        if (result.stdout) process.stdout.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
        if (result.error) throw new Error(`${result.command} failed to start: ${result.error.message}`);
        if (result.status !== 0) throw new Error(`${result.command} failed (${result.status ?? result.signal})`);
      }
      assertBase();
    };
    // Mirror checks run before build generators; no branch commit is needed.
    const mirror = commands.filter(c => c.startsWith("npm run verify:public-mirror-fresh"));
    const ordered = [...mirror, ...commands.filter(c => !mirror.includes(c))];
    const parallelStart = ordered.length - INDEPENDENT_PURE_CHECKS.length;
    const parallelCommands = ordered.slice(parallelStart);
    if (parallelCommands.join("\n") !== INDEPENDENT_PURE_CHECKS.join("\n")) throw new Error("Independent preflight checks must remain the final pure-check group");
    for (let index = 0; index < ordered.length; index += 1) {
      const command = ordered[index];
      if (index >= parallelStart) {
        if (index === parallelStart) await runIndependentChecks(parallelCommands);
        continue;
      }
      assertBase();
      console.log(`[ci:preflight] ${command}`);
      const [binary, ...args] = command.split(/\s+/);
      run(process.execPath, binary === "npm" ? [npm, ...args] : args, { cwd: snapshot, env });
    }
    // Scope uses the exact snapshot diff, including uncommitted shell payment edits.
    const scope = run(process.execPath, ["scripts/resolve-paid-gate-scope.mjs", "--base", base, "--head", commit], { cwd: snapshot, env, capture: true });
    console.log(scope);
    if (!scope.includes("[paid-gate-scope] run=false")) {
      // No base attribution waiver: every paid regression must pass locally.
      const paidGateArgs = ["scripts/run-paid-gate-suite.mjs"];
      // test:jest와 test:node를 이미 preflight 명령으로 통과했으면 paid suite의 `npm test`와 중복된다.
      // 독립 GitHub paid-flow-gates job은 여전히 전체 스위트를 실행한다.
      if (commands.includes("npm run test:jest") && commands.includes("npm run test:node")) paidGateArgs.push("--skip", "npm test");
      run(process.execPath, paidGateArgs, { cwd: snapshot, env });
    }
    if (tree() !== candidate) throw new Error("Source changed during validation; run preflight again.");
    const finalMain = git(["rev-parse", "origin/main"]);
    if (finalMain !== base) {
      if (!checkUpstream(base, finalMain, files)) throw new Error("Source/main changed during validation; run preflight again.");
      base = finalMain;
    }
    writeFileSync(receiptPath, JSON.stringify({ version: 1, tree: candidate, base, tier, files, completedAt: new Date().toISOString() }, null, 2));
    console.log("[ci:preflight] PASS. Commit, push, then npm run pr:create -- --title ... --body-file ...");
  } finally {
    // Only this UUID snapshot is disposable. Never touch another worktree.
    if (added && dirname(snapshot) === dirname(root) && /^\.preflight-[0-9a-f]{8}$/.test(snapshot.split(/[\\/]/).at(-1))) {
      const link = resolve(snapshot, "node_modules");
      if (existsSync(link)) {
        if (process.platform === "win32") rmdirSync(link);
        else unlinkSync(link);
      }
      try { git(["-c", "core.longpaths=true", "worktree", "remove", "--force", "--", snapshot]); }
      catch (error) { console.error(`[ci:preflight] cleanup needs attention: ${snapshot}: ${error.message}`); }
    }
  }
}
function isEntrypoint() { return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
if (isEntrypoint()) main().catch(error => { console.error(`[ci:preflight] BLOCKED: ${error.message}`); process.exitCode = 1; });
