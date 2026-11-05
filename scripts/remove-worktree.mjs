#!/usr/bin/env node
/**
 * 워크트리를 끝까지 지운다. 폴더가 남으면 실패다.
 *
 * 왜 필요한가: `git worktree remove --force` 가 긴 경로에서 "Filename too long" 으로 멈추면 등록만
 * 풀리고 파일이 남는다(2026-11-04 실측 11개 중 6개). 그 폴더는 어떤 목록에도 안 잡히는 고아가 된다.
 *
 * 🔴 순서가 안전의 전부다. 공유 node_modules 정션을 먼저 끊어야 한다. 끊지 않고 지우면 main 의
 *    설치본이 함께 사라질 수 있다.
 * 🔴 미커밋이 있거나 origin/main 에 없는 커밋이 있으면 거부한다. --force 만 이 확인을 넘는다.
 *
 * 실행: npm run worktree:remove -- <경로> [--force]
 */
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, rmSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseWorktrees } from "./worktree-status.mjs";

function git(cwd, args) {
  const result = spawnSync("git", ["-c", "core.longpaths=true", ...args], { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  return { ok: result.status === 0, out: (result.stdout || "").trim(), err: (result.stderr || "").trim() };
}

const samePath = (a, b) => resolve(a).replaceAll("\\", "/").toLowerCase() === resolve(b).replaceAll("\\", "/").toLowerCase();

function unlinkShared(target) {
  for (const link of [join(target, "node_modules"), join(target, ".paid-gate-base", "node_modules")]) {
    let stat;
    try { stat = lstatSync(link); } catch { continue; }
    if (stat.isSymbolicLink()) unlinkSync(link);
  }
}

export function removeWorktree({ repo, target, force = false, baseRef = "origin/main" }) {
  const listed = git(repo, ["worktree", "list", "--porcelain", "-z"]);
  if (!listed.ok) throw new Error(`워크트리 목록을 읽지 못했다: ${listed.err}`);
  const records = parseWorktrees(listed.out);
  const record = records.find((item) => samePath(item.path, target));
  if (!record) throw new Error(`등록된 워크트리가 아니다: ${target}`);
  if (samePath(records[0].path, target)) throw new Error("주 체크아웃은 지우지 않는다");
  if (samePath(repo, target)) throw new Error("지울 워크트리 안에서 실행할 수 없다");

  const dirty = git(target, ["status", "--porcelain"]);
  const ahead = git(target, ["rev-list", "--count", `${baseRef}..HEAD`]);
  const merged = dirty.ok && !dirty.out && ahead.ok && ahead.out === "0";
  if (!merged && !force) {
    if (!dirty.ok || !ahead.ok) throw new Error(`상태를 확인하지 못했다(--force 로만 넘는다): ${dirty.err || ahead.err}`);
    throw new Error(dirty.out ? `미커밋이 있다:\n${dirty.out}` : `${baseRef} 에 없는 커밋 ${ahead.out}개가 있다`);
  }

  unlinkShared(target);
  const removed = git(repo, ["worktree", "remove", "--force", target]);
  if (existsSync(target)) {
    console.log(`[worktree:remove] git 이 끝내지 못했다(${removed.err.split("\n")[0] || "폴더 남음"}) — 직접 지운다`);
    rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  }
  git(repo, ["worktree", "prune"]);
  if (existsSync(target)) throw new Error(`폴더가 남았다: ${target}`);
  const after = parseWorktrees(git(repo, ["worktree", "list", "--porcelain", "-z"]).out);
  if (after.some((item) => samePath(item.path, target))) throw new Error(`등록이 남았다: ${target}`);

  // 병합을 위에서 origin/main 기준으로 확인했다. git branch -d 는 주 체크아웃의 HEAD 와 비교해 거부할 수 있다.
  const branch = record.branch?.startsWith("wt/") ? record.branch : null;
  const branchDeleted = Boolean(branch && merged && git(repo, ["branch", "-D", branch]).ok);
  return { target, branch, branchDeleted };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const paths = args.filter((arg) => arg !== "--force");
  if (paths.length !== 1) {
    console.error("사용: npm run worktree:remove -- <경로> [--force]");
    process.exit(1);
  }
  try {
    const result = removeWorktree({ repo: process.cwd(), target: resolve(paths[0]), force });
    console.log(`[worktree:remove] 지웠다: ${result.target}${result.branch ? ` · 브랜치 ${result.branch} ${result.branchDeleted ? "삭제" : "유지"}` : ""}`);
  } catch (error) {
    console.error(`[worktree:remove] 실패: ${error.message}`);
    process.exitCode = 1;
  }
}
