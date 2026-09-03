#!/usr/bin/env node

/*
 * 워크트리·브랜치·열린 PR 을 "이어받을 것 / 정리할 것 / 건드리지 말 것" 으로 분류한다.
 *
 * worktree-status.mjs 는 **무엇을 만졌고 누구와 겹치는지**를 본다. 이 도구는 그 옆의 빈칸,
 * **머지됐는지**를 본다. 전원이 나가 세션이 통째로 날아갔을 때 처음 돌리는 것이 이쪽이다.
 *
 * 🔴 스쿼시 머지 때문에 SHA 는 증거가 아니다 (2026-08-31·2026-09-04 두 번 오진).
 *   `git branch --contains` · `git cherry` · patch-id · `rev-list origin/main..HEAD` 는
 *   머지된 브랜치를 전부 "미머지"로 부른다. 스쿼시가 SHA 를 새로 쓰기 때문이다.
 *   믿을 수 있는 것은 둘뿐이다 — ① PR 상태 ② 파일별 내용 대조(two-dot diff).
 *   세 점(`origin/main...HEAD`)도 쓰지 않는다. 그건 착륙 여부와 무관하게 브랜치의 변경분을 낸다.
 *
 * 읽기 전용이다. 아무것도 바꾸지 않고 종료코드는 항상 0 이다 — 가드가 아니라 조회 도구다.
 * 실행: npm run worktree:unmerged
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

function git(gitArgs, cwd) {
  const result = spawnSync("git", gitArgs, { cwd, encoding: "utf8", windowsHide: true });
  return result.status === 0 ? String(result.stdout || "").trim() : "";
}
/** 종료코드가 필요한 검사용. `git diff --quiet` 는 차이가 있을 때 1 을 낸다. */
function gitCode(gitArgs, cwd) {
  return spawnSync("git", gitArgs, { cwd, encoding: "utf8", windowsHide: true }).status;
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
      // porcelain 의 첫 항목은 항상 주 체크아웃(저장소 루트)이다. 이것을 정리 후보로 부르면 안 된다.
      const primary = entries.length === 0;
      current = { path: line.slice("worktree ".length).trim(), branch: "", head: "", locked: false, lockReason: "", primary };
    } else if (current && line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    } else if (current && line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length).trim();
    } else if (current && (line === "locked" || line.startsWith("locked "))) {
      current.locked = true;
      current.lockReason = line.slice("locked".length).trim();
    }
  }
  if (current) entries.push(current);
  return entries;
}

/*
 * PR 조회는 브랜치마다 한 번씩 부르면 왕복이 그만큼 늘어난다. 한 번에 받아서 head 이름으로 색인한다.
 * 🔴 gh 가 없거나 인증이 안 됐으면 그 사실을 찍고 PR 축은 UNKNOWN 으로 둔다 —
 *   조용히 "PR 없음 = 머지됨"으로 넘기면 그게 fail-open 이고, 살아 있는 작업을 지우게 된다.
 */
function pullRequests() {
  const fields = "number,state,title,headRefName,baseRefName,mergeable,url,isDraft";
  const result = spawnSync(
    "gh",
    ["pr", "list", "--state", "all", "--limit", "100", "--json", fields],
    { cwd: process.cwd(), encoding: "utf8", windowsHide: true },
  );
  if (result.status !== 0) {
    const why = String(result.stderr || result.error?.message || "").trim().split(/\r?\n/)[0] || "알 수 없는 오류";
    return { ok: false, why, byHead: new Map() };
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return { ok: false, why: "gh 출력이 JSON 이 아니다", byHead: new Map() };
  }
  const byHead = new Map();
  for (const pr of parsed) {
    // 같은 head 로 PR 이 여러 개면 OPEN 을 우선한다. 닫힌 재시도가 열린 것을 가리면 안 된다.
    const prev = byHead.get(pr.headRefName);
    if (!prev || (prev.state !== "OPEN" && pr.state === "OPEN")) byHead.set(pr.headRefName, pr);
  }
  return { ok: true, why: "", byHead };
}

/** 미커밋(스테이지 포함) + 미추적 파일. */
function dirtyFiles(cwd) {
  const files = [
    git(["diff", "--name-only"], cwd),
    git(["diff", "--cached", "--name-only"], cwd),
    git(["ls-files", "--others", "--exclude-standard"], cwd),
  ].flatMap(lines);
  return [...new Set(files)].sort();
}

/*
 * 브랜치가 만진 파일 중 **아직 main 과 내용이 다른** 것만 남긴다.
 * 세 점으로 목록을 얻고(브랜치의 변경분), 두 점으로 파일마다 실제 내용을 대조한다.
 * 스쿼시로 머지된 브랜치는 목록은 그대로인데 대조가 전부 같게 나온다 — 그래서 착륙을 알아본다.
 */
function filesStillDifferent(cwd) {
  if (!git(["rev-parse", "--verify", "--quiet", "origin/main"], cwd)) return null;
  const changed = lines(git(["diff", "--name-only", "origin/main...HEAD"], cwd));
  return changed.filter((file) => gitCode(["diff", "--quiet", "origin/main", "HEAD", "--", file], cwd) !== 0);
}

/*
 * 생성 산출물은 리베이스만 해도 값이 바뀐다(캐시버스트 해시·sitemap 서명·lastmod).
 * 지우지 않고 표시만 한다 — 판정은 사람이 한다. 실측 근거는 docs/handoff/session-recovery-2026-08-31.md.
 */
const GENERATED = /^(public\/|dist\/|out\/|sitemap\.xml$|config\/sitemap-lastmod\.json$|\.ignore$)/;

const prs = pullRequests();
const entries = worktrees();
const rows = [];

