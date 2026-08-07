#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { requiresPullRequest } from "./lib/change-risk.mjs";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const dryRun = process.argv.includes("--dry-run");

// Node 20+ will not spawn .cmd shims without a shell; without this every npm call
// below failed with EINVAL on Windows, so release:fast never ran there.
const onWindows = process.platform === "win32";
function run(command, args, options = {}) {
  const useShell = onWindows && command.endsWith(".cmd");
  const finalArgs = useShell ? args.map((arg) => (/\s/.test(String(arg)) ? `"${arg}"` : String(arg))) : args;
  const result = spawnSync(command, finalArgs, { cwd: root, stdio: "inherit", shell: useShell, windowsHide: true, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}
function capture(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
  return String(result.stdout || "").trim();
}

try {
  const branch = capture(["branch", "--show-current"]);
  if (!branch || ["main", "master"].includes(branch.toLowerCase())) {
    throw new Error("release:fast must run from a clean secondary feature worktree, never from main.");
  }
  if (capture(["status", "--porcelain"])) throw new Error("Working tree is dirty. Commit or stash first; release:fast never creates commits.");
  run("git", ["fetch", "origin", "main", "--no-tags"]);
  const head = capture(["rev-parse", "HEAD"]);
  const remote = capture(["rev-parse", "origin/main"]);
  if (head === remote) throw new Error("main has no unpushed commit.");
  run("git", ["merge-base", "--is-ancestor", "origin/main", "HEAD"]);

  // 레인 판정. 인증·결제·DB 스키마·배포 인프라는 preview 스모크가 잡아내지 못하거나
  // 되돌릴 수 없어서 사람이 봐야 한다. 그 외에는 릴리스 파이프라인의
  // preview -> smoke -> promote 가 안전망 역할을 한다.
  const changed = capture(["diff", "--name-only", "origin/main...HEAD"]).split(/\r?\n/).filter(Boolean);
  const pr = requiresPullRequest(changed);
  if (pr.required) {
    for (const match of pr.matches) console.error(`  - ${match.file} (${match.reason})`);
    throw new Error(`${pr.matches.length} PR-required path(s) changed. Open a pull request targeting main instead.`);
  }
  console.log(`[release:fast] lane=direct files=${changed.length}`);

  run(npm, ["run", "check:quick", "--", "--committed-head", "--skip-build"]);
  if (dryRun) {
    console.log(`[release:fast] --dry-run: checks passed for ${head.slice(0, 12)}; nothing pushed.`);
  } else {
    run("git", ["push", "origin", "HEAD:main"]);
    console.log(`[release:fast] pushed ${head.slice(0, 12)} directly to main; the unified GitHub Actions release owns deployment.`);
  }
} catch (error) {
  console.error(`[release:fast] BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
