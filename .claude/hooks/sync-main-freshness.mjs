#!/usr/bin/env node
/**
 * SessionStart + PreToolUse(EnterWorktree) 훅 — 로컬 `main` 이 낡은 채로 굳지 않게 한다.
 *
 * 왜: 이 레포는 브랜치 → PR → **사용자 머지** 흐름이라 로컬 main 을 갱신하는 주체가 없다.
 * 2026-09-05 실측으로 `HEAD..origin/main` 이 이미 10 커밋이었다. 낡은 로컬 main 은 두 가지
 * 사고로 온다 — (1) 이미 머지된 수정을 미해결로 보는 진단 오진, (2) 낡은 지점에서 브랜치를 딴다.
 *
 * 🔴 이미 있는 장치와의 관계 (CLAUDE.md 원칙 6 — 감싸기 전에 안팎을 확인한 결과):
 *    `.claude/settings.json` 의 `worktree.baseRef: "fresh"` 덕분에 EnterWorktree 는 로컬 main 이
 *    아니라 `origin/HEAD` 에서 브랜치를 딴다. 그래서 (2)는 이미 상당 부분 막혀 있다. 다만 그
 *    fetch 는 **24시간 쿨다운 · 5초 캡 · 실패 시 로컬 캐시 폴백**이다 — 이 레포에서 24시간이면
 *    수십 커밋이다. 이 훅이 하는 일은 새 방어층을 얹는 게 아니라 **그 24시간 창을 좁히고**,
 *    (1)을 위해 **로컬 main 자체를 당기는** 것이다.
 *
 * 🔴 fast-forward 는 안전할 때만 한다. 프로젝트 루트는 여러 세션이 공유하므로(메모리
 *    `concurrent-sessions-share-worktree`) 남의 미커밋 변경을 절대 건드리면 안 된다. stash 는
 *    쓰지 않는다 — 조건이 하나라도 어긋나면 손대지 않고 안내만 한다. 같은 브랜치의
 *    fast-forward 라 커밋이 사라질 일은 없고, 되돌릴 수 없는 것은 아무것도 하지 않는다.
 *
 * 🔴 이것은 정확성 가드가 아니라 **동기화 넛지**라, 원칙 10(fail-closed)을 따르지 않는다.
 *    오프라인이거나 git 이 느릴 때마다 세션 시작을 막으면 아무 일도 못 한다. 그래서 모든 경로가
 *    fail-open(조용히 exit 0)이고 **fetch 실패는 보고하지 않는다**(캐시된 origin/main 으로 계속
 *    간다). 원칙 10 의 취지는 테스트 쪽에서 지킨다 — sync-main-freshness.test.mjs 가 임시
 *    저장소로 ff 되는 경우와 **건너뛰어야 하는 경우 4종**을 실제로 돌려 단언한다.
 *
 * 🔴 **fetch·ff 는 늘 하지만 말은 거의 안 한다** — 안내는 대규모 변경일 때만(LARGE_CHANGE_FILES).
 *    사용자 요청: "너무 자주할 필요는 없으니까 대규모 변경이 들어갔을때에만 안내".
 *
 * 손으로 확인:
 *   echo '{"hook_event_name":"SessionStart","source":"startup","cwd":"<repo>"}' \
 *     | CLAUDE_PROJECT_DIR=<repo> node .claude/hooks/sync-main-freshness.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_BRANCH = "main";

/**
 * fetch 쿨다운. 스탬프는 `<git-common-dir>/FETCH_HEAD` 의 mtime — 새 파일을 만들지 않고
 * Claude Code 자신의 24시간 판정과 **같은 시계**를 읽는다. EnterWorktree 직전이 더 짧은 이유는
 * 그 순간이 base 가 브랜치에 굳는 지점이기 때문이다.
 */
const COOLDOWN_MS = {
  SessionStart: 30 * 60 * 1000,
  PreToolUse: 5 * 60 * 1000,
};

/**
 * "대규모 변경" 임계 — `main..origin/main` 의 변경 파일 수. 이 미만이면 fast-forward 는 하되
 * **아무 말도 하지 않는다**.
 *
 * 왜 200인가 (2026-09-05 실측, `origin/main`):
 *   git log --since=10.days --format=%cd --date=format:%Y-%m-%d origin/main | sort | uniq -c
 *     → 하루 30~108 커밋(스쿼시 머지)
 *   git diff --shortstat origin/main~10 origin/main   → 115 files changed
 *   git diff --shortstat origin/main~3  origin/main   →  53 files changed
 * 이 속도면 "커밋 N개" 류의 임계는 하루에도 몇 번 걸려 그냥 소음이 된다. 200파일은 대략
 * 20커밋 이상이 쌓였을 때, 즉 **오랜만에 돌아왔거나 ff 가 오래 막혀 있던 경우**에만 걸린다.
 */
