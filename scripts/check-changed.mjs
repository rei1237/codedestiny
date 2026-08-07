#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { riskOf, requiresDeepVerification, selfTest as riskSelfTest } from "./lib/change-risk.mjs";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const args = new Set(process.argv.slice(2));
const committedHead = args.has("--committed-head");
// 빌드는 CI 가 preview 단계에서 한다. Windows 로컬에서는 next build 가 완주되지 않고,
// 빌드가 깨져도 preview 에서 멈추므로 프로덕션에는 닿지 않는다.
const skipBuild = args.has("--skip-build");

function git(args, allowFailure = false) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  if (result.status !== 0 && !allowFailure) throw new Error(`git ${args.join(" ")} failed`);
  return String(result.stdout || "").trim();
}

// Node 20+ refuses to spawn .cmd shims without a shell, so every npm call here died
// with EINVAL on Windows and surfaced as a bare "typecheck failed" -- check:quick has
// never run locally on Windows. shell: true concatenates args instead of passing them
// through, so quote anything with whitespace: changed-file lint passes real paths.
const onWindows = process.platform === "win32";
function shellSafe(value) {
  const text = String(value);
  return /\s/.test(text) ? `"${text}"` : text;
}

function run(label, command, commandArgs) {
  console.log(`[check:changed] ${label}`);
  const useShell = onWindows && command.endsWith(".cmd");
  const result = spawnSync(command, useShell ? commandArgs.map(shellSafe) : commandArgs, {
    cwd: root,
    env: { ...process.env, LLM_DRY_RUN: "true", WORKERS_AI_ENABLED: "false" },
    stdio: "inherit",
    shell: useShell,
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`${label} failed`);
}

function changedFiles() {
  const range = committedHead ? "HEAD^..HEAD" : "origin/main...HEAD";
  const committed = git(["diff", "--name-only", range], true).split(/\r?\n/).filter(Boolean);
  const working = committedHead ? [] : [
    git(["diff", "--name-only"], true),
    git(["diff", "--cached", "--name-only"], true),
    git(["ls-files", "--others", "--exclude-standard"], true),
  ].flatMap((value) => value.split(/\r?\n/).filter(Boolean));
  return [...new Set([...committed, ...working])].sort();
}

// 위험도 분류 정본은 scripts/lib/change-risk.mjs 하나다.
const docsOnly = /^(?:README(?:\.md)?|docs\/|.*\.md$|.*\.txt$)/i;

function main() {
  if (args.has("--self-test")) {
    riskSelfTest();
    console.log("[check:changed] self-test passed");
    return;
  }
  const files = changedFiles();
  if (!files.length) throw new Error("No changed files found.");
  const risk = riskOf(files).level;
  const deep = requiresDeepVerification(files);
  console.log(`[check:changed] risk=${risk} deepRequired=${deep.required} files=${files.length}`);
  files.forEach((file) => console.log(`  - ${file}`));
  for (const match of deep.matches) console.log(`  deep-verification: ${match.file} (${match.reason})`);
  run("whitespace", "git", ["diff", "--check", committedHead ? "HEAD^..HEAD" : "HEAD"]);

  if (files.every((file) => docsOnly.test(file))) {
    console.log("[check:changed] docs-only change; build skipped.");
    return;
  }
  if (skipBuild) console.log("[check:changed] --skip-build: the Cloudflare Pages build runs in CI.");

  const source = files.filter((file) => /\.(?:[cm]?js|[cm]?ts|tsx|jsx)$/.test(file));
  if (source.length) run("changed-file lint", npm, ["exec", "--", "eslint", "--quiet", ...source]);
  run("typecheck", npm, ["run", "typecheck"]);
  if (risk !== "low") run("mock core smoke", npm, ["run", "smoke:core"]);
  if (risk === "high") run("critical mock gates", npm, ["run", "check:critical"]);
  if (!skipBuild) run("Cloudflare Pages build", npm, ["run", "build:cf"]);
}

try {
  main();
} catch (error) {
  console.error(`[check:changed] BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
