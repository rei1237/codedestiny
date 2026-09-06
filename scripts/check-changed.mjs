#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
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

  // 삭제된 파일을 eslint 에 넘기면 "No files matching the pattern" 으로 죽는다.
  // 삭제만 있는 변경(미참조 파일 스윕)이 통째로 막히던 자리다 — 위험도 분류는 삭제분까지 보되,
  // lint 대상은 실제로 존재하는 파일로만 좁힌다.
  const source = files.filter((file) => /\.(?:[cm]?js|[cm]?ts|tsx|jsx)$/.test(file) && existsSync(file));
  if (source.length) run("changed-file lint", npm, ["exec", "--", "eslint", "--quiet", ...source]);
  // PR CI 실패 1위가 sitemap 드리프트다. 로컬 4초짜리를 느린 typecheck 앞에 둬서
  // 라우트를 건드린 커밋이 CI 왕복을 한 번 더 돌지 않게 한다.
  run("sitemap drift", npm, ["run", "verify:sitemap-drift"]);
  run("typecheck", npm, ["run", "typecheck"]);
  if (risk !== "low") run("mock core smoke", npm, ["run", "smoke:core"]);
  // 🔴 deep.required 를 함께 본다. 여기만 level 단독으로 보던 동안, level 은 medium 인데
  //    전체 회귀가 필요한 경로(scripts/migrations/** · app/hooks/useCoinGate.ts ·
  //    app/_lib/billing-client.ts …)가 로컬에서만 check:critical 을 건너뛰었다.
  //    CI(resolve-ci-tier.mjs)와 배포(deploy-safe.mjs)는 처음부터 두 축을 함께 보고 있었다 —
  //    같은 모듈을 쓰면서 세 소비자의 판정이 갈리던 자리다.
  if (risk === "high" || deep.required) run("critical mock gates", npm, ["run", "check:critical"]);
  if (!skipBuild) run("Cloudflare Pages build", npm, ["run", "build:cf"]);
}

try {
  main();
} catch (error) {
  console.error(`[check:changed] BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
