#!/usr/bin/env node
/**
 * git merge driver 등록.
 *
 * merge driver 는 .git/config 에만 살고 clone·worktree 로 따라오지 않는다. 그래서 .gitattributes
 * 에 merge=cachebust 를 적어 두어도 등록이 없으면 git 이 조용히 기본 병합으로 되돌아간다
 * (= 캐시버스트 해시 충돌이 다시 240개 뜬다). npm install 의 prepare 단계에서 자동 실행한다.
 *
 * worktree 는 .git/config 를 본체와 공유하므로 한 번만 등록하면 모든 worktree 에 적용된다.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const driverPath = "scripts/git/cachebust-merge-driver.mjs";

if (!existsSync(resolve(root, driverPath))) {
  console.warn(`[setup-git-merge-drivers] skip: ${driverPath} 이 없습니다.`);
  process.exit(0);
}

const inRepo = spawnSync("git", ["rev-parse", "--git-dir"], { encoding: "utf8" });
if (inRepo.status !== 0) {
  console.warn("[setup-git-merge-drivers] skip: git 저장소가 아닙니다.");
  process.exit(0);
}

const settings = [
  ["merge.cachebust.name", "cache-bust hash aware merge (?v=build-<hash>)"],
  // %O=ancestor %A=ours(결과를 여기 쓴다) %B=theirs
  ["merge.cachebust.driver", `node ${driverPath} %O %A %B`],
  // 세 쪽 모두 존재할 때만 의미가 있다. 파일 추가/삭제는 git 기본 동작에 맡긴다.
  ["merge.cachebust.recursive", "binary"],
];

let failed = false;
for (const [key, value] of settings) {
  const result = spawnSync("git", ["config", key, value], { encoding: "utf8" });
  if (result.status !== 0) {
    failed = true;
    console.error(`[setup-git-merge-drivers] 실패: ${key}\n${result.stderr || ""}`);
  }
}

if (failed) process.exit(1);
console.log("[setup-git-merge-drivers] OK: merge.cachebust 등록됨 (.gitattributes 의 merge=cachebust 가 활성화됩니다)");
