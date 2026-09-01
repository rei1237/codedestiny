#!/usr/bin/env node
/**
 * 정리 후보 리포트 — 워크트리와 세션 트랜스크립트를 훑어 **삭제 후보만 뽑는다.**
 *
 * 🔴 이 스크립트는 아무것도 지우지 않는다. 지울 수 없다. 판단 재료만 만든다.
 *
 * 왜 리포트인가 (2026-08-24 실측): 워크트리 12개 5.5G 중 **미커밋 변경이 없으면서 머지까지
 * 끝난 것은 0개**였다. 머지된 3개는 각각 미커밋 1개·12개(게다가 locked)를 들고 있었다.
 * "머지됐으니 지워도 된다"로 자동화했으면 그날 작업분이 날아갔다. 그래서 판정은 사람이 한다.
 *
 * 🔴 그리고 이 정리는 **토큰을 한 푼도 아끼지 않는다.** 워크트리는 `.gitignore` 에 있어
 * 검색에 안 잡히고(실측: `rg --files` 3,784개 중 워크트리 경로 0개), 트랜스크립트는 애초에
 * 컨텍스트가 아니다. 이건 디스크 문제다. 토큰 문제로 착각하면 엉뚱한 것을 지우게 된다.
 *
 * 🔴 정정(2026-09-01) — 위 문장은 **rg 기준으로만 옳다.** Glob 툴은 `.gitignore` 를 따르지
 *    않아서 워크트리를 그대로 훑는다. 그날 실측: 전 경로 package.json Glob 조회가 사본
 *    16개를 반환했고 `.claude/worktrees` 아래 파일이 132,255개(메인 추적 4,441개)였다.
 *    Glob 은 100건에서 잘리므로 그만큼 진짜 파일이 밀려난다. 그래서 루트 `.ignore` 에
 *    `/.claude/worktrees/` 를 넣었다 — 정리 자체보다 그 한 줄이 검색 비용을 줄인다.
 *
 * 사용:
 *   node scripts/list-cleanup-candidates.mjs
 *   node scripts/list-cleanup-candidates.mjs --size    # 디스크 사용량까지(느리다)
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WANT_SIZE = process.argv.includes("--size");
const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");

const git = (args, cwd) => {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};

/** `~/.claude/projects/` 의 디렉터리 이름 규칙: 경로의 `: \ / .` 를 전부 `-` 로 바꾼 것. */
const encodePath = (p) => p.replace(/[:\\/.]/g, "-").toLowerCase();

function dirSize(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else {
        try {
          total += fs.statSync(full).size;
        } catch {
          /* 링크 끊김 등 — 무시 */
        }
      }
    }
  }
  return total;
}

