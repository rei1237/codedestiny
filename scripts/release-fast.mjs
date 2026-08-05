#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false, windowsHide: true, ...options });
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
  run(npm, ["run", "check:quick", "--", "--committed-head"]);
  run("git", ["push", "origin", "HEAD:main"]);
  console.log(`[release:fast] pushed ${head.slice(0, 12)} directly to main; the unified GitHub Actions release owns deployment.`);
} catch (error) {
  console.error(`[release:fast] BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
