#!/usr/bin/env node

/*
 * 워크트리별로 무엇을 건드리고 있는지, 그리고 겹치는 파일이 있는지 보고한다.
 *
 * "같은 부분이 아니면 워크트리를 나눈다"는 판단을 사람 기억이 아니라 실제 git 상태로 한다.
 * 세션이 직접 등록하는 claim 파일 방식은 갱신을 잊는 순간 거짓말이 되므로 쓰지 않는다.
 *
 * 세는 것: 각 워크트리의 미커밋 변경 + origin/main 에 아직 없는 커밋이 건드린 파일.
 * 읽기 전용이며 아무것도 바꾸지 않는다.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");

function git(gitArgs, cwd) {
  const result = spawnSync("git", gitArgs, { cwd, encoding: "utf8", windowsHide: true });
  return result.status === 0 ? String(result.stdout || "").trim() : "";
}
function lines(value) {
  return value ? value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) : [];
}

function worktrees() {
  const out = git(["worktree", "list", "--porcelain"], process.cwd());
  const entries = [];
  let current = null;
  for (const line of lines(out)) {
    if (line.startsWith("worktree ")) {
      if (current) entries.push(current);
      current = { path: line.slice("worktree ".length).trim(), branch: "", head: "" };
    } else if (current && line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    } else if (current && line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length).trim();
    }
  }
  if (current) entries.push(current);
  return entries;
}

/** 이 워크트리가 "지금 작업 중인" 파일. 미커밋 + origin/main 에 없는 커밋. */
function touchedFiles(cwd) {
  const working = [
    git(["diff", "--name-only"], cwd),
    git(["diff", "--cached", "--name-only"], cwd),
    git(["ls-files", "--others", "--exclude-standard"], cwd),
  ].flatMap(lines);
  // origin/main 이 없으면 커밋 범위는 건너뛴다. 미커밋 변경만으로도 겹침은 드러난다.
  const committed = git(["rev-parse", "--verify", "--quiet", "origin/main"], cwd)
    ? lines(git(["diff", "--name-only", "origin/main...HEAD"], cwd))
    : [];
  return [...new Set([...working, ...committed])].sort();
}

const entries = worktrees().map((entry) => ({ ...entry, files: touchedFiles(entry.path) }));
const owners = new Map();
for (const entry of entries) {
  for (const file of entry.files) {
    if (!owners.has(file)) owners.set(file, []);
    owners.get(file).push(entry);
  }
}
const collisions = [...owners.entries()]
  .filter(([, list]) => list.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

for (const entry of entries) {
  const name = path.basename(entry.path);
  const label = entry.branch || entry.head.slice(0, 12) || "detached";
  console.log(`\n${name}  [${label}]  ${entry.files.length} file(s)`);
  for (const file of entry.files.slice(0, 12)) {
    const shared = owners.get(file).length > 1;
    console.log(`  ${shared ? "!" : " "} ${file}`);
  }
  if (entry.files.length > 12) console.log(`    … ${entry.files.length - 12} more`);
}

console.log("");
if (!collisions.length) {
  console.log("[worktree-status] No file is touched by two worktrees. Safe to work and deploy in parallel.");
  process.exit(0);
}

console.log(`[worktree-status] ${collisions.length} file(s) touched by more than one worktree:`);
for (const [file, list] of collisions.slice(0, 25)) {
  console.log(`  ${file}`);
  for (const entry of list) console.log(`      ${path.basename(entry.path)} [${entry.branch || "detached"}]`);
}
if (collisions.length > 25) console.log(`  … ${collisions.length - 25} more`);
console.log("");
console.log("  Overlap is not automatically wrong — it means those worktrees must merge before");
console.log("  the second one promotes, or one of them should take over the file entirely.");
console.log("  Production promotion is already guarded: deploy-safe refuses to promote a HEAD");
console.log("  that does not contain the currently live commit.");

process.exitCode = strict ? 1 : 0;