const LARGE_CHANGE_FILES = 200;

/** 네트워크가 죽어 있을 때 세션 시작을 붙잡지 않도록. 훅 자체 timeout(10초)보다 짧아야 한다. */
const FETCH_TIMEOUT_MS = 8_000;
const GIT_TIMEOUT_MS = 5_000;

/** 이 중 하나라도 있으면 루트 체크아웃이 작업 중이므로 절대 건드리지 않는다. */
const IN_PROGRESS_MARKERS = [
  "MERGE_HEAD",
  "CHERRY_PICK_HEAD",
  "REVERT_HEAD",
  "rebase-merge",
  "rebase-apply",
  "BISECT_LOG",
];

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

/** git 을 돌려 stdout 을 돌려준다. 실패·타임아웃은 null — 빈 출력("")과 구분해야 한다. */
function git(args, cwd, timeout = GIT_TIMEOUT_MS) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", timeout, windowsHide: true });
  if (result.status !== 0) return null;
  return String(result.stdout ?? "").trim();
}

function commonDirOf(dir) {
  const out = git(["rev-parse", "--path-format=absolute", "--git-common-dir"], dir);
  return out ? path.resolve(out) : null;
}

/**
 * 쿨다운 밖이면 origin/main 을 당긴다.
 *
 * 명시 refspec 은 `scripts/create-safe-worktree.ps1:31` 의 형태를 따른다 — 원격 추적 참조를
 * 확실히 갱신하고, 체크아웃된 로컬 main 은 건드리지 않는다. 실패해도 막지 않는 태도는
 * `scripts/lib/worker-deploy-base-guard.mjs:66` 과 같다.
 */
function maybeFetch(root, commonDir, cooldownMs) {
  const stamp = path.join(commonDir, "FETCH_HEAD");
  try {
    if (Date.now() - fs.statSync(stamp).mtimeMs < cooldownMs) return;
  } catch {
    // 스탬프가 없으면 한 번도 안 당겼다는 뜻이니 그냥 fetch 한다.
  }
  git(
    [
      "fetch",
      "origin",
      `refs/heads/${DEFAULT_BRANCH}:refs/remotes/origin/${DEFAULT_BRANCH}`,
      "--no-tags",
      "--quiet",
    ],
    root,
    FETCH_TIMEOUT_MS
  );
}

/** 로컬 main 이 origin/main 보다 몇 커밋 뒤처졌는지. 둘 중 하나라도 없으면 null. */
function countBehind(root) {
  const refs = [`refs/heads/${DEFAULT_BRANCH}`, `refs/remotes/origin/${DEFAULT_BRANCH}`];
  if (refs.some((ref) => git(["rev-parse", "--verify", "--quiet", ref], root) === null)) return null;
  const out = git(["rev-list", "--count", `${DEFAULT_BRANCH}..origin/${DEFAULT_BRANCH}`], root);
  const behind = Number.parseInt(out ?? "", 10);
  return Number.isFinite(behind) ? behind : null;
}

/**
 * `main..origin/main` 이 건드리는 파일 수.
 *
 * 🔴 **fast-forward 전에** 재야 한다 — ff 뒤엔 범위가 비어 0이 된다.
 * 🔴 못 재면(`null`) **소규모로 친다** — 못 잰 것을 대규모로 오인해 안내를 띄우면
 *    "대규모일 때만 안내" 라는 요구가 통째로 무너진다.
 *
 * `--shortstat` 이 아니라 `--name-only` 인 이유: 파일 수는 같은데 내용 diff 를 계산하지 않아
 * 더 싸고, 파싱할 문장이 없다.
 */
function countFilesChanged(root) {
  const out = git(
    ["diff", "--name-only", `${DEFAULT_BRANCH}..origin/${DEFAULT_BRANCH}`],
    root
  );
  if (out === null) return 0;
  return out === "" ? 0 : out.split("\n").length;
}

/**
 * 세션이 격리 워크트리 안에 있는지. 워크트리면 `--git-dir` 은 `.git/worktrees/<이름>` 이고
 * `--git-common-dir` 은 `.git` 이라 서로 다르다.
 *
 * 판정이 안 되면 **워크트리로 친다** — 모를 때 남의 체크아웃을 건드리지 않는 쪽이 안전하다.
 */
function isWorktreeSession(sessionCwd) {
  if (!sessionCwd || !fs.existsSync(sessionCwd)) return true;
  const out = git(
    ["rev-parse", "--path-format=absolute", "--git-dir", "--git-common-dir"],
    sessionCwd
  );
  const [gitDir, commonDir] = String(out ?? "").split("\n");
  if (!gitDir || !commonDir) return true;
  return path.resolve(gitDir) !== path.resolve(commonDir);
}

