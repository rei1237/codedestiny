#!/usr/bin/env node
/**
 * 캐시버스트 해시 충돌 일괄 해결 (merge driver 의 수동 폴백).
 *
 * 왜 드라이버만으로 부족한가:
 *   merge driver 는 병합 시점의 트리에 있는 .gitattributes 를 읽는다. 그래서
 *   (a) 드라이버 도입 이전 커밋을 리베이스할 때
 *   (b) npm install 전이라 .git/config 등록이 없을 때
 *   두 경우엔 드라이버가 뜨지 않아 해시 충돌이 그대로 쏟아진다.
 *
 * 안전장치: 훅마다 build-<hex> 를 지운 뒤 양쪽을 비교해 **완전히 같을 때만** 해결한다.
 *   하나라도 실제 내용이 다르면 아무 파일도 건드리지 않고 그 위치를 보고하며 종료(1)한다.
 *   즉 진짜 충돌을 삼킬 수 없다.
 *
 * 사용: node scripts/resolve-cachebust-conflicts.mjs   (해결 후 npm run sync:public 권장)
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { normalizeCacheBust } from "./lib/cachebust-pattern.mjs";

const strip = normalizeCacheBust;
const CONFLICT_RE = /<<<<<<< [^\n]*\n([\s\S]*?)\n?=======\n([\s\S]*?)\n?>>>>>>> [^\n]*\n/g;

const listed = spawnSync("git", ["diff", "--name-only", "--diff-filter=U"], { encoding: "utf8" });
if (listed.status !== 0) {
  console.error("[resolve-cachebust] git diff 실패:", listed.stderr || "");
  process.exit(1);
}

const files = listed.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).filter((f) => existsSync(f));
if (files.length === 0) {
  console.log("[resolve-cachebust] 충돌 중인 파일이 없습니다.");
  process.exit(0);
}

// 1단계: 전수 검사만 한다. 하나라도 실제 충돌이면 아무것도 쓰지 않는다.
const real = [];
const plan = new Map();
for (const file of files) {
  const raw = readFileSync(file, "utf8");
  let hunks = 0;
  CONFLICT_RE.lastIndex = 0;
  for (const match of raw.matchAll(CONFLICT_RE)) {
    if (strip(match[1]) !== strip(match[2])) {
      const line = raw.slice(0, match.index).split("\n").length;
      real.push(`${file}:${line}`);
      continue;
    }
    hunks += 1;
  }
  if (hunks > 0) plan.set(file, hunks);
}

if (real.length > 0) {
  console.error("[resolve-cachebust] 해시를 제외해도 다른 훅이 있습니다 — 아무 파일도 수정하지 않았습니다.");
  real.slice(0, 20).forEach((loc) => console.error(`  - ${loc}`));
  if (real.length > 20) console.error(`  ... 외 ${real.length - 20}건`);
  console.error("이 충돌들을 먼저 손으로 해결한 뒤 다시 실행하세요.");
  process.exit(1);
}

// 2단계: 해시만 다른 훅을 ours 쪽으로 접는다. 어차피 sync:public 이 내용 기준으로 다시 찍는다.
let resolved = 0;
for (const [file, hunks] of plan) {
  const raw = readFileSync(file, "utf8");
  writeFileSync(file, raw.replace(CONFLICT_RE, (_whole, ours) => `${ours}\n`));
  resolved += hunks;
  console.log(`  ${file}: 훅 ${hunks}건 해결`);
}

const add = spawnSync("git", ["add", "--", ...plan.keys()], { encoding: "utf8" });
if (add.status !== 0) {
  console.error("[resolve-cachebust] git add 실패:", add.stderr || "");
  process.exit(1);
}

console.log(`\n[resolve-cachebust] OK: 파일 ${plan.size}개 / 훅 ${resolved}건을 해결하고 스테이징했습니다.`);
console.log("다음: npm run sync:public 으로 해시를 다시 찍은 뒤 rebase --continue / commit 하세요.");
