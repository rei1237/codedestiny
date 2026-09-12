#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, appendFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { collectChanges, createVerificationPlan, expandCiGuards } from "./lib/verification-plan.mjs";
import { lintTargets } from "./lib/lint-targets.mjs";
import { selfTest as riskSelfTest } from "./lib/change-risk.mjs";

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const args = process.argv.slice(2);
const value = (key) => args.find((arg) => arg.startsWith(`--${key}=`))?.slice(key.length + 3);
const scripts = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).scripts;
const guard = resolve(root, "scripts/lib/mock-network-guard.cjs").replaceAll("\\", "/");
const env = {
  ...process.env, LLM_DRY_RUN: "true", WORKERS_AI_ENABLED: "false",
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --require="${guard}"`.trim(),
  NEXT_TELEMETRY_DISABLED: "1", WRANGLER_SEND_METRICS: "false",
};

function run(command, commandArgs, capture = false) {
  const result = spawnSync(command, commandArgs, { cwd: root, env, windowsHide: true, encoding: "utf8", stdio: capture ? "pipe" : "inherit" });
  if (result.status !== 0) throw new Error(`${commandArgs.join(" ")} failed (${result.status ?? result.error?.code})${capture ? `: ${result.stderr}` : ""}`);
  return result.stdout || "";
}

function main() {
  if (args.includes("--self-test")) {
    riskSelfTest();
    run(process.execPath, ["--test", "__tests__/release/verification-plan.test.js"]);
    return;
  }
  const ci = args.includes("--ci-shadow");
  const committed = args.includes("--committed-head");
  const changes = collectChanges({
    // main 직접 개발: 로컬 기본 베이스는 HEAD 다. origin/main 을 쓰면 아직 push 하지 않은
    // 마이크로 커밋이 전부 누적돼 검사 범위가 세션 내내 불어난다(= 최소 검증이 깨진다).
    root, base: value("base") || (ci ? process.env.PR_BASE_SHA || "MISSING_PR_BASE" : committed ? "HEAD^" : "HEAD"),
    head: value("head") || (ci ? process.env.PR_HEAD_SHA || "HEAD" : "HEAD"), working: !ci && !committed,
  });
  let jestConfig;
  try { jestConfig = require(resolve(root, "jest.config.cjs")); } catch { /* Keep smoke when dependencies/config cannot be resolved. */ }
  let plan = createVerificationPlan(changes, { scripts, jestConfig, profile: value("profile") || "fast", skipBuild: args.includes("--skip-build"), forceCritical: process.env.CD_FORCE_CRITICAL === "true" });
  if (plan.profile === "all") {
    const workflow = require("js-yaml").load(readFileSync(resolve(root, ".github/workflows/pr-ci.yml"), "utf8"));
    plan = expandCiGuards(plan, workflow, scripts);
  }
  console.log(JSON.stringify(plan, null, 2));
  if (ci) {
    // Observation only: never feeds outputs into existing job conditions.
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n## Proposed verification plan (shadow only)\n\nExisting CI checks remain active. Collect 10 PR comparisons before changing selection.\n\n\`\`\`json\n${JSON.stringify(plan, null, 2)}\n\`\`\`\n`);
    if (value("output")) writeFileSync(value("output"), JSON.stringify(plan, null, 2) + "\n");
    return;
  }
  if (args.includes("--plan")) return;
  const npmCli = process.env.npm_execpath || resolve(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
  if (!existsSync(npmCli)) throw new Error("Run this checker through npm run check:fast so npm_execpath is available");
  for (const step of plan.steps) {
    console.log(`[check:changed] ${step.name || step.kind}`);
    if (step.kind === "npm") run(process.execPath, [npmCli, "run", step.name, ...(step.args.length ? ["--", ...step.args] : [])]);
    if (step.kind === "node") run(process.execPath, [step.file, ...step.args]);
    if (step.kind === "whitespace") {
      if (changes.baseSha && changes.headSha) run("git", ["diff", "--check", `${changes.baseSha}...${changes.headSha}`]);
      if (!committed) run("git", ["diff", "--check", "HEAD"]);
    }
    if (step.kind === "lint-changed") {
      const files = lintTargets(plan.files, { root });
      if (files.length) run(process.execPath, [resolve(dirname(require.resolve("eslint/package.json")), "bin/eslint.js"), "--quiet", "--", ...files]);
    }
    if (step.kind === "jest-related") {
      const files = lintTargets(plan.files, { root });
      if (!files.length) continue;
      const cli = require.resolve("jest/bin/jest");
      const flags = ["--experimental-vm-modules", cli, "--runInBand", "--testEnvironment=node", "--cacheDirectory=build-cache/jest", "--findRelatedTests", ...files];
      const tests = JSON.parse(run(process.execPath, [...flags, "--listTests", "--json"], true));
      if (tests.length) run(process.execPath, ["--experimental-vm-modules", cli, "--runInBand", "--testEnvironment=node", "--cacheDirectory=build-cache/jest", "--runTestsByPath", ...tests]);
      else console.log("[check:changed] No Jest import dependents; source-reading static guards already ran.");
    }
  }
}

try { main(); } catch (error) {
  console.error(`[check:changed] BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
