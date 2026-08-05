#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const args = new Set(process.argv.slice(2));
const committedHead = args.has("--committed-head");

function git(args, allowFailure = false) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  if (result.status !== 0 && !allowFailure) throw new Error(`git ${args.join(" ")} failed`);
  return String(result.stdout || "").trim();
}

function run(label, command, commandArgs) {
  console.log(`[check:changed] ${label}`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: { ...process.env, LLM_DRY_RUN: "true", WORKERS_AI_ENABLED: "false" },
    stdio: "inherit",
    shell: false,
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

const high = [
  /^(worker|server)\//i,
  /(^|\/)(payment|billing|subscription|entitlement|ticket|pass|auth|session|user|database|migration|schema)\b/i,
  /(^|\/)wrangler(?:\.(?:toml|jsonc?))?$/i,
  /^\.github\/workflows\//i,
  /(^|\/)scripts\/(?:deploy|release|rollback)/i,
  /(^|\/)\.env/i,
];
const medium = [/^(app|components|src|lib|js)\//i, /(^|\/)(package\.json|next\.config|tsconfig)/i];
const docsOnly = /^(?:README(?:\.md)?|docs\/|.*\.md$|.*\.txt$)/i;

function level(files) {
  if (files.some((file) => high.some((pattern) => pattern.test(file)))) return "high";
  if (files.some((file) => medium.some((pattern) => pattern.test(file)))) return "medium";
  return "low";
}

function main() {
  if (args.has("--self-test")) {
    if (level(["docs/guide.md"]) !== "low") throw new Error("docs classification failed");
    if (level(["app/page.tsx"]) !== "medium") throw new Error("frontend classification failed");
    if (level(["worker/routes/payments.js"]) !== "high") throw new Error("worker classification failed");
    if (level([".github/workflows/release.yml"]) !== "high") throw new Error("workflow classification failed");
    console.log("[check:changed] self-test passed");
    return;
  }
  const files = changedFiles();
  if (!files.length) throw new Error("No changed files found.");
  const risk = level(files);
  console.log(`[check:changed] risk=${risk} files=${files.length}`);
  files.forEach((file) => console.log(`  - ${file}`));
  run("whitespace", "git", ["diff", "--check", committedHead ? "HEAD^..HEAD" : "HEAD"]);

  if (files.every((file) => docsOnly.test(file))) {
    console.log("[check:changed] docs-only change; build skipped.");
    return;
  }

  const source = files.filter((file) => /\.(?:[cm]?js|[cm]?ts|tsx|jsx)$/.test(file));
  if (source.length) run("changed-file lint", npm, ["exec", "--", "eslint", "--quiet", ...source]);
  run("typecheck", npm, ["run", "typecheck"]);
  if (risk !== "low") run("mock core smoke", npm, ["run", "smoke:core"]);
  if (risk === "high") run("critical mock gates", npm, ["run", "check:critical"]);
  run("Cloudflare Pages build", npm, ["run", "build:cf"]);
}

try {
  main();
} catch (error) {
  console.error(`[check:changed] BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
