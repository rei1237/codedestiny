#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PROTECTED_BRANCHES = new Set(["main", "master"]);

function normalisePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function git(args, cwd) {
  const result = spawnSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) return "";
  return String(result.stdout || "").trim();
}

function isAncestor(base, head, cwd) {
  if (!base || !head) return false;
  return spawnSync("git", ["-C", cwd, "merge-base", "--is-ancestor", base, head], {
    encoding: "utf8",
    windowsHide: true,
  }).status === 0;
}

function parseWorktrees(text) {
  const entries = [];
  let current = null;

  for (const line of String(text || "").split(/\r?\n/)) {
    if (line.startsWith("worktree ")) {
      if (current) entries.push(current);
      current = { path: line.slice("worktree ".length).trim(), branch: "" };
      continue;
    }
    if (current && line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "").trim();
    }
  }
  if (current) entries.push(current);
  return entries;
}

function readGithubEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(eventPath, "utf8"));
  } catch {
    return {};
  }
}

function getPolicyContext(cwd = process.cwd()) {
  const currentPath = normalisePath(path.resolve(cwd));
  const worktrees = parseWorktrees(git(["worktree", "list", "--porcelain"], cwd));
  const normalisedEntries = worktrees.map((entry) => ({
    ...entry,
    path: normalisePath(entry.path),
  }));
  const currentEntry = normalisedEntries.find((entry) => entry.path === currentPath);
  const primaryPath = normalisedEntries[0]?.path || "";
  const branch = git(["branch", "--show-current"], cwd);
  const headSha = git(["rev-parse", "HEAD"], cwd);
  const originMainSha = git(["rev-parse", "--verify", "origin/main"], cwd);
  const event = readGithubEvent();
  const pullRequest = event.pull_request || {};
  const baseRef = process.env.GITHUB_BASE_REF || pullRequest.base?.ref || "";
  const headRef = process.env.GITHUB_HEAD_REF || pullRequest.head?.ref || "";
  const baseSha = process.env.GITHUB_BASE_SHA || pullRequest.base?.sha || "";
  const eventName = process.env.GITHUB_EVENT_NAME || "";
  const githubRef = process.env.GITHUB_REF || "";
  // For pull_request events, GITHUB_SHA is GitHub's synthetic merge commit.
  // The workflow intentionally checks out the exact PR head, so compare it
  // with the event's head SHA. Push/deploy events continue using GITHUB_SHA.
  const checkedSha = eventName === "pull_request"
    ? pullRequest.head?.sha || headSha
    : process.env.GITHUB_SHA || headSha;
  const prBody = process.env.GITHUB_PR_BODY || pullRequest.body || "";

  return {
    cwd: currentPath,
    worktrees: normalisedEntries,
    registered: Boolean(currentEntry),
    isPrimary: Boolean(currentEntry && currentPath === primaryPath),
    branch,
    headSha,
    originMainSha,
    baseRef,
    headRef,
    baseSha,
    checkedSha,
    eventName,
    githubRef,
    ci: process.env.CI === "true" || process.env.CI === "1",
    prBody,
    baseIsAncestor: originMainSha ? isAncestor(originMainSha, headSha, cwd) : false,
  };
}