const human = (bytes) => {
  if (bytes == null) return "-";
  const units = ["B", "K", "M", "G"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)}${units[i]}`;
};

function collectWorktrees(root) {
  const porcelain = git(["worktree", "list", "--porcelain"], root);
  if (!porcelain) return [];
  const out = [];
  let cur = null;
  for (const line of porcelain.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (cur) out.push(cur);
      cur = { path: line.slice(9).trim(), branch: null, locked: false };
    } else if (line.startsWith("branch ")) cur.branch = line.slice(7).trim();
    else if (line === "locked" || line.startsWith("locked ")) cur.locked = true;
  }
  if (cur) out.push(cur);
  return out;
}

function main() {
  const root = git(["rev-parse", "--show-toplevel"], process.cwd());
  if (!root) {
    console.error("[cleanup-candidates] git 저장소가 아니다");
    process.exit(1);
  }
  // 🔴 `--show-toplevel` 은 **현재 워크트리**를 가리킨다 — 이걸 기준으로 걸러내면 자기 자신을
  //    빼고 메인 저장소를 후보로 올린다(실제로 그렇게 틀렸다). 메인 저장소는 공용 .git 의
  //    부모다.
  const commonDir = git(["rev-parse", "--path-format=absolute", "--git-common-dir"], process.cwd());
  const mainRepo = commonDir ? path.dirname(commonDir) : root;

  // 머지 판정 기준은 origin/main 이다 — 낡은 로컬 main 으로 재면 이미 머지된 것을 미머지로 읽는다.
  git(["fetch", "origin", "main", "--quiet"], root);

  const worktrees = collectWorktrees(root).filter(
    (w) => path.resolve(w.path) !== path.resolve(mainRepo)
  );
  const live = new Set(worktrees.map((w) => encodePath(path.resolve(w.path))));

  console.log("=== 워크트리 ===");
  console.log("판정      미커밋  locked  크기    브랜치 / 경로");
  const removable = [];
  for (const w of worktrees) {
    const merged = w.branch
      ? git(["merge-base", "--is-ancestor", w.branch, "origin/main"], root) !== null
      : false;
    const status = git(["status", "--porcelain"], w.path);
    const dirty = status === null ? null : status ? status.split("\n").filter(Boolean).length : 0;
    const size = WANT_SIZE ? dirSize(w.path) : null;
    const verdict = merged ? (dirty === 0 ? "삭제가능" : "머지됨") : "보존";
    if (verdict === "삭제가능") removable.push(w);
    console.log(
      `${verdict.padEnd(9)} ${String(dirty ?? "?").padStart(6)} ${(w.locked ? "예" : "-").padStart(7)} ${human(size).padStart(6)}  ${(w.branch || "(detached)").replace("refs/heads/", "")}`
    );
    console.log(`${" ".repeat(32)}${w.path}`);
  }

  console.log("\n=== 세션 트랜스크립트 (~/.claude/projects) ===");
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.log("(없음)");
  } else {
    const rows = [];
    for (const name of fs.readdirSync(PROJECTS_DIR)) {
      const dir = path.join(PROJECTS_DIR, name);
      let stat;
      try {
        stat = fs.statSync(dir);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;
      // 워크트리에서 열린 세션만 고아 판정 대상이다. 일반 프로젝트 디렉터리는 건드리지 않는다.
      const isWorktreeSession = /-claude-worktrees-/.test(name.toLowerCase());
      if (!isWorktreeSession) continue;
      rows.push({
        name,
        orphan: !live.has(name.toLowerCase()),
        mtime: stat.mtime,
        size: WANT_SIZE ? dirSize(dir) : null,
      });
    }
    rows.sort((a, b) => b.mtime - a.mtime);
    console.log("워크트리  마지막수정   크기    디렉터리");
    for (const r of rows) {
      console.log(
        `${(r.orphan ? "없음" : "있음").padEnd(9)} ${r.mtime.toISOString().slice(0, 10)}  ${human(r.size).padStart(6)}  ${r.name}`
      );
    }
    const orphans = rows.filter((r) => r.orphan);
    console.log(
      `\n워크트리 세션 ${rows.length}개 중 ${orphans.length}개는 대응 워크트리가 이미 없다.`
    );
  }

  console.log("\n─────────────────────────────────────────────");
  console.log("🔴 이 스크립트는 아무것도 지우지 않았다. 삭제는 항목별로 사람이 판단한다.");
  console.log("🔴 이 정리는 토큰을 아끼지 않는다 — 워크트리는 .gitignore 라 검색에 안 잡히고,");
  console.log("   트랜스크립트는 컨텍스트가 아니다. 디스크만 준다.");
  console.log("🔴 트랜스크립트를 지우면 그 세션의 /resume 이력이 사라진다.");
  if (removable.length) {
    console.log(`\n삭제가능 ${removable.length}개 — 지운다면 Windows 에서는 링크부터 끊는다:`);
    for (const w of removable) {
      console.log(`  cmd /c rmdir "${w.path}\\node_modules"   # 정션이면. 안 끊으면 공유 설치본이 위험하다`);
      console.log(`  git worktree remove "${w.path}"`);
    }
  } else {
    console.log("\n삭제가능 0개 — 머지됐으면서 미커밋도 없는 워크트리가 없다.");
  }
}

main();