for (const entry of entries) {
  const name = path.basename(entry.path);
  const dirty = dirtyFiles(entry.path);
  const differing = filesStillDifferent(entry.path);
  const pr = entry.branch ? prs.byHead.get(entry.branch) : undefined;

  let verdict;
  let action;
  if (entry.primary) {
    verdict = "저장소 루트";
    action = `공유 체크아웃 — 정리 대상이 아니다${dirty.length ? " (미커밋이 있다: 남의 세션 것일 수 있다)" : ""}`;
  } else if (entry.locked) {
    verdict = "LOCKED";
    action = "🔴 건드리지 않는다 — 다른 세션이 쓰는 중";
  } else if (!prs.ok) {
    verdict = "UNKNOWN (gh 조회 실패)";
    action = "PR 축을 못 봤다. 아래 로컬 판정만 유효하다";
  } else if (pr && pr.state === "OPEN") {
    verdict = `OPEN #${pr.number}`;
    action = "🔴 이어받을 것";
  } else if (pr && pr.state === "MERGED") {
    verdict = `MERGED #${pr.number}`;
    action = dirty.length ? "🔴 머지됐지만 미커밋 변경이 남아 있다 — 확인 후 정리" : "정리 대상";
  } else if (pr && pr.state === "CLOSED") {
    verdict = `CLOSED #${pr.number}`;
    action = dirty.length ? "🔴 닫혔지만 미커밋 변경이 남아 있다 — 확인 후 정리" : "정리 대상";
  } else if (dirty.length > 0) {
    verdict = "UNMERGED (PR 없음)";
    action = "🔴 이어받을 것 — 커밋도 PR 도 없는 작업이 살아 있다";
  } else if (differing === null) {
    verdict = "UNKNOWN (origin/main 없음)";
    action = "git fetch origin 후 다시 본다";
  } else if (differing.length === 0) {
    verdict = "LANDED (PR 없음)";
    action = "정리 대상 — 내용이 이미 main 에 있다";
  } else {
    verdict = "UNMERGED (PR 없음)";
    action = "🔴 이어받을 것";
  }

  rows.push({ name, entry, pr, dirty, differing, verdict, action });
}

const order = (row) => (row.action.startsWith("🔴") ? 0 : 1);
rows.sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));

if (!prs.ok) {
  console.log("");
  console.log(`[unmerged] 🔴 gh 조회 실패 — ${prs.why}`);
  console.log("  PR 상태를 못 봤으므로 아래 판정은 로컬 정보만으로 낸 것이다.");
  console.log("  `gh auth status` 를 확인하기 전에는 어떤 워크트리도 지우지 않는다.");
}

console.log("");
for (const row of rows) {
  const label = row.entry.branch || row.entry.head.slice(0, 12) || "detached";
  console.log(`${row.name}  [${label}]`);
  console.log(`   ${row.verdict}  —  ${row.action}`);
  if (row.entry.locked && row.entry.lockReason) console.log(`   잠금 사유: ${row.entry.lockReason}`);
  // 🔴 머지된 PR 은 mergeable 이 영구 UNKNOWN 이다 — 찍으면 노이즈이고 오진을 부른다.
  if (row.pr) {
    const mergeable = row.pr.state === "OPEN" ? `  mergeable=${row.pr.mergeable}` : "";
    console.log(`   ${row.pr.url}  base=${row.pr.baseRefName}${mergeable}${row.pr.isDraft ? "  (draft)" : ""}`);
  }
  if (row.dirty.length) {
    console.log(`   미커밋 ${row.dirty.length}개:`);
    for (const file of row.dirty.slice(0, 6)) console.log(`     ${GENERATED.test(file) ? "~" : " "} ${file}`);
    if (row.dirty.length > 6) console.log(`     … ${row.dirty.length - 6} more`);
  }
  if (row.differing && row.differing.length) {
    console.log(`   main 과 다른 커밋 파일 ${row.differing.length}개:`);
    for (const file of row.differing.slice(0, 6)) console.log(`     ${GENERATED.test(file) ? "~" : " "} ${file}`);
    if (row.differing.length > 6) console.log(`     … ${row.differing.length - 6} more`);
  }
  console.log("");
}

// 워크트리가 없는 열린 PR — 이것을 빠뜨리면 "워크트리만 보고 다 됐다"는 오판이 난다.
if (prs.ok) {
  const covered = new Set(rows.map((row) => row.entry.branch).filter(Boolean));
  const orphanOpen = [...prs.byHead.values()].filter((pr) => pr.state === "OPEN" && !covered.has(pr.headRefName));
  if (orphanOpen.length) {
    console.log(`[unmerged] 워크트리가 없는 열린 PR ${orphanOpen.length}건 — 이어받으려면 브랜치를 먼저 체크아웃한다:`);
    for (const pr of orphanOpen) {
      console.log(`  #${pr.number}  ${pr.headRefName} → ${pr.baseRefName}  mergeable=${pr.mergeable}`);
      console.log(`      ${pr.title}`);
    }
    console.log("");
  }
}

const resume = rows.filter((row) => row.action.startsWith("🔴"));
console.log(`[unmerged] 워크트리 ${rows.length}개 중 손댈 것 ${resume.length}개, 정리 후보 ${rows.length - resume.length}개.`);
console.log("  ~ 표시는 생성 산출물이다(캐시버스트 해시·sitemap 서명). 리베이스만 해도 바뀌므로 작업의 증거가 아니다.");
console.log("  LOCKED 에는 지금 이 세션의 워크트리도 포함된다 — 잠금 사유의 pid 로 구분한다.");
console.log("  다음: docs/handoff/ 에서 해당 갈래 문서를 읽고, 한 세션은 한 갈래만 잡는다.");