/** fast-forward 를 건너뛸 사유. 없으면 null(= 당겨도 안전). */
function ffBlockedReason(root, commonDir, sessionCwd) {
  if (isWorktreeSession(sessionCwd)) {
    return "이 세션이 격리 워크트리에 있다(루트 체크아웃은 건드리지 않는다)";
  }
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], root);
  if (branch !== DEFAULT_BRANCH) {
    return `루트 체크아웃의 HEAD 가 \`${branch ?? "알 수 없음"}\` 이다`;
  }
  const status = git(["status", "--porcelain"], root);
  if (status === null) return "루트 체크아웃의 상태를 읽지 못했다";
  if (status !== "") return "루트 체크아웃에 미커밋 변경이 있다";
  const busy = IN_PROGRESS_MARKERS.find((name) => fs.existsSync(path.join(commonDir, name)));
  if (busy) return `루트 체크아웃에 진행 중인 작업이 있다(${busy})`;
  return null;
}

/**
 * 로컬 main 을 당기고, **말할 가치가 있을 때만** 문장을 돌려준다.
 *
 * 🔴 안내는 대규모 변경(`LARGE_CHANGE_FILES` 이상)에서만 나간다. 소규모는 ff 를 하든
 *    못 하든 **0바이트로 침묵한다** — 훅 자신이 토큰을 쓰면 최적화가 역전되고, 하루 수십 번
 *    뜨는 안내는 읽히지 않는다.
 */
function syncLocalMain(root, commonDir, sessionCwd) {
  const behind = countBehind(root);
  if (behind === null || behind === 0) return null;

  // ff 가 범위를 지우기 전에 잰다.
  const files = countFilesChanged(root);
  const isLarge = files >= LARGE_CHANGE_FILES;
  const scale = `${behind} 커밋 / ${files} 파일`;

  const reason = ffBlockedReason(root, commonDir, sessionCwd);
  if (reason) {
    if (!isLarge) return null;
    return [
      `⚠️ origin/${DEFAULT_BRANCH} 에 대규모 변경이 들어와 있다 — 로컬 ${DEFAULT_BRANCH} 이 ${scale} 뒤처졌는데 자동 fast-forward 를 건너뛴 사유: ${reason}.`,
      `브랜치는 로컬 ${DEFAULT_BRANCH} 말고 \`origin/${DEFAULT_BRANCH}\` 에서 따라.`,
    ].join("\n");
  }

  if (git(["merge", "--ff-only", `origin/${DEFAULT_BRANCH}`], root) === null) {
    if (!isLarge) return null;
    return `⚠️ 로컬 ${DEFAULT_BRANCH} 이 ${scale} 뒤처져 있는데 fast-forward 가 실패했다. 손으로 확인해라: \`git merge --ff-only origin/${DEFAULT_BRANCH}\``;
  }

  if (!isLarge) return null;

  const head = git(["rev-parse", "--short", "HEAD"], root);
  return [
    `🔄 origin/${DEFAULT_BRANCH} 에 대규모 변경이 들어와 있었다 — 로컬 ${DEFAULT_BRANCH} 을 ${scale} fast-forward 했다${head ? ` (${head})` : ""}.`,
    `읽어 둔 파일이 움직였을 수 있으니, 진단·수정 전에 대상 파일을 다시 확인해라.`,
  ].join("\n");
}

async function main() {
  let event;
  try {
    event = JSON.parse(await readStdin());
  } catch {
    process.exit(0);
  }

  // 모르는 이벤트에는 아무것도 하지 않는다.
  const cooldownMs = COOLDOWN_MS[event?.hook_event_name];
  if (cooldownMs == null) process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR;
  if (!root || !fs.existsSync(root)) process.exit(0);

  const commonDir = commonDirOf(root);
  if (!commonDir) process.exit(0);

  maybeFetch(root, commonDir, cooldownMs);

  // PreToolUse(EnterWorktree) 는 부수효과(fetch)만 내고 조용히 빠진다.
  // 🔴 permissionDecision 을 찍지 않아야 정상 권한 흐름이 유지된다 — "allow" 를 내면 권한
  //    체계를 통째로 우회해 버린다. 워크트리 base 는 origin/HEAD 라 여기선 ff 가 필요 없다.
  if (event.hook_event_name !== "SessionStart") process.exit(0);

  const message = syncLocalMain(root, commonDir, event?.cwd);
  if (!message) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: message,
      },
    })
  );
  process.exit(0);
}

main().catch(() => process.exit(0));
