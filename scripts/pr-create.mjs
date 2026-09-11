#!/usr/bin/env node
// PR 생성 전용 진입점이다. 검증은 GitHub CI 가 한다 — 2026-09-12 에 로컬 전체 preflight
// (`ci-preflight.mjs`)를 폐기했고, 공식 검증 게이트는 `pr-ci.yml` 하나다.
// 여기서 막는 것은 CI 가 구조적으로 잡을 수 없는 세 가지뿐이다:
//   1) 미커밋 변경이 남은 채로 PR 을 여는 것 — CI 는 push 된 커밋만 본다.
//   2) push 하지 않은 커밋으로 PR 을 여는 것 — 원격 head 가 달라 다른 코드가 검사된다.
//   3) --head/--base/--repo 로 검사 대상과 다른 브랜치·저장소를 지정하는 것.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} 실패: ${String(result.stderr || "").trim()}`);
  return result.stdout.trim();
}

export function validatedPrArguments(args, branch) {
  if (args.some((arg) => /^(?:--(?:head|base|repo)(?:=|$)|-[HBR])/.test(arg))) throw new Error("PR 의 head/base/repo 는 현재 브랜치와 main 으로 고정된다. --head/--base/--repo 를 덮어쓰지 않는다.");
  return ["pr", "create", "--base", "main", "--head", branch, ...args];
}

function main() {
  const branch = git(["branch", "--show-current"]);
  if (!branch) throw new Error("detached HEAD 에서는 PR 을 만들지 않습니다.");
  if (branch === "main") throw new Error("main 에서 PR 을 만들지 않습니다. 작업 브랜치로 옮기세요.");
  const dirty = git(["status", "--porcelain"]);
  if (dirty) throw new Error(`미커밋 변경이 있습니다. PR CI 는 push 된 커밋만 검사하므로 먼저 커밋하세요.\n${dirty}`);
  const head = git(["rev-parse", "HEAD"]);
  const remote = git(["ls-remote", "origin", `refs/heads/${branch}`]).split(/\s/)[0];
  if (remote !== head) throw new Error(`원격 ${branch} 가 로컬 HEAD 와 다릅니다. push 후 다시 실행하세요(원격=${remote ? remote.slice(0, 12) : "없음"}, 로컬=${head.slice(0, 12)}).`);
  const result = spawnSync("gh", validatedPrArguments(argv, branch), { stdio: "inherit", windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

function isEntrypoint() { return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
if (isEntrypoint()) {
  try { main(); } catch (error) { console.error(`[pr:create] FAIL: ${error.message}`); process.exitCode = 1; }
}