function evaluateWorktreePolicy(context, mode = "edit") {
  const failures = [];
  const branch = String(context.branch || "").trim();
  const protectedBranch = PROTECTED_BRANCHES.has(branch.toLowerCase());

  if (mode === "ci") {
    if (context.baseRef !== "main") {
      failures.push(`PR base must be main (received ${context.baseRef || "missing"}).`);
    }
    if (!context.headRef || PROTECTED_BRANCHES.has(context.headRef.toLowerCase())) {
      failures.push("PR head must be a non-protected feature branch.");
    }
    if (context.checkedSha && context.headSha && context.checkedSha !== context.headSha) {
      failures.push("The checked-out SHA does not match the workflow SHA.");
    }
    if (!context.baseIsAncestor) {
      failures.push("PR head does not include the latest origin/main base.");
    }
    for (const heading of ["## Validation", "## Risk", "## No-regression Scope", "## Rollback"]) {
      if (!String(context.prBody || "").includes(heading)) {
        failures.push(`PR body is missing required section: ${heading}.`);
      }
    }
    return { ok: failures.length === 0, failures };
  }

  if (mode === "deploy") {
    const onMainRef = context.githubRef === "refs/heads/main" || process.env.GITHUB_REF_NAME === "main";
    const isPullRequest = context.eventName === "pull_request";
    if (!context.ci) {
      failures.push("Production deployment is allowed only from the CI workflow, not a local worktree.");
    }
    if (!onMainRef || branch !== "main") {
      failures.push("Production deployment must run from the main branch.");
    }
    if (isPullRequest) {
      failures.push("Production deployment cannot run from a pull_request event.");
    }
    if (context.checkedSha && context.headSha && context.checkedSha !== context.headSha) {
      failures.push("The deployment checkout SHA does not match the workflow SHA.");
    }
    return { ok: failures.length === 0, failures };
  }

  if (!context.registered) {
    failures.push("Current directory is not a registered Git worktree.");
  }
  // 주 워크트리 편집은 허용한다. 실제 사고를 막는 것은 아래 protectedBranch 검사이고,
  // 워크트리 격리는 세션마다 전체 체크아웃 + node_modules 재설치를 강요할 뿐이었다.
  // 병렬 작업이 필요할 때만 scripts/create-safe-worktree.ps1 로 보조 워크트리를 만든다.
  if (!branch) {
    failures.push("Detached HEAD is not allowed for repository edits.");
  }
  if (protectedBranch) {
    failures.push(`Protected branch '${branch}' cannot be edited directly.`);
  }
  if (!context.originMainSha) {
    failures.push("origin/main is unavailable; refresh the remote base before editing.");
  }

  if (mode === "pr" && !context.baseIsAncestor) {
    failures.push("The feature branch is stale; rebase or merge the latest origin/main before opening a PR.");
  }

  return { ok: failures.length === 0, failures };
}

function printResult(result, mode, context) {
  if (result.ok) {
    console.log(`[verify-worktree-policy] PASS mode=${mode} branch=${context.branch || "detached"} path=${context.cwd}`);
    return;
  }
  console.error(`[verify-worktree-policy] BLOCKED mode=${mode}`);
  for (const failure of result.failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}

function runSelfTest() {
  const base = {
    registered: true,
    isPrimary: false,
    branch: "codex/example",
    originMainSha: "base-sha",
    baseIsAncestor: true,
    baseRef: "main",
    headRef: "codex/example",
    checkedSha: "head-sha",
    headSha: "head-sha",
    ci: false,
    prBody: "## Validation\n## Risk\n## No-regression Scope\n## Rollback",
  };
  const cases = [
    ["secondary edit", evaluateWorktreePolicy(base, "edit"), true],
    ["primary worktree on feature branch", evaluateWorktreePolicy({ ...base, isPrimary: true }, "edit"), true],
    ["primary worktree on main", evaluateWorktreePolicy({ ...base, isPrimary: true, branch: "main" }, "edit"), false],
    ["main edit", evaluateWorktreePolicy({ ...base, branch: "main" }, "edit"), false],
    ["detached edit", evaluateWorktreePolicy({ ...base, branch: "" }, "edit"), false],
    ["fresh PR", evaluateWorktreePolicy(base, "ci"), true],
    ["stale PR", evaluateWorktreePolicy({ ...base, baseIsAncestor: false }, "ci"), false],
    ["local deploy", evaluateWorktreePolicy({ ...base, githubRef: "refs/heads/main" }, "deploy"), false],
    ["CI main deploy", evaluateWorktreePolicy({ ...base, branch: "main", githubRef: "refs/heads/main", eventName: "push", ci: true }, "deploy"), true],
  ];
  for (const [name, result, expected] of cases) {
    if (result.ok !== expected) throw new Error(`self-test failed: ${name}`);
  }
  console.log(`[verify-worktree-policy] self-test passed (${cases.length} cases)`);
}

function runHook() {
  const context = getPolicyContext();
  const result = evaluateWorktreePolicy(context, "edit");
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: result.ok ? "allow" : "deny",
      ...(result.ok
        ? {}
        : { permissionDecisionReason: result.failures.join(" ") }),
    },
  };
  process.stdout.write(JSON.stringify(output));
}

const args = new Set(process.argv.slice(2));
if (args.has("--self-test")) {
  runSelfTest();
} else if (args.has("--hook")) {
  runHook();
} else {
  const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
  const mode = modeArg ? modeArg.slice("--mode=".length) : "edit";
  const validModes = new Set(["edit", "pr", "deploy", "ci"]);
  if (!validModes.has(mode)) {
    console.error(`Unknown mode '${mode}'. Use edit, pr, deploy, or ci.`);
    process.exit(1);
  }
  const context = getPolicyContext();
  printResult(evaluateWorktreePolicy(context, mode), mode, context);
}

export { evaluateWorktreePolicy, parseWorktrees };
