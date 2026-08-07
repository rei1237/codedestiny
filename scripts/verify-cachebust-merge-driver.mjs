#!/usr/bin/env node
/**
 * 캐시버스트 merge driver 회귀 가드.
 *
 * 임시 저장소를 만들어 실제로 병합시켜 본다. 문자열 검사가 아니라 실행 검사인 이유는,
 * merge driver 는 .gitattributes·.git/config·드라이버 스크립트 셋이 모두 맞아야 동작하고
 * 하나만 어긋나도 git 이 조용히 기본 병합으로 되돌아가기 때문이다(= 해시 충돌 재발).
 *
 * 검사:
 *   1) 해시만 다른 병합 → 충돌 없이 자동 병합된다
 *   2) 해시 + 실제 내용이 함께 다른 병합 → 충돌 마커가 남는다 (진짜 충돌을 삼키지 않는다)
 *   3) .gitattributes 에 등록된 경로가 실제로 존재한다
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";

const repoRoot = process.cwd();
const driverRel = "scripts/git/cachebust-merge-driver.mjs";
let failures = 0;

function check(label, ok, detail = "") {
  if (ok) {
    console.log(`  OK   ${label}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${label}${detail ? `\n         → ${detail}` : ""}`);
}

function git(cwd, args, opts = {}) {
  return spawnSync("git", args, { cwd, encoding: "utf8", ...opts });
}

// 3) .gitattributes 등록 경로가 실제 파일인지
const attrs = readFileSync(resolve(repoRoot, ".gitattributes"), "utf8");
const registered = [...attrs.matchAll(/^(\S+)\s+merge=cachebust\s*$/gm)].map((m) => m[1]);
check(".gitattributes 에 merge=cachebust 경로가 등록돼 있다", registered.length > 0, `count=${registered.length}`);
const missing = registered.filter((rel) => !existsSync(resolve(repoRoot, rel)));
check("등록된 경로가 전부 실제로 존재한다", missing.length === 0, missing.join(", "));

const work = mkdtempSync(join(tmpdir(), "cd-merge-driver-test-"));
try {
  // 임시 저장소에 드라이버를 복사해 실제 병합을 돌린다.
  git(work, ["init", "-q", "-b", "main"]);
  git(work, ["config", "user.email", "guard@example.com"]);
  git(work, ["config", "user.name", "guard"]);
  mkdirSync(dirname(join(work, driverRel)), { recursive: true });
  cpSync(resolve(repoRoot, driverRel), join(work, driverRel));
  git(work, ["config", "merge.cachebust.name", "cache-bust hash aware merge"]);
  git(work, ["config", "merge.cachebust.driver", `node ${driverRel} %O %A %B`]);
  writeFileSync(join(work, ".gitattributes"), "shell.html merge=cachebust\n");

  const shell = join(work, "shell.html");
  const build = (hash, extra = "") =>
    `<script src="/js/a.js?v=build-${hash}"></script>\n` +
    `<script src="/js/b.js?v=build-${hash}"></script>\n` +
    `<nav>메뉴</nav>\n${extra}`;

  writeFileSync(shell, build("aaaaaaaaaaaa"));
  git(work, ["add", "-A"]);
  git(work, ["commit", "-qm", "base"]);
  const baseSha = git(work, ["rev-parse", "HEAD"]).stdout.trim();

  // 1) 해시만 다른 두 갈래
  git(work, ["checkout", "-q", "-b", "feature"]);
  writeFileSync(shell, build("bbbbbbbbbbbb"));
  git(work, ["commit", "-qam", "feature: rehash"]);

  git(work, ["checkout", "-q", "main"]);
  writeFileSync(shell, build("cccccccccccc"));
  git(work, ["commit", "-qam", "main: rehash"]);

  const merge1 = git(work, ["merge", "--no-edit", "feature"]);
  const merged1 = readFileSync(shell, "utf8");
  check(
    "해시만 다르면 충돌 없이 자동 병합된다",
    merge1.status === 0 && !merged1.includes("<<<<<<<"),
    `status=${merge1.status} ${(merge1.stdout || "").trim().slice(0, 120)}`,
  );

  // 2) 해시 + 실제 내용이 함께 다른 두 갈래 — 충돌이 남아야 한다
  git(work, ["reset", "-q", "--hard", baseSha]);
  git(work, ["checkout", "-q", "-B", "feature2", baseSha]);
  writeFileSync(shell, build("dddddddddddd", "<p>기능 브랜치 문단</p>\n"));
  git(work, ["commit", "-qam", "feature2: content"]);

  git(work, ["checkout", "-q", "main"]);
  git(work, ["reset", "-q", "--hard", baseSha]);
  writeFileSync(shell, build("eeeeeeeeeeee", "<p>메인 브랜치 문단</p>\n"));
  git(work, ["commit", "-qam", "main: different content"]);

  const merge2 = git(work, ["merge", "--no-edit", "feature2"]);
  const merged2 = readFileSync(shell, "utf8");
  check(
    "해시를 빼고도 내용이 다르면 충돌을 그대로 남긴다",
    merge2.status !== 0 && merged2.includes("<<<<<<<"),
    `status=${merge2.status}`,
  );
} finally {
  try {
    rmSync(work, { recursive: true, force: true });
  } catch {
    /* 임시 디렉터리 정리 실패는 검사 결과에 영향이 없다 */
  }
}

if (failures > 0) {
  console.error(`\n[verify-cachebust-merge-driver] FAILED: ${failures}건`);
  process.exit(1);
}
console.log("\n[verify-cachebust-merge-driver] OK: 해시 충돌은 자동 병합되고 실제 충돌은 보존됩니다.");
